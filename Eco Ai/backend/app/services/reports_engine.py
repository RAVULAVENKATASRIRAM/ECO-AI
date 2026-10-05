"""
Reports engine — compiles energy audit data from DB and generates structured report dicts scoped to active dataset.
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.energy import EnergyReading
from app.models.weather import WeatherReading
from app.models.alert import Alert
from app.models.report import ReportRecord
from app.services.analytics import _active_dataset, _scoped_energy_readings, _active_dataset_info


def generate_report(
    db: Session,
    report_type: str = "monthly",
    date_from: datetime = None,
    date_to: datetime = None,
    dataset_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Compile and persist a structured energy audit report scoped to active dataset.
    Returns the full report dict and the saved ReportRecord id.
    """
    dataset = _active_dataset(db, dataset_id)

    if date_to is None:
        date_to = datetime.now(timezone.utc).replace(tzinfo=None)
    if date_from is None:
        delta = {"weekly": 7, "monthly": 30, "quarterly": 90}.get(report_type, 30)
        date_from = date_to - timedelta(days=delta)

    # --- Energy stats scoped to dataset ---
    all_readings = _scoped_energy_readings(db, dataset)
    if all_readings:
        energy_rows = [r for r in all_readings if date_from <= r.timestamp <= date_to]
    else:
        energy_rows = (
            db.query(EnergyReading)
            .filter(EnergyReading.timestamp.between(date_from, date_to))
            .all()
        )

    values = [r.consumption for r in energy_rows]
    total_mwh = round(sum(values) / 1000, 2) if values else 0.0
    peak_mw = round(max(values), 2) if values else 0.0
    avg_mw = round(sum(values) / len(values), 2) if values else 0.0

    # --- Carbon & cost (grid emission factor 0.82 kg CO2 / kWh India) ---
    carbon_tonnes = round(total_mwh * 0.82, 2)
    cost_inr = round(total_mwh * 1000 * 8.0, 2)  # ₹8/kWh

    # --- Alerts in period ---
    alerts = (
        db.query(Alert)
        .filter(Alert.timestamp.between(date_from, date_to))
        .all()
    )
    num_alerts = len(alerts)
    num_anomalies = sum(1 for a in alerts if a.category == "anomaly")

    dataset_name = dataset.name if dataset else "Default Grid Telemetry"

    # --- Build summary ---
    title = f"{report_type.capitalize()} Energy Audit ({dataset_name}) — {date_from.strftime('%d %b')} to {date_to.strftime('%d %b %Y')}"
    summary = (
        f"Audit of dataset '{dataset_name}' from {date_from.strftime('%d %b %Y')} to {date_to.strftime('%d %b %Y')}. "
        f"Total consumption: {total_mwh:,.0f} MWh. "
        f"Peak demand: {peak_mw:.1f} MW. "
        f"Estimated carbon footprint: {carbon_tonnes:.1f} tonnes CO₂. "
        f"Estimated electricity cost: ₹{cost_inr:,.0f}. "
        f"Alerts raised: {num_alerts} ({num_anomalies} anomaly detections)."
    )

    record = ReportRecord(
        title=title,
        report_type=report_type,
        date_from=date_from,
        date_to=date_to,
        total_consumption_mwh=total_mwh,
        peak_demand_mw=peak_mw,
        avg_demand_mw=avg_mw,
        carbon_footprint_tonnes=carbon_tonnes,
        cost_inr=cost_inr,
        num_alerts=num_alerts,
        num_anomalies=num_anomalies,
        summary=summary,
        status="ready",
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "id": record.id,
        "title": title,
        "report_type": report_type,
        "date_from": date_from.isoformat(),
        "date_to": date_to.isoformat(),
        "total_consumption_mwh": total_mwh,
        "peak_demand_mw": peak_mw,
        "avg_demand_mw": avg_mw,
        "carbon_footprint_tonnes": carbon_tonnes,
        "cost_inr": cost_inr,
        "num_alerts": num_alerts,
        "num_anomalies": num_anomalies,
        "summary": summary,
        "generated_at": record.generated_at.isoformat(),
        "readings_count": len(energy_rows),
        "active_dataset": _active_dataset_info(dataset),
    }
