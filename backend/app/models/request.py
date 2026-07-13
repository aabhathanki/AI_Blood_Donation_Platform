from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class BloodRequest(Base):
    __tablename__ = "blood_requests"

    id = Column(Integer, primary_key=True, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    blood_group = Column(String, nullable=False)
    units_required = Column(Integer, default=1, nullable=False)
    hospital_name = Column(String, nullable=False)
    city = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    urgency = Column(String, default="medium", nullable=False)  # low, medium, high, emergency
    required_date = Column(Date, nullable=False)
    status = Column(String, default="pending", nullable=False)  # pending, fulfilled, cancelled
    
    # Workflow tracking field
    workflow_status = Column(String, default="created", nullable=False)  # created, verified, searching, matched, fulfilled, closed

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    recipient = relationship("User", back_populates="blood_requests")
