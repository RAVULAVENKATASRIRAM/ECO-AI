"""
Anomaly detector service — scans recent energy readings for z-score spikes
and generates alert records in the database scoped to the active dataset.
"""
import math
import random
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.energy import EnergyReading
from app.models.alert import Alert
from app.services.analytics import _active_dataset, _scoped_energy_readings, _active_dataset_info


def _z_score(value: float, mean: float, std: float) -> float:
    if std == 0:
        return 0.0
    return abs(value - mean) / std


def run_anomaly_scan(db: Session, dataset_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Scan energy readings of the active dataset for anomalies.
    Creates new Alert records for any detected spikes.
    Returns summary dict.
    """
    dataset = _active_dataset(db, dataset_id)
    readings = _scoped_energy_readings(db, dataset)

    if not readings:
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=48)
        readings = (
            db.query(EnergyReading)
            .filter(EnergyReading.timestamp >= cutoff)
            .order_by(EnergyReading.timestamp.asc())
            .all()
        )

    if len(readings) < 5:
        return {"scanned": 0, "anomalies_found": 0, "active_dataset": _active_dataset_info(dataset)}

    values = [r.consumption for r in readings]
    mean_v = sum(values) / len(values)
    variance = sum((v - mean_v) ** 2 for v in values) / len(values)
    std_v = math.sqrt(variance)

    anomalies_found = 0
    for r in readings:
        z = _z_score(r.consumption, mean_v, std_v)
        if z > 2.8:
            existing = (
                db.query(Alert)
                .filter(Alert.metric == "current_load", Alert.metric_value == r.consumption)
                .first()
            )
            if not existing:
                severity = "critical" if z > 3.5 else "warning"
                alert = Alert(
                    title=f"Anomalous Load Detected: {r.consumption:.1f} MW",
                    message=(
                        f"Energy consumption of {r.consumption:.1f} MW at "
                        f"{r.timestamp.strftime('%Y-%m-%d %H:%M')} is {z:.1f}σ "
                        f"above the baseline mean of {mean_v:.1f} MW."
                    ),
                    severity=severity,
                    category="anomaly",
                    metric="current_load",
                    metric_value=round(r.consumption, 2),
                    threshold=round(mean_v + 2.8 * std_v, 2),
                    timestamp=r.timestamp,
                )
                db.add(alert)
                anomalies_found += 1

    db.commit()
    return {
        "scanned": len(readings),
        "anomalies_found": anomalies_found,
        "mean_mw": round(mean_v, 2),
        "std_mw": round(std_v, 2),
        "active_dataset": _active_dataset_info(dataset),
    }
