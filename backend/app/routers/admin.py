from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.hospital import HospitalProfile
from app.models.audit import AuditLog
from app.models.donor import DonorProfile
from app.schemas.user import UserOut
from app.schemas.hospital import HospitalProfileOut
from app.schemas.audit import AuditLogOut
from app.routers.deps import check_role
import json

router = APIRouter(prefix="/admin", tags=["Admin Portal Controls"])

# Audit logging helper
def log_audit_action(db: Session, user_id: int, action: str, entity_type: str, entity_id: int = None, details: dict = None):
    meta = json.dumps(details) if details else None
    audit = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_json=meta
    )
    db.add(audit)
    db.commit()

@router.get("/users", response_model=list[UserOut])
def list_system_users(
    role: str = None,
    search: str = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(check_role(["admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if search:
        query = query.filter(
            (User.email.contains(search)) | (User.full_name.contains(search))
        )
    return query.offset(skip).limit(limit).all()

@router.patch("/users/{id}/suspend", response_model=UserOut)
def suspend_user_account(
    id: int,
    current_user: User = Depends(check_role(["admin"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        
    user.is_suspended = True
    user.is_active = False
    
    log_audit_action(db, current_user.id, "suspend_user", "user", user.id, {"email": user.email})
    db.commit()
    db.refresh(user)
    return user

@router.patch("/users/{id}/activate", response_model=UserOut)
def activate_user_account(
    id: int,
    current_user: User = Depends(check_role(["admin"])),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
        
    user.is_suspended = False
    user.is_active = True
    
    log_audit_action(db, current_user.id, "activate_user", "user", user.id, {"email": user.email})
    db.commit()
    db.refresh(user)
    return user

@router.get("/hospitals/pending", response_model=list[HospitalProfileOut])
def get_pending_hospitals(
    current_user: User = Depends(check_role(["admin"])),
    db: Session = Depends(get_db)
):
    return db.query(HospitalProfile).filter(HospitalProfile.verification_status == "pending").all()

@router.patch("/hospitals/{id}/verify", response_model=HospitalProfileOut)
def verify_hospital_profile(
    id: int,
    approve: bool,
    current_user: User = Depends(check_role(["admin"])),
    db: Session = Depends(get_db)
):
    hosp = db.query(HospitalProfile).filter(HospitalProfile.id == id).first()
    if not hosp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital profile not found.")
        
    status_str = "verified" if approve else "rejected"
    hosp.verification_status = status_str
    
    log_audit_action(db, current_user.id, f"verify_hospital_{status_str}", "hospital", hosp.id, {"user_id": hosp.user_id})
    db.commit()
    db.refresh(hosp)
    return hosp

@router.get("/audit-logs", response_model=list[AuditLogOut])
def get_system_audit_logs(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(check_role(["admin"])),
    db: Session = Depends(get_db)
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
