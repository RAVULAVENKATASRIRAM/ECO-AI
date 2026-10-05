from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.recommendation import Recommendation

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("/")
def list_recommendations(db: Session = Depends(get_db)):
    recs = db.query(Recommendation).order_by(
        desc(Recommendation.estimated_cost_saving)
    ).all()
    return [
        {
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
            "created_at": r.created_at.isoformat() + "Z",
            "applied_at": r.applied_at.isoformat() + "Z" if r.applied_at else None,
        }
        for r in recs
    ]


@router.get("/summary")
def recommendations_summary(db: Session = Depends(get_db)):
    recs = db.query(Recommendation).filter(Recommendation.status == "active").all()
    total_kwh = sum(r.estimated_kwh_saving for r in recs)
    total_inr = sum(r.estimated_cost_saving for r in recs)
    total_co2 = sum(r.carbon_reduction_kg for r in recs)
    return {
        "active_count": len(recs),
        "total_potential_kwh_saving": round(total_kwh, 1),
        "total_potential_inr_saving": round(total_inr, 0),
        "total_carbon_reduction_kg": round(total_co2, 1),
    }


@router.post("/{rec_id}/apply")
def apply_recommendation(rec_id: int, db: Session = Depends(get_db)):
    rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.status = "applied"
    rec.applied_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"success": True, "recommendation_id": rec_id, "status": "applied"}


@router.post("/{rec_id}/dismiss")
def dismiss_recommendation(rec_id: int, db: Session = Depends(get_db)):
    rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    rec.status = "dismissed"
    db.commit()
    return {"success": True, "recommendation_id": rec_id, "status": "dismissed"}
