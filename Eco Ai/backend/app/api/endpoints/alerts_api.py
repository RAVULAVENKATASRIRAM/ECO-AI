from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.core.database import get_db
from app.models.alert import Alert, AlertConfig
from app.services.anomaly_detector import run_anomaly_scan

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/")
def get_alerts(
    status: str = Query(None, description="Filter by status: active, acknowledged, resolved"),
    severity: str = Query(None, description="Filter by severity: critical, warning, info"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(Alert).order_by(Alert.timestamp.desc())
    if status:
        q = q.filter(Alert.status == status)
    if severity:
        q = q.filter(Alert.severity == severity)
    alerts = q.limit(limit).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "message": a.message,
            "severity": a.severity,
            "category": a.category,
            "metric": a.metric,
            "metric_value": a.metric_value,
            "threshold": a.threshold,
            "status": a.status,
            "timestamp": a.timestamp.isoformat(),
            "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
            "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
        }
        for a in alerts
    ]


@router.get("/summary")
def alert_summary(db: Session = Depends(get_db)):
    total = db.query(Alert).count()
    active = db.query(Alert).filter(Alert.status == "active").count()
    critical = db.query(Alert).filter(Alert.severity == "critical", Alert.status == "active").count()
    return {"total": total, "active": active, "critical": critical}


@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "resolved"
    alert.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"id": alert_id, "status": "resolved"}


@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"id": alert_id, "status": "acknowledged"}


@router.post("/scan")
def scan_anomalies(dataset_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Trigger anomaly scan against active dataset energy readings."""
    return run_anomaly_scan(db, dataset_id=dataset_id)



@router.get("/configs")
def get_configs(db: Session = Depends(get_db)):
    configs = db.query(AlertConfig).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "metric": c.metric,
            "warning_threshold": c.warning_threshold,
            "critical_threshold": c.critical_threshold,
            "unit": c.unit,
            "enabled": c.enabled,
        }
        for c in configs
    ]
