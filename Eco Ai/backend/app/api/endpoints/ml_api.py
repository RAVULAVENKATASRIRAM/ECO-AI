"""Centralized ML API Router for Eco AI.

Unified ML System: Single source of truth for AI Forecast and Future Intelligence.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.ml import (
    ensure_default_active_model,
    get_active_model_record,
    get_available_algorithms_metadata,
    get_synchronized_predictions,
    list_all_models,
    list_evaluated_algorithm_comparison,
    retrain_active_model_on_data_change,
    select_and_train_algorithm,
)

router = APIRouter(prefix="/ml", tags=["Unified ML System"])


class AlgorithmSelectRequest(BaseModel):
    algorithm: str = Field(..., description="ML algorithm identifier (linear_regression, random_forest, gradient_boosting, sarimax, isolation_forest)")
    dataset_id: Optional[int] = Field(None, description="Optional scoped dataset ID")


@router.get("/algorithms")
def list_algorithms():
    """Returns all genuinely supported ML algorithms and their capabilities."""
    return get_available_algorithms_metadata()


@router.get("/active")
def get_active_ml_model(
    dataset_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Returns the single active model record with version, metrics, and feature metadata."""
    active_model = ensure_default_active_model(db, dataset_id)
    if not active_model:
        raise HTTPException(status_code=404, detail="No active ML model found.")
    return active_model.to_dict()


@router.post("/select")
def select_ml_algorithm(
    payload: AlgorithmSelectRequest,
    db: Session = Depends(get_db),
):
    """
    Selects and trains an algorithm.
    Validates on chronological test split, stores model, and sets it as the active model across Eco AI.
    If training fails, the previous active model is preserved.
    """
    try:
        result = select_and_train_algorithm(db, algorithm=payload.algorithm, dataset_id=payload.dataset_id)
        if result.get("status") == "failed":
            return {
                "status": "failed",
                "message": result.get("message"),
                "error": result.get("error"),
                "active_model": result.get("active_model"),
            }
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model training failed: {str(exc)}")


@router.post("/retrain")
def retrain_active_model(
    dataset_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Retrains the active algorithm against the latest data, creating the next version v(n+1)."""
    try:
        return retrain_active_model_on_data_change(db, dataset_id=dataset_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(exc)}")


@router.get("/predictions")
def get_ml_predictions(
    horizon: int = Query(24, ge=1, le=168, description="Prediction horizon in hours"),
    dataset_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Canonical predictions generated exclusively from the active model."""
    try:
        return get_synchronized_predictions(db, horizon_hours=horizon, dataset_id=dataset_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate predictions: {str(exc)}")


@router.get("/models")
def list_models(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """Lists model version history for traceability."""
    models = list_all_models(db, limit=limit)
    return [m.to_dict() for m in models]


@router.get("/comparison")
def algorithm_comparison(
    dataset_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Side-by-side performance comparison of evaluated algorithms on the active dataset."""
    return list_evaluated_algorithm_comparison(db, dataset_id=dataset_id)


@router.get("/feature-importance")
def get_feature_importance(
    dataset_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Returns feature importance or linear coefficients for the active model."""
    active_model = ensure_default_active_model(db, dataset_id)
    if not active_model:
        return {"feature_importance": [], "coefficients": [], "algorithm": None}
    d = active_model.to_dict()
    return {
        "algorithm": d["algorithm"],
        "algorithm_label": d["algorithm_label"],
        "model_version": d["model_version"],
        "feature_importance": d["feature_importance"],
        "coefficients": d["coefficients"],
    }
