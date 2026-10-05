import math
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, asc
from app.models.energy import EnergyReading
from app.models.weather import WeatherReading
from app.models.appliance import Appliance, ApplianceReading
from app.models.dataset import Dataset
from app.models.setting import Setting


def _active_dataset(db: Session, dataset_id: Optional[int] = None) -> Optional[Dataset]:
    if dataset_id is not None:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if dataset:
            return dataset

    setting = db.query(Setting).filter(Setting.key == "active_dataset_id").first()
    active_id = int(setting.value) if setting and setting.value.isdigit() else None
    dataset = db.query(Dataset).filter(Dataset.id == active_id).first() if active_id else None
    return dataset or db.query(Dataset).order_by(desc(Dataset.created_at)).first()


def _active_dataset_info(dataset: Optional[Dataset]) -> Dict[str, Any]:
    if not dataset:
        return {"id": None, "name": "No dataset selected", "type": None, "filename": None}
    return {
        "id": dataset.id,
        "name": dataset.name,
        "type": dataset.type,
        "filename": dataset.filename,
        "source": dataset.source,
        "row_count": dataset.row_count,
        "date_start": dataset.date_start.isoformat() if dataset.date_start else None,
        "date_end": dataset.date_end.isoformat() if dataset.date_end else None,
    }


def _scoped_energy_readings(db: Session, dataset: Optional[Dataset]) -> List[EnergyReading]:
    if not dataset:
        return []
    if dataset.type not in ("energy", "combined"):
        return []

    # First check explicitly tagged dataset_id
    records = db.query(EnergyReading).filter(
        EnergyReading.dataset_id == dataset.id
    ).order_by(asc(EnergyReading.timestamp)).all()

    if records:
        return records

    # Fallback for demo datasets before migration/backfill
    query = db.query(EnergyReading)
    if dataset.date_start:
        query = query.filter(EnergyReading.timestamp >= dataset.date_start)
    if dataset.date_end:
        query = query.filter(EnergyReading.timestamp <= dataset.date_end)
    if dataset.source != "User Upload":
        query = query.filter(EnergyReading.source.like("%Synthetic%"))
    return query.order_by(asc(EnergyReading.timestamp)).all()


def _scoped_weather_readings(db: Session, dataset: Optional[Dataset]) -> List[WeatherReading]:
    if not dataset:
        return []
    if dataset.type not in ("weather", "combined"):
        return []

    # First check explicitly tagged dataset_id
    records = db.query(WeatherReading).filter(
        WeatherReading.dataset_id == dataset.id
    ).order_by(asc(WeatherReading.timestamp)).all()

    if records:
        return records

    # Fallback for demo datasets before migration/backfill
    query = db.query(WeatherReading)
    if dataset.date_start:
        query = query.filter(WeatherReading.timestamp >= dataset.date_start)
    if dataset.date_end:
        query = query.filter(WeatherReading.timestamp <= dataset.date_end)
    if dataset.source != "User Upload":
        query = query.filter(WeatherReading.source.like("%Synthetic%"))
    return query.order_by(asc(WeatherReading.timestamp)).all()


def calculate_dashboard_kpis(db: Session, dataset_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Computes real KPIs dynamically scoped to the active/selected dataset.
    """
    dataset = _active_dataset(db, dataset_id)
    energy_list = _scoped_energy_readings(db, dataset)
    weather_list = _scoped_weather_readings(db, dataset)

    # Fallback to any available readings if neither found in active dataset
    if not energy_list and (not dataset or dataset.type not in ("weather", "appliance")):
        energy_list = db.query(EnergyReading).order_by(asc(EnergyReading.timestamp)).all()
    if not weather_list and (not dataset or dataset.type not in ("energy", "appliance")):
        weather_list = db.query(WeatherReading).order_by(asc(WeatherReading.timestamp)).all()

    current_energy = 0.0
    unit = "MW"
    todays_consumption = 0.0
    avg_consumption = 0.0
    peak_consumption = 0.0
    latest_ts = datetime.now(timezone.utc).replace(tzinfo=None)
    total_readings = 0

    if energy_list:
        latest_energy = energy_list[-1]
        current_energy = round(latest_energy.consumption, 2)
        unit = latest_energy.unit or "MW"
        latest_ts = latest_energy.timestamp

        latest_date = latest_energy.timestamp.date()
        todays_consumption = round(
            sum(r.consumption for r in energy_list if r.timestamp.date() == latest_date), 2
        )

        consumptions = [r.consumption for r in energy_list]
        avg_consumption = round(sum(consumptions) / len(consumptions), 2)
        peak_consumption = round(max(consumptions), 2)
        total_readings = len(energy_list)

    latest_temp = None
    latest_humidity = None
    if weather_list:
        latest_weather = weather_list[-1]
        latest_temp = round(float(latest_weather.temperature), 1)
        latest_humidity = round(float(latest_weather.humidity), 1)
        if not energy_list:
            latest_ts = latest_weather.timestamp
            total_readings = len(weather_list)

    return {
        "active_dataset": _active_dataset_info(dataset),
        "current_energy_usage": current_energy,
        "unit": unit,
        "todays_consumption": todays_consumption,
        "average_consumption": avg_consumption,
        "peak_consumption": peak_consumption,
        "latest_temperature": latest_temp if latest_temp is not None else 0.0,
        "latest_humidity": latest_humidity if latest_humidity is not None else 0.0,
        "timestamp": latest_ts,
        "total_readings": total_readings,
        "has_energy": len(energy_list) > 0,
        "has_weather": len(weather_list) > 0,
    }


def get_energy_trend(
    db: Session,
    period: str = "7d",
    dataset_id: Optional[int] = None,
    start_dt: Optional[datetime] = None,
    end_dt: Optional[datetime] = None
) -> List[Dict[str, Any]]:
    """
    Returns time series with energy, temperature, and humidity scoped to the active/selected dataset.
    """
    dataset = _active_dataset(db, dataset_id)
    energy_records = _scoped_energy_readings(db, dataset)
    if not energy_records:
        if not dataset or dataset.type == "energy":
            energy_records = db.query(EnergyReading).order_by(asc(EnergyReading.timestamp)).all()

    if not energy_records:
        return []

    max_timestamp = energy_records[-1].timestamp

    if period == "24h":
        min_timestamp = max_timestamp - timedelta(hours=24)
    elif period == "7d":
        min_timestamp = max_timestamp - timedelta(days=7)
    elif period == "30d":
        min_timestamp = max_timestamp - timedelta(days=30)
    elif period == "custom" and start_dt and end_dt:
        min_timestamp = start_dt
        max_timestamp = end_dt
    else:
        min_timestamp = max_timestamp - timedelta(days=7)

    # Filter within window
    filtered_energy = [
        e for e in energy_records if min_timestamp <= e.timestamp <= max_timestamp
    ]
    # If filtered is empty (e.g. historical span is smaller than requested), fall back to all
    if not filtered_energy:
        filtered_energy = energy_records[-50:]

    # Get weather records in same time window
    weather_records = _scoped_weather_readings(db, dataset)
    if not weather_records:
        weather_records = db.query(WeatherReading).filter(
            WeatherReading.timestamp >= min_timestamp,
            WeatherReading.timestamp <= max_timestamp
        ).all()
    weather_map = {w.timestamp.strftime("%Y-%m-%d %H:%M"): w for w in weather_records}

    result = []
    for e in filtered_energy:
        key = e.timestamp.strftime("%Y-%m-%d %H:%M")
        w = weather_map.get(key)
        result.append({
            "timestamp": key,
            "consumption": round(e.consumption, 2),
            "unit": e.unit,
            "temperature": round(w.temperature, 1) if w else None,
            "humidity": round(w.humidity, 1) if w else None
        })

    return result


def get_temp_vs_energy_correlation(
    db: Session,
    dataset_id: Optional[int] = None,
    limit: int = 500
) -> List[Dict[str, Any]]:
    """
    Returns matched temperature and energy consumption points for scatter / correlation analysis.
    """
    dataset = _active_dataset(db, dataset_id)
    energy_records = _scoped_energy_readings(db, dataset)
    weather_records = _scoped_weather_readings(db, dataset)

    if not energy_records:
        energy_records = db.query(EnergyReading).order_by(desc(EnergyReading.timestamp)).limit(limit).all()
    if not weather_records:
        weather_records = db.query(WeatherReading).order_by(desc(WeatherReading.timestamp)).limit(limit).all()

    weather_by_time = {w.timestamp: w for w in weather_records}
    points = []
    for e in energy_records:
        w = weather_by_time.get(e.timestamp)
        if w:
            points.append({
                "timestamp": e.timestamp.strftime("%Y-%m-%d %H:%M"),
                "temperature": round(w.temperature, 1),
                "consumption": round(e.consumption, 2),
                "humidity": round(w.humidity, 1),
                "weather_condition": w.weather_condition
            })
            if len(points) >= limit:
                break

    # If no exact timestamp matches found between scoped readings, pair by nearest or available
    if not points and energy_records and weather_records:
        paired_count = min(len(energy_records), len(weather_records), limit)
        for i in range(paired_count):
            e = energy_records[i]
            w = weather_records[i]
            points.append({
                "timestamp": e.timestamp.strftime("%Y-%m-%d %H:%M"),
                "temperature": round(w.temperature, 1),
                "consumption": round(e.consumption, 2),
                "humidity": round(w.humidity, 1),
                "weather_condition": w.weather_condition
            })

    return points


def get_daily_energy_consumption(
    db: Session,
    dataset_id: Optional[int] = None,
    days: int = 30
) -> List[Dict[str, Any]]:
    """
    Aggregates energy consumption day by day from actual database readings.
    """
    dataset = _active_dataset(db, dataset_id)
    energy_records = _scoped_energy_readings(db, dataset)
    if not energy_records:
        if not dataset or dataset.type == "energy":
            energy_records = db.query(EnergyReading).order_by(asc(EnergyReading.timestamp)).all()

    if not energy_records:
        return []

    # Group by date
    grouped: Dict[str, List[float]] = defaultdict(list)
    for e in energy_records:
        day_str = e.timestamp.strftime("%Y-%m-%d")
        grouped[day_str].append(e.consumption)

    # Weather map by date
    weather_records = _scoped_weather_readings(db, dataset)
    if not weather_records:
        weather_records = db.query(WeatherReading).all()
    temp_grouped: Dict[str, List[float]] = defaultdict(list)
    for w in weather_records:
        day_str = w.timestamp.strftime("%Y-%m-%d")
        temp_grouped[day_str].append(w.temperature)

    sorted_days = sorted(grouped.keys())[-days:]
    result = []
    for day_str in sorted_days:
        loads = grouped[day_str]
        temps = temp_grouped.get(day_str, [])
        result.append({
            "date": day_str,
            "total_consumption": round(sum(loads), 2),
            "avg_consumption": round(sum(loads) / len(loads), 2),
            "peak_consumption": round(max(loads), 2),
            "avg_temperature": round(sum(temps) / len(temps), 1) if temps else 0.0
        })

    return result


def get_appliance_energy_distribution(
    db: Session,
    dataset_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Calculates percentage distribution of energy consumption by appliance scoped to active dataset.
    """
    dataset = _active_dataset(db, dataset_id)

    # Find appliances
    q_app = db.query(Appliance)
    if dataset and dataset.type == "appliance":
        q_app = q_app.filter(Appliance.dataset_id == dataset.id)
    appliances = q_app.all()

    if not appliances:
        appliances = db.query(Appliance).all()

    if not appliances:
        return []

    app_ids = [a.id for a in appliances]

    # Sum energy
    q_readings = db.query(
        ApplianceReading.appliance_id,
        func.sum(ApplianceReading.energy).label("total_energy")
    ).filter(ApplianceReading.appliance_id.in_(app_ids))

    if dataset and dataset.type == "appliance":
        q_readings = q_readings.filter(ApplianceReading.dataset_id == dataset.id)

    totals = q_readings.group_by(ApplianceReading.appliance_id).all()
    energy_map = {app_id: float(tot or 0.0) for app_id, tot in totals}
    grand_total = sum(energy_map.values()) or 1.0

    distribution = []
    for app in appliances:
        tot_kwh = energy_map.get(app.id, 0.0)
        percentage = round((tot_kwh / grand_total) * 100.0, 2)
        distribution.append({
            "id": app.id,
            "name": app.name,
            "type": app.type,
            "rated_power_w": app.rated_power,
            "total_energy_kwh": round(tot_kwh, 2),
            "percentage": percentage,
            "status": app.status
        })

    distribution.sort(key=lambda x: x["percentage"], reverse=True)
    return distribution


def calculate_pearson_correlation(x_vals: List[float], y_vals: List[float]) -> float:
    """Calculates Pearson r correlation coefficient."""
    n = len(x_vals)
    if n < 2:
        return 0.0
    mean_x = sum(x_vals) / n
    mean_y = sum(y_vals) / n

    cov = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_vals, y_vals))
    std_x = math.sqrt(sum((x - mean_x) ** 2 for x in x_vals))
    std_y = math.sqrt(sum((y - mean_y) ** 2 for y in y_vals))

    if std_x == 0 or std_y == 0:
        return 0.0
    return round(cov / (std_x * std_y), 3)


def get_energy_analytics_deep(db: Session, dataset_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Detailed analytics for the Energy Analytics page:
    - Peak vs Off-Peak hours consumption
    - Hourly average profile (00:00 to 23:00) comparing Weekday vs Weekend
    - Load Duration Curve data (sorted consumption values)
    """
    dataset = _active_dataset(db, dataset_id)
    all_readings = _scoped_energy_readings(db, dataset)
    if not all_readings:
        return {
            "active_dataset": _active_dataset_info(dataset),
            "available": False,
            "message": f"The active dataset '{dataset.name if dataset else 'None'}' is not an Energy or Combined dataset.",
            "total_energy_mw_sum": 0.0,
            "peak_energy": 0.0,
            "peak_percentage": 0.0,
            "offpeak_energy": 0.0,
            "offpeak_percentage": 0.0,
            "hourly_curve": [],
            "load_duration_curve": [],
            "highest_recorded": 0.0,
            "lowest_recorded": 0.0,
        }

    peak_energy = 0.0
    offpeak_energy = 0.0
    weekday_hourly = {h: [] for h in range(24)}
    weekend_hourly = {h: [] for h in range(24)}
    all_loads = []

    for r in all_readings:
        all_loads.append(r.consumption)
        h = r.timestamp.hour
        is_weekend = r.timestamp.weekday() >= 5

        # Classify peak vs offpeak: 10:00 - 16:00 (cooling) & 18:00 - 22:00 (evening)
        if (10 <= h <= 16) or (18 <= h <= 22):
            peak_energy += r.consumption
        else:
            offpeak_energy += r.consumption

        if is_weekend:
            weekend_hourly[h].append(r.consumption)
        else:
            weekday_hourly[h].append(r.consumption)

    total_energy = peak_energy + offpeak_energy
    peak_percentage = round((peak_energy / (total_energy or 1.0)) * 100.0, 1)
    offpeak_percentage = round((offpeak_energy / (total_energy or 1.0)) * 100.0, 1)

    # Hourly 24h curve comparison
    hourly_curve = []
    for h in range(24):
        wd_avg = sum(weekday_hourly[h]) / (len(weekday_hourly[h]) or 1)
        we_avg = sum(weekend_hourly[h]) / (len(weekend_hourly[h]) or 1)
        hourly_curve.append({
            "hour": f"{h:02d}:00",
            "weekday_avg": round(wd_avg, 2),
            "weekend_avg": round(we_avg, 2),
            "overall_avg": round((wd_avg + we_avg) / 2.0, 2)
        })

    # Load duration curve (descending sorted loads)
    all_loads.sort(reverse=True)
    step = max(1, len(all_loads) // 50)
    sampled_ldc = [
        {
            "percentile": round((i / len(all_loads)) * 100.0, 1),
            "load_mw": round(all_loads[i], 2)
        }
        for i in range(0, len(all_loads), step)
    ]

    return {
        "active_dataset": _active_dataset_info(dataset),
        "available": True,
        "total_energy_mw_sum": round(total_energy, 2),
        "peak_energy": round(peak_energy, 2),
        "peak_percentage": peak_percentage,
        "offpeak_energy": round(offpeak_energy, 2),
        "offpeak_percentage": offpeak_percentage,
        "hourly_curve": hourly_curve,
        "load_duration_curve": sampled_ldc,
        "highest_recorded": round(all_loads[0], 2) if all_loads else 0.0,
        "lowest_recorded": round(all_loads[-1], 2) if all_loads else 0.0
    }


def get_weather_analytics_deep(db: Session, dataset_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Detailed analytics for the Weather page:
    - Weather overview and averages
    - Condition frequency breakdown
    - Temperature vs Energy correlation coefficient
    - Heat Index impact estimate
    """
    dataset = _active_dataset(db, dataset_id)
    weather_list = _scoped_weather_readings(db, dataset)
    if not weather_list:
        return {
            "active_dataset": _active_dataset_info(dataset),
            "available": False,
            "message": f"The active dataset '{dataset.name if dataset else 'None'}' is not a Weather or Combined dataset.",
            "current_temperature": 0.0,
            "current_humidity": 0.0,
            "current_wind_speed": 0.0,
            "current_condition": "No weather data",
            "avg_temperature": 0.0,
            "max_temperature": 0.0,
            "min_temperature": 0.0,
            "avg_humidity": 0.0,
            "avg_wind_speed": 0.0,
            "temp_energy_correlation": 0.0,
            "humidity_energy_correlation": 0.0,
            "condition_distribution": {},
            "cooling_degree_sensitivity": "Unavailable",
        }

    temps = [w.temperature for w in weather_list]
    humidities = [w.humidity for w in weather_list]
    winds = [w.wind_speed for w in weather_list]

    # Condition count
    cond_counts: Dict[str, int] = {}
    for w in weather_list:
        cond_counts[w.weather_condition] = cond_counts.get(w.weather_condition, 0) + 1

    # Correlate with Energy readings matching timestamps
    energy_list = _scoped_energy_readings(db, dataset)
    if not energy_list:
        energy_list = db.query(EnergyReading).all()

    energy_by_timestamp = {reading.timestamp: reading for reading in energy_list}
    joined = [
        (weather.temperature, weather.humidity, energy_by_timestamp[weather.timestamp].consumption)
        for weather in weather_list
        if weather.timestamp in energy_by_timestamp
    ]

    if joined:
        j_temps = [r[0] for r in joined]
        j_loads = [r[2] for r in joined]
        temp_corr = calculate_pearson_correlation(j_temps, j_loads)

        j_humids = [r[1] for r in joined]
        humid_corr = calculate_pearson_correlation(j_humids, j_loads)
    else:
        temp_corr = 0.0
        humid_corr = 0.0

    latest = weather_list[-1]

    return {
        "active_dataset": _active_dataset_info(dataset),
        "available": True,
        "current_temperature": latest.temperature,
        "current_humidity": latest.humidity,
        "current_wind_speed": latest.wind_speed,
        "current_condition": latest.weather_condition,
        "avg_temperature": round(sum(temps) / len(temps), 1),
        "max_temperature": round(max(temps), 1),
        "min_temperature": round(min(temps), 1),
        "avg_humidity": round(sum(humidities) / len(humidities), 1),
        "avg_wind_speed": round(sum(winds) / len(winds), 1),
        "temp_energy_correlation": temp_corr,
        "humidity_energy_correlation": humid_corr,
        "condition_distribution": cond_counts,
        "cooling_degree_sensitivity": "High (Positive r = " + str(temp_corr) + ")" if temp_corr > 0.5 else ("Moderate (r = " + str(temp_corr) + ")" if temp_corr > 0 else "Low/None")
    }
