from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.iot_device import IoTDevice

router = APIRouter(prefix="/iot", tags=["IoT Devices"])


class DeviceCreate(BaseModel):
    name: str
    device_type: str
    model: Optional[str] = None
    location: Optional[str] = None
    mac_address: Optional[str] = None
    ip_address: Optional[str] = None
    firmware_version: Optional[str] = None
    mqtt_topic: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str  # online, offline, maintenance, error


@router.get("/devices")
def list_devices(db: Session = Depends(get_db)):
    devices = db.query(IoTDevice).order_by(desc(IoTDevice.registered_at)).all()
    return [_serialize(d) for d in devices]


@router.get("/stats")
def iot_stats(db: Session = Depends(get_db)):
    devices = db.query(IoTDevice).all()
    online = sum(1 for d in devices if d.status == "online")
    offline = sum(1 for d in devices if d.status == "offline")
    maintenance = sum(1 for d in devices if d.status == "maintenance")
    error = sum(1 for d in devices if d.status == "error")
    rssi_values = [d.rssi for d in devices if d.rssi is not None]
    avg_rssi = round(sum(rssi_values) / len(rssi_values), 1) if rssi_values else None
    total_msg_rate = sum(d.message_rate_per_min for d in devices if d.status == "online")
    return {
        "total": len(devices),
        "online": online,
        "offline": offline,
        "maintenance": maintenance,
        "error": error,
        "avg_rssi_dbm": avg_rssi,
        "total_msg_rate_per_min": round(total_msg_rate, 1),
    }


@router.post("/devices")
def register_device(body: DeviceCreate, db: Session = Depends(get_db)):
    device = IoTDevice(**body.model_dump(), status="offline", last_seen=None)
    db.add(device)
    db.commit()
    db.refresh(device)
    return {"success": True, "device_id": device.id, "device": _serialize(device)}


@router.patch("/devices/{device_id}/status")
def update_device_status(device_id: int, body: StatusUpdate, db: Session = Depends(get_db)):
    device = db.query(IoTDevice).filter(IoTDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    valid = {"online", "offline", "maintenance", "error"}
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid}")
    device.status = body.status
    if body.status == "online":
        device.last_seen = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"success": True, "device_id": device_id, "status": body.status}


@router.delete("/devices/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(IoTDevice).filter(IoTDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(device)
    db.commit()
    return {"success": True, "device_id": device_id, "deleted": True}


def _serialize(d: IoTDevice) -> dict:
    return {
        "id": d.id,
        "name": d.name,
        "device_type": d.device_type,
        "model": d.model,
        "location": d.location,
        "mac_address": d.mac_address,
        "ip_address": d.ip_address,
        "firmware_version": d.firmware_version,
        "mqtt_topic": d.mqtt_topic,
        "status": d.status,
        "rssi": d.rssi,
        "last_seen": d.last_seen.isoformat() + "Z" if d.last_seen else None,
        "message_rate_per_min": d.message_rate_per_min,
        "uptime_hours": d.uptime_hours,
        "registered_at": d.registered_at.isoformat() + "Z",
    }
