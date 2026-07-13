from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class DonationSlot(Base):
    __tablename__ = "donation_slots"

    id = Column(Integer, primary_key=True, index=True)
    camp_id = Column(Integer, ForeignKey("donation_camps.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(String, nullable=False)  # e.g., "09:00 AM"
    end_time = Column(String, nullable=False)    # e.g., "11:00 AM"
    capacity = Column(Integer, default=10, nullable=False)
    booked_count = Column(Integer, default=0, nullable=False)
    status = Column(String, default="active", nullable=False)  # active, closed

    camp = relationship("DonationCamp", back_populates="slots")
    appointments = relationship("Appointment", back_populates="slot", cascade="all, delete-orphan")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    slot_id = Column(Integer, ForeignKey("donation_slots.id", ondelete="CASCADE"), nullable=False)
    donor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="pending", nullable=False)  # pending, approved, checked_in, completed, cancelled
    qr_code = Column(String, unique=True, index=True, nullable=False)
    booked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    slot = relationship("DonationSlot", back_populates="appointments")
    donor = relationship("User", back_populates="appointments")
