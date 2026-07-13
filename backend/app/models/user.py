from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="recipient", nullable=False)  # donor, recipient, hospital_ngo, admin, organizer
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_suspended = Column(Boolean, default=False, nullable=False)
    profile_picture_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    donor_profile = relationship("DonorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    hospital_profile = relationship("HospitalProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    blood_requests = relationship("BloodRequest", back_populates="recipient", cascade="all, delete-orphan")
    organized_camps = relationship("DonationCamp", back_populates="organizer", cascade="all, delete-orphan")
    camp_registrations = relationship("CampRegistration", back_populates="donor", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="donor", cascade="all, delete-orphan")
    blood_inventory = relationship("BloodInventory", back_populates="hospital", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    ai_conversations = relationship("AIConversation", back_populates="user", cascade="all, delete-orphan")
