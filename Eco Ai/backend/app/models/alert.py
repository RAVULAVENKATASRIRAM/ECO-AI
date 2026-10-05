from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime
from app.core.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(150), nullable=False)
    message = Column(String(500), nullable=False)
    severity = Column(String(20), default="warning")     # critical, warning, info
    category = Column(String(50), nullable=False)        # anomaly, threshold, device, system
    metric = Column(String(50), nullable=True)           # e.g., current_load, voltage, temperature
    metric_value = Column(Float, nullable=True)
    threshold = Column(Float, nullable=True)
    status = Column(String(20), default="active")        # active, acknowledged, resolved
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    resolved_at = Column(DateTime, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)


class AlertConfig(Base):
    __tablename__ = "alert_configs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    metric = Column(String(50), nullable=False)
    warning_threshold = Column(Float, nullable=False)
    critical_threshold = Column(Float, nullable=False)
    enabled = Column(Boolean, default=True)
    unit = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
