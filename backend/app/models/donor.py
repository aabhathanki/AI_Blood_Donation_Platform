from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class DonorProfile(Base):
    __tablename__ = "donor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    blood_group = Column(String, nullable=False)
    weight = Column(Float, nullable=False)
    age = Column(Integer, nullable=False)
    medical_info = Column(String, nullable=True)
    last_donation_date = Column(Date, nullable=True)
    availability = Column(Boolean, default=True, nullable=False)
    city = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact_info = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # New portfolio fields
    total_donations = Column(Integer, default=0, nullable=False)
    donation_streak = Column(Integer, default=0, nullable=False)
    certificates = Column(Text, nullable=True)  # JSON serialized certificates list
    document_url = Column(String, nullable=True)  # ID upload link

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="donor_profile")
