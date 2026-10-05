from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Appliance(Base):
    __tablename__ = "appliances"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)  # AC, Fan, Lighting, Refrigerator, Other
    rated_power = Column(Float, nullable=False)  # in Watts
    location = Column(String(100), default="Chennai Campus", nullable=False)
    status = Column(String(20), default="active", nullable=False)
    power_state = Column(String(20), default="on", nullable=False)  # 'on' or 'off'
    source = Column(String(100), default="Synthetic Smart Submeter", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    readings = relationship("ApplianceReading", back_populates="appliance", cascade="all, delete-orphan")


class ApplianceReading(Base):
    __tablename__ = "appliance_readings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True, index=True)
    appliance_id = Column(Integer, ForeignKey("appliances.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    power = Column(Float, nullable=False)   # in Watts
    energy = Column(Float, nullable=False)  # in kWh
    status = Column(String(20), default="on", nullable=False)

    appliance = relationship("Appliance", back_populates="readings")
