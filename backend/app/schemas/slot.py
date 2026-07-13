from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List
from app.schemas.user import UserOut

class DonationSlotBase(BaseModel):
    date: date
    start_time: str
    end_time: str
    capacity: int = 10

class DonationSlotCreate(DonationSlotBase):
    pass

class DonationSlotUpdate(BaseModel):
    date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[str] = None # active, closed

class DonationSlotOut(DonationSlotBase):
    id: int
    camp_id: int
    booked_count: int
    status: str

    class Config:
        from_attributes = True

class AppointmentBase(BaseModel):
    slot_id: int

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    status: Optional[str] = None # pending, approved, checked_in, completed, cancelled

class AppointmentOut(BaseModel):
    id: int
    slot_id: int
    donor_id: int
    status: str
    qr_code: str
    booked_at: datetime
    donor: Optional[UserOut] = None
    slot: Optional[DonationSlotOut] = None

    class Config:
        from_attributes = True
