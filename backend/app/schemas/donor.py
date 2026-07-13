from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from app.schemas.user import UserOut

class DonorProfileBase(BaseModel):
    blood_group: str
    weight: float
    age: int
    medical_info: Optional[str] = None
    last_donation_date: Optional[date] = None
    availability: bool = True
    city: str
    latitude: float
    longitude: float
    contact_info: str
    total_donations: int = 0
    donation_streak: int = 0
    certificates: Optional[str] = None
    document_url: Optional[str] = None

class DonorProfileCreate(DonorProfileBase):
    pass

class DonorProfileUpdate(BaseModel):
    blood_group: Optional[str] = None
    weight: Optional[float] = None
    age: Optional[int] = None
    medical_info: Optional[str] = None
    last_donation_date: Optional[date] = None
    availability: Optional[bool] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contact_info: Optional[str] = None
    is_verified: Optional[bool] = None
    total_donations: Optional[int] = None
    donation_streak: Optional[int] = None
    certificates: Optional[str] = None
    document_url: Optional[str] = None

class DonorProfileOut(DonorProfileBase):
    id: int
    user_id: int
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True
