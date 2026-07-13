from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.schemas.user import UserOut

class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    entity_type: str
    entity_id: Optional[int] = None
    metadata_json: Optional[str] = None
    created_at: datetime
    user: Optional[UserOut] = None

    class Config:
        from_attributes = True
