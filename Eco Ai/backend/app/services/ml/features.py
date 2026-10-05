"""Feature engineering for the Unified ML System."""
from datetime import datetime
from typing import Any, List, Optional, Sequence, Tuple
import numpy as np
import pandas as pd
from app.models.energy import EnergyReading
from app.models.weather import WeatherReading

FEATURE_COLUMNS = [
    "hour", "day", "day_of_week", "month", "quarter", "week_of_year", "is_weekend",
    "hour_sin", "hour_cos", "month_sin", "month_cos",
    "temperature", "humidity", "pressure", "wind_speed",
    "temp_squared", "cooling_degree_load",
    "lag_1", "lag_2", "lag_3", "lag_24", "lag_48", "lag_168",
    "rolling_mean_3", "rolling_mean_6", "rolling_mean_12", "rolling_mean_24", "rolling_mean_168",
    "rolling_std_24",
]


def safe_numeric(value: Any, default: float = 0.0) -> float:
    if value is None or pd.isna(value):
        return float(default)
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def build_feature_dataframe(
    energy_records: Sequence[EnergyReading],
    weather_records: Sequence[WeatherReading]
) -> pd.DataFrame:
    """Constructs a clean chronological DataFrame with engineered features."""
    if not energy_records:
        return pd.DataFrame(columns=FEATURE_COLUMNS + ["timestamp", "consumption"])

    energy_df = pd.DataFrame([
        {
            "timestamp": rec.timestamp,
            "consumption": safe_numeric(rec.consumption, 0.0),
        }
        for rec in energy_records
    ]).sort_values("timestamp").reset_index(drop=True)

    if weather_records:
        weather_df = pd.DataFrame([
            {
                "timestamp": rec.timestamp,
                "temperature": safe_numeric(rec.temperature, 30.0),
                "humidity": safe_numeric(rec.humidity, 65.0),
                "pressure": safe_numeric(rec.pressure, 1013.0),
                "wind_speed": safe_numeric(rec.wind_speed, 10.0),
            }
            for rec in weather_records
        ]).sort_values("timestamp").reset_index(drop=True)

        energy_df = pd.merge_asof(
            energy_df.sort_values("timestamp"),
            weather_df,
            on="timestamp",
            direction="nearest",
            tolerance=pd.Timedelta(hours=2),
        )
    else:
        energy_df["temperature"] = 30.0
        energy_df["humidity"] = 65.0
        energy_df["pressure"] = 1013.0
        energy_df["wind_speed"] = 10.0

    energy_df["timestamp"] = pd.to_datetime(energy_df["timestamp"])
    
    # Cyclic & calendar features
    energy_df["hour"] = energy_df["timestamp"].dt.hour
    energy_df["day"] = energy_df["timestamp"].dt.day
    energy_df["day_of_week"] = energy_df["timestamp"].dt.dayofweek
    energy_df["month"] = energy_df["timestamp"].dt.month
    energy_df["quarter"] = energy_df["timestamp"].dt.quarter
    energy_df["week_of_year"] = energy_df["timestamp"].dt.isocalendar().week.astype(int)
    energy_df["is_weekend"] = (energy_df["day_of_week"] >= 5).astype(int)

    energy_df["hour_sin"] = np.sin(2 * np.pi * energy_df["hour"] / 24.0)
    energy_df["hour_cos"] = np.cos(2 * np.pi * energy_df["hour"] / 24.0)
    energy_df["month_sin"] = np.sin(2 * np.pi * energy_df["month"] / 12.0)
    energy_df["month_cos"] = np.cos(2 * np.pi * energy_df["month"] / 12.0)

    # Weather non-linear features
    energy_df["temperature"] = energy_df["temperature"].ffill().bfill().fillna(30.0)
    energy_df["humidity"] = energy_df["humidity"].ffill().bfill().fillna(65.0)
    energy_df["pressure"] = energy_df["pressure"].ffill().bfill().fillna(1013.0)
    energy_df["wind_speed"] = energy_df["wind_speed"].ffill().bfill().fillna(10.0)

    energy_df["temp_squared"] = energy_df["temperature"] ** 2
    # Cooling degree load above 26°C
    energy_df["cooling_degree_load"] = np.maximum(0.0, energy_df["temperature"] - 26.0)

    # Lag features
    for lag in [1, 2, 3, 24, 48, 168]:
        energy_df[f"lag_{lag}"] = energy_df["consumption"].shift(lag)

    # Rolling window statistics
    for window in [3, 6, 12, 24, 168]:
        energy_df[f"rolling_mean_{window}"] = energy_df["consumption"].shift(1).rolling(window=window, min_periods=1).mean()
    
    energy_df["rolling_std_24"] = energy_df["consumption"].shift(1).rolling(window=24, min_periods=1).std().fillna(0.0)

    # Clean fillna for edge cases
    energy_df[FEATURE_COLUMNS] = energy_df[FEATURE_COLUMNS].ffill().bfill().fillna(0.0)
    return energy_df


def build_future_feature_row(
    recent_values: List[float],
    timestamp: datetime,
    temperature: float,
    humidity: float,
    pressure: float,
    wind_speed: float
) -> dict:
    """Builds a single feature dict for one autoregressive prediction step."""
    hour = timestamp.hour
    month = timestamp.month
    day_of_week = timestamp.weekday()

    values = list(recent_values)
    row = {
        "hour": float(hour),
        "day": float(timestamp.day),
        "day_of_week": float(day_of_week),
        "month": float(month),
        "quarter": float(((month - 1) // 3) + 1),
        "week_of_year": float(timestamp.isocalendar().week),
        "is_weekend": float(1 if day_of_week >= 5 else 0),
        "hour_sin": float(np.sin(2 * np.pi * hour / 24.0)),
        "hour_cos": float(np.cos(2 * np.pi * hour / 24.0)),
        "month_sin": float(np.sin(2 * np.pi * month / 12.0)),
        "month_cos": float(np.cos(2 * np.pi * month / 12.0)),
        "temperature": float(temperature),
        "humidity": float(humidity),
        "pressure": float(pressure),
        "wind_speed": float(wind_speed),
        "temp_squared": float(temperature ** 2),
        "cooling_degree_load": float(max(0.0, temperature - 26.0)),
    }

    for lag in [1, 2, 3, 24, 48, 168]:
        row[f"lag_{lag}"] = float(values[-lag]) if len(values) >= lag else float(values[-1] if values else 0.0)

    for window in [3, 6, 12, 24, 168]:
        slice_vals = values[-window:] if values else [0.0]
        row[f"rolling_mean_{window}"] = float(np.mean(slice_vals)) if slice_vals else 0.0

    slice_24 = values[-24:] if values else [0.0]
    row["rolling_std_24"] = float(np.std(slice_24)) if len(slice_24) > 1 else 0.0

    return row
