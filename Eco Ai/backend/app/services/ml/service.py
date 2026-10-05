"""Unified ML Orchestration Service for Eco AI.

Maintains a single source of truth across AI Forecast and Future Intelligence.
"""
import logging
from typing import Any, Dict, List, Optional
import pandas as pd
from sqlalchemy.orm import Session

from app.models.energy import EnergyReading
from app.models.weather import WeatherReading
from app.models.ml_model import MLModelRecord, ALGORITHM_LABELS, ALGORITHM_DESCRIPTIONS
from app.models.forecast import ForecastSnapshot
from app.models.setting import Setting
from app.services.analytics import _active_dataset, _scoped_energy_readings
from app.services.ml.features import build_feature_dataframe
from app.services.ml.predictor import build_canonical_prediction_response, predict_autoregressive_horizon
from app.services.ml.registry import (
    activate_model_record,
    get_active_model_record,
    list_all_models,
    list_evaluated_algorithm_comparison,
    mark_model_training_failed,
    register_training_start,
)
from app.services.ml.storage import load_model_artifact, save_model_artifact
from app.services.ml.trainer import (
    SUPPORTED_ALGORITHMS,
    train_and_evaluate_pipeline,
)

logger = logging.getLogger("eco_ai.ml")


def get_scoped_training_data(db: Session, dataset_id: Optional[int] = None) -> pd.DataFrame:
    """Fetches scoped energy and weather records and constructs feature DataFrame."""
    dataset = _active_dataset(db, dataset_id)
    energy_records = _scoped_energy_readings(db, dataset)
    if not energy_records:
        return pd.DataFrame()

    weather_records = db.query(WeatherReading).filter(WeatherReading.location == "Chennai").order_by(WeatherReading.timestamp.asc()).all()
    if dataset:
        weather_records = [
            w for w in weather_records
            if (dataset.date_start is None or w.timestamp >= dataset.date_start)
            and (dataset.date_end is None or w.timestamp <= dataset.date_end)
        ]

    return build_feature_dataframe(energy_records, weather_records)


def invalidate_prediction_cache(db: Session) -> None:
    """Invalidates old cached forecast snapshots so new model predictions take immediate effect."""
    try:
        db.query(ForecastSnapshot).delete()
        db.commit()
    except Exception as e:
        logger.warning(f"Failed to clear forecast snapshot cache: {e}")
        db.rollback()


def select_and_train_algorithm(
    db: Session,
    algorithm: str,
    dataset_id: Optional[int] = None,
    location: str = "Chennai",
    user_id: str = "default_user",
) -> Dict[str, Any]:
    """
    Selects and trains an algorithm.
    If training succeeds and validates, it activates the model, increments the version, and invalidates stale cache.
    If training fails, the previous active model is preserved.
    """
    algorithm = algorithm.lower().strip()
    if algorithm not in SUPPORTED_ALGORITHMS:
        raise ValueError(f"Algorithm '{algorithm}' is not supported. Choose from: {list(SUPPORTED_ALGORITHMS.keys())}")

    training_df = get_scoped_training_data(db, dataset_id)
    if training_df.empty or len(training_df) < 12:
        raise ValueError("Insufficient historical telemetry records for model training (min 12 records required).")

    # Register start of training
    model_record = register_training_start(db, algorithm, dataset_id=dataset_id, location=location, user_id=user_id)

    try:
        # Run real training and validation
        train_result = train_and_evaluate_pipeline(algorithm, training_df)
        pipeline = train_result["pipeline"]
        metrics = train_result["metrics"]
        feature_set = train_result["feature_set"]

        metadata = {
            "config": train_result["config"],
            "feature_importance": train_result["feature_importance"],
            "coefficients": train_result["coefficients"],
            "model_parameters": train_result.get("model_parameters", {}),
            "evaluation_series": train_result["evaluation_series"],
            "samples_train": metrics.get("samples_train"),
            "samples_test": metrics.get("samples_test"),
            "is_anomaly_detector": metrics.get("is_anomaly_detector", False),
            "anomaly_metrics": {
                "is_anomaly_detector": metrics.get("is_anomaly_detector", False),
                "anomaly_count": metrics.get("anomaly_count"),
                "normal_count": metrics.get("normal_count"),
                "anomaly_rate_pct": metrics.get("anomaly_rate_pct"),
                "contamination": metrics.get("contamination"),
                "avg_anomaly_score": metrics.get("avg_anomaly_score"),
                "c_n": metrics.get("c_n"),
                "subsample_size": metrics.get("subsample_size"),
            } if metrics.get("is_anomaly_detector") else {},
        }

        # Save model artifact to disk
        model_path = save_model_artifact(pipeline, algorithm, model_record.model_version, model_record.id)

        # Activate model and archive previous active models
        activated_record = activate_model_record(
            db=db,
            model_id=model_record.id,
            metrics=metrics,
            feature_set=feature_set,
            model_path=model_path,
            metadata=metadata,
            training_record_count=train_result["training_record_count"],
        )

        # Invalidate old prediction cache
        invalidate_prediction_cache(db)

        logger.info(f"Successfully trained and activated model {algorithm} v{activated_record.model_version} (MAE: {metrics['mae']})")

        return {
            "status": "success",
            "message": f"Successfully trained and activated {ALGORITHM_LABELS.get(algorithm, algorithm)} (Version {activated_record.model_version}).",
            "model": activated_record.to_dict(),
        }

    except Exception as exc:
        error_msg = str(exc)
        logger.error(f"Training failed for algorithm '{algorithm}': {error_msg}")
        mark_model_training_failed(db, model_record.id, error_msg)

        # Retrieve active model to confirm preservation
        active_model = get_active_model_record(db, dataset_id)
        return {
            "status": "failed",
            "message": f"Training failed: {error_msg}. Previous active model preserved.",
            "error": error_msg,
            "failed_model_id": model_record.id,
            "active_model": active_model.to_dict() if active_model else None,
        }


def ensure_default_active_model(db: Session, dataset_id: Optional[int] = None) -> MLModelRecord:
    """Ensures there is always an active, validated model available upon startup."""
    active_rec = get_active_model_record(db, dataset_id)
    if active_rec and active_rec.model_path and load_model_artifact(active_rec.model_path) is not None:
        return active_rec

    # Check preferred algorithm setting or fallback to random_forest
    setting_algo = db.query(Setting).filter(Setting.key == "active_ml_algorithm").first()
    preferred_algo = setting_algo.value if setting_algo and setting_algo.value in SUPPORTED_ALGORITHMS else "random_forest"

    training_df = get_scoped_training_data(db, dataset_id)
    if training_df.empty or len(training_df) < 12:
        logger.warning("Not enough data to train default active model during startup.")
        if active_rec:
            return active_rec
        # Create lightweight baseline record if no data
        return register_training_start(db, preferred_algo, dataset_id=dataset_id)

    res = select_and_train_algorithm(db, preferred_algo, dataset_id=dataset_id)
    if res["status"] == "success":
        return get_active_model_record(db, dataset_id)

    # Fallback to baseline if advanced tree fails
    res_base = select_and_train_algorithm(db, "baseline", dataset_id=dataset_id)
    return get_active_model_record(db, dataset_id)


def retrain_active_model_on_data_change(db: Session, dataset_id: Optional[int] = None) -> Dict[str, Any]:
    """Automatically retrains the currently selected active algorithm when new data arrives."""
    active_model = get_active_model_record(db, dataset_id)
    algo_to_train = active_model.algorithm if active_model else "random_forest"

    logger.info(f"Retraining active algorithm '{algo_to_train}' due to database update...")
    return select_and_train_algorithm(db, algo_to_train, dataset_id=dataset_id)


def get_synchronized_predictions(
    db: Session,
    horizon_hours: int = 24,
    dataset_id: Optional[int] = None,
) -> Dict[str, Any]:
    """Generates canonical predictions using the single persistent ACTIVE model."""
    active_model = ensure_default_active_model(db, dataset_id)
    training_df = get_scoped_training_data(db, dataset_id)

    if training_df.empty or not active_model:
        return {
            "model": active_model.to_dict() if active_model else None,
            "prediction": {
                "value": 0.0,
                "average_hourly_mw": 0.0,
                "peak_forecast_mw": 0.0,
                "peak_hour": "N/A",
                "unit": "MW",
                "horizon_hours": horizon_hours,
                "horizon_label": f"{horizon_hours}h",
                "timestamp": None,
            },
            "metrics": {},
            "forecast_points": [],
            "history_series": [],
            "summary": {
                "total_forecast_mwh": 0.0,
                "avg_forecast_mw": 0.0,
                "peak_forecast_mw": 0.0,
                "peak_hour": "N/A",
                "peak_count": 0,
            },
            "generated_at": None,
            "message": "Insufficient data to generate prediction.",
        }

    # Load trained model pipeline
    pipeline = load_model_artifact(active_model.model_path) if active_model.model_path else None
    if pipeline is None:
        # Retrain pipeline if artifact file is missing
        logger.info(f"Model artifact not found for {active_model.algorithm} v{active_model.model_version}. Retraining...")
        res = select_and_train_algorithm(db, active_model.algorithm, dataset_id=dataset_id)
        if res["status"] == "success":
            active_model = get_active_model_record(db, dataset_id)
            pipeline = load_model_artifact(active_model.model_path)

    if pipeline is None:
        raise RuntimeError("Failed to load active ML model pipeline.")

    # Predict
    residual_rmse = active_model.rmse if active_model.rmse is not None else 15.0
    is_anomaly = active_model.algorithm == "isolation_forest" or active_model.to_dict().get("metrics", {}).get("is_anomaly_detector", False)
    forecast_points = predict_autoregressive_horizon(
        pipeline=pipeline,
        training_df=training_df,
        horizon_hours=horizon_hours,
        residual_rmse=residual_rmse,
        is_anomaly_detector=is_anomaly,
    )

    return build_canonical_prediction_response(
        model_record=active_model,
        forecast_points=forecast_points,
        training_df=training_df,
        horizon_hours=horizon_hours,
        pipeline=pipeline,
    )


def get_available_algorithms_metadata() -> List[Dict[str, Any]]:
    """Returns list of exactly the 5 approved algorithms with true feature capabilities."""
    return [
        {
            "id": "linear_regression",
            "name": "Linear Regression",
            "label": ALGORITHM_LABELS.get("linear_regression", "Linear Regression (Ridge Regularized)"),
            "description": ALGORITHM_DESCRIPTIONS.get("linear_regression", ""),
            "category": "Linear Models",
            "supports_feature_importance": False,
            "supports_coefficients": True,
            "is_anomaly_detector": False,
            "typical_training_time_ms": 40,
        },
        {
            "id": "random_forest",
            "name": "Random Forest Regressor",
            "label": ALGORITHM_LABELS.get("random_forest", "Random Forest Regressor"),
            "description": ALGORITHM_DESCRIPTIONS.get("random_forest", ""),
            "category": "Tree Ensemble",
            "supports_feature_importance": True,
            "supports_coefficients": False,
            "is_anomaly_detector": False,
            "typical_training_time_ms": 250,
        },
        {
            "id": "gradient_boosting",
            "name": "Gradient Boosting Regressor",
            "label": ALGORITHM_LABELS.get("gradient_boosting", "Gradient Boosting Regressor"),
            "description": ALGORITHM_DESCRIPTIONS.get("gradient_boosting", ""),
            "category": "Boosting Ensemble",
            "supports_feature_importance": True,
            "supports_coefficients": False,
            "is_anomaly_detector": False,
            "typical_training_time_ms": 300,
        },
        {
            "id": "sarimax",
            "name": "SARIMAX",
            "label": ALGORITHM_LABELS.get("sarimax", "SARIMAX (Seasonal ARIMAX)"),
            "description": ALGORITHM_DESCRIPTIONS.get("sarimax", ""),
            "category": "Econometric / Time Series",
            "supports_feature_importance": False,
            "supports_coefficients": True,
            "is_anomaly_detector": False,
            "typical_training_time_ms": 450,
        },
        {
            "id": "isolation_forest",
            "name": "Isolation Forest",
            "label": ALGORITHM_LABELS.get("isolation_forest", "Isolation Forest (Anomaly Detector)"),
            "description": ALGORITHM_DESCRIPTIONS.get("isolation_forest", ""),
            "category": "Anomaly Detection",
            "supports_feature_importance": False,
            "supports_coefficients": False,
            "is_anomaly_detector": True,
            "typical_training_time_ms": 180,
        },
    ]


def true_coefficients_supported() -> bool:
    return True

