from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.donor import DonorProfile
from app.schemas.donor import DonorProfileCreate, DonorProfileOut
from app.routers.deps import get_current_user, check_role
from app.services.donor_recommendation import recommend_donors

router = APIRouter(prefix="/donors", tags=["Donors"])

@router.post("/profile", response_model=DonorProfileOut)
def upsert_donor_profile(
    profile_in: DonorProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_profile = (
        db.query(DonorProfile).filter(DonorProfile.user_id == current_user.id).first()
    )

    if db_profile:
        # Update existing profile
        for key, value in profile_in.model_dump().items():
            setattr(db_profile, key, value)
    else:
        # Create new profile
        db_profile = DonorProfile(user_id=current_user.id, **profile_in.model_dump())
        db.add(db_profile)

    # Automatically set user's role to 'donor' if they were registered as recipient
    if current_user.role == "recipient":
        current_user.role = "donor"

    db.commit()
    db.refresh(db_profile)
    return db_profile

@router.get("/profile", response_model=DonorProfileOut)
def get_donor_profile(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    db_profile = (
        db.query(DonorProfile).filter(DonorProfile.user_id == current_user.id).first()
    )
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donor profile not found. Please register as a donor first.",
        )
    return db_profile

@router.get("/recommendations")
def get_recommendations(
    blood_group: str,
    latitude: float,
    longitude: float,
    limit: int = 5,
    db: Session = Depends(get_db),
):
    """Get a ranked list of compatible donors close to a latitude/longitude."""
    recommendations = recommend_donors(
        db, blood_group, latitude, longitude, limit
    )
    
    results = []
    for rec in recommendations:
        d = rec["donor"]
        results.append({
            "id": d.id,
            "user_id": d.user_id,
            "blood_group": d.blood_group,
            "availability": d.availability,
            "city": d.city,
            "contact_info": d.contact_info,
            "is_verified": d.is_verified,
            "distance_km": rec["distance_km"],
            "score": rec["score"],
            "full_name": rec["user_name"],
            "email": rec["email"],
            "latitude": d.latitude,
            "longitude": d.longitude
        })
    return results

@router.post("/{donor_id}/verify", response_model=DonorProfileOut)
def verify_donor(
    donor_id: int,
    authorized_user: User = Depends(check_role(["admin", "hospital_ngo"])),
    db: Session = Depends(get_db),
):
    """Verify a donor profile (authorized for Admin and Hospitals/NGOs)."""
    db_profile = db.query(DonorProfile).filter(DonorProfile.id == donor_id).first()
    if not db_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Donor profile not found.",
        )
    db_profile.is_verified = True
    db.commit()
    db.refresh(db_profile)
    return db_profile
