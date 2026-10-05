from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime
from app.core.database import Base


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False)        # HVAC, Load Shifting, Standby, Efficiency, Maintenance
    impact_level = Column(String(20), default="medium")  # high, medium, low
    estimated_kwh_saving = Column(Float, nullable=False)
    estimated_cost_saving = Column(Float, nullable=False) # INR ₹
    carbon_reduction_kg = Column(Float, nullable=False)
    description = Column(String(500), nullable=False)
    action_text = Column(String(100), default="Apply Optimization")
    status = Column(String(20), default="active")        # active, applied, dismissed
    appliance_id = Column(Integer, nullable=True)        # Associated appliance for remote control
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    applied_at = Column(DateTime, nullable=True)
