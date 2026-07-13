from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from app.database import Base, engine, SessionLocal
from app.routers import (
    auth_router,
    donors_router,
    requests_router,
    camps_router,
    ai_router,
    slots_router,
    appointments_router,
    inventory_router,
    notifications_router,
    analytics_router,
    admin_router,
)
from app.models.user import User
from app.models.donor import DonorProfile
from app.models.camp import DonationCamp
from app.models.request import BloodRequest
from app.utils.auth import get_password_hash

app = FastAPI(
    title="AI Blood Donation Platform API",
    description="Backend service for finding blood donors, managing requests, organizing camps, and AI consulting.",
    version="1.0.0"
)

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify front-end URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(donors_router, prefix="/api")
app.include_router(requests_router, prefix="/api")
app.include_router(camps_router, prefix="/api")
app.include_router(slots_router, prefix="/api")
app.include_router(appointments_router, prefix="/api")
app.include_router(inventory_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(ai_router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the AI Blood Donation Platform API. Visit /docs for Swagger UI documentation."
    }

# Automatic Database Seeder on Startup
@app.on_event("startup")
def startup_event():
    # 1. Create tables
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed default data if database is empty
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            print("Seeding initial database data...")
            # Create Default Users
            pwd = get_password_hash("password123")
            
            admin = User(email="admin@blood.ai", password_hash=pwd, full_name="System Admin", role="admin")
            hospital = User(email="hospital@blood.ai", password_hash=pwd, full_name="City General Hospital", role="hospital_ngo")
            recipient = User(email="recipient@blood.ai", password_hash=pwd, full_name="Aabha Sen", role="recipient")
            
            db.add_all([admin, hospital, recipient])
            db.commit()
            
            # Create Donors and their Profiles
            d1_user = User(email="rahul@blood.ai", password_hash=pwd, full_name="Rahul Sharma", role="donor")
            d2_user = User(email="priya@blood.ai", password_hash=pwd, full_name="Priya Patel", role="donor")
            d3_user = User(email="amit@blood.ai", password_hash=pwd, full_name="Amit Verma", role="donor")
            d4_user = User(email="sneha@blood.ai", password_hash=pwd, full_name="Sneha Reddy", role="donor")
            
            db.add_all([d1_user, d2_user, d3_user, d4_user])
            db.commit()
            
            # Seed Donor Profiles (Bangalore, India Centered for maps demo)
            dp1 = DonorProfile(
                user_id=d1_user.id,
                blood_group="O+",
                weight=72.5,
                age=28,
                medical_info="No conditions. Regular donor.",
                last_donation_date=date.today() - timedelta(days=120),
                availability=True,
                city="Bangalore",
                latitude=12.9716,
                longitude=77.5946,
                contact_info="+91 98765 43210",
                is_verified=True
            )
            dp2 = DonorProfile(
                user_id=d2_user.id,
                blood_group="A+",
                weight=58.0,
                age=24,
                medical_info="No major conditions.",
                last_donation_date=date.today() - timedelta(days=150),
                availability=True,
                city="Bangalore",
                latitude=12.9279,
                longitude=77.6271,
                contact_info="+91 91234 56789",
                is_verified=True
            )
            dp3 = DonorProfile(
                user_id=d3_user.id,
                blood_group="B+",
                weight=68.0,
                age=31,
                medical_info="Asthma controlled.",
                last_donation_date=date.today() - timedelta(days=45),  # Not eligible (too recent)
                availability=True,
                city="Bangalore",
                latitude=12.9801,
                longitude=77.6412,
                contact_info="+91 99887 76655",
                is_verified=False
            )
            dp4 = DonorProfile(
                user_id=d4_user.id,
                blood_group="O-",  # Universal donor
                weight=54.5,
                age=27,
                medical_info="None.",
                last_donation_date=None,  # Never donated before (boosted eligibility score)
                availability=True,
                city="Bangalore",
                latitude=12.9591,
                longitude=77.5714,
                contact_info="+91 94433 22110",
                is_verified=True
            )
            
            db.add_all([dp1, dp2, dp3, dp4])
            db.commit()
            
            # Create Donation Camps
            camp1 = DonationCamp(
                organized_by_id=hospital.id,
                name="Bengaluru Mega Summer Camp",
                description="Join City General Hospital for the annual blood contribution drive. Free health check-up, juice, and certificates for all donors.",
                city="Bangalore",
                address="Town Hall Compound, JC Road, Bengaluru",
                latitude=12.9631,
                longitude=77.5855,
                date_time=datetime.now() + timedelta(days=15),
                status="upcoming"
            )
            camp2 = DonationCamp(
                organized_by_id=hospital.id,
                name="Indiranagar Youth Blood Drive",
                description="Community blood camp aimed at mobilizing young donors in Indiranagar. Sponsored by Rotaract Bengaluru.",
                city="Bangalore",
                address="Indiranagar Club Grounds, 100 Feet Road",
                latitude=12.9719,
                longitude=77.6412,
                date_time=datetime.now() + timedelta(days=22),
                status="upcoming"
            )
            db.add_all([camp1, camp2])
            db.commit()
            
            # Create Blood Requests
            req1 = BloodRequest(
                recipient_id=recipient.id,
                blood_group="O+",
                units_required=2,
                hospital_name="Columbia Asia Hospital, Hebbal",
                city="Bangalore",
                latitude=13.0371,
                longitude=77.5986,
                urgency="emergency",
                required_date=date.today(),
                status="pending"
            )
            req2 = BloodRequest(
                recipient_id=recipient.id,
                blood_group="A+",
                units_required=1,
                hospital_name="St. John's Medical College Hospital",
                city="Bangalore",
                latitude=12.9333,
                longitude=77.6244,
                urgency="high",
                required_date=date.today() + timedelta(days=1),
                status="pending"
            )
            db.add_all([req1, req2])
            db.commit()
            
            print("Database successfully seeded with Bangalore mock data!")
    finally:
        db.close()
