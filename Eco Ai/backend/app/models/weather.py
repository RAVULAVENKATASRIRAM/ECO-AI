from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from app.core.database import Base


class WeatherReading(Base):
    __tablename__ = "weather_readings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    temperature = Column(Float, nullable=False)  # in Celsius
    humidity = Column(Float, nullable=False)     # in %
    pressure = Column(Float, nullable=True, default=1013.0)  # in hPa
    wind_speed = Column(Float, nullable=False)   # in km/h
    weather_condition = Column(String(50), default="Clear", nullable=False)
    location = Column(String(100), default="Chennai", nullable=False, index=True)
    source = Column(String(100), default="Chennai Met Synthetic Station", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
