from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from app.models.donor import DonorProfile
from app.models.user import User
from app.utils.geo import calculate_distance

# Blood compatibility dictionary
# Key: Donor Blood Group, Value: List of Recipient Blood Groups that can receive it
BLOOD_COMPATIBILITY = {
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],  # Universal Donor
    "O+": ["O+", "A+", "B+", "AB+"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A+", "AB+"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"],  # Can only donate to AB+
}

def is_blood_compatible(donor_bg: str, recipient_bg: str) -> bool:
    """Check if donor blood group is compatible with recipient blood group."""
    d_bg = donor_bg.strip().upper()
    r_bg = recipient_bg.strip().upper()
    return r_bg in BLOOD_COMPATIBILITY.get(d_bg, [])

def get_compatible_donor_groups(recipient_bg: str) -> list[str]:
    """Get all donor blood groups that can donate to the recipient."""
    r_bg = recipient_bg.strip().upper()
    compatible_groups = []
    for donor_bg, recipients in BLOOD_COMPATIBILITY.items():
        if r_bg in recipients:
            compatible_groups.append(donor_bg)
    return compatible_groups

def recommend_donors(
    db: Session,
    blood_group: str,
    latitude: float,
    longitude: float,
    limit: int = 5,
) -> list[dict]:
    """
    Find and rank the top compatible donors based on:
    1. Blood group compatibility
    2. Distance (using Haversine formula)
    3. Availability status
    4. Time elapsed since last donation (minimum 90 days required)
    5. Verification status
    """
    # 1. Get all compatible donor blood groups for the recipient
    compatible_donor_groups = get_compatible_donor_groups(blood_group)
    if not compatible_donor_groups:
        return []

    # 2. Fetch active and available donors with compatible blood groups
    # Minimum 90 days since last donation
    ninety_days_ago = date.today() - timedelta(days=90)
    
    query = db.query(DonorProfile).join(User).filter(
        DonorProfile.blood_group.in_(compatible_donor_groups),
        DonorProfile.availability == True,
        (DonorProfile.last_donation_date == None) | (DonorProfile.last_donation_date <= ninety_days_ago)
    )
    
    donors = query.all()
    ranked_donors = []

    for donor in donors:
        # Calculate distance
        distance = calculate_distance(
            latitude, longitude, donor.latitude, donor.longitude
        )
        
        # Calculate matching score (starts at 100)
        score = 100.0
        
        # 1. Distance penalty: subtract 2 points per km
        score -= distance * 1.5
        
        # 2. Verification status boost: +25 points
        if donor.is_verified:
            score += 25.0
            
        # 3. Last donation timing boost:
        # If they haven't donated recently (e.g. > 120 days), they are highly eligible
        if donor.last_donation_date:
            days_since = (date.today() - donor.last_donation_date).days
            if days_since > 120:
                score += 15.0
        else:
            # Never donated: +20 points boost (highly eligible)
            score += 20.0

        # Don't let score fall below 0
        score = max(0.0, score)

        ranked_donors.append({
            "donor": donor,
            "distance_km": round(distance, 2),
            "score": round(score, 1),
            "user_name": donor.user.full_name,
            "email": donor.user.email
        })

    # Sort by score (descending) and then distance (ascending)
    ranked_donors.sort(key=lambda x: (-x["score"], x["distance_km"]))
    
    return ranked_donors[:limit]
