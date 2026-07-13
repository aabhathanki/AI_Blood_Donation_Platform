from sqlalchemy import Column, Integer, String, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.database import Base

class HospitalProfile(Base):
    __tablename__ = "hospital_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    license_number = Column(String, nullable=False)
    ngo_certificate_url = Column(String, nullable=True)
    address = Column(String, nullable=False)
    verification_status = Column(String, default="pending", nullable=False)  # pending, verified, rejected
    rating = Column(Float, default=5.0, nullable=False)

    user = relationship("User", back_populates="hospital_profile")
