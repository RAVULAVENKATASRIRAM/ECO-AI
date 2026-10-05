import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.models.dataset import Dataset
from app.models.setting import Setting
from app.models.energy import EnergyReading
from app.models.weather import WeatherReading
from app.models.appliance import Appliance, ApplianceReading
from app.services.dataset_service import (
    analyze_csv_dataset,
    generate_appliance_csv_content,
    generate_combined_csv_content,
    generate_energy_csv_content,
    generate_weather_csv_content,
    get_dataset_preview,
    validate_and_ingest_csv,
)
from app.services.generator import seed_database_if_empty
from app.services.ml.service import retrain_active_model_on_data_change


router = APIRouter(prefix="/datasets", tags=["Dataset Management"])


@router.get("/")
def list_datasets(db: Session = Depends(get_db)):
    """Lists all registered datasets with metadata, row counts, and date bounds."""
    datasets = db.query(Dataset).order_by(desc(Dataset.created_at)).all()
    active_setting = db.query(Setting).filter(Setting.key == "active_dataset_id").first()
    active_id = int(active_setting.value) if active_setting and active_setting.value.isdigit() else None
    return [
        {
            **{column.name: getattr(dataset, column.name) for column in Dataset.__table__.columns},
            "is_active": dataset.id == active_id,
        }
        for dataset in datasets
    ]


@router.get("/active")
def get_active_dataset(db: Session = Depends(get_db)):
    """Returns the persisted dataset currently selected for the application."""
    active_setting = db.query(Setting).filter(Setting.key == "active_dataset_id").first()
    active_id = int(active_setting.value) if active_setting and active_setting.value.isdigit() else None
    dataset = db.query(Dataset).filter(Dataset.id == active_id).first() if active_id else None
    if not dataset:
        dataset = db.query(Dataset).order_by(desc(Dataset.created_at)).first()
        if dataset:
            if active_setting:
                active_setting.value = str(dataset.id)
            else:
                db.add(Setting(key="active_dataset_id", value=str(dataset.id)))
            db.commit()
    if not dataset:
        return {"dataset": None}
    return {
        "dataset": {
            **{column.name: getattr(dataset, column.name) for column in Dataset.__table__.columns},
            "is_active": True,
        }
    }


@router.post("/{dataset_id}/activate")
def activate_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Persists a dataset selection so dashboards keep using the chosen dataset after reloads."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    setting = db.query(Setting).filter(Setting.key == "active_dataset_id").first()
    if setting:
        setting.value = str(dataset.id)
    else:
        db.add(Setting(key="active_dataset_id", value=str(dataset.id)))
    db.commit()

    # Automatically retrain active ML model on the newly activated dataset
    try:
        retrain_active_model_on_data_change(db, dataset_id=dataset.id)
    except Exception as e:
        print(f"Auto-retrain on activate warning: {e}")

    return {
        "message": f"Dataset '{dataset.name}' is now active.",
        "dataset": {
            **{column.name: getattr(dataset, column.name) for column in Dataset.__table__.columns},
            "is_active": True,
        },
    }



@router.get("/demo/{dataset_type}/download")
def download_demo_dataset(dataset_type: str, db: Session = Depends(get_db)):
    """Downloads Chennai dataset in CSV format."""
    if dataset_type == "energy":
        content = generate_energy_csv_content(db)
        filename = "chennai_energy_dataset.csv"
    elif dataset_type == "weather":
        content = generate_weather_csv_content(db)
        filename = "chennai_weather_dataset.csv"
    elif dataset_type == "appliance":
        content = generate_appliance_csv_content(db)
        filename = "chennai_appliance_dataset.csv"
    elif dataset_type == "combined":
        content = generate_combined_csv_content(db)
        filename = "chennai_combined_dataset.csv"
    else:
        raise HTTPException(status_code=400, detail="Invalid dataset type requested.")

    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Analyzes the uploaded CSV and returns normalized preview data without inserting records yet."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    content = await file.read()
    text_content = content.decode("utf-8", errors="ignore")

    try:
        result = analyze_csv_dataset(text_content, file.filename)
        return {"message": "Dataset parsed successfully. Review the preview and import when ready.", "data": result}
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to process dataset: {str(exc)}")


@router.post("/import")
def import_dataset(payload: dict, db: Session = Depends(get_db)):
    """Ingests a normalized CSV payload into the correct database table."""
    filename = payload.get("filename") or "uploaded_dataset.csv"
    normalized_rows = payload.get("normalized_rows") or []
    dataset_type = payload.get("dataset_type")

    if not dataset_type:
        raise HTTPException(status_code=400, detail="Dataset type is required for import.")
    if not normalized_rows:
        raise HTTPException(status_code=400, detail="No valid rows were provided for import.")

    try:
        buffer = []
        if dataset_type in ("weather", "combined"):
            buffer = [
                ["timestamp", "temperature", "humidity", "pressure", "wind_speed", "weather_source", "weather_condition", "location"]
                + (["energy_consumption", "unit"] if dataset_type == "combined" else []),
            ]
            for row in normalized_rows:
                ts = row.get("timestamp")
                if isinstance(ts, str):
                    ts_value = datetime.fromisoformat(ts.replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M")
                else:
                    ts_value = ts.strftime("%Y-%m-%d %H:%M")
                row_values = [
                    ts_value,
                    row.get("temperature"),
                    row.get("humidity"),
                    row.get("pressure", 1013.0),
                    row.get("wind_speed"),
                    row.get("weather_source", row.get("source")),
                    row.get("weather_condition", "Clear"),
                    row.get("location", "Chennai"),
                ]
                if dataset_type == "combined":
                    row_values.extend([row.get("energy_consumption"), row.get("unit", "MW")])
                buffer.append(row_values)
        elif dataset_type == "energy":
            buffer = [["timestamp", "energy_consumption", "location", "source", "unit"]]
            for row in normalized_rows:
                ts = row.get("timestamp")
                if isinstance(ts, str):
                    ts_value = datetime.fromisoformat(ts.replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M")
                else:
                    ts_value = ts.strftime("%Y-%m-%d %H:%M")
                buffer.append([
                    ts_value,
                    row.get("energy_consumption"),
                    row.get("location", "Chennai"),
                    row.get("source", "Chennai Grid Telemetry"),
                    row.get("unit", "MW"),
                ])
        elif dataset_type == "appliance":
            buffer = [["timestamp", "appliance", "power", "energy_consumption", "location", "source"]]
            for row in normalized_rows:
                ts = row.get("timestamp")
                if isinstance(ts, str):
                    ts_value = datetime.fromisoformat(ts.replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M")
                else:
                    ts_value = ts.strftime("%Y-%m-%d %H:%M")
                buffer.append([
                    ts_value,
                    row.get("appliance"),
                    row.get("power"),
                    row.get("energy_consumption"),
                    row.get("location", "Chennai"),
                    row.get("source", "Submeter Network"),
                ])
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported dataset type: {dataset_type}")

        csv_text = "\n".join(
            ",".join('"' + str(cell).replace('"', '""') + '"' if "," in str(cell) or '\n' in str(cell) else str(cell) for cell in line)
            for line in buffer
        )
        result = validate_and_ingest_csv(db, csv_text, filename)
        setting = db.query(Setting).filter(Setting.key == "active_dataset_id").first()
        if setting:
            setting.value = str(result["dataset_id"])
        else:
            db.add(Setting(key="active_dataset_id", value=str(result["dataset_id"])))
        db.commit()

        # Automatically retrain active ML model on newly imported dataset
        try:
            retrain_active_model_on_data_change(db, dataset_id=result["dataset_id"])
        except Exception as e:
            print(f"Auto-retrain on import warning: {e}")

        return {"message": "Dataset imported successfully", "data": result}
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to import dataset: {str(exc)}")


@router.get("/{dataset_id}/preview")
def preview_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Returns sample rows and columns for a given dataset."""
    preview = get_dataset_preview(db, dataset_id)
    if "error" in preview:
        raise HTTPException(status_code=404, detail=preview["error"])
    return preview


@router.post("/seed")
def reseed_database(db: Session = Depends(get_db)):
    """Regenerates fresh realistic Chennai synthetic data across all models."""
    res = seed_database_if_empty(db, force=True)
    # Automatically retrain active ML model on newly seeded data
    try:
        retrain_active_model_on_data_change(db)
    except Exception as e:
        print(f"Auto-retrain on seed warning: {e}")
    return {"message": "Database successfully refreshed with Chennai telemetry data", "stats": res}



@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: int, db: Session = Depends(get_db)):
    """Deletes an uploaded dataset entry and its associated telemetry records."""
    ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found")

    # Cascade delete readings
    db.query(EnergyReading).filter(EnergyReading.dataset_id == dataset_id).delete()
    db.query(WeatherReading).filter(WeatherReading.dataset_id == dataset_id).delete()
    db.query(ApplianceReading).filter(ApplianceReading.dataset_id == dataset_id).delete()
    db.query(Appliance).filter(Appliance.dataset_id == dataset_id).delete()

    # If this dataset was active, reset to the first available dataset
    setting = db.query(Setting).filter(Setting.key == "active_dataset_id").first()
    if setting and setting.value == str(dataset_id):
        next_ds = db.query(Dataset).filter(Dataset.id != dataset_id).order_by(desc(Dataset.created_at)).first()
        setting.value = str(next_ds.id) if next_ds else ""

    dataset_name = ds.name
    db.delete(ds)
    db.commit()
    return {"message": f"Dataset '{dataset_name}' deleted successfully."}
