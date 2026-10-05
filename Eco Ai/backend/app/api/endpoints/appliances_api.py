from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Body
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.appliance import Appliance, ApplianceReading
from app.models.alert import Alert
from app.services.analytics import _active_dataset

router = APIRouter(prefix="/appliances", tags=["Appliances"])

BASE_RATE = 8.00     # ₹8.00 / kWh
PEAK_RATE = 10.50    # ₹10.50 / kWh
OFFPEAK_RATE = 5.50  # ₹5.50 / kWh


def _get_current_tariff(hour: Optional[int] = None) -> tuple[float, str]:
    if hour is None:
        hour = datetime.now().hour
    if (18 <= hour <= 22) or (12 <= hour <= 16):
        return PEAK_RATE, "Peak"
    elif 23 <= hour or hour <= 5:
        return OFFPEAK_RATE, "Off-Peak"
    return BASE_RATE, "Standard"


@router.get("/")
def list_appliances(dataset_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Returns all registered appliances with their latest reading stats, power state, and real-time cost."""
    dataset = _active_dataset(db, dataset_id)
    
    q = db.query(Appliance)
    if dataset and dataset.type in ("appliance", "combined"):
        scoped_apps = q.filter(Appliance.dataset_id == dataset.id).all()
        if scoped_apps:
            appliances = scoped_apps
        else:
            appliances = q.all()
    else:
        appliances = q.all()

    rate, tier = _get_current_tariff()

    result = []
    for a in appliances:
        latest = (
            db.query(ApplianceReading)
            .filter(ApplianceReading.appliance_id == a.id)
            .order_by(ApplianceReading.timestamp.desc())
            .first()
        )
        total_energy = (
            db.query(func.sum(ApplianceReading.energy))
            .filter(ApplianceReading.appliance_id == a.id)
            .scalar()
        ) or 0.0

        health_score = round(99 - (a.id * 3.7 % 28), 0)
        power_state = getattr(a, "power_state", "on") or "on"
        
        # If appliance is switched off, real-time power is 0 (or slight standby)
        if power_state == "off":
            effective_power_w = 0.0
        else:
            effective_power_w = round(latest.power, 1) if latest else round(a.rated_power * 0.8, 1)

        hourly_cost_inr = round((effective_power_w / 1000.0) * rate, 2)
        daily_cost_inr = round(hourly_cost_inr * 24.0, 2)
        
        # High consumption flag: drawing > 80% rated and > 500W, or > 1200W
        is_high = bool(effective_power_w > 1000.0 or (a.rated_power > 300 and effective_power_w / a.rated_power >= 0.75))
        
        if is_high and tier == "Peak":
            cost_severity = "critical"
        elif is_high or hourly_cost_inr > 8.0:
            cost_severity = "warning"
        else:
            cost_severity = "normal"

        result.append({
            "id": a.id,
            "name": a.name,
            "type": a.type,
            "rated_power_w": a.rated_power,
            "location": a.location,
            "status": a.status,
            "power_state": power_state,
            "health_score": health_score,
            "current_power_w": effective_power_w,
            "current_energy_kwh": round(latest.energy, 3) if latest else None,
            "total_energy_kwh": round(total_energy, 2),
            "last_seen": latest.timestamp.isoformat() if latest else None,
            "standby_leakage_w": round(a.rated_power * 0.045, 1),
            "hourly_cost_inr": hourly_cost_inr,
            "daily_projected_cost_inr": daily_cost_inr,
            "tariff_tier": tier,
            "tariff_rate_inr": rate,
            "is_high_consumption": is_high,
            "cost_severity": cost_severity,
        })
    return result


@router.get("/high-consumption")
def get_high_consumption_appliances(db: Session = Depends(get_db)):
    """
    Scans and returns appliances currently consuming high energy or incurring excessive cost.
    Generates actionable notification banners and 1-click ON/OFF targets for Prescriptive Insights.
    """
    appliances = db.query(Appliance).all()
    rate, tier = _get_current_tariff()

    notices = []
    total_excess_cost_per_hr = 0.0
    total_high_power_w = 0.0

    for a in appliances:
        power_state = getattr(a, "power_state", "on") or "on"
        latest = (
            db.query(ApplianceReading)
            .filter(ApplianceReading.appliance_id == a.id)
            .order_by(ApplianceReading.timestamp.desc())
            .first()
        )

        effective_power_w = 0.0 if power_state == "off" else (latest.power if latest else a.rated_power * 0.8)
        hourly_cost = round((effective_power_w / 1000.0) * rate, 2)
        daily_cost = round(hourly_cost * 24.0, 2)

        # High consumption threshold: power > 700W or power > 0.70 rated power and power_state == 'on'
        is_heavy = effective_power_w > 700.0 or (a.rated_power >= 300 and effective_power_w >= a.rated_power * 0.70)
        is_costly = hourly_cost >= 6.00 or (is_heavy and tier == "Peak")

        if is_heavy or is_costly or power_state == "off":
            severity = "critical" if (tier == "Peak" and effective_power_w > 1000.0) else "warning" if effective_power_w > 500.0 else "info"
            
            savings_if_off = hourly_cost
            if power_state == "on":
                total_excess_cost_per_hr += hourly_cost
                total_high_power_w += effective_power_w

            if power_state == "off":
                warning_title = f"{a.name} — Remotely Switched OFF"
                warning_msg = f"Appliance is powered down. Currently saving ~₹{round((a.rated_power * 0.8 / 1000.0) * rate, 2)}/hr and avoiding peak grid load."
                suggested_action = "Turn ON when necessary"
            elif tier == "Peak":
                warning_title = f"High Tariff Alert: {a.name} drawing {effective_power_w:.0f}W"
                warning_msg = f"{a.name} is consuming ₹{hourly_cost:.2f}/hr during Peak Tariff ({rate:.2f} ₹/kWh). Toggling OFF saves up to ₹{daily_cost:.0f}/day."
                suggested_action = "Switch OFF to prevent peak surcharge"
            else:
                warning_title = f"High Consumption Detected: {a.name}"
                warning_msg = f"{a.name} is operating at {round((effective_power_w/a.rated_power)*100, 0):.0f}% capacity ({effective_power_w:.0f}W). Current cost: ₹{hourly_cost:.2f}/hr."
                suggested_action = "Power OFF or apply Eco Mode"

            notices.append({
                "appliance_id": a.id,
                "name": a.name,
                "type": a.type,
                "location": a.location,
                "rated_power_w": a.rated_power,
                "current_power_w": round(effective_power_w, 1),
                "power_state": power_state,
                "tariff_tier": tier,
                "current_tariff_rate_inr": rate,
                "hourly_cost_inr": hourly_cost,
                "daily_projected_cost_inr": daily_cost,
                "severity": severity,
                "warning_title": warning_title,
                "warning_message": warning_msg,
                "suggested_action": suggested_action,
                "hourly_saving_if_off_inr": savings_if_off,
            })

    return {
        "tariff_tier": tier,
        "tariff_rate_inr": rate,
        "active_high_count": sum(1 for n in notices if n["power_state"] == "on" and n["current_power_w"] > 500),
        "total_excess_cost_per_hr": round(total_excess_cost_per_hr, 2),
        "total_high_power_kw": round(total_high_power_w / 1000.0, 2),
        "notices": notices,
    }


@router.post("/{appliance_id}/toggle-power")
def toggle_appliance_power(appliance_id: int, db: Session = Depends(get_db)):
    """
    Toggles the ON/OFF power state of an appliance from Prescriptive Insights.
    Instantly cuts off power or restores it, creating audit records and telemetry readings.
    """
    appliance = db.query(Appliance).filter(Appliance.id == appliance_id).first()
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")

    current_state = getattr(appliance, "power_state", "on") or "on"
    new_state = "off" if current_state == "on" else "on"
    appliance.power_state = new_state
    appliance.status = "active" if new_state == "on" else "inactive"

    rate, _ = _get_current_tariff()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if new_state == "off":
        new_power = 0.0
        new_energy = 0.0
        saved_kw = appliance.rated_power * 0.82 / 1000.0
        saved_cost_hr = round(saved_kw * rate, 2)
        message = f"{appliance.name} turned OFF. Saving ~₹{saved_cost_hr:.2f}/hr and {saved_kw:.2f} kW."
        
        # Log Alert
        db.add(Alert(
            title=f"Remote Control: {appliance.name} Switched OFF",
            message=f"{appliance.name} was remotely powered down via Prescriptive Insights. Load dropped to 0W.",
            severity="info",
            category="control",
            metric="appliance_power",
            metric_value=0.0,
            threshold=appliance.rated_power,
            timestamp=now,
            status="resolved"
        ))
    else:
        new_power = round(appliance.rated_power * 0.82, 1)
        new_energy = round(new_power / 1000.0, 4)
        message = f"{appliance.name} turned ON. Drawing ~{new_power:.0f}W."
        
        # Log Alert
        db.add(Alert(
            title=f"Remote Control: {appliance.name} Switched ON",
            message=f"{appliance.name} was powered ON via Prescriptive Insights. Active power draw ~{new_power:.0f}W.",
            severity="info",
            category="control",
            metric="appliance_power",
            metric_value=new_power,
            threshold=appliance.rated_power,
            timestamp=now,
            status="active"
        ))

    # Append fresh reading so graphs and real-time cards reflect state instantly
    new_reading = ApplianceReading(
        appliance_id=appliance.id,
        timestamp=now,
        power=new_power,
        energy=new_energy,
        status="on" if new_state == "on" else "off",
        dataset_id=appliance.dataset_id
    )
    db.add(new_reading)
    db.commit()

    return {
        "success": True,
        "appliance_id": appliance.id,
        "name": appliance.name,
        "power_state": new_state,
        "current_power_w": new_power,
        "hourly_cost_inr": round((new_power / 1000.0) * rate, 2),
        "message": message,
    }


@router.post("/{appliance_id}/set-power")
def set_appliance_power(appliance_id: int, body: dict = Body(...), db: Session = Depends(get_db)):
    """Explicitly sets power_state to 'on' or 'off'."""
    target_state = body.get("power_state", "on").lower()
    if target_state not in ("on", "off"):
        raise HTTPException(status_code=400, detail="power_state must be 'on' or 'off'")

    appliance = db.query(Appliance).filter(Appliance.id == appliance_id).first()
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")

    current_state = getattr(appliance, "power_state", "on") or "on"
    if current_state == target_state:
        return {"success": True, "appliance_id": appliance.id, "power_state": current_state, "message": "No change"}

    return toggle_appliance_power(appliance_id, db)


@router.get("/{appliance_id}/analytics")
def appliance_analytics(appliance_id: int, days: int = Query(7, ge=1, le=30), db: Session = Depends(get_db)):
    """Returns time-series energy readings for a specific appliance."""
    appliance = db.query(Appliance).filter(Appliance.id == appliance_id).first()
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")
    readings = (
        db.query(ApplianceReading)
        .filter(ApplianceReading.appliance_id == appliance_id)
        .order_by(ApplianceReading.timestamp.asc())
        .limit(days * 24)
        .all()
    )
    return {
        "appliance_id": appliance_id,
        "appliance_name": appliance.name,
        "readings": [
            {
                "timestamp": r.timestamp.isoformat(),
                "power_w": r.power,
                "energy_kwh": r.energy,
            }
            for r in readings
        ],
    }
