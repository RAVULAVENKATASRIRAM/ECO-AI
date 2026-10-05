from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime
from app.core.database import Base


class IoTDevice(Base):
    __tablename__ = "iot_devices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    device_type = Column(String(50), nullable=False)   # ESP32, Modbus, Gateway, Smart Plug, Sensor
    model = Column(String(100), nullable=True)
    location = Column(String(100), nullable=True)
    mac_address = Column(String(20), nullable=True)
    ip_address = Column(String(20), nullable=True)
    firmware_version = Column(String(20), nullable=True)
    mqtt_topic = Column(String(150), nullable=True)
    status = Column(String(20), default="online")      # online, offline, maintenance, error
    rssi = Column(Float, nullable=True)                # WiFi signal strength (dBm)
    last_seen = Column(DateTime, nullable=True)
    message_rate_per_min = Column(Float, default=60.0)
    uptime_hours = Column(Float, default=0.0)
    registered_at = Column(DateTime, default=datetime.utcnow, nullable=False)
