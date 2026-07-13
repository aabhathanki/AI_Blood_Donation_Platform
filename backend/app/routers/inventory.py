from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.inventory import BloodInventory
from app.schemas.inventory import BloodInventoryOut, BloodInventoryUpdate
from app.routers.deps import get_current_user, check_role
from sqlalchemy import func

router = APIRouter(prefix="/inventory", tags=["Blood Inventory"])

@router.get("/", response_model=list[BloodInventoryOut])
def get_my_inventory(
    current_user: User = Depends(check_role(["admin", "hospital_ngo"])),
    db: Session = Depends(get_db)
):
    return db.query(BloodInventory).filter(BloodInventory.hospital_id == current_user.id).all()

@router.put("/{blood_group}", response_model=BloodInventoryOut)
def update_blood_stock(
    blood_group: str,
    stock_update: BloodInventoryUpdate,
    current_user: User = Depends(check_role(["admin", "hospital_ngo"])),
    db: Session = Depends(get_db)
):
    # Standardize blood group casing/spacing
    bg = blood_group.upper().strip()
    valid_groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
    if bg not in valid_groups:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid blood group: {blood_group}. Must be one of {valid_groups}")

    db_inv = db.query(BloodInventory).filter(
        BloodInventory.hospital_id == current_user.id,
        BloodInventory.blood_group == bg
    ).first()

    if not db_inv:
        db_inv = BloodInventory(
            hospital_id=current_user.id,
            blood_group=bg,
            units_available=stock_update.units_available,
            units_reserved=stock_update.units_reserved
        )
        db.add(db_inv)
    else:
        if stock_update.units_available is not None:
            db_inv.units_available = stock_update.units_available
        if stock_update.units_reserved is not None:
            db_inv.units_reserved = stock_update.units_reserved
            
    db.commit()
    db.refresh(db_inv)
    return db_inv

@router.get("/shortages", response_model=list[BloodInventoryOut])
def get_inventory_shortages(
    current_user: User = Depends(check_role(["admin", "hospital_ngo"])),
    db: Session = Depends(get_db)
):
    # Shortage threshold is defined as < 5 units
    return db.query(BloodInventory).filter(
        BloodInventory.hospital_id == current_user.id,
        BloodInventory.units_available < 5
    ).all()

@router.get("/public")
def get_public_aggregate_stock(db: Session = Depends(get_db)):
    """Publicly aggregate available blood units across all verified hospitals/blood banks."""
    aggregates = db.query(
        BloodInventory.blood_group,
        func.sum(BloodInventory.units_available).label("total_available")
    ).group_by(BloodInventory.blood_group).all()
    
    results = {group: 0 for group in ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
    for agg in aggregates:
        results[agg.blood_group] = int(agg.total_available or 0)
        
    return results
