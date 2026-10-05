from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from app.core.database import Base


class EnergyReading(Base):
    __tablename__ = "energy_readings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    consumption = Column(Float, nullable=False)  # in MW or kWh
    unit = Column(String(20), default="MW", nullable=False)
    location = Column(String(100), default="Chennai", nullable=False, index=True)
    source = Column(String(100), default="Chennai Grid Synthetic Feed", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
