from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.recommendation import Recommendation
from app.models.appliance import Appliance, ApplianceReading
from app.api.endpoints.appliances_api import toggle_appliance_power, _get_current_tariff

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("/")
def get_recommendations(db: Session = Depends(get_db)):
    recs = db.query(Recommendation).order_by(Recommendation.estimated_kwh_saving.desc()).all()
    rate, _ = _get_current_tariff()

    result = []
    for r in recs:
        app_info = None
        if r.appliance_id:
            app = db.query(Appliance).filter(Appliance.id == r.appliance_id).first()
            if app:
                pstate = getattr(app, "power_state", "on") or "on"
                latest_reading = (
                    db.query(ApplianceReading)
                    .filter(ApplianceReading.appliance_id == app.id)
                    .order_by(ApplianceReading.timestamp.desc())
                    .first()
                )
                curr_w = 0.0 if pstate == "off" else (latest_reading.power if latest_reading else app.rated_power * 0.8)
                hourly_cost = round((curr_w / 1000.0) * rate, 2)

                app_info = {
                    "id": app.id,
                    "name": app.name,
                    "type": app.type,
                    "power_state": pstate,
                    "current_power_w": round(curr_w, 1),
                    "hourly_cost_inr": hourly_cost,
                    "rated_power_w": app.rated_power,
                }

        result.append({
            "id": r.id,
            "title": r.title,
            "category": r.category,
            "impact_level": r.impact_level,
            "estimated_kwh_saving": r.estimated_kwh_saving,
            "estimated_cost_saving": r.estimated_cost_saving,
            "carbon_reduction_kg": r.carbon_reduction_kg,
            "description": r.description,
            "action_text": r.action_text,
            "status": r.status,
            "appliance_id": r.appliance_id,
            "appliance": app_info,
            "created_at": r.created_at.isoformat(),
            "applied_at": r.applied_at.isoformat() if r.applied_at else None,
        })
    return result


@router.post("/{rec_id}/action")
def take_action(rec_id: int, action: str = "apply", db: Session = Depends(get_db)):
    """action: 'apply' or 'dismiss'"""
    rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    if action == "apply":
        rec.status = "applied"
        rec.applied_at = datetime.now(timezone.utc).replace(tzinfo=None)
    elif action == "dismiss":
        rec.status = "dismissed"
    else:
        raise HTTPException(status_code=400, detail="action must be 'apply' or 'dismiss'")
    db.commit()
    return {"id": rec_id, "status": rec.status}


@router.post("/{rec_id}/toggle-appliance")
def toggle_recommendation_appliance(rec_id: int, db: Session = Depends(get_db)):
    """
    Toggles the appliance directly associated with a prescriptive recommendation.
    """
    rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    if not rec.appliance_id:
        raise HTTPException(status_code=400, detail="This recommendation is not linked to a specific physical appliance")

    res = toggle_appliance_power(rec.appliance_id, db)
    # If turned off, automatically mark the recommendation as applied
    if res.get("power_state") == "off":
        rec.status = "applied"
        rec.applied_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()

    return {
        "recommendation_id": rec.id,
        "recommendation_status": rec.status,
        "appliance": res,
    }
