from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.slot import DonationSlot, Appointment
from app.models.camp import DonationCamp
from app.models.donor import DonorProfile
from app.models.notification import Notification
from app.schemas.slot import AppointmentOut
from app.routers.deps import get_current_user, check_role
import uuid
import json
from datetime import date

router = APIRouter(prefix="/appointments", tags=["Donation Appointments"])

@router.post("/", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def book_appointment(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify slot exists and has capacity
    slot = db.query(DonationSlot).filter(DonationSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found.")
    
    if slot.booked_count >= slot.capacity or slot.status == "closed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slot is full or closed.")

    # Check duplicate appointment
    existing = db.query(Appointment).filter(
        Appointment.slot_id == slot_id,
        Appointment.donor_id == current_user.id,
        Appointment.status != "cancelled"
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You already have an appointment booked for this slot.")

    # Create appointment
    qr_code_ref = str(uuid.uuid4())
    db_appointment = Appointment(
        slot_id=slot_id,
        donor_id=current_user.id,
        status="pending",
        qr_code=qr_code_ref
    )
    db.add(db_appointment)
    
    # Increment slot booked count
    slot.booked_count += 1
    db.commit()
    db.refresh(db_appointment)
    
    # Notify user
    camp = db.query(DonationCamp).filter(DonationCamp.id == slot.camp_id).first()
    notif = Notification(
        user_id=current_user.id,
        title="Appointment Booked",
        message=f"Your slot booking request for {camp.name} on {slot.date} at {slot.start_time} has been registered.",
        type="appointment"
    )
    db.add(notif)
    db.commit()
    
    return db_appointment

@router.get("/mine", response_model=list[AppointmentOut])
def get_my_appointments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Appointment).filter(Appointment.donor_id == current_user.id).all()

@router.get("/slot/{slot_id}", response_model=list[AppointmentOut])
def get_slot_appointments(
    slot_id: int,
    current_user: User = Depends(check_role(["admin", "hospital_ngo"])),
    db: Session = Depends(get_db)
):
    return db.query(Appointment).filter(Appointment.slot_id == slot_id).all()

@router.patch("/{id}/approve", response_model=AppointmentOut)
def approve_appointment(
    id: int,
    current_user: User = Depends(check_role(["admin", "hospital_ngo"])),
    db: Session = Depends(get_db)
):
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    
    appt.status = "approved"
    
    # Notify donor
    camp = db.query(DonationCamp).filter(DonationCamp.id == appt.slot.camp_id).first()
    notif = Notification(
        user_id=appt.donor_id,
        title="Appointment Approved",
        message=f"Your booking for {camp.name} on {appt.slot.date} has been approved. Show your QR Code at check-in.",
        type="appointment"
    )
    db.add(notif)
    db.commit()
    db.refresh(appt)
    return appt

@router.patch("/{id}/checkin", response_model=AppointmentOut)
def checkin_appointment(
    id: int,
    current_user: User = Depends(check_role(["admin", "hospital_ngo"])),
    db: Session = Depends(get_db)
):
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    
    appt.status = "checked_in"
    db.commit()
    db.refresh(appt)
    return appt

@router.patch("/{id}/complete", response_model=AppointmentOut)
def complete_appointment(
    id: int,
    current_user: User = Depends(check_role(["admin", "hospital_ngo"])),
    db: Session = Depends(get_db)
):
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    
    appt.status = "completed"
    
    # Get donor profile to increment donation statistics
    donor_prof = db.query(DonorProfile).filter(DonorProfile.user_id == appt.donor_id).first()
    if donor_prof:
        donor_prof.total_donations += 1
        donor_prof.last_donation_date = date.today()
        donor_prof.donation_streak += 1
        
        # Add a mock digital certificate to certificates list
        camp = db.query(DonationCamp).filter(DonationCamp.id == appt.slot.camp_id).first()
        new_cert = {
            "id": str(uuid.uuid4())[:8].upper(),
            "camp_name": camp.name,
            "date": str(appt.slot.date),
            "blood_group": donor_prof.blood_group,
            "certificate_url": f"/certificates/LF-{uuid.uuid4().hex[:10].upper()}.pdf"
        }
        certs_list = []
        if donor_prof.certificates:
            try:
                certs_list = json.loads(donor_prof.certificates)
            except Exception:
                certs_list = []
        certs_list.append(new_cert)
        donor_prof.certificates = json.dumps(certs_list)
        
    # Notify donor
    notif = Notification(
        user_id=appt.donor_id,
        title="Donation Completed! ❤️",
        message="Thank you for your blood contribution! Your digital donation certificate is now available.",
        type="camp"
    )
    db.add(notif)
    db.commit()
    db.refresh(appt)
    return appt

@router.patch("/{id}/cancel", response_model=AppointmentOut)
def cancel_appointment(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found.")
    
    # Check permissions: only donor, admin, or slot camp organizer
    camp = db.query(DonationCamp).filter(DonationCamp.id == appt.slot.camp_id).first()
    if appt.donor_id != current_user.id and current_user.role != "admin" and camp.organized_by_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to cancel this appointment.")
        
    if appt.status == "cancelled":
        return appt
        
    appt.status = "cancelled"
    
    # Decrement booked count
    appt.slot.booked_count = max(0, appt.slot.booked_count - 1)
    
    # Notify donor if hospital/admin cancelled it
    if current_user.id != appt.donor_id:
        notif = Notification(
            user_id=appt.donor_id,
            title="Appointment Cancelled",
            message=f"Your booking for {camp.name} on {appt.slot.date} has been cancelled by the organizer.",
            type="appointment"
        )
        db.add(notif)
        
    db.commit()
    db.refresh(appt)
    return appt
