from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.forecast_service import generate_24h_forecast, generate_7d_forecast
from app.services.forecasting import generate_forecast, get_forecast_accuracy_metrics

router = APIRouter(prefix="/forecast", tags=["AI Forecast"])

SUPPORTED_MODELS = (
    "baseline",
    "linear_regression",
    "random_forest",
    "gradient_boosting",
    "hist_gradient_boosting",
)


@router.get("/24h")
def forecast_24h(dataset_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """24-hour ahead hourly energy consumption forecast scoped to active dataset."""
    return generate_24h_forecast(db, dataset_id=dataset_id)


@router.get("/7d")
def forecast_7d(dataset_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """7-day daily energy demand forecast summary scoped to active dataset."""
    return generate_7d_forecast(db, dataset_id=dataset_id)


@router.get("/predict")
def predict_forecast(
    horizon: int = Query(24, ge=1, le=168),
    dataset_id: Optional[int] = Query(None),
    model: Optional[str] = Query(None, pattern="^(baseline|linear_regression|random_forest|gradient_boosting|hist_gradient_boosting)$"),
    db: Session = Depends(get_db)
):
    """Autoregressive forecast with confidence intervals and peak warnings."""
    points = generate_forecast(db, horizon_hours=horizon, dataset_id=dataset_id, model_name=model)
    return {"horizon": horizon, "forecast": points}


@router.get("/metrics")
def forecast_metrics(
    dataset_id: Optional[int] = Query(None),
    model: Optional[str] = Query(None, pattern="^(baseline|linear_regression|random_forest|gradient_boosting|hist_gradient_boosting)$"),
    db: Session = Depends(get_db),
):
    """Model performance metrics (MAE, RMSE, MAPE, R2) calculated from active dataset."""
    return get_forecast_accuracy_metrics(db, dataset_id=dataset_id, model_name=model)

