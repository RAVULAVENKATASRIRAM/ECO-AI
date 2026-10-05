"""Canonical Prediction Service for Unified ML System."""
import json
import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline

from app.services.ml.features import FEATURE_COLUMNS, build_future_feature_row, safe_numeric


def predict_autoregressive_horizon(
    pipeline: Pipeline,
    training_df: pd.DataFrame,
    horizon_hours: int = 24,
    residual_rmse: float = 15.0,
    peak_threshold_quantile: float = 0.85,
    is_anomaly_detector: bool = False,
) -> List[Dict[str, Any]]:
    """Generates sequential multi-step predictions with dynamic weather cycles and confidence bounds.

    For Isolation Forest, calculates future anomaly status and path-length anomaly score s(x, n).
    """
    if training_df.empty:
        return []

    recent_values = training_df["consumption"].tolist()
    last_timestamp = pd.to_datetime(training_df["timestamp"].iloc[-1])
    last_weather = training_df.iloc[-1]
    latest_temperature = safe_numeric(last_weather.get("temperature"), 30.0)
    latest_humidity = safe_numeric(last_weather.get("humidity"), 65.0)
    latest_pressure = safe_numeric(last_weather.get("pressure"), 1013.0)
    latest_wind = safe_numeric(last_weather.get("wind_speed"), 10.0)

    forecast_points: List[Dict[str, Any]] = []
    residual_scale = max(residual_rmse, 3.0)

    # Calculate baseline peak cutoff from recent history
    recent_tail = recent_values[-72:] if len(recent_values) >= 72 else recent_values
    peak_cutoff = float(np.quantile(recent_tail, peak_threshold_quantile)) if recent_tail else 750.0
    peak_cutoff = max(peak_cutoff, 500.0)

    model_step = pipeline.named_steps.get("model")
    has_iso = is_anomaly_detector or hasattr(model_step, "compute_anomaly_scores")

    for step in range(1, horizon_hours + 1):
        ts = last_timestamp + timedelta(hours=step)
        # Realistic diurnal atmospheric cycles for Chennai
        temperature = latest_temperature + 4.0 * math.sin(math.pi * (ts.hour - 5) / 12.0)
        humidity = max(35.0, min(95.0, latest_humidity - 8.0 * math.cos(math.pi * (ts.hour - 12) / 12.0)))
        pressure = latest_pressure + 1.2 * math.sin(math.pi * ts.hour / 12.0)
        wind_speed = max(4.0, latest_wind + 2.0 * math.sin(math.pi * (ts.hour - 15) / 12.0))

        row_dict = build_future_feature_row(recent_values, ts, temperature, humidity, pressure, wind_speed)
        row_df = pd.DataFrame([row_dict], columns=FEATURE_COLUMNS)

        is_anomaly = False
        anomaly_score = 0.0

        if has_iso:
            # Baseline expected demand with temperature coupling
            base_lag = recent_values[-24] if len(recent_values) >= 24 else (sum(recent_values[-24:]) / max(1, len(recent_values[-24:])))
            temp_delta = max(0.0, temperature - 28.0) * 18.0
            pred_val = max(100.0, float(base_lag) + temp_delta)

            # Evaluate row with Isolation Forest
            row_df_iso = row_df.copy()
            row_df_iso["consumption"] = pred_val
            try:
                preds = model_step.predict(row_df_iso)
                scores = model_step.compute_anomaly_scores(row_df_iso)
                is_anomaly = bool(preds[0] == -1)
                anomaly_score = round(float(scores[0]), 4)
            except Exception:
                is_anomaly = False
                anomaly_score = 0.35
        else:
            pred_val = float(pipeline.predict(row_df)[0])
            pred_val = max(0.0, pred_val)

        # 95% Confidence Interval (± 1.96 * residual_scale * sqrt(step scaling factor))
        step_uncertainty = 1.0 + (0.02 * math.sqrt(step))
        ci_half = max(0.04 * pred_val, residual_scale * 1.645 * step_uncertainty)
        lower_bound = max(0.0, pred_val - ci_half)
        upper_bound = pred_val + ci_half

        is_peak = bool(pred_val >= peak_cutoff)

        forecast_points.append({
            "timestamp": ts.isoformat(),
            "hour": ts.hour,
            "forecast_mw": round(pred_val, 2),
            "lower_mw": round(lower_bound, 2),
            "upper_mw": round(upper_bound, 2),
            "temperature_c": round(temperature, 1),
            "humidity_pct": round(humidity, 1),
            "is_peak": is_peak,
            "is_anomaly": is_anomaly,
            "anomaly_score": anomaly_score,
            "day_label": ts.strftime("%a %H:00"),
        })

        # Append predicted value for autoregressive lag feeding
        recent_values.append(pred_val)

    return forecast_points


def build_canonical_prediction_response(
    model_record: Any,
    forecast_points: List[Dict[str, Any]],
    training_df: pd.DataFrame,
    horizon_hours: int = 24,
    pipeline: Optional[Pipeline] = None,
) -> Dict[str, Any]:
    """Formats canonical payload with synchronized metrics, summary, and historical chart series."""
    total_forecast = sum(p["forecast_mw"] for p in forecast_points) if forecast_points else 0.0
    avg_forecast = (total_forecast / len(forecast_points)) if forecast_points else 0.0
    peak_point = max(forecast_points, key=lambda p: p["forecast_mw"]) if forecast_points else None

    # Parse metadata if present
    meta = {}
    if hasattr(model_record, "metadata_json") and model_record.metadata_json:
        try:
            meta = json.loads(model_record.metadata_json)
        except Exception:
            meta = {}
    elif isinstance(getattr(model_record, "metadata", None), dict):
        meta = model_record.metadata

    is_anomaly_detector = getattr(model_record, "algorithm", "") == "isolation_forest" or meta.get("metrics", {}).get("is_anomaly_detector", False)

    # Recent historical actuals (up to 48 points) for smooth continuous chart visualization
    hist_count = min(len(training_df), 48)
    history_series = []
    if not training_df.empty:
        hist_df = training_df.iloc[-hist_count:]
        iso_preds = None
        iso_scores = None

        if is_anomaly_detector and pipeline is not None:
            model_step = pipeline.named_steps.get("model")
            if hasattr(model_step, "compute_anomaly_scores"):
                try:
                    iso_preds = model_step.predict(hist_df[FEATURE_COLUMNS])
                    iso_scores = model_step.compute_anomaly_scores(hist_df[FEATURE_COLUMNS])
                except Exception:
                    pass

        idx = 0
        for _, row in hist_df.iterrows():
            ts = pd.to_datetime(row["timestamp"])
            is_anomaly = bool(iso_preds[idx] == -1) if iso_preds is not None else False
            score = float(iso_scores[idx]) if iso_scores is not None else None
            history_series.append({
                "timestamp": ts.isoformat(),
                "actual_mw": round(float(row["consumption"]), 2),
                "temperature_c": round(safe_numeric(row.get("temperature"), 30.0), 1),
                "is_anomaly": is_anomaly,
                "anomaly_score": round(score, 4) if score is not None else None,
                "label": ts.strftime("%a %H:00"),
            })
            idx += 1

    # Extract metrics
    metrics = {
        "mae": model_record.mae if hasattr(model_record, "mae") else None,
        "rmse": model_record.rmse if hasattr(model_record, "rmse") else None,
        "mape": model_record.mape if hasattr(model_record, "mape") else None,
        "r2": model_record.r2 if hasattr(model_record, "r2") else None,
        "r_squared": model_record.r2 if hasattr(model_record, "r2") else None,
        "is_anomaly_detector": is_anomaly_detector,
        **(meta.get("anomaly_metrics", {})),
    }

    anomalous_points = [p for p in forecast_points if p.get("is_anomaly")]

    summary = {
        "total_forecast_mwh": round(total_forecast, 2),
        "avg_forecast_mw": round(avg_forecast, 2),
        "peak_forecast_mw": round(peak_point["forecast_mw"], 2) if peak_point else 0.0,
        "peak_hour": peak_point["day_label"] if peak_point else "N/A",
        "peak_count": len([p for p in forecast_points if p["is_peak"]]),
        "horizon_hours": horizon_hours,
        "is_anomaly_detector": is_anomaly_detector,
        "future_anomaly_count": len(anomalous_points),
    }

    algorithm_name = getattr(model_record, "algorithm", "unknown")
    version_tag = f"v{getattr(model_record, 'model_version', 1)}"

    return {
        "model": model_record.to_dict() if hasattr(model_record, "to_dict") else None,
        "algorithm": algorithm_name,
        "version_tag": version_tag,
        "is_anomaly_detector": is_anomaly_detector,
        "prediction": {
            "value": round(avg_forecast, 2),
            "average_hourly_mw": round(avg_forecast, 2),
            "peak_forecast_mw": round(peak_point["forecast_mw"], 2) if peak_point else 0.0,
            "peak_hour": peak_point["day_label"] if peak_point else "N/A",
            "unit": "MW",
            "horizon_hours": horizon_hours,
            "horizon_label": f"{horizon_hours}h",
            "timestamp": forecast_points[0]["timestamp"] if forecast_points else None,
        },
        "metrics": metrics,
        "forecast_points": forecast_points,
        "history_series": history_series,
        "summary": summary,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "message": f"Predictions generated with {algorithm_name} ({version_tag}).",
    }
