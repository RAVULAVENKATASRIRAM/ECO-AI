from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.models.alert import Alert, AlertConfig

router = APIRouter(prefix="/alerts", tags=["Alerts"])


class AlertConfigUpdate(BaseModel):
    warning_threshold: Optional[float] = None
    critical_threshold: Optional[float] = None
    enabled: Optional[bool] = None


@router.get("/")
def list_alerts(
    status: Optional[str] = Query(None, description="Filter by status: active, acknowledged, resolved"),
    severity: Optional[str] = Query(None, description="Filter by severity: critical, warning, info"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if status:
        query = query.filter(Alert.status == status)
    if severity:
        query = query.filter(Alert.severity == severity)
    alerts = query.order_by(desc(Alert.timestamp)).limit(limit).all()
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
            "timestamp": a.timestamp.isoformat() + "Z",
            "resolved_at": a.resolved_at.isoformat() + "Z" if a.resolved_at else None,
            "acknowledged_at": a.acknowledged_at.isoformat() + "Z" if a.acknowledged_at else None,
        }
        for a in alerts
    ]


@router.get("/summary")
def alerts_summary(db: Session = Depends(get_db)):
    all_alerts = db.query(Alert).all()
    total = len(all_alerts)
    active = sum(1 for a in all_alerts if a.status == "active")
    acknowledged = sum(1 for a in all_alerts if a.status == "acknowledged")
    resolved = sum(1 for a in all_alerts if a.status == "resolved")
    critical = sum(1 for a in all_alerts if a.severity == "critical" and a.status != "resolved")
    warnings = sum(1 for a in all_alerts if a.severity == "warning" and a.status != "resolved")
    return {
        "total": total,
        "active": active,
        "acknowledged": acknowledged,
        "resolved": resolved,
        "critical_unresolved": critical,
        "warning_unresolved": warnings,
    }


@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    if alert.status == "resolved":
        raise HTTPException(status_code=400, detail="Cannot acknowledge a resolved alert")
    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"success": True, "alert_id": alert_id, "status": "acknowledged"}


@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = "resolved"
    alert.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"success": True, "alert_id": alert_id, "status": "resolved"}


@router.get("/configs")
def list_alert_configs(db: Session = Depends(get_db)):
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
            "created_at": c.created_at.isoformat() + "Z",
        }
        for c in configs
    ]


@router.put("/configs/{config_id}")
def update_alert_config(config_id: int, body: AlertConfigUpdate, db: Session = Depends(get_db)):
    config = db.query(AlertConfig).filter(AlertConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Alert config not found")
    if body.warning_threshold is not None:
        config.warning_threshold = body.warning_threshold
    if body.critical_threshold is not None:
        config.critical_threshold = body.critical_threshold
    if body.enabled is not None:
        config.enabled = body.enabled
    db.commit()
    return {"success": True, "config_id": config_id}
