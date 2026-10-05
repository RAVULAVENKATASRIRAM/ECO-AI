import csv
import io
import re
from datetime import datetime
from typing import Any, Dict, List

from sqlalchemy import asc
from sqlalchemy.orm import Session

from app.models.appliance import Appliance, ApplianceReading
from app.models.dataset import Dataset
from app.models.energy import EnergyReading
from app.models.weather import WeatherReading


HEADER_ALIASES = {
    "timestamp": {"timestamp", "datetime", "date_time", "dateandtime", "date", "time", "eventtime"},
    "energy_consumption": {"energy_consumption", "energy", "electricity_consumption", "consumption", "power_mw", "load_mw", "electricity", "power", "energy_kwh", "load"},
    "temperature": {"temperature", "temp", "air_temperature", "airtemp", "avg_temperature", "temperaturec"},
    "humidity": {"humidity", "relativehumidity", "rh", "relative_humidity"},
    "pressure": {"pressure", "atmosphericpressure", "atmospheric_pressure", "barometric_pressure", "air_pressure", "pressure_hpa", "pressure_pa"},
    "wind_speed": {"wind_speed", "windspeed", "wind", "wind_kmh", "windvelocity", "wind_speed_kmh"},
    "weather_condition": {"weather_condition", "condition", "conditions", "weather", "weatherstate"},
    "location": {"location", "city", "city_name", "site", "site_name", "area", "area_name"},
    "source": {"source", "data_source", "weather_source", "station", "station_name"},
    "appliance": {"appliance", "appliance_name", "device", "device_name", "equipment", "equipment_name"},
    "power": {"power", "power_watts", "appliance_power", "wattage", "load_watts"},
    "energy": {"energy", "energy_consumption", "energy_kwh", "appliance_energy"},
    "unit": {"unit", "units", "measurement_unit"},
    "status": {"status", "state", "operating_status"},
    "appliance_type": {"appliance_type", "device_type", "equipment_type"},
    "note": {"note", "notes", "comments", "comment"},
}


def _clean_header(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"[^a-z0-9]+", "", str(value).strip().lower())


def _header_matches(headers: List[str], aliases: set[str]) -> bool:
    cleaned_headers = {_clean_header(h) for h in headers}
    for alias in aliases:
        if _clean_header(alias) in cleaned_headers:
            return True
    return False


def _get_first_value(row: Dict[str, Any], aliases: set[str]) -> Any:
    for key, value in row.items():
        if value is None:
            continue
        if _clean_header(key) in {_clean_header(a) for a in aliases}:
            return value
    return None


def _coerce_float(value: Any, default: float = 0.0) -> float:
    if value is None or str(value).strip() == "":
        return default
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return default


def _normalize_timestamp(date_value: Any, time_value: Any = None) -> datetime:
    if date_value is None:
        raise ValueError("Missing timestamp/date value.")

    raw = str(date_value).strip()
    if time_value is not None and str(time_value).strip():
        raw = f"{raw} {str(time_value).strip()}"

    for fmt in (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
    ):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue

    raise ValueError(f"Unrecognized timestamp format: {raw}")


def detect_dataset_type(headers: List[str]) -> str:
    cleaned = {_clean_header(h) for h in headers}
    scores = {"weather": 0, "appliance": 0, "energy": 0}

    weather_aliases = ["temperature", "humidity", "pressure", "windspeed", "weathercondition", "atmosphericpressure", "summer", "monsoon", "prevhourtemperature", "prevdaytemperature", "rollingtemperature"]
    appliance_aliases = ["appliance", "appliancename", "device", "powerwatts", "energykwh", "appliancepower", "equipment"]
    energy_aliases = ["energyconsumption", "electricityconsumption", "consumption", "loadmw", "powermw", "electricity", "energy", "city", "location"]

    for alias in weather_aliases:
        if _clean_header(alias) in cleaned:
            scores["weather"] += 1
    for alias in appliance_aliases:
        if _clean_header(alias) in cleaned:
            scores["appliance"] += 1
    for alias in energy_aliases:
        if _clean_header(alias) in cleaned:
            scores["energy"] += 1

    has_weather_metrics = scores["weather"] >= 2 or (
        _header_matches(headers, HEADER_ALIASES["temperature"])
        and _header_matches(headers, HEADER_ALIASES["humidity"])
    )
    has_energy_metrics = scores["energy"] >= 1 and _header_matches(headers, HEADER_ALIASES["energy_consumption"])

    if has_weather_metrics and has_energy_metrics:
        return "combined"

    if any(_header_matches(headers, HEADER_ALIASES[field]) for field in ("temperature", "humidity", "pressure", "wind_speed", "weather_condition")):
        return "weather"

    # Specific weather signature: date + time + temp/humidity is strong evidence.
    if scores["weather"] >= 2 and ("date" in cleaned or "timestamp" in cleaned or "datetime" in cleaned):
        return "weather"
    if scores["appliance"] >= 2:
        return "appliance"
    if scores["energy"] >= 2:
        return "energy"

    if _header_matches(headers, HEADER_ALIASES["temperature"]) and _header_matches(headers, HEADER_ALIASES["humidity"]):
        return "weather"
    if _header_matches(headers, HEADER_ALIASES["appliance"]) or _header_matches(headers, HEADER_ALIASES["power"]):
        return "appliance"
    if _header_matches(headers, HEADER_ALIASES["energy_consumption"]) or _header_matches(headers, HEADER_ALIASES["location"]):
        return "energy"

    raise ValueError("Could not detect the dataset type from the CSV headers.")


DATASET_SCHEMA = {
    "weather": {
        "label": "Weather Dataset",
        "required": {
            "Date or timestamp": HEADER_ALIASES["timestamp"],
            "Temperature": HEADER_ALIASES["temperature"],
            "Humidity": HEADER_ALIASES["humidity"],
        },
        "optional": HEADER_ALIASES["pressure"] | HEADER_ALIASES["wind_speed"] | HEADER_ALIASES["weather_condition"] | HEADER_ALIASES["location"] | HEADER_ALIASES["source"] | HEADER_ALIASES["note"],
    },
    "energy": {
        "label": "Energy Dataset",
        "required": {
            "Date or timestamp": HEADER_ALIASES["timestamp"],
            "Energy consumption": HEADER_ALIASES["energy_consumption"],
        },
        "optional": HEADER_ALIASES["location"] | HEADER_ALIASES["source"] | HEADER_ALIASES["unit"] | HEADER_ALIASES["note"],
    },
    "appliance": {
        "label": "Home Appliance Dataset",
        "required": {
            "Date or timestamp": HEADER_ALIASES["timestamp"],
            "Appliance or device": HEADER_ALIASES["appliance"],
            "Power or energy": HEADER_ALIASES["power"] | HEADER_ALIASES["energy"],
        },
        "optional": HEADER_ALIASES["location"] | HEADER_ALIASES["source"] | HEADER_ALIASES["status"] | HEADER_ALIASES["appliance_type"] | HEADER_ALIASES["note"],
    },
    "combined": {
        "label": "Combined Energy + Weather Dataset",
        "required": {
            "Date or timestamp": HEADER_ALIASES["timestamp"],
            "Energy consumption": HEADER_ALIASES["energy_consumption"],
            "Temperature": HEADER_ALIASES["temperature"],
            "Humidity": HEADER_ALIASES["humidity"],
        },
        "optional": HEADER_ALIASES["location"] | HEADER_ALIASES["source"] | HEADER_ALIASES["unit"] | HEADER_ALIASES["pressure"] | HEADER_ALIASES["wind_speed"] | HEADER_ALIASES["weather_condition"] | HEADER_ALIASES["note"],
    },
}


def _schema_report(dataset_type: str, headers: List[str]) -> Dict[str, Any]:
    schema = DATASET_SCHEMA.get(dataset_type)
    if not schema:
        return {
            "schema_status": "incorrect",
            "missing_columns": ["A supported dataset type could not be detected"],
            "additional_columns": headers,
            "recognized_columns": [],
            "expected_columns": [],
        }

    cleaned_headers = {_clean_header(header) for header in headers}
    missing_columns = [
        label for label, aliases in schema["required"].items()
        if not any(_clean_header(alias) in cleaned_headers for alias in aliases)
    ]
    all_known_aliases = set().union(*schema["required"].values(), schema["optional"])
    additional_columns = [
        header for header in headers
        if _clean_header(header) not in {_clean_header(alias) for alias in all_known_aliases}
    ]
    recognized_columns = [
        header for header in headers if header not in additional_columns
    ]
    return {
        "schema_status": "correct" if not missing_columns else "incorrect",
        "missing_columns": missing_columns,
        "additional_columns": additional_columns,
        "recognized_columns": recognized_columns,
        "expected_columns": list(schema["required"].keys()),
    }


def _infer_weather_condition(row: Dict[str, Any]) -> str:
    condition = _get_first_value(row, HEADER_ALIASES["weather_condition"])
    if condition is not None and str(condition).strip():
        return str(condition).strip()
    temp = _coerce_float(_get_first_value(row, HEADER_ALIASES["temperature"]), 30.0)
    if temp >= 35:
        return "Sunny"
    if temp >= 30:
        return "Partly Cloudy"
    if temp <= 22:
        return "Cool"
    return "Clear"


def _normalize_weather_row(row: Dict[str, Any], filename: str) -> Dict[str, Any]:
    raw = {str(k).strip(): str(v).strip() if v is not None else "" for k, v in row.items() if k is not None}

    date_value = _get_first_value(raw, {"date", "timestamp", "datetime", "date_time", "dateandtime"})
    time_value = _get_first_value(raw, {"time", "timestamp_time", "recordtime"})
    if date_value is None:
        raise ValueError("Weather rows require a valid date field.")
    ts = _normalize_timestamp(date_value, time_value)

    temperature = _coerce_float(_get_first_value(raw, HEADER_ALIASES["temperature"]), 0.0)
    humidity = _coerce_float(_get_first_value(raw, HEADER_ALIASES["humidity"]), 0.0)
    pressure = _coerce_float(_get_first_value(raw, HEADER_ALIASES["pressure"]), 1013.0)
    wind_speed = _coerce_float(_get_first_value(raw, HEADER_ALIASES["wind_speed"]), 0.0)
    location = _get_first_value(raw, HEADER_ALIASES["location"]) or "Chennai"
    source = _get_first_value(raw, HEADER_ALIASES["source"]) or f"User CSV Upload: {filename}"

    if temperature == 0 and _get_first_value(raw, HEADER_ALIASES["temperature"]) is None:
        raise ValueError("Weather rows require a temperature value.")
    if humidity == 0 and _get_first_value(raw, HEADER_ALIASES["humidity"]) is None:
        raise ValueError("Weather rows require a humidity value.")

    return {
        "timestamp": ts,
        "temperature": round(temperature, 2),
        "humidity": round(humidity, 2),
        "pressure": round(pressure, 2),
        "wind_speed": round(wind_speed, 2),
        "weather_source": str(source),
        "weather_condition": _infer_weather_condition(raw),
        "location": str(location),
        "source": f"User CSV Upload: {filename}",
    }


def _normalize_energy_row(row: Dict[str, Any], filename: str) -> Dict[str, Any]:
    raw = {str(k).strip(): str(v).strip() if v is not None else "" for k, v in row.items() if k is not None}

    date_value = _get_first_value(raw, {"timestamp", "datetime", "date_time", "dateandtime", "date"})
    if date_value is None:
        raise ValueError("Energy rows require a valid timestamp/date value.")
    ts = _normalize_timestamp(date_value)

    energy_value = _get_first_value(raw, HEADER_ALIASES["energy_consumption"])
    if energy_value is None:
        raise ValueError("Energy rows require an energy or consumption value.")

    location = _get_first_value(raw, HEADER_ALIASES["location"]) or "Chennai"
    source = _get_first_value(raw, HEADER_ALIASES["source"]) or f"User CSV Upload: {filename}"

    return {
        "timestamp": ts,
        "energy_consumption": round(_coerce_float(energy_value, 0.0), 2),
        "location": str(location),
        "source": str(source),
        "unit": "MW",
    }


def _normalize_combined_row(row: Dict[str, Any], filename: str) -> Dict[str, Any]:
    weather = _normalize_weather_row(row, filename)
    energy = _normalize_energy_row(row, filename)
    return {**weather, **energy}


def _normalize_appliance_row(row: Dict[str, Any], filename: str) -> Dict[str, Any]:
    raw = {str(k).strip(): str(v).strip() if v is not None else "" for k, v in row.items() if k is not None}

    date_value = _get_first_value(raw, {"timestamp", "datetime", "date_time", "dateandtime", "date"})
    if date_value is None:
        raise ValueError("Appliance rows require a valid timestamp/date value.")
    ts = _normalize_timestamp(date_value)

    appliance_name = _get_first_value(raw, HEADER_ALIASES["appliance"]) or "Unknown Appliance"
    power = _coerce_float(_get_first_value(raw, HEADER_ALIASES["power"]), 0.0)
    energy = _coerce_float(_get_first_value(raw, HEADER_ALIASES["energy"]), 0.0)
    if power == 0 and energy == 0:
        raise ValueError("Appliance rows require a power or energy value.")

    return {
        "timestamp": ts,
        "appliance": str(appliance_name),
        "power": round(power, 2),
        "energy_consumption": round(energy or power / 1000.0, 4),
        "location": str(_get_first_value(raw, HEADER_ALIASES["location"]) or "Chennai"),
        "source": f"User CSV Upload: {filename}",
    }


def analyze_csv_dataset(file_content: str, filename: str) -> Dict[str, Any]:
    """Parses the uploaded CSV and returns a validation summary, invalid rows, and normalized preview data."""
    reader = csv.DictReader(io.StringIO(file_content))
    if not reader.fieldnames:
        raise ValueError("The uploaded CSV file is empty or missing headers.")

    headers = [str(h).strip() for h in reader.fieldnames if h is not None]
    try:
        dataset_type = detect_dataset_type(headers)
    except ValueError:
        dataset_type = "unknown"

    schema_report = _schema_report(dataset_type, headers)

    valid_rows: List[Dict[str, Any]] = []
    invalid_rows: List[Dict[str, Any]] = []
    rows_detected = 0

    for row_number, row in enumerate(reader, start=2):
        row_record = {str(k).strip(): v for k, v in row.items() if k is not None}
        if not any(str(v).strip() for v in row_record.values() if v is not None):
            continue
        rows_detected += 1

        try:
            if dataset_type == "unknown":
                raise ValueError("The CSV headers do not match Energy, Weather, Appliance, or Combined schema.")
            if dataset_type == "weather":
                normalized = _normalize_weather_row(row_record, filename)
            elif dataset_type == "appliance":
                normalized = _normalize_appliance_row(row_record, filename)
            elif dataset_type == "energy":
                normalized = _normalize_energy_row(row_record, filename)
            elif dataset_type == "combined":
                normalized = _normalize_combined_row(row_record, filename)
            else:
                raise ValueError(f"Unsupported dataset type: {dataset_type}")
            valid_rows.append(normalized)
        except Exception as exc:
            invalid_rows.append({
                "row_number": row_number,
                "reason": str(exc),
                "raw": {k: v for k, v in row_record.items() if v not in (None, "")},
            })

    location_counts: Dict[str, int] = {}
    for row in valid_rows:
        loc = row.get("location") or "Chennai"
        location_counts[loc] = location_counts.get(loc, 0) + 1
    location = max(location_counts.items(), key=lambda item: item[1])[0] if location_counts else "Chennai"

    preview = []
    for row in valid_rows[:10]:
        preview.append({k: v for k, v in row.items()})

    return {
        "dataset_type": dataset_type,
        "dataset_label": DATASET_SCHEMA.get(dataset_type, {}).get("label", "Unknown Dataset"),
        **schema_report,
        "location": location,
        "rows_detected": rows_detected,
        "valid_rows": len(valid_rows),
        "invalid_rows": len(invalid_rows),
        "invalid_row_details": invalid_rows[:20],
        "preview": preview,
        "normalized_rows": valid_rows,
    }


def validate_and_ingest_csv(db: Session, file_content: str, filename: str) -> Dict[str, Any]:
    """Validates and stores CSV data to the correct Eco AI table."""
    analysis = analyze_csv_dataset(file_content, filename)
    dataset_type = analysis["dataset_type"]
    valid_rows = analysis["normalized_rows"]

    min_date = None
    max_date = None

    clean_name = filename.replace('.csv', '').replace('_', ' ').replace('-', ' ').title()
    loc = valid_rows[0].get("location") if valid_rows and valid_rows[0].get("location") else "Regional"
    dataset = Dataset(
        name=clean_name,
        type=dataset_type,
        filename=filename,
        description=f"Standardized {dataset_type} telemetry dataset with {len(valid_rows)} recorded observations.",
        source=f"{loc} Telemetry Network",
        row_count=len(valid_rows),
        date_start=None,
        date_end=None,
    )
    db.add(dataset)
    db.flush()

    if dataset_type in ("weather", "combined"):
        rows = []
        for row in valid_rows:
            ts = row["timestamp"]
            rows.append(WeatherReading(
                dataset_id=dataset.id,
                timestamp=ts,
                temperature=row["temperature"],
                humidity=row["humidity"],
                pressure=row.get("pressure", 1013.0),
                wind_speed=row["wind_speed"],
                weather_condition=row["weather_condition"],
                location=row["location"],
                source=row["source"],
            ))
            min_date = ts if min_date is None or ts < min_date else min_date
            max_date = ts if max_date is None or ts > max_date else max_date
        db.add_all(rows)

    if dataset_type in ("energy", "combined"):
        rows = []
        for row in valid_rows:
            ts = row["timestamp"]
            rows.append(EnergyReading(
                dataset_id=dataset.id,
                timestamp=ts,
                consumption=row["energy_consumption"],
                unit=row.get("unit", "MW"),
                location=row["location"],
                source=row["source"],
            ))
            min_date = ts if min_date is None or ts < min_date else min_date
            max_date = ts if max_date is None or ts > max_date else max_date
        db.add_all(rows)

    if dataset_type == "appliance":
        appliance_index: Dict[str, Appliance] = {}
        for row in valid_rows:
            ts = row["timestamp"]
            name = row["appliance"]
            appliance = appliance_index.get(name)
            if appliance is None:
                appliance = db.query(Appliance).filter(Appliance.name == name, Appliance.dataset_id == dataset.id).first()
                if appliance is None:
                    appliance = Appliance(
                        dataset_id=dataset.id,
                        name=name,
                        type="Other",
                        rated_power=max(float(row["power"]), 0.0),
                        location=row["location"],
                        status="active",
                        source=row["source"],
                    )
                    db.add(appliance)
                    db.flush()
                appliance_index[name] = appliance

            db.add(ApplianceReading(
                dataset_id=dataset.id,
                appliance_id=appliance.id,
                timestamp=ts,
                power=row["power"],
                energy=row["energy_consumption"],
                status="on",
            ))
            min_date = ts if min_date is None or ts < min_date else min_date
            max_date = ts if max_date is None or ts > max_date else max_date

    dataset.date_start = min_date
    dataset.date_end = max_date
    db.commit()
    db.refresh(dataset)

    return {
        "dataset_id": dataset.id,
        "name": dataset.name,
        "type": dataset.type,
        "dataset_label": analysis["dataset_label"],
        "location": analysis["location"],
        "rows_detected": analysis["rows_detected"],
        "valid_rows": analysis["valid_rows"],
        "invalid_rows": analysis["invalid_rows"],
        "invalid_row_details": analysis["invalid_row_details"],
        "preview": analysis["preview"],
        "rows_ingested": len(valid_rows),
        "date_start": str(min_date) if min_date else None,
        "date_end": str(max_date) if max_date else None,
    }


def generate_energy_csv_content(db: Session) -> str:
    """Generates CSV text for Chennai Energy Dataset."""
    readings = db.query(EnergyReading).order_by(asc(EnergyReading.timestamp)).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["timestamp", "location", "energy_consumption", "unit", "source", "note"])
    for r in readings:
        writer.writerow([
            r.timestamp.strftime("%Y-%m-%d %H:%M"),
            r.location,
            r.consumption,
            r.unit,
            r.source,
            "Standard Telemetry Record"
        ])
    return output.getvalue()


def generate_weather_csv_content(db: Session) -> str:
    """Generates CSV text for Chennai Weather Dataset."""
    readings = db.query(WeatherReading).order_by(asc(WeatherReading.timestamp)).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["timestamp", "location", "temperature", "humidity", "wind_speed", "weather_condition", "source", "note"])
    for r in readings:
        writer.writerow([
            r.timestamp.strftime("%Y-%m-%d %H:%M"),
            r.location,
            r.temperature,
            r.humidity,
            r.wind_speed,
            r.weather_condition,
            r.source,
            "Standard Telemetry Record"
        ])
    return output.getvalue()


def generate_appliance_csv_content(db: Session) -> str:
    """Generates CSV text for Chennai Appliance Dataset."""
    results = db.query(
        ApplianceReading.timestamp,
        Appliance.name,
        Appliance.type,
        ApplianceReading.power,
        ApplianceReading.energy,
        ApplianceReading.status
    ).join(
        Appliance,
        ApplianceReading.appliance_id == Appliance.id
    ).order_by(asc(ApplianceReading.timestamp)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["timestamp", "appliance", "appliance_type", "power_watts", "energy_kwh", "status", "note"])
    for ts, name, app_type, pwr, nrg, stat in results:
        writer.writerow([
            ts.strftime("%Y-%m-%d %H:%M"),
            name,
            app_type,
            pwr,
            nrg,
            stat,
            "Standard Telemetry Record"
        ])
    return output.getvalue()


def generate_combined_csv_content(db: Session) -> str:
    """Generates unified CSV stream with synchronized Energy & Weather readings."""
    joined = db.query(
        EnergyReading.timestamp,
        EnergyReading.location,
        EnergyReading.consumption,
        EnergyReading.unit,
        WeatherReading.temperature,
        WeatherReading.humidity,
        WeatherReading.wind_speed,
        WeatherReading.weather_condition
    ).join(
        WeatherReading,
        EnergyReading.timestamp == WeatherReading.timestamp
    ).order_by(asc(EnergyReading.timestamp)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "timestamp", "location", "energy_consumption", "unit",
        "temperature", "humidity", "wind_speed", "weather_condition", "data_type"
    ])
    for ts, loc, cons, unit, temp, hum, wind, cond in joined:
        writer.writerow([
            ts.strftime("%Y-%m-%d %H:%M"),
            loc,
            cons,
            unit,
            temp,
            hum,
            wind,
            cond,
            "Integrated Telemetry Feed"
        ])
    return output.getvalue()


def get_dataset_preview(db: Session, dataset_id: int, limit: int = 50) -> Dict[str, Any]:
    """Provides tabular preview rows for a specific dataset in the registry."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        return {"error": "Dataset not found"}

    if dataset.type == "energy":
        q = db.query(EnergyReading).filter(EnergyReading.dataset_id == dataset.id)
        records = q.order_by(asc(EnergyReading.timestamp)).limit(limit).all()
        if not records:
            records = db.query(EnergyReading).order_by(asc(EnergyReading.timestamp)).limit(limit).all()
        cols = ["timestamp", "consumption", "unit", "location", "source"]
        rows = [
            {
                "timestamp": r.timestamp.strftime("%Y-%m-%d %H:%M"),
                "consumption": r.consumption,
                "unit": r.unit,
                "location": r.location,
                "source": r.source,
            }
            for r in records
        ]
    elif dataset.type == "weather":
        q = db.query(WeatherReading).filter(WeatherReading.dataset_id == dataset.id)
        records = q.order_by(asc(WeatherReading.timestamp)).limit(limit).all()
        if not records:
            records = db.query(WeatherReading).order_by(asc(WeatherReading.timestamp)).limit(limit).all()
        cols = ["timestamp", "temperature", "humidity", "pressure", "wind_speed", "weather_condition", "location", "source"]
        rows = [
            {
                "timestamp": r.timestamp.strftime("%Y-%m-%d %H:%M"),
                "temperature": r.temperature,
                "humidity": r.humidity,
                "pressure": r.pressure,
                "wind_speed": r.wind_speed,
                "weather_condition": r.weather_condition,
                "location": r.location,
                "source": r.source,
            }
            for r in records
        ]
    elif dataset.type == "appliance":
        q = db.query(
            ApplianceReading.timestamp,
            Appliance.name,
            Appliance.type,
            ApplianceReading.power,
            ApplianceReading.energy,
            ApplianceReading.status,
        ).join(
            Appliance,
            ApplianceReading.appliance_id == Appliance.id,
        ).filter(ApplianceReading.dataset_id == dataset.id)
        results = q.order_by(asc(ApplianceReading.timestamp)).limit(limit).all()
        if not results:
            results = db.query(
                ApplianceReading.timestamp,
                Appliance.name,
                Appliance.type,
                ApplianceReading.power,
                ApplianceReading.energy,
                ApplianceReading.status,
            ).join(
                Appliance,
                ApplianceReading.appliance_id == Appliance.id,
            ).order_by(asc(ApplianceReading.timestamp)).limit(limit).all()
        cols = ["timestamp", "appliance", "type", "power_w", "energy_kwh", "status"]
        rows = [
            {
                "timestamp": ts.strftime("%Y-%m-%d %H:%M"),
                "appliance": name,
                "type": app_type,
                "power_w": pwr,
                "energy_kwh": nrg,
                "status": stat,
            }
            for ts, name, app_type, pwr, nrg, stat in results
        ]
    elif dataset.type == "combined":
        energy_records = db.query(EnergyReading).filter(EnergyReading.dataset_id == dataset.id).order_by(asc(EnergyReading.timestamp)).limit(limit).all()
        if not energy_records:
            energy_records = db.query(EnergyReading).order_by(asc(EnergyReading.timestamp)).limit(limit).all()
        weather_records = db.query(WeatherReading).filter(WeatherReading.dataset_id == dataset.id).all()
        if not weather_records:
            weather_records = db.query(WeatherReading).all()
        weather_map = {w.timestamp.strftime("%Y-%m-%d %H:%M"): w for w in weather_records}
        cols = ["timestamp", "consumption", "unit", "temperature", "humidity", "wind_speed", "weather_condition", "location"]
        rows = []
        for e in energy_records:
            k = e.timestamp.strftime("%Y-%m-%d %H:%M")
            w = weather_map.get(k)
            rows.append({
                "timestamp": k,
                "consumption": e.consumption,
                "unit": e.unit,
                "temperature": w.temperature if w else "---",
                "humidity": w.humidity if w else "---",
                "wind_speed": w.wind_speed if w else "---",
                "weather_condition": w.weather_condition if w else "---",
                "location": e.location,
            })
    else:
        raise ValueError(f"Unsupported dataset preview type: {dataset.type}")

    return {
        "id": dataset.id,
        "name": dataset.name,
        "type": dataset.type,
        "filename": dataset.filename,
        "total_rows": dataset.row_count,
        "columns": cols,
        "rows": rows,
    }
