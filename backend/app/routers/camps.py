from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.camp import DonationCamp, CampRegistration
from app.schemas.camp import DonationCampCreate, DonationCampOut, DonationCampUpdate, CampRegistrationOut
from app.routers.deps import get_current_user, check_role

router = APIRouter(prefix="/camps", tags=["Donation Camps"])

@router.post("/", response_model=DonationCampOut, status_code=status.HTTP_201_CREATED)
def organize_camp(
    camp_in: DonationCampCreate,
    current_user: User = Depends(check_role(["admin", "hospital_ngo"])),
    db: Session = Depends(get_db),
):
    initial_status = "upcoming" if current_user.role == "admin" else "pending_approval"
    db_camp = DonationCamp(
        organized_by_id=current_user.id,
        status=initial_status,
        **camp_in.model_dump()
    )
    db.add(db_camp)
    db.commit()
    db.refresh(db_camp)
    return db_camp

@router.get("/", response_model=list[DonationCampOut])
def get_upcoming_camps(db: Session = Depends(get_db)):
    """Retrieve all upcoming/active camps."""
    return (
        db.query(DonationCamp)
        .filter(DonationCamp.status.in_(["upcoming", "active"]))
        .all()
    )

@router.get("/all", response_model=list[DonationCampOut])
def get_all_camps(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Retrieve all camps (including past/cancelled ones). Admins/Hospitals see all; donors see active."""
    if current_user.role in ["admin", "hospital_ngo"]:
        return db.query(DonationCamp).all()
    return (
        db.query(DonationCamp)
        .filter(DonationCamp.status.in_(["upcoming", "active"]))
        .all()
    )

@router.post("/{camp_id}/register", response_model=CampRegistrationOut)
def register_for_camp(
    camp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify camp exists and is active/upcoming
    camp = db.query(DonationCamp).filter(DonationCamp.id == camp_id).first()
    if not camp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Donation camp not found."
        )

    if camp.status not in ["upcoming", "active", "approved"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot register for a completed or cancelled camp.",
        )

    # Check duplicate registration
    existing_reg = (
        db.query(CampRegistration)
        .filter(
            CampRegistration.camp_id == camp_id,
            CampRegistration.donor_id == current_user.id,
        )
        .first()
    )

    if existing_reg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already registered for this camp.",
        )

    db_reg = CampRegistration(camp_id=camp_id, donor_id=current_user.id)
    db.add(db_reg)
    db.commit()
    db.refresh(db_reg)
    return db_reg

@router.post("/{camp_id}/unregister")
def unregister_from_camp(
    camp_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reg = (
        db.query(CampRegistration)
        .filter(
            CampRegistration.camp_id == camp_id,
            CampRegistration.donor_id == current_user.id,
        )
        .first()
    )
    if not reg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Registration not found."
        )

    db.delete(reg)
    db.commit()
    return {"message": "Successfully unregistered from the donation camp."}

@router.get("/{camp_id}", response_model=DonationCampOut)
def get_camp_details(camp_id: int, db: Session = Depends(get_db)):
    camp = db.query(DonationCamp).filter(DonationCamp.id == camp_id).first()
    if not camp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Donation camp not found."
        )
    return camp

@router.patch("/{camp_id}", response_model=DonationCampOut)
def update_camp(
    camp_id: int,
    camp_update: DonationCampUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    camp = db.query(DonationCamp).filter(DonationCamp.id == camp_id).first()
    if not camp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Donation camp not found."
        )

    if camp.organized_by_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this camp.",
        )

    for key, value in camp_update.model_dump(exclude_unset=True).items():
        setattr(camp, key, value)

    db.commit()
    db.refresh(camp)
    return camp
