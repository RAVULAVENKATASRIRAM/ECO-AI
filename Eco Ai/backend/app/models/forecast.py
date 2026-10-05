import json
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, Text

from app.core.database import Base


class ForecastSnapshot(Base):
    __tablename__ = "forecast_snapshots"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    dataset_id = Column(Integer, nullable=True, index=True)
    horizon_hours = Column(Integer, nullable=False)
    model_name = Column(Text, nullable=False)
    source_count = Column(Integer, nullable=False)
    source_last_timestamp = Column(DateTime, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    forecast_json = Column(Text, nullable=False)
    metrics_json = Column(Text, nullable=False, default="{}")
    active_dataset_json = Column(Text, nullable=False, default="{}")
    message = Column(Text, nullable=False)

    def to_payload(self) -> dict:
        return {
            "forecast": json.loads(self.forecast_json),
            "model_name": self.model_name,
            "model_label": MODEL_LABELS.get(self.model_name, self.model_name),
            "message": self.message,
            "metrics": json.loads(self.metrics_json),
            "active_dataset": json.loads(self.active_dataset_json),
            "generated_at": self.generated_at.isoformat() + "Z",
            "cached": True,
        }


MODEL_LABELS = {
    "random_forest": "Random Forest Regressor",
    "gradient_boosting": "Gradient Boosting Regressor",
    "hist_gradient_boosting": "HistGradientBoosting Regressor",
}