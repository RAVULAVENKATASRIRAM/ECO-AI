"""Future Intelligence Module — Eco AI.

Exclusively driven by the Unified ML System active model.
Predict. Monitor. Optimize. Save.
"""
from __future__ import annotations
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.alert import Alert
from app.models.appliance import Appliance, ApplianceReading
from app.models.recommendation import Recommendation
from app.models.ml_model import ALGORITHM_LABELS
from app.services.analytics import _active_dataset, _scoped_energy_readings, calculate_dashboard_kpis
from app.services.ml.service import ensure_default_active_model, get_synchronized_predictions
from app.services.ml.registry import get_active_model_record

router = APIRouter(prefix="/future-intelligence", tags=["Future Intelligence"])


def _safe_divide(numerator: float, denominator: float) -> float:
    if denominator in (None, 0):
        return 0.0
    return float(numerator) / float(denominator)


def _compute_historical_comparison(db: Session, dataset_id: Optional[int] = None) -> Dict[str, Any]:
    dataset = _active_dataset(db, dataset_id)
    readings = _scoped_energy_readings(db, dataset)
    if not readings:
        return {
            "current_usage": 0.0,
            "historical_average": 0.0,
            "difference": 0.0,
            "percentage_change": 0.0,
            "trend": "insufficient_data",
            "unit": "MW",
            "message": "Not enough historical data yet. Record more data to activate model learning.",
        }

    values = [float(item.consumption) for item in readings]
    current_usage = values[-1]
    baseline = values[:-1] if len(values) > 1 else values
    historical_average = sum(baseline) / len(baseline) if baseline else 0.0
    difference = current_usage - historical_average
    percentage_change = 0.0 if historical_average == 0 else (difference / historical_average) * 100.0

    if percentage_change > 0:
        trend = "above_recent_average"
    elif percentage_change < 0:
        trend = "below_recent_average"
    else:
        trend = "stable"

    return {
        "current_usage": round(current_usage, 2),
        "historical_average": round(historical_average, 2),
        "difference": round(difference, 2),
        "percentage_change": round(percentage_change, 2),
        "trend": trend,
        "unit": readings[-1].unit or "MW",
        "message": "Calculated from actual energy telemetry in the active dataset.",
    }


def _build_efficiency_summary(db: Session, dataset_id: Optional[int] = None) -> Dict[str, Any]:
    comparison = _compute_historical_comparison(db, dataset_id)
    current_usage = float(comparison["current_usage"])
    historical_average = float(comparison["historical_average"])
    deviation = abs(current_usage - historical_average) if historical_average else 0.0
    deviation_ratio = _safe_divide(deviation, historical_average) if historical_average else 0.0
    efficiency_score = max(0.0, min(100.0, 100.0 - (deviation_ratio * 120.0)))

    if current_usage > historical_average:
        explanation = "Current usage is higher than recent baseline, indicating elevated demand and lower relative efficiency."
    elif current_usage < historical_average:
        explanation = "Current usage is below the recent baseline, indicating efficient operation relative to normal demand."
    else:
        explanation = "Current usage is perfectly aligned with recent historical baseline."

    return {
        "score": round(efficiency_score, 2),
        "formula": "Efficiency Score = 100 - (abs(current - baseline) / baseline × 120), bounded [0, 100]",
        "explanation": explanation,
        "current_usage": comparison["current_usage"],
        "historical_average": comparison["historical_average"],
        "unit": comparison["unit"],
    }


def _build_top_appliances(db: Session, dataset_id: Optional[int] = None) -> List[Dict[str, Any]]:
    appliances = db.query(Appliance).all()
    if not appliances:
        return []

    totals: List[Dict[str, Any]] = []
    total_energy = 0.0
    for appliance in appliances:
        energy_total = (
            db.query(ApplianceReading)
            .filter(ApplianceReading.appliance_id == appliance.id)
            .with_entities(func.coalesce(func.sum(ApplianceReading.energy), 0.0))
            .scalar()
        ) or 0.0
        total_energy += float(energy_total)
        latest = (
            db.query(ApplianceReading)
            .filter(ApplianceReading.appliance_id == appliance.id)
            .order_by(ApplianceReading.timestamp.desc())
            .first()
        )
        totals.append({
            "id": appliance.id,
            "name": appliance.name,
            "type": appliance.type,
            "total_energy_kwh": float(energy_total),
            "current_power_w": float(latest.power) if latest else 0.0,
            "share_of_total": 0.0,
        })

    if total_energy <= 0:
        return []

    top = []
    for item in sorted(totals, key=lambda it: it["total_energy_kwh"], reverse=True)[:5]:
        item["share_of_total"] = round((item["total_energy_kwh"] / total_energy) * 100.0, 2)
        item["current_usage_kwh"] = round(item["total_energy_kwh"], 2)
        item["unit"] = "kWh"
        top.append(item)
    return top


def _build_alerts(db: Session) -> List[Dict[str, Any]]:
    alerts = db.query(Alert).order_by(Alert.timestamp.desc()).limit(5).all()
    return [
        {
            "id": alert.id,
            "title": alert.title,
            "message": alert.message,
            "severity": alert.severity,
            "category": alert.category,
            "status": alert.status,
            "timestamp": alert.timestamp.isoformat(),
        }
        for alert in alerts
    ]


def _build_recommendations(db: Session) -> List[Dict[str, Any]]:
    recs = db.query(Recommendation).filter(Recommendation.status == "active").order_by(Recommendation.estimated_kwh_saving.desc()).limit(5).all()
    return [
        {
            "id": rec.id,
            "title": rec.title,
            "reason": rec.description,
            "evidence": f"Estimated impact: {rec.estimated_kwh_saving} kWh saved / ₹{rec.estimated_cost_saving} cost reduction.",
            "action": rec.action_text,
            "estimated_impact_kwh": rec.estimated_kwh_saving,
            "estimated_cost_saving": rec.estimated_cost_saving,
            "status": rec.status,
        }
        for rec in recs
    ]


def _build_prediction_payload(db: Session, dataset_id: Optional[int] = None) -> Dict[str, Any]:
    """Retrieves synchronized prediction exclusively from the active unified ML model."""
    active_model = ensure_default_active_model(db, dataset_id)
    canonical = get_synchronized_predictions(db, horizon_hours=24, dataset_id=dataset_id)

    model_dict = canonical.get("model") or (active_model.to_dict() if active_model else {})
    pred_data = canonical.get("prediction", {})
    metrics = canonical.get("metrics", {})
    forecast_points = canonical.get("forecast_points", [])

    return {
        "predicted_usage": pred_data.get("value", 0.0),
        "average_hourly_mw": pred_data.get("average_hourly_mw", 0.0),
        "peak_forecast_mw": pred_data.get("peak_forecast_mw", 0.0),
        "peak_hour": pred_data.get("peak_hour", "N/A"),
        "horizon": "24h",
        "unit": "MW",
        "algorithm": model_dict.get("algorithm", "random_forest"),
        "algorithm_label": model_dict.get("algorithm_label", ALGORITHM_LABELS.get(model_dict.get("algorithm", ""), "Random Forest Regressor")),
        "model_version": model_dict.get("model_version", 1),
        "version_tag": f"v{model_dict.get('model_version', 1)}",
        "training_data_count": model_dict.get("training_record_count", 0),
        "last_model_update": model_dict.get("updated_at") or canonical.get("generated_at"),
        "message": f"Generated using active {model_dict.get('algorithm_label', 'ML model')} (v{model_dict.get('model_version', 1)}).",
        "metrics": {
            "mae": metrics.get("mae"),
            "rmse": metrics.get("rmse"),
            "mape": metrics.get("mape"),
            "r_squared": metrics.get("r_squared") or metrics.get("r2"),
            "r2": metrics.get("r2") or metrics.get("r_squared"),
        },
        "forecast_points": forecast_points,
        "history_series": canonical.get("history_series", []),
        "evaluation_series": model_dict.get("evaluation_series", {}),
        "feature_importance": model_dict.get("feature_importance", []),
        "coefficients": model_dict.get("coefficients", []),
    }


def _build_cost_prediction(db: Session, prediction: Dict[str, Any], dataset_id: Optional[int] = None) -> Dict[str, Any]:
    """Calculates granular dynamic Time-of-Day (ToD) tariff & AI cost predictions based on active ML forecast points."""
    BASE_RATE = 7.50
    PEAK_RATE = 10.50
    OFFPEAK_RATE = 5.80

    forecast_points = prediction.get("forecast_points", [])
    hourly_cost_series = []

    total_projected_cost = 0.0
    total_projected_mwh = 0.0
    peak_cost_sum = 0.0
    offpeak_cost_sum = 0.0
    peak_hours_count = 0

    for pt in forecast_points:
        hour = int(pt.get("hour", 0))
        load_mw = float(pt.get("forecast_mw", 0.0))
        is_peak = bool(pt.get("is_peak", False) or (18 <= hour <= 22) or (load_mw >= 820.0))
        is_offpeak = bool(23 <= hour or hour <= 6)

        if is_peak:
            rate = PEAK_RATE
            tier = "peak"
            peak_hours_count += 1
        elif is_offpeak:
            rate = OFFPEAK_RATE
            tier = "off_peak"
        else:
            rate = BASE_RATE
            tier = "standard"

        # Cost = MW * 1000 kWh * rate (INR)
        cost_inr = load_mw * 1000.0 * rate
        total_projected_cost += cost_inr
        total_projected_mwh += load_mw

        if is_peak:
            peak_cost_sum += cost_inr
        elif is_offpeak:
            offpeak_cost_sum += cost_inr

        hourly_cost_series.append({
            "timestamp": pt.get("timestamp"),
            "hour": hour,
            "forecast_mw": round(load_mw, 2),
            "rate_per_kwh": rate,
            "cost_inr": round(cost_inr, 2),
            "cost_inr_lakhs": round(cost_inr / 100000.0, 3),
            "tier": tier,
            "is_peak": is_peak,
        })

    # Historical daily baseline calculation
    kpis = calculate_dashboard_kpis(db, dataset_id)
    today_consumption = float(kpis.get("todays_consumption", 0.0))
    avg_consumption = float(kpis.get("average_consumption", 0.0))

    today_cost_inr = today_consumption * 1000.0 * BASE_RATE
    historical_daily_cost_inr = (avg_consumption * 24.0) * 1000.0 * BASE_RATE

    cost_difference_inr = total_projected_cost - historical_daily_cost_inr
    cost_percentage_change = 0.0 if historical_daily_cost_inr == 0 else (cost_difference_inr / historical_daily_cost_inr) * 100.0

    # 30-day projection
    projected_monthly_bill_inr = total_projected_cost * 30.0

    # Potential AI optimization savings (15% reduction during peak surcharge hours + 4% base efficiency)
    potential_daily_savings_inr = (peak_cost_sum * 0.15) + (total_projected_cost * 0.04)
    potential_monthly_savings_inr = potential_daily_savings_inr * 30.0

    peak_cost_share_pct = round((peak_cost_sum / total_projected_cost * 100.0), 1) if total_projected_cost > 0 else 0.0
    offpeak_cost_share_pct = round((offpeak_cost_sum / total_projected_cost * 100.0), 1) if total_projected_cost > 0 else 0.0

    return {
        "projected_24h_cost_inr": round(total_projected_cost, 2),
        "projected_24h_cost_lakhs": round(total_projected_cost / 100000.0, 2),
        "today_cost_inr": round(today_cost_inr, 2),
        "historical_daily_cost_inr": round(historical_daily_cost_inr, 2),
        "cost_difference_inr": round(cost_difference_inr, 2),
        "cost_percentage_change": round(cost_percentage_change, 2),
        "projected_monthly_bill_inr": round(projected_monthly_bill_inr, 2),
        "projected_monthly_bill_lakhs": round(projected_monthly_bill_inr / 100000.0, 2),
        "potential_daily_savings_inr": round(potential_daily_savings_inr, 2),
        "potential_monthly_savings_inr": round(potential_monthly_savings_inr, 2),
        "peak_cost_sum_inr": round(peak_cost_sum, 2),
        "offpeak_cost_sum_inr": round(offpeak_cost_sum, 2),
        "peak_cost_share_pct": peak_cost_share_pct,
        "offpeak_cost_share_pct": offpeak_cost_share_pct,
        "peak_hours_count": peak_hours_count,
        "currency": "INR",
        "currency_symbol": "₹",
        "tariff_structure": {
            "base_rate_per_kwh": BASE_RATE,
            "peak_rate_per_kwh": PEAK_RATE,
            "offpeak_rate_per_kwh": OFFPEAK_RATE,
            "currency": "INR",
            "unit": "₹/kWh",
            "policy": "Time of Day (ToD) Industrial/Commercial Tariff",
        },
        "hourly_cost_series": hourly_cost_series,
        "explanation": f"Next 24h electricity cost is projected at ₹{total_projected_cost:,.0f} ({round(total_projected_cost/100000.0, 2)} Lakhs) based on {prediction.get('algorithm_label')} forecasts. Peak surcharge windows account for {peak_cost_share_pct}% of the total bill. Implementing recommended peak load shifting can save ~₹{potential_monthly_savings_inr:,.0f}/month.",
    }


@router.get("/overview")
def future_intelligence_overview(
    dataset_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """Consolidated overview for Future Intelligence, synchronized with the active ML model."""
    current_usage = calculate_dashboard_kpis(db, dataset_id)
    comparison = _compute_historical_comparison(db, dataset_id)
    prediction = _build_prediction_payload(db, dataset_id)
    cost_pred = _build_cost_prediction(db, prediction, dataset_id)
    efficiency = _build_efficiency_summary(db, dataset_id)
    appliances = _build_top_appliances(db, dataset_id)
    alerts = _build_alerts(db)
    recommendations = _build_recommendations(db)

    return {
        "current_usage": {
            "label": "Current Usage",
            "value": float(current_usage.get("current_energy_usage", 0.0)),
            "unit": current_usage.get("unit", "MW"),
            "today": float(current_usage.get("todays_consumption", 0.0)),
            "average": float(current_usage.get("average_consumption", 0.0)),
            "peak": float(current_usage.get("peak_consumption", 0.0)),
            "timestamp": current_usage.get("timestamp"),
        },
        "historical_comparison": comparison,
        "future_prediction": prediction,
        "cost_prediction": cost_pred,
        "efficiency": efficiency,
        "top_appliances": appliances,
        "alerts": alerts,
        "recommendations": recommendations,
        "model_status": {
            "algorithm": prediction.get("algorithm", "random_forest"),
            "algorithm_label": prediction.get("algorithm_label", "Random Forest Regressor"),
            "model_version": prediction.get("model_version", 1),
            "version_tag": prediction.get("version_tag", "v1"),
            "last_updated": prediction.get("last_model_update"),
            "training_data_count": prediction.get("training_data_count", 0),
            "metrics": prediction.get("metrics", {}),
            "status": "active",
        },
        "data_status": {
            "ready": bool(prediction.get("training_data_count", 0) > 0),
            "message": prediction.get("message", "Data is ready."),
        },
    }


@router.get("/current")
def current_usage(dataset_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    data = calculate_dashboard_kpis(db, dataset_id)
    return {
        "current_usage": float(data.get("current_energy_usage", 0.0)),
        "todays_usage": float(data.get("todays_consumption", 0.0)),
        "average_usage": float(data.get("average_consumption", 0.0)),
        "peak_usage": float(data.get("peak_consumption", 0.0)),
        "unit": data.get("unit", "MW"),
        "timestamp": data.get("timestamp"),
    }


@router.get("/history")
def usage_history(dataset_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    dataset = _active_dataset(db, dataset_id)
    readings = _scoped_energy_readings(db, dataset)
    return [
        {
            "timestamp": item.timestamp.isoformat(),
            "consumption": float(item.consumption),
            "unit": item.unit,
        }
        for item in readings[-50:]
    ]


@router.get("/comparison")
def usage_comparison(dataset_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    return _compute_historical_comparison(db, dataset_id)


@router.get("/prediction")
def prediction(dataset_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    return _build_prediction_payload(db, dataset_id)


@router.get("/cost-prediction")
def cost_prediction_endpoint(dataset_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Dedicated endpoint returning Time-of-Day cost predictions & tariff analysis."""
    pred = _build_prediction_payload(db, dataset_id)
    return _build_cost_prediction(db, pred, dataset_id)


@router.get("/appliances")
def appliances(dataset_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    return _build_top_appliances(db, dataset_id)


@router.get("/efficiency")
def efficiency(dataset_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    return _build_efficiency_summary(db, dataset_id)


@router.get("/alerts")
def ai_alerts(db: Session = Depends(get_db)):
    return _build_alerts(db)


@router.get("/recommendations")
def future_recommendations(db: Session = Depends(get_db)):
    return _build_recommendations(db)


@router.post("/sync")
def sync_future_intelligence(dataset_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Synchronizes Future Intelligence with the latest active ML model and dataset."""
    ensure_default_active_model(db, dataset_id)
    pred = _build_prediction_payload(db, dataset_id)
    cost_pred = _build_cost_prediction(db, pred, dataset_id)
    return {
        "status": "success",
        "dataset_id": dataset_id,
        "message": f"Future Intelligence synchronized with active model: {pred.get('algorithm_label')} ({pred.get('version_tag')}).",
        "prediction": pred,
        "cost_prediction": cost_pred,
    }
