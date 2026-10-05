import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from app.core.database import Base

ALGORITHM_LABELS = {
    "linear_regression": "Linear Regression (Ridge Regularized)",
    "random_forest": "Random Forest Regressor",
    "gradient_boosting": "Gradient Boosting Regressor",
    "sarimax": "SARIMAX (Seasonal ARIMAX)",
    "isolation_forest": "Isolation Forest (Anomaly Detector)",
    # Fallback mappings for backwards compatibility
    "baseline": "Baseline Regressor (Seasonal Persistence)",
    "hist_gradient_boosting": "HistGradientBoosting Regressor",
}

ALGORITHM_DESCRIPTIONS = {
    "linear_regression": "Standardized Linear Ridge regression modeling direct thermal and diurnal load coefficients.",
    "random_forest": "Ensemble of 160 randomized decision trees capturing non-linear weather-load interactions.",
    "gradient_boosting": "Sequential boosting model minimizing Huber loss to resist demand spike outliers.",
    "sarimax": "Seasonal AutoRegressive Integrated Moving Average with exogenous weather variables.",
    "isolation_forest": "Ensemble of isolation trees isolating anomalous power surges and sensor failures.",
    # Fallback mappings for backwards compatibility
    "baseline": "Simple persistence model utilizing 24-hour seasonal lag with temperature drift compensation.",
    "hist_gradient_boosting": "High-efficiency histogram-binned gradient boosting for fast tabular regression.",
}


class MLModelRecord(Base):
    __tablename__ = "ml_model_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(100), nullable=True, default="default_user")
    location = Column(String(100), nullable=False, default="Chennai")
    dataset_id = Column(Integer, nullable=True, index=True)
    algorithm = Column(String(50), nullable=False, index=True)  # baseline, linear_regression, random_forest, gradient_boosting, hist_gradient_boosting
    model_version = Column(Integer, nullable=False, default=1)
    status = Column(String(50), nullable=False, default="training")  # training, validated, active, failed, archived
    is_active = Column(Boolean, default=False, nullable=False, index=True)
    training_record_count = Column(Integer, nullable=False, default=0)
    feature_set = Column(Text, nullable=False, default="[]")  # JSON list of feature names
    prediction_horizon = Column(Integer, default=24, nullable=False)
    mae = Column(Float, nullable=True)
    rmse = Column(Float, nullable=True)
    mape = Column(Float, nullable=True)
    r2 = Column(Float, nullable=True)
    model_path = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=False, default="{}")  # Feature importances, coefficients, evaluation series
    training_error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self) -> Dict[str, Any]:
        meta = json.loads(self.metadata_json) if self.metadata_json else {}
        features = json.loads(self.feature_set) if self.feature_set else []
        return {
            "id": self.id,
            "user_id": self.user_id,
            "location": self.location,
            "dataset_id": self.dataset_id,
            "algorithm": self.algorithm,
            "algorithm_label": ALGORITHM_LABELS.get(self.algorithm, self.algorithm),
            "algorithm_description": ALGORITHM_DESCRIPTIONS.get(self.algorithm, ""),
            "model_version": self.model_version,
            "version_tag": f"v{self.model_version}",
            "status": self.status,
            "is_active": self.is_active,
            "training_record_count": self.training_record_count,
            "feature_set": features,
            "prediction_horizon": self.prediction_horizon,
            "metrics": {
                "mae": round(self.mae, 4) if self.mae is not None else None,
                "rmse": round(self.rmse, 4) if self.rmse is not None else None,
                "mape": round(self.mape, 4) if self.mape is not None else None,
                "r2": round(self.r2, 4) if self.r2 is not None else None,
                "r_squared": round(self.r2, 4) if self.r2 is not None else None,
                **(meta.get("anomaly_metrics", {})),
            },
            "model_path": self.model_path,
            "metadata": meta,
            "feature_importance": meta.get("feature_importance", []),
            "coefficients": meta.get("coefficients", []),
            "evaluation_series": meta.get("evaluation_series", {}),
            "training_error": self.training_error,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "updated_at": self.updated_at.isoformat() + "Z" if self.updated_at else None,
        }
