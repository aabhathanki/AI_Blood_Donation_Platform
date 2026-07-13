from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.schemas.user import UserOut
from app.schemas.slot import DonationSlotOut

class DonationCampBase(BaseModel):
    name: str
    description: Optional[str] = None
    city: str
    address: str
    latitude: float
    longitude: float
    date_time: datetime
    volunteer_count: int = 0
    expected_donors: int = 50

class DonationCampCreate(DonationCampBase):
    pass

class DonationCampUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date_time: Optional[datetime] = None
    status: Optional[str] = None  # upcoming, active, completed, cancelled, pending_approval, published, archived
    volunteer_count: Optional[int] = None
    expected_donors: Optional[int] = None

class CampRegistrationOut(BaseModel):
    id: int
    camp_id: int
    donor_id: int
    registered_at: datetime
    donor: Optional[UserOut] = None

    class Config:
        from_attributes = True

class DonationCampOut(DonationCampBase):
    id: int
    organized_by_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    organizer: Optional[UserOut] = None
    registrations: List[CampRegistrationOut] = []
    slots: List[DonationSlotOut] = []

    class Config:
        from_attributes = True
