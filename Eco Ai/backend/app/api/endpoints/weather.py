from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.analytics import get_weather_analytics_deep, get_temp_vs_energy_correlation

router = APIRouter(prefix="/weather", tags=["Weather Analytics"])


@router.get("/summary")
def get_weather_summary(
    dataset_id: Optional[int] = Query(None, description="Optional dataset ID"),
    db: Session = Depends(get_db)
):
    """Returns weather overview, correlations with energy load, condition frequencies."""
    return get_weather_analytics_deep(db, dataset_id=dataset_id)


@router.get("/correlation-points")
def get_weather_correlation_points(
    dataset_id: Optional[int] = Query(None, description="Optional dataset ID"),
    db: Session = Depends(get_db)
):
    """Returns scatter plot pairs of temperature and energy load."""
    return get_temp_vs_energy_correlation(db, dataset_id=dataset_id, limit=400)
