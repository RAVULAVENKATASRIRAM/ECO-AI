"""Real chronological ML forecasting pipeline for Eco AI.

Backed by the Unified ML System core.
"""
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.models.ml_model import ALGORITHM_LABELS
from app.services.analytics import _active_dataset, _active_dataset_info
from app.services.ml.service import (
    ensure_default_active_model,
    get_synchronized_predictions,
    select_and_train_algorithm,
)
from app.services.ml.registry import get_active_model_record
from app.services.ml.trainer import SUPPORTED_ALGORITHMS

MODEL_LABELS = {
    "baseline": "Baseline Regressor (Seasonal Persistence)",
    "linear_regression": "Linear Regression (Ridge Regularized)",
    "random_forest": "Random Forest Regressor",
    "gradient_boosting": "Gradient Boosting Regressor",
    "hist_gradient_boosting": "HistGradientBoosting Regressor",
}


def generate_forecast(
    db: Session,
    horizon_hours: int = 24,
    dataset_id: Optional[int] = None,
    model_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate forecast using the unified ML service.
    If model_name is specified and different from the active model, trains/retrieves that model.
    Otherwise uses the persistent active model.
    """
    dataset = _active_dataset(db, dataset_id)
    active_model = get_active_model_record(db, dataset_id)

    if model_name and model_name in SUPPORTED_ALGORITHMS:
        if not active_model or active_model.algorithm != model_name:
            select_and_train_algorithm(db, algorithm=model_name, dataset_id=dataset_id)

    canonical = get_synchronized_predictions(db, horizon_hours=horizon_hours, dataset_id=dataset_id)
    model_info = canonical.get("model") or {}
    points = canonical.get("forecast_points", [])

    return {
        "forecast": points,
        "model_name": model_info.get("algorithm", "random_forest"),
        "model_label": model_info.get("algorithm_label", MODEL_LABELS.get(model_info.get("algorithm", ""), "Random Forest Regressor")),
        "model_version": model_info.get("model_version", 1),
        "version_tag": model_info.get("version_tag", "v1"),
        "message": f"Forecast generated using persistent active model: {model_info.get('algorithm_label', 'Random Forest Regressor')} (v{model_info.get('model_version', 1)}).",
        "metrics": canonical.get("metrics", {}),
        "active_dataset": _active_dataset_info(dataset),
        "generated_at": canonical.get("generated_at"),
        "cached": False,
        "summary": canonical.get("summary", {}),
        "history_series": canonical.get("history_series", []),
    }


def get_forecast_accuracy_metrics(
    db: Session,
    dataset_id: Optional[int] = None,
    model_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Return actual evaluation metrics from the persistent active ML model."""
    dataset = _active_dataset(db, dataset_id)
    active_model = ensure_default_active_model(db, dataset_id)

    if model_name and model_name in SUPPORTED_ALGORITHMS and active_model and active_model.algorithm != model_name:
        select_and_train_algorithm(db, algorithm=model_name, dataset_id=dataset_id)
        active_model = get_active_model_record(db, dataset_id)

    if not active_model:
        return {
            "mae": None, "rmse": None, "mape": None, "r_squared": None,
            "model_name": model_name or "random_forest",
            "model_label": MODEL_LABELS.get(model_name or "random_forest", "Random Forest Regressor"),
        }

    return {
        "mae": active_model.mae,
        "rmse": active_model.rmse,
        "mape": active_model.mape,
        "r_squared": active_model.r2,
        "r2": active_model.r2,
        "samples_used": active_model.training_record_count,
        "model_name": active_model.algorithm,
        "model_label": ALGORITHM_LABELS.get(active_model.algorithm, active_model.algorithm),
        "model_version": active_model.model_version,
        "active_dataset": _active_dataset_info(dataset),
    }
