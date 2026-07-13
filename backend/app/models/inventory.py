from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class BloodInventory(Base):
    __tablename__ = "blood_inventories"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    blood_group = Column(String, nullable=False)
    units_available = Column(Integer, default=0, nullable=False)
    units_reserved = Column(Integer, default=0, nullable=False)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    hospital = relationship("User", back_populates="blood_inventory")

    __table_args__ = (UniqueConstraint("hospital_id", "blood_group", name="_hospital_blood_uc"),)
