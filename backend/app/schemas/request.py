from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from app.schemas.user import UserOut

class BloodRequestBase(BaseModel):
    blood_group: str
    units_required: int = 1
    hospital_name: str
    city: str
    latitude: float
    longitude: float
    urgency: str  # low, medium, high, emergency
    required_date: date

class BloodRequestCreate(BloodRequestBase):
    pass

class BloodRequestUpdate(BaseModel):
    blood_group: Optional[str] = None
    units_required: Optional[int] = None
    hospital_name: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    urgency: Optional[str] = None
    required_date: Optional[date] = None
    status: Optional[str] = None  # pending, fulfilled, cancelled
    workflow_status: Optional[str] = None  # created, verified, searching, matched, fulfilled, closed

class BloodRequestOut(BloodRequestBase):
    id: int
    recipient_id: int
    status: str
    workflow_status: str
    created_at: datetime
    updated_at: datetime
    recipient: Optional[UserOut] = None

    class Config:
        from_attributes = True
