from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class BloodInventoryBase(BaseModel):
    blood_group: str
    units_available: int = 0
    units_reserved: int = 0

class BloodInventoryCreate(BloodInventoryBase):
    pass

class BloodInventoryUpdate(BaseModel):
    units_available: Optional[int] = None
    units_reserved: Optional[int] = None

class BloodInventoryOut(BloodInventoryBase):
    id: int
    hospital_id: int
    last_updated: datetime

    class Config:
        from_attributes = True
