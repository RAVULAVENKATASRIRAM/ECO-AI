from typing import Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, func
from app.core.database import get_db
from app.models.appliance import Appliance, ApplianceReading

router = APIRouter(prefix="/appliances", tags=["Appliances"])


def _health_score(appliance: Appliance, db: Session) -> float:
    """Compute a synthetic health score 0–100 based on recent vs rated power ratio."""
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=24)
    recent = db.query(func.avg(ApplianceReading.power)).filter(
        ApplianceReading.appliance_id == appliance.id,
        ApplianceReading.timestamp >= cutoff,
        ApplianceReading.status == "on"
    ).scalar()
    if recent is None or appliance.rated_power == 0:
        return 92.0
    ratio = recent / appliance.rated_power
    # Healthy ratio is 0.75–0.95; degrade score outside that band
    if 0.75 <= ratio <= 0.95:
        return round(min(100, 96 - (ratio - 0.85) * 40), 1)
    elif ratio > 0.95:
        return round(max(50, 96 - (ratio - 0.95) * 200), 1)
    else:
        return round(max(60, 96 - (0.75 - ratio) * 150), 1)


def _efficiency_pct(appliance: Appliance, db: Session) -> float:
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=24)
    recent = db.query(func.avg(ApplianceReading.power)).filter(
        ApplianceReading.appliance_id == appliance.id,
        ApplianceReading.timestamp >= cutoff,
        ApplianceReading.status == "on"
    ).scalar()
    if recent is None or appliance.rated_power == 0:
        return 91.0
    return round(min(100, (appliance.rated_power / max(recent, 1)) * 91), 1)


@router.get("/")
def list_appliances(db: Session = Depends(get_db)):
    """List all appliances with health scores, efficiency, and recent consumption."""
    appliances = db.query(Appliance).all()
    result = []
    for a in appliances:
        # Last 24h energy sum
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=24)
        daily_kwh = db.query(func.sum(ApplianceReading.energy)).filter(
            ApplianceReading.appliance_id == a.id,
            ApplianceReading.timestamp >= cutoff
        ).scalar() or 0.0

        # Latest reading
        latest = db.query(ApplianceReading).filter(
            ApplianceReading.appliance_id == a.id
        ).order_by(desc(ApplianceReading.timestamp)).first()

        result.append({
            "id": a.id,
            "name": a.name,
            "type": a.type,
            "rated_power": a.rated_power,
            "location": a.location,
            "status": a.status,
            "source": a.source,
            "health_score": _health_score(a, db),
            "efficiency_pct": _efficiency_pct(a, db),
            "daily_energy_kwh": round(daily_kwh, 2),
            "current_power_w": round(latest.power, 1) if latest else None,
            "last_seen": latest.timestamp.isoformat() + "Z" if latest else None,
        })
    return result


@router.get("/summary")
def appliance_summary(db: Session = Depends(get_db)):
    """Aggregated energy distribution and standby detection summary."""
    appliances = db.query(Appliance).all()
    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=24)
    distribution = []
    standby_watts = 0.0
    total_kwh = 0.0

    for a in appliances:
        daily_kwh = db.query(func.sum(ApplianceReading.energy)).filter(
            ApplianceReading.appliance_id == a.id,
            ApplianceReading.timestamp >= cutoff
        ).scalar() or 0.0
        total_kwh += daily_kwh
        distribution.append({"name": a.name, "type": a.type, "daily_kwh": round(daily_kwh, 2)})

        # Standby: readings where status == 'standby'
        standby = db.query(func.avg(ApplianceReading.power)).filter(
            ApplianceReading.appliance_id == a.id,
            ApplianceReading.status == "standby",
            ApplianceReading.timestamp >= cutoff
        ).scalar() or 0.0
        standby_watts += standby

    # Calculate percentage share
    for item in distribution:
        item["pct"] = round((item["daily_kwh"] / total_kwh * 100) if total_kwh > 0 else 0, 1)

    return {
        "total_daily_kwh": round(total_kwh, 2),
        "standby_watts_detected": round(standby_watts, 1),
        "standby_kwh_per_month_estimate": round(standby_watts / 1000 * 24 * 30, 2),
        "distribution": distribution,
    }


@router.get("/{appliance_id}/history")
def appliance_history(appliance_id: int, hours: int = 24, db: Session = Depends(get_db)):
    """Hourly power trend for a specific appliance."""
    appliance = db.query(Appliance).filter(Appliance.id == appliance_id).first()
    if not appliance:
        raise HTTPException(status_code=404, detail="Appliance not found")

    cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=hours)
    readings = db.query(ApplianceReading).filter(
        ApplianceReading.appliance_id == appliance_id,
        ApplianceReading.timestamp >= cutoff
    ).order_by(asc(ApplianceReading.timestamp)).all()

    return {
        "appliance_id": appliance_id,
        "appliance_name": appliance.name,
        "hours": hours,
        "readings": [
            {
                "timestamp": r.timestamp.isoformat() + "Z",
                "power_w": round(r.power, 1),
                "energy_kwh": round(r.energy, 4),
                "status": r.status,
            }
            for r in readings
        ],
    }
