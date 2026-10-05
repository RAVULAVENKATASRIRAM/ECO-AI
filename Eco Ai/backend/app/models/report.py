from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, Boolean
from app.core.database import Base


class ReportRecord(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    report_type = Column(String(50), nullable=False)   # weekly, monthly, audit, custom
    date_from = Column(DateTime, nullable=False)
    date_to = Column(DateTime, nullable=False)
    total_consumption_mwh = Column(Float, nullable=True)
    peak_demand_mw = Column(Float, nullable=True)
    avg_demand_mw = Column(Float, nullable=True)
    carbon_footprint_tonnes = Column(Float, nullable=True)
    cost_inr = Column(Float, nullable=True)
    num_alerts = Column(Integer, default=0)
    num_anomalies = Column(Integer, default=0)
    summary = Column(String(1000), nullable=True)
    status = Column(String(20), default="ready")       # generating, ready, error
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
