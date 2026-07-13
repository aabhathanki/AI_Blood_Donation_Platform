from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.camp import DonationCamp
from app.models.slot import DonationSlot
from app.schemas.slot import DonationSlotCreate, DonationSlotOut, DonationSlotUpdate
from app.routers.deps import get_current_user, check_role

router = APIRouter(prefix="/slots", tags=["Donation Slots"])

@router.post("/", response_model=DonationSlotOut, status_code=status.HTTP_201_CREATED)
def create_slot(
    slot_in: DonationSlotCreate,
    camp_id: int,
    current_user: User = Depends(check_role(["admin", "hospital_ngo"])),
    db: Session = Depends(get_db),
):
    # Verify camp exists
    camp = db.query(DonationCamp).filter(DonationCamp.id == camp_id).first()
    if not camp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Camp not found.")
    
    # Check permissions (only owner or admin)
    if camp.organized_by_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to add slots to this camp.")

    db_slot = DonationSlot(camp_id=camp_id, **slot_in.model_dump())
    db.add(db_slot)
    db.commit()
    db.refresh(db_slot)
    return db_slot

@router.get("/{camp_id}", response_model=list[DonationSlotOut])
def get_camp_slots(camp_id: int, db: Session = Depends(get_db)):
    return db.query(DonationSlot).filter(DonationSlot.camp_id == camp_id).all()

@router.patch("/{slot_id}", response_model=DonationSlotOut)
def update_slot(
    slot_id: int,
    slot_update: DonationSlotUpdate,
    current_user: User = Depends(check_role(["admin", "hospital_ngo"])),
    db: Session = Depends(get_db),
):
    db_slot = db.query(DonationSlot).filter(DonationSlot.id == slot_id).first()
    if not db_slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found.")
    
    # Check permission
    camp = db.query(DonationCamp).filter(DonationCamp.id == db_slot.camp_id).first()
    if camp.organized_by_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit slots for this camp.")

    for key, value in slot_update.model_dump(exclude_unset=True).items():
        setattr(db_slot, key, value)
    
    db.commit()
    db.refresh(db_slot)
    return db_slot

@router.delete("/{slot_id}")
def delete_slot(
    slot_id: int,
    current_user: User = Depends(check_role(["admin", "hospital_ngo"])),
    db: Session = Depends(get_db),
):
    db_slot = db.query(DonationSlot).filter(DonationSlot.id == slot_id).first()
    if not db_slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found.")
    
    # Check permission
    camp = db.query(DonationCamp).filter(DonationCamp.id == db_slot.camp_id).first()
    if camp.organized_by_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete slots for this camp.")

    db.delete(db_slot)
    db.commit()
    return {"message": "Slot deleted successfully."}
