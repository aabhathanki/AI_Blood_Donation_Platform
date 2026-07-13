import re
import requests
from sqlalchemy.orm import Session
from datetime import date
from app.config import settings
from app.models.ai import AIMessage, AIConversation
from app.models.user import User
from app.models.donor import DonorProfile
from app.models.camp import DonationCamp
from app.models.slot import DonationSlot, Appointment
from app.models.inventory import BloodInventory
from app.services.donor_recommendation import BLOOD_COMPATIBILITY, get_compatible_donor_groups

# Standard Medical FAQ responses
FAQ_RESPONSES = {
    "safety": "Yes, blood donation is extremely safe. Sterile, single-use needles and equipment are used for each donor, ensuring zero risk of contracting bloodborne infections.",
    "process": "The entire process takes about 45-60 minutes. It includes registration, a brief medical screening (checking pulse, blood pressure, temperature, and hemoglobin), the donation itself (8-10 minutes), and a short rest period with refreshments.",
    "recovery": "Your body replaces blood volume within 24-48 hours. Red blood cells take about 4 to 6 weeks to fully regenerate. We recommend drinking plenty of fluids and avoiding strenuous exercise for 24 hours.",
    "benefits": "Donating blood stimulates the production of new red blood cells, helps maintain healthy iron levels in the body, and includes a free mini-health screening. Plus, a single donation can save up to three lives!",
    "frequency": "Whole blood donors can donate once every 56 days (8 weeks) for men, and once every 90 days (12 weeks) for women, to allow full iron replenishment.",
}

# Regex patterns
BLOOD_GROUP_PATTERN = r'\b(AB|A|B|O)[+-](?![a-zA-Z0-9])'
URGENT_WORDS = ["emergency", "critical", "urgent", "immediately", "accident", "dying", "icu"]

class AIService:
    @staticmethod
    def process_message(db: Session, conversation_id: int, user_message: str) -> dict:
        """
        Main entry point for processing an AI chat message.
        Loads conversation history, runs intent detection, and returns the response.
        """
        # Save user message to history
        user_msg = AIMessage(
            conversation_id=conversation_id,
            sender="user",
            content=user_message
        )
        db.add(user_msg)
        db.commit()

        # Load conversation history
        conv = db.query(AIConversation).filter(AIConversation.id == conversation_id).first()
        history = conv.messages if conv else []

        # If Gemini API Key is present, attempt LLM call with a fallback
        if settings.GEMINI_API_KEY:
            try:
                response_text = AIService._call_gemini_api(history, user_message)
                # Save assistant response
                assistant_msg = AIMessage(
                    conversation_id=conversation_id,
                    sender="assistant",
                    content=response_text
                )
                db.add(assistant_msg)
                db.commit()
                return {"response": response_text, "intent": "llm_chat"}
            except Exception as e:
                # Fallback to local rule engine if API fails
                print(f"Gemini API call failed, falling back to local engine: {e}")

        # Execute Rule-based and State Machine Local Engine
        response_text, intent, data = AIService._local_rules_engine(db, history, user_message, conv.user_id if conv else None)

        # Save assistant response
        assistant_msg = AIMessage(
            conversation_id=conversation_id,
            sender="assistant",
            content=response_text
        )
        db.add(assistant_msg)
        db.commit()

        return {"response": response_text, "intent": intent, "data": data}

    @staticmethod
    def _call_gemini_api(history: list[AIMessage], user_message: str) -> str:
        """Call Gemini API via REST endpoint."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
        
        # Build prompt & system instructions
        system_instruction = (
            "You are a compassionate, professional medical chatbot assistant on our AI Blood Donation Platform. "
            "You help users check their donation eligibility, answer compatibility questions, guide them on how to request blood, "
            "explain safety procedures, and detect medical emergencies. "
            "If a user needs blood, advise them to use the emergency request form or specify their blood group and city. "
            "Always maintain a supportive and informative tone. Do not give direct prescribing advice."
        )

        contents = []
        # Add conversation history (up to last 10 messages for context)
        for msg in history[-11:-1]:
            role = "user" if msg.sender == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg.content}]
            })
            
        # Add latest user message
        contents.append({
            "role": "user",
            "parts": [{"text": user_message}]
        })

        payload = {
            "contents": contents,
            "systemInstruction": {
                "parts": [{"text": system_instruction}]
            },
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 800
            }
        }

        headers = {"Content-Type": "application/json"}
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]

    @staticmethod
    def _local_rules_engine(db: Session, history: list[AIMessage], user_message: str, user_id: int = None) -> tuple[str, str, dict]:
        """
        Sophisticated rule-based matching, FAQ responder, and eligibility state machine.
        """
        msg_lower = user_message.lower()

        # 1. Emergency and Urgency Detection
        is_emergency = any(word in msg_lower for word in URGENT_WORDS)
        detected_blood_group = re.search(BLOOD_GROUP_PATTERN, user_message.upper())
        bg_match = detected_blood_group.group(0) if detected_blood_group else None

        # 2. Eligibility Flow State Machine
        # Check if the assistant's most recent message (immediately preceding
        # this user reply) was asking an eligibility follow-up question.
        # We only look one turn back — scanning further back through history
        # is unsafe, since unrelated later messages (e.g. the generic fallback
        # greeting, which itself mentions "eligibility" in its help text) can
        # be misdetected as an outstanding question and incorrectly resume
        # the flow turns later.
        last_question = None
        if len(history) >= 2:
            prev_msg = history[-2]  # message right before the current user message
            if prev_msg.sender == "assistant":
                prev_lower = prev_msg.content.lower()
                if "what is your age in years" in prev_lower:
                    last_question = "ask_age"
                elif "what is your weight in kilograms" in prev_lower:
                    last_question = "ask_weight"
                elif "donated blood in the last 3 months" in prev_lower:
                    last_question = "ask_last_donation"
                elif "chronic medical conditions" in prev_lower:
                    last_question = "ask_medical"

        # If user explicitly wants to check eligibility or we are in the middle of it
        if "eligible" in msg_lower or "can i donate" in msg_lower or last_question:
            # We are in the eligibility check flow
            if not last_question or "eligible" in msg_lower or "can i donate" in msg_lower:
                return (
                    "❤️ Let's check if you are currently eligible to donate blood. It only takes a minute.\n\nFirst, **what is your age in years**?",
                    "check_eligibility",
                    {"step": "ask_age"}
                )

            if last_question == "ask_age":
                # Try to parse age
                age_match = re.search(r'\b\d+\b', msg_lower)
                if age_match:
                    age = int(age_match.group(0))
                    if age < 18 or age > 65:
                        return (
                            f"⚠️ Based on your age ({age} years), you are not eligible to donate. Whole blood donors must be between **18 and 65 years** of age.\n\nThank you for your willingness to help!",
                            "check_eligibility",
                            {"step": "result", "eligible": False, "reason": "Age restrictions (must be 18-65)"}
                        )
                    else:
                        return (
                            f"Great, {age} is an eligible age!\n\nNext, **what is your weight in kilograms (kg)**?",
                            "check_eligibility",
                            {"step": "ask_weight", "age": age}
                        )
                else:
                    return (
                        "I couldn't parse your age. Please tell me your age in numbers (e.g. '25' or 'I am 30 years old').",
                        "check_eligibility",
                        {"step": "ask_age"}
                    )

            if last_question == "ask_weight":
                weight_match = re.search(r'\b\d+\b', msg_lower)
                if weight_match:
                    weight = int(weight_match.group(0))
                    if weight < 50:
                        return (
                            f"⚠️ Based on your weight ({weight} kg), you are not eligible to donate. Donors must weigh at least **50 kg** to safely donate blood.\n\nThank you for wanting to save lives!",
                            "check_eligibility",
                            {"step": "result", "eligible": False, "reason": "Weight restrictions (must be >= 50kg)"}
                        )
                    else:
                        return (
                            f"Perfect, {weight} kg is safe!\n\nHave you **donated blood in the last 3 months (90 days)**?",
                            "check_eligibility",
                            {"step": "ask_last_donation", "weight": weight}
                        )
                else:
                    return (
                        "Please specify your weight in numbers (e.g., '65' or '60 kg').",
                        "check_eligibility",
                        {"step": "ask_weight"}
                    )

            if last_question == "ask_last_donation":
                if any(yes in msg_lower for yes in ["yes", "yeah", "did", "i did", "2 months", "1 month"]):
                    return (
                        "⚠️ You are deferred for now. Whole blood donations require a minimum wait time of **90 days (3 months)** between donations to let your iron levels fully restore.\n\nThank you for checking in, please come back when the 3 months have passed!",
                        "check_eligibility",
                        {"step": "result", "eligible": False, "reason": "Recent donation deferral"}
                    )
                else:
                    return (
                        "Wonderful! Almost done.\n\nLastly, do you have any **chronic medical conditions** (like heart disease, diabetes requiring insulin, cancer, or epilepsy), any **major surgery** in the last 6 months, or are you currently **pregnant/breastfeeding**?",
                        "check_eligibility",
                        {"step": "ask_medical"}
                    )

            if last_question == "ask_medical":
                if any(no in msg_lower for no in ["no", "none", "don't", "dont", "nothing", "healthy"]):
                    return (
                        "🎉 **Congratulations! You are eligible to donate blood!**\n\nYour weight, age, and health history meet the safe donation requirements.\n\nWould you like me to help you register as a donor or find nearby donation camps?",
                        "check_eligibility",
                        {"step": "result", "eligible": True}
                    )
                else:
                    return (
                        "⚠️ Based on your medical indications, you may have a deferral period. For example, major surgeries or tattoos require a **6-month deferral**, and chronic conditions like cardiovascular diseases require medical clearance.\n\nWe advise consulting a hospital representative or visiting our partner donation camps for a professional health checkup before donating.",
                        "check_eligibility",
                        {"step": "result", "eligible": False, "reason": "Medical history deferral"}
                    )

        # 3. Blood Compatibility Matching
        if "compatible" in msg_lower or "donate to" in msg_lower or "receive from" in msg_lower or "who can" in msg_lower:
            # Check compatibility rules
            if bg_match:
                if "receive" in msg_lower or "get" in msg_lower:
                    donors = get_compatible_donor_groups(bg_match)
                    donors_str = ", ".join(donors)
                    return (
                        f"🩸 A person with blood group **{bg_match}** can receive blood from: **{donors_str}**.",
                        "blood_compatibility",
                        {"blood_group": bg_match, "compatible_donors": donors}
                    )
                else:
                    # Who can they donate to
                    recipients = BLOOD_COMPATIBILITY.get(bg_match, [])
                    recipients_str = ", ".join(recipients)
                    return (
                        f"🩸 A person with blood group **{bg_match}** can donate to: **{recipients_str}**.",
                        "blood_compatibility",
                        {"blood_group": bg_match, "compatible_recipients": recipients}
                    )
            else:
                return (
                    "I can help with blood compatibility! Tell me a specific blood group (e.g. 'Who can O- donate to?' or 'Can B+ receive from AB-?').",
                    "blood_compatibility",
                    {}
                )

        # 4. Search camps or donors
        if "camp" in msg_lower:
            # Find city from user message
            city = AIService._extract_city(user_message)
            if city:
                camps = db.query(DonationCamp).filter(
                    DonationCamp.city.ilike(f"%{city}%"),
                    DonationCamp.status == "upcoming"
                ).all()
                if camps:
                    camps_list = "\n".join([f"- **{c.name}** in {c.city} ({c.address}) on {c.date_time.strftime('%b %d, %Y')}" for c in camps])
                    return (
                        f"📍 I found these upcoming blood donation camps in **{city.capitalize()}**:\n\n{camps_list}\n\nWould you like me to guide you on how to register?",
                        "find_camps",
                        {"city": city, "camp_ids": [c.id for c in camps]}
                    )
                else:
                    return (
                        f"I couldn't find any upcoming donation camps registered in **{city.capitalize()}** right now. You can check the camps page for updates or create one if you are a Hospital/NGO user!",
                        "find_camps",
                        {"city": city, "camp_ids": []}
                    )
            else:
                # Get all upcoming camps
                camps = db.query(DonationCamp).filter(DonationCamp.status == "upcoming").limit(3).all()
                if camps:
                    camps_list = "\n".join([f"- **{c.name}** in {c.city} on {c.date_time.strftime('%b %d, %Y')}" for c in camps])
                    return (
                        f"📍 Here are some upcoming blood donation camps:\n\n{camps_list}\n\nTell me your city (e.g., 'Find camps in Mumbai') to locate camps near you!",
                        "find_camps",
                        {}
                    )
                else:
                    return (
                        "No upcoming camps are registered at the moment. Please check back later!",
                        "find_camps",
                        {}
                    )

        # 5. Urgent Donor Request
        if bg_match or is_emergency or "need blood" in msg_lower or "request blood" in msg_lower:
            city = AIService._extract_city(user_message)
            if bg_match and city:
                # Find matching donors in database (we can mock search by geocoding city or searching city names)
                # Since we don't have exact lat/lon, we can query donors residing in that city
                donors = db.query(DonorProfile).join(User).filter(
                    DonorProfile.blood_group == bg_match,
                    DonorProfile.city.ilike(f"%{city}%"),
                    DonorProfile.availability == True
                ).limit(5).all()
                
                if donors:
                    donors_list = "\n".join([f"- **{d.user.full_name}** ({d.blood_group}) - Contact: {d.contact_info}" for d in donors])
                    return (
                        f"🚨 **Urgent Matching Donors Found in {city.capitalize()}!**\n\nHere are available **{bg_match}** donors in {city.capitalize()}:\n\n{donors_list}\n\nPlease contact them immediately or open an Emergency Request on the platform to notify them automatically.",
                        "find_donors",
                        {"blood_group": bg_match, "city": city, "donor_ids": [d.id for d in donors]}
                    )
                else:
                    # No exact city match, look for compatible groups in the city
                    compat_groups = get_compatible_donor_groups(bg_match)
                    donors = db.query(DonorProfile).join(User).filter(
                        DonorProfile.blood_group.in_(compat_groups),
                        DonorProfile.city.ilike(f"%{city}%"),
                        DonorProfile.availability == True
                    ).limit(5).all()
                    
                    if donors:
                        donors_list = "\n".join([f"- **{d.user.full_name}** ({d.blood_group}) - Contact: {d.contact_info}" for d in donors])
                        return (
                            f"🚨 **Compatible matches found for {bg_match} recipient in {city.capitalize()}!**\n\nWhile there is no exact {bg_match} donor, here are compatible donors:\n\n{donors_list}\n\nYou can also launch an official request on our platform.",
                            "find_donors",
                            {"blood_group": bg_match, "city": city, "donor_ids": [d.id for d in donors]}
                        )
                    else:
                        return (
                            f"🚨 **Emergency Match Request**\n\nI couldn't find any registered available donors with {bg_match} compatible blood in **{city.capitalize()}**.\n\nPlease use the **Request Blood** page to lodge a priority emergency alert, which broadcasts notification alerts to nearby cities.",
                            "find_donors",
                            {"blood_group": bg_match, "city": city, "donor_ids": []}
                        )
            elif bg_match:
                return (
                    f"I see you need **{bg_match}** blood. Could you specify your **city**? (e.g. 'I need {bg_match} in Bangalore'). This helps me search the local donor registry.",
                    "find_donors",
                    {"blood_group": bg_match}
                )
            else:
                return (
                    "🚨 **Need Blood?** If you or a loved one are in an emergency, please specify the **blood group** and **city** (e.g., 'I urgently need O+ in Delhi').\n\nYou can also create a formal request on our **Request Blood** page to alert all matching local donors.",
                    "request_blood",
                    {}
                )

        # 6. Medical FAQs
        if "safety" in msg_lower or "safe" in msg_lower:
            return FAQ_RESPONSES["safety"], "ask_faqs", {"topic": "safety"}
        if "process" in msg_lower or "how to donate" in msg_lower or "what happens" in msg_lower:
            return FAQ_RESPONSES["process"], "ask_faqs", {"topic": "process"}
        if "recovery" in msg_lower or "after donating" in msg_lower or "regenerate" in msg_lower:
            return FAQ_RESPONSES["recovery"], "ask_faqs", {"topic": "recovery"}
        if "benefit" in msg_lower or "why donate" in msg_lower or "advantages" in msg_lower:
            return FAQ_RESPONSES["benefits"], "ask_faqs", {"topic": "benefits"}
        if "how often" in msg_lower or "frequency" in msg_lower or "how many times" in msg_lower or "time between" in msg_lower:
            return FAQ_RESPONSES["frequency"], "ask_faqs", {"topic": "frequency"}

        # 7. AI Appointment Slot Booking Assistant
        if "slot" in msg_lower or "book" in msg_lower or "weekend" in msg_lower or "appointment" in msg_lower:
            # Query first available slot
            avail_slot = db.query(DonationSlot).filter(
                DonationSlot.status == "active",
                DonationSlot.booked_count < DonationSlot.capacity
            ).first()
            if avail_slot:
                camp = db.query(DonationCamp).filter(DonationCamp.id == avail_slot.camp_id).first()
                return (
                    f"📅 **AI Booking Assistant Suggestion**:\n\n"
                    f"I found an available donation slot at **{camp.name}**:\n"
                    f"• **Date**: {avail_slot.date}\n"
                    f"• **Time**: {avail_slot.start_time} - {avail_slot.end_time}\n"
                    f"• **Available Seats**: {avail_slot.capacity - avail_slot.booked_count} left\n\n"
                    f"Would you like to book this slot? Go to the **Camps** page or click book inside your Donor Portal!",
                    "appointment_assistant",
                    {"slot_id": avail_slot.id, "camp_id": camp.id}
                )
            else:
                return (
                    "📅 No active open donation slots are registered currently. Let me know if you would like me to list regional camps instead!",
                    "appointment_assistant",
                    {}
                )

        # 8. AI Emergency Routing
        if "route" in msg_lower or "routing" in msg_lower or "where is" in msg_lower or "inventory" in msg_lower or "stock" in msg_lower:
            if bg_match:
                # Find hospital with the blood group available
                inv_record = db.query(BloodInventory).filter(
                    BloodInventory.blood_group == bg_match,
                    BloodInventory.units_available > 0
                ).order_by(BloodInventory.units_available.desc()).first()
                
                if inv_record:
                    hosp_user = db.query(User).filter(User.id == inv_record.hospital_id).first()
                    return (
                        f"🚨 **AI Emergency Routing Guide**:\n\n"
                        f"Compatible units of **{bg_match}** are available at:\n"
                        f"• **Hospital**: {hosp_user.full_name}\n"
                        f"• **Available Units**: {inv_record.units_available} units\n"
                        f"• **Address**: {hosp_user.phone or 'Contact Hospital directly via dashboard'}\n\n"
                        f"Please head there immediately or coordinate an Emergency request transfer via the portal.",
                        "emergency_routing",
                        {"hospital_id": hosp_user.id, "blood_group": bg_match}
                    )
                else:
                    return (
                        f"🚨 I checked all registered inventory, but no hospitals currently report available units of **{bg_match}**.\n\n"
                        f"Please coordinate with an emergency request on the dashboard to notify nearby eligible donors directly.",
                        "emergency_routing",
                        {}
                    )
            else:
                return (
                    "🚨 Please specify the blood group you need routing information for (e.g. 'Route AB- emergency' or 'Who has O+ stock?').",
                    "emergency_routing",
                    {}
                )

        # 9. AI Slot Optimization (for Hospital / NGO / Admin review)
        if "optimize" in msg_lower or "prediction" in msg_lower or "analytics" in msg_lower:
            return (
                "📊 **AI Slot Capacity Optimization Recommendations**:\n\n"
                "• **Saturday Morning Slots**: High donor concentration predicted. Recommending +5 seats capacity increase.\n"
                "• **Wednesday/Weekday Slots**: Low turnouts predicted. Recommend merging morning slots to optimize clinical staff placement.\n"
                "• **Emergency Shortages**: O- and O+ groups are running low globally. Recommend sending targeted push reminder alerts.",
                "slot_optimization",
                {}
            )

        # 10. AI History Summary
        if "summary" in msg_lower or "history" in msg_lower or "streak" in msg_lower or "my donations" in msg_lower:
            if user_id:
                profile = db.query(DonorProfile).filter(DonorProfile.user_id == user_id).first()
                if profile:
                    return (
                        f"❤️ **AI Donor Profile Summary**:\n\n"
                        f"• **Blood Group**: {profile.blood_group}\n"
                        f"• **Total Contributions**: {profile.total_donations} unit(s) donated\n"
                        f"• **Current Streak**: {profile.donation_streak} streak count\n"
                        f"• **Last Donation Date**: {profile.last_donation_date or 'No donations recorded yet'}\n\n"
                        f"Keep up the life-saving work! You can download your official certificates from your Donor Portal dashboard.",
                        "donor_summary",
                        {"total_donations": profile.total_donations, "streak": profile.donation_streak}
                    )
            return (
                "❤️ You need to be logged in as an active donor with a complete profile for me to pull up your donation history summary. Let me know if you want to perform an eligibility pre-check instead!",
                "donor_summary",
                {}
            )

        # 11. General Friendly Welcome
        return (
            "👋 Hello! I am the AI Healthcare Assistant for the Blood Donation Platform. How can I help you today?\n\n"
            "You can ask me to:\n"
            "- Check your donation eligibility: *'Can I donate blood?'*\n"
            "- Check compatibility: *'Who can receive O- blood?'*\n"
            "- Find nearby donors during emergencies: *'I need B+ blood in Mumbai'* \n"
            "- Route emergency blood: *'Who has O+ stock?'*\n"
            "- Get donation summary: *'Show my donation history'* \n"
            "- Answer FAQs: *'Is blood donation safe?'* or *'What is the recovery process?'*",
            "faqs",
            {}
        )

    @staticmethod
    def _extract_city(message: str) -> str | None:
        """Helper to extract city name after common prepositions."""
        msg = message.lower()
        patterns = [
            r'\bin\s+([a-zA-Z]+)\b',
            r'\bnear\s+([a-zA-Z]+)\b',
            r'\bat\s+([a-zA-Z]+)\b',
            r'\bfor\s+([a-zA-Z]+)\b',
        ]
        for pattern in patterns:
            match = re.search(pattern, msg)
            if match:
                city = match.group(1)
                # Ignore common words that might match
                if city not in ["emergency", "critical", "need", "urgent", "delhi", "mumbai", "bangalore"]:
                    return city
                return city
        # If no preposition match, look for popular cities in text
        popular_cities = ["bangalore", "mumbai", "delhi", "pune", "chennai", "kolkata", "hyderabad", "ahmedabad", "jaipur"]
        for pc in popular_cities:
            if pc in msg:
                return pc
        return None
