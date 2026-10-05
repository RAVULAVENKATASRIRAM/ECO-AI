from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.analytics import (
    calculate_dashboard_kpis,
    get_energy_trend,
    get_temp_vs_energy_correlation,
    get_daily_energy_consumption,
    get_appliance_energy_distribution
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/kpis")
def get_dashboard_kpis(
    dataset_id: Optional[int] = Query(None, description="Optional dataset ID to scope KPIs to"),
    db: Session = Depends(get_db)
):
    """Returns real KPI values scoped to the active or requested dataset."""
    return calculate_dashboard_kpis(db, dataset_id=dataset_id)


@router.get("/energy-trend")
def get_dashboard_energy_trend(
    period: str = Query("7d", pattern="^(24h|7d|30d|custom)$"),
    dataset_id: Optional[int] = Query(None, description="Optional dataset ID to scope trend to"),
    db: Session = Depends(get_db)
):
    """Returns actual time series for Energy Consumption Over Time chart."""
    return get_energy_trend(db, period=period, dataset_id=dataset_id)


@router.get("/temp-vs-energy")
def get_dashboard_temp_vs_energy(
    limit: int = Query(300, ge=10, le=1000),
    dataset_id: Optional[int] = Query(None, description="Optional dataset ID"),
    db: Session = Depends(get_db)
):
    """Returns paired Temperature and Energy points for correlation chart."""
    return get_temp_vs_energy_correlation(db, dataset_id=dataset_id, limit=limit)


@router.get("/daily-consumption")
def get_dashboard_daily_consumption(
    days: int = Query(30, ge=1, le=90),
    dataset_id: Optional[int] = Query(None, description="Optional dataset ID"),
    db: Session = Depends(get_db)
):
    """Returns day-by-day aggregated consumption from real readings."""
    return get_daily_energy_consumption(db, dataset_id=dataset_id, days=days)


@router.get("/appliance-distribution")
def get_dashboard_appliance_distribution(
    dataset_id: Optional[int] = Query(None, description="Optional dataset ID"),
    db: Session = Depends(get_db)
):
    """Returns appliance energy share calculated from database readings."""
    return get_appliance_energy_distribution(db, dataset_id=dataset_id)
