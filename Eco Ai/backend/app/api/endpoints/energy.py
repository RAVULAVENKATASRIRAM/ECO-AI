from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.analytics import get_energy_analytics_deep, get_energy_trend

router = APIRouter(prefix="/energy", tags=["Energy Analytics"])


@router.get("/analytics")
def get_energy_analytics(
    dataset_id: Optional[int] = Query(None, description="Optional dataset ID"),
    db: Session = Depends(get_db)
):
    """Returns deep analytics: peak vs off-peak, hourly weekday vs weekend profile, load duration curve."""
    return get_energy_analytics_deep(db, dataset_id=dataset_id)


@router.get("/history")
def get_energy_history(
    period: str = Query("7d"),
    dataset_id: Optional[int] = Query(None, description="Optional dataset ID"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Returns time-series history with optional custom date range filtering."""
    start_dt = None
    end_dt = None
    if start_date and end_date:
        try:
            start_dt = datetime.fromisoformat(start_date)
            end_dt = datetime.fromisoformat(end_date)
            period = "custom"
        except ValueError:
            pass

    return get_energy_trend(db, period=period, dataset_id=dataset_id, start_dt=start_dt, end_dt=end_dt)
