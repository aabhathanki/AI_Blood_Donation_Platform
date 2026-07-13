from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class DonationCamp(Base):
    __tablename__ = "donation_camps"

    id = Column(Integer, primary_key=True, index=True)
    organized_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    city = Column(String, nullable=False)
    address = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    date_time = Column(DateTime, nullable=False)
    status = Column(String, default="upcoming", nullable=False)  # created, pending_approval, approved, published, completed, archived, cancelled
    
    # New volunteer and expectation tracking fields
    volunteer_count = Column(Integer, default=0, nullable=False)
    expected_donors = Column(Integer, default=50, nullable=False)
    published_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    organizer = relationship("User", back_populates="organized_camps")
    registrations = relationship("CampRegistration", back_populates="camp", cascade="all, delete-orphan")
    slots = relationship("DonationSlot", back_populates="camp", cascade="all, delete-orphan")

class CampRegistration(Base):
    __tablename__ = "camp_registrations"

    id = Column(Integer, primary_key=True, index=True)
    camp_id = Column(Integer, ForeignKey("donation_camps.id", ondelete="CASCADE"), nullable=False)
    donor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    registered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    camp = relationship("DonationCamp", back_populates="registrations")
    donor = relationship("User", back_populates="camp_registrations")

    __table_args__ = (UniqueConstraint("camp_id", "donor_id", name="_camp_donor_uc"),)
