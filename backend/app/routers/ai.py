from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models.user import User
from app.models.ai import AIConversation
from app.schemas.ai import AIConversationOut, AIConversationCreate, AIMessageCreate
from app.routers.deps import get_current_user
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

@router.post("/conversations", response_model=AIConversationOut, status_code=status.HTTP_201_CREATED)
def create_conversation(
    conv_in: AIConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db_conv = AIConversation(user_id=current_user.id, title=conv_in.title)
    db.add(db_conv)
    db.commit()
    db.refresh(db_conv)
    return db_conv

@router.get("/conversations", response_model=list[AIConversationOut])
def get_conversations(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return (
        db.query(AIConversation)
        .filter(AIConversation.user_id == current_user.id)
        .order_by(AIConversation.updated_at.desc())
        .all()
    )

@router.get("/conversations/{conversation_id}", response_model=AIConversationOut)
def get_conversation_details(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = db.query(AIConversation).filter(AIConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found."
        )
    if conv.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this conversation.",
        )
    return conv

@router.post("/conversations/{conversation_id}/messages")
def send_message(
    conversation_id: int,
    msg_in: AIMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    conv = db.query(AIConversation).filter(AIConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found."
        )
    if conv.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to send messages in this conversation.",
        )

    # Process user message and fetch assistant response
    result = AIService.process_message(db, conversation_id, msg_in.content)

    # Update updated_at timestamp on the conversation
    conv.updated_at = datetime.utcnow()
    db.commit()

    return result
