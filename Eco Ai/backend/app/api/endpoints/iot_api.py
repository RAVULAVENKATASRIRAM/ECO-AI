from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.iot_device import IoTDevice

router = APIRouter(prefix="/iot", tags=["IoT Devices"])


@router.get("/devices")
def list_devices(db: Session = Depends(get_db)):
    devices = db.query(IoTDevice).order_by(IoTDevice.status.asc(), IoTDevice.name.asc()).all()
    return [
        {
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
            "last_seen": d.last_seen.isoformat() if d.last_seen else None,
            "message_rate_per_min": d.message_rate_per_min,
            "uptime_hours": d.uptime_hours,
            "registered_at": d.registered_at.isoformat(),
        }
        for d in devices
    ]


@router.get("/summary")
def device_summary(db: Session = Depends(get_db)):
    total = db.query(IoTDevice).count()
    online = db.query(IoTDevice).filter(IoTDevice.status == "online").count()
    offline = db.query(IoTDevice).filter(IoTDevice.status == "offline").count()
    return {"total": total, "online": online, "offline": offline}


@router.post("/devices/{device_id}/action")
def device_action(device_id: int, action: str = "ping", db: Session = Depends(get_db)):
    """action: 'ping', 'reboot', 'ota_update'"""
    device = db.query(IoTDevice).filter(IoTDevice.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if action == "ping":
        device.last_seen = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        return {"action": "ping", "device_id": device_id, "result": "pong", "latency_ms": round(__import__("random").uniform(2.0, 45.0), 1)}
    elif action == "reboot":
        device.status = "online"
        device.uptime_hours = 0.0
        device.last_seen = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        return {"action": "reboot", "device_id": device_id, "result": "reboot_initiated"}
    elif action == "ota_update":
        device.firmware_version = "latest"
        db.commit()
        return {"action": "ota_update", "device_id": device_id, "result": "update_scheduled"}
    else:
        raise HTTPException(status_code=400, detail="action must be ping, reboot, or ota_update")
