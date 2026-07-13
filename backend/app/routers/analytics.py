from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.donor import DonorProfile
from app.models.hospital import HospitalProfile
from app.models.request import BloodRequest
from app.models.camp import DonationCamp, CampRegistration
from app.models.slot import DonationSlot, Appointment
from app.models.inventory import BloodInventory
from app.routers.deps import get_current_user, check_role
from sqlalchemy import func
import json

router = APIRouter(prefix="/analytics", tags=["System Analytics"])

@router.get("/admin")
def get_admin_analytics(
    current_user: User = Depends(check_role(["admin"])),
    db: Session = Depends(get_db)
):
    total_donors = db.query(User).filter(User.role == "donor").count()
    active_donors = db.query(DonorProfile).filter(DonorProfile.availability == True).count()
    verified_donors = db.query(DonorProfile).filter(DonorProfile.is_verified == True).count()
    pending_verifications = db.query(DonorProfile).filter(DonorProfile.is_verified == False).count()
    
    total_hospitals = db.query(User).filter(User.role == "hospital_ngo").count()
    total_requests = db.query(BloodRequest).count()
    emergency_requests = db.query(BloodRequest).filter(BloodRequest.urgency == "emergency").count()
    total_camps = db.query(DonationCamp).count()
    total_appointments = db.query(Appointment).count()
    
    # Blood Units Collected
    units_collected_query = db.query(func.sum(DonorProfile.total_donations)).scalar()
    units_collected = int(units_collected_query or 0)
    lives_saved = units_collected * 3  # Industry standard estimation: 1 pint/unit of blood can save up to 3 lives

    # Let's also retrieve timeline data for charts (by group, by month)
    # 1. Requests by status
    req_by_status = db.query(
        BloodRequest.status, func.count(BloodRequest.id)
    ).group_by(BloodRequest.status).all()
    requests_stats = {s: count for s, count in req_by_status}

    # 2. Donors by blood group
    donors_by_bg = db.query(
        DonorProfile.blood_group, func.count(DonorProfile.id)
    ).group_by(DonorProfile.blood_group).all()
    bg_stats = {bg: count for bg, count in donors_by_bg}

    return {
        "summary": {
            "total_donors": total_donors,
            "active_donors": active_donors,
            "verified_donors": verified_donors,
            "pending_verifications": pending_verifications,
            "total_hospitals": total_hospitals,
            "total_requests": total_requests,
            "emergency_requests": emergency_requests,
            "total_camps": total_camps,
            "total_appointments": total_appointments,
            "units_collected": units_collected,
            "lives_saved": lives_saved
        },
        "charts": {
            "requests_by_status": requests_stats,
            "donors_by_blood_group": bg_stats
        }
    }

@router.get("/hospital")
def get_hospital_analytics(
    current_user: User = Depends(check_role(["admin", "hospital_ngo"])),
    db: Session = Depends(get_db)
):
    target_hospital_id = current_user.id
    
    # Inventory list
    inventory = db.query(BloodInventory).filter(BloodInventory.hospital_id == target_hospital_id).all()
    inventory_data = {inv.blood_group: inv.units_available for inv in inventory}
    
    # Camps organized by this hospital
    camps = db.query(DonationCamp).filter(DonationCamp.organized_by_id == target_hospital_id).all()
    camp_ids = [c.id for c in camps]
    total_camps = len(camps)
    
    # Camp registrations count
    camp_regs = 0
    if camp_ids:
        camp_regs = db.query(CampRegistration).filter(CampRegistration.camp_id.in_(camp_ids)).count()
        
    # Appointment counts by status for this hospital's camps
    appt_counts = {"pending": 0, "approved": 0, "checked_in": 0, "completed": 0, "cancelled": 0}
    if camp_ids:
        appts = db.query(
            Appointment.status, func.count(Appointment.id)
        ).join(DonationSlot).filter(DonationSlot.camp_id.in_(camp_ids)).group_by(Appointment.status).all()
        
        for status_name, count in appts:
            appt_counts[status_name] = count

    return {
        "inventory": inventory_data,
        "total_camps_organized": total_camps,
        "total_registrations": camp_regs,
        "appointment_stats": appt_counts
    }

@router.get("/donor/{user_id}")
def get_donor_personal_analytics(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Security check: User can view their own, or admin/hospitals can view
    if current_user.id != user_id and current_user.role not in ["admin", "hospital_ngo"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
        
    profile = db.query(DonorProfile).filter(DonorProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donor profile not found.")
        
    # Get donation appointments history
    appts = db.query(Appointment).filter(
        Appointment.donor_id == user_id,
        Appointment.status == "completed"
    ).all()
    
    history = []
    for a in appts:
        camp = db.query(DonationCamp).filter(DonationCamp.id == a.slot.camp_id).first()
        history.append({
            "date": str(a.slot.date),
            "camp_name": camp.name,
            "location": camp.city
        })
        
    certs_count = 0
    if profile.certificates:
        try:
            certs_count = len(json.loads(profile.certificates))
        except Exception:
            certs_count = 0

    return {
        "total_donations": profile.total_donations,
        "streak": profile.donation_streak,
        "certificates_count": certs_count,
        "history": history
    }
