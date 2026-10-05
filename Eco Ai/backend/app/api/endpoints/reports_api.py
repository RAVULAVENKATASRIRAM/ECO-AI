from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.models.report import ReportRecord
from app.services.reports_engine import generate_report

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/")
def list_reports(db: Session = Depends(get_db)):
    reports = db.query(ReportRecord).order_by(ReportRecord.generated_at.desc()).all()
    return [
        {
            "id": r.id,
            "title": r.title,
            "report_type": r.report_type,
            "date_from": r.date_from.isoformat(),
            "date_to": r.date_to.isoformat(),
            "total_consumption_mwh": r.total_consumption_mwh,
            "peak_demand_mw": r.peak_demand_mw,
            "avg_demand_mw": r.avg_demand_mw,
            "carbon_footprint_tonnes": r.carbon_footprint_tonnes,
            "cost_inr": r.cost_inr,
            "num_alerts": r.num_alerts,
            "status": r.status,
            "generated_at": r.generated_at.isoformat(),
        }
        for r in reports
    ]


@router.get("/{report_id}")
def get_report(report_id: int, db: Session = Depends(get_db)):
    r = db.query(ReportRecord).filter(ReportRecord.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    return {
        "id": r.id,
        "title": r.title,
        "report_type": r.report_type,
        "date_from": r.date_from.isoformat(),
        "date_to": r.date_to.isoformat(),
        "total_consumption_mwh": r.total_consumption_mwh,
        "peak_demand_mw": r.peak_demand_mw,
        "avg_demand_mw": r.avg_demand_mw,
        "carbon_footprint_tonnes": r.carbon_footprint_tonnes,
        "cost_inr": r.cost_inr,
        "num_alerts": r.num_alerts,
        "num_anomalies": r.num_anomalies,
        "summary": r.summary,
        "status": r.status,
        "generated_at": r.generated_at.isoformat(),
    }


@router.post("/generate")
def create_report(
    report_type: str = Query("monthly", description="weekly, monthly, quarterly"),
    dataset_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Generate a new energy audit report from the active dataset."""
    return generate_report(db, report_type=report_type, dataset_id=dataset_id)

