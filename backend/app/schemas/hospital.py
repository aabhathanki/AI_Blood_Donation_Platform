from pydantic import BaseModel
from typing import Optional
from app.schemas.user import UserOut

class HospitalProfileBase(BaseModel):
    license_number: str
    ngo_certificate_url: Optional[str] = None
    address: str

class HospitalProfileCreate(HospitalProfileBase):
    pass

class HospitalProfileUpdate(BaseModel):
    license_number: Optional[str] = None
    ngo_certificate_url: Optional[str] = None
    address: Optional[str] = None
    verification_status: Optional[str] = None # pending, verified, rejected
    rating: Optional[float] = None

class HospitalProfileOut(HospitalProfileBase):
    id: int
    user_id: int
    verification_status: str
    rating: float
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True
