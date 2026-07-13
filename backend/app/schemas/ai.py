from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class AIMessageBase(BaseModel):
    sender: str  # user, assistant
    content: str

class AIMessageCreate(BaseModel):
    content: str

class AIMessageOut(AIMessageBase):
    id: int
    conversation_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class AIConversationBase(BaseModel):
    title: str

class AIConversationCreate(AIConversationBase):
    pass

class AIConversationOut(AIConversationBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    messages: List[AIMessageOut] = []

    class Config:
        from_attributes = True
