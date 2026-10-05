"""Model registry and database persistence for Unified ML System."""
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.ml_model import MLModelRecord, ALGORITHM_LABELS, ALGORITHM_DESCRIPTIONS
from app.models.setting import Setting


def _current_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_active_model_record(db: Session, dataset_id: Optional[int] = None) -> Optional[MLModelRecord]:
    """Retrieves the single active ML model from the database."""
    # First check is_active flag
    query = db.query(MLModelRecord).filter(MLModelRecord.is_active == True, MLModelRecord.status == "active")
    if dataset_id is not None:
        scoped = query.filter(MLModelRecord.dataset_id == dataset_id).order_by(desc(MLModelRecord.updated_at)).first()
        if scoped:
            return scoped

    active_rec = query.order_by(desc(MLModelRecord.updated_at)).first()
    if active_rec:
        return active_rec

    # Fallback: check setting
    setting = db.query(Setting).filter(Setting.key == "active_ml_model_id").first()
    if setting and setting.value.isdigit():
        model_id = int(setting.value)
        record = db.query(MLModelRecord).filter(MLModelRecord.id == model_id, MLModelRecord.status == "active").first()
        if record:
            return record

    return None


def get_next_model_version(db: Session, algorithm: str, dataset_id: Optional[int] = None) -> int:
    """Finds the highest version for this algorithm and increments by 1."""
    query = db.query(MLModelRecord).filter(MLModelRecord.algorithm == algorithm)
    if dataset_id is not None:
        query = query.filter(MLModelRecord.dataset_id == dataset_id)
    latest = query.order_by(desc(MLModelRecord.model_version)).first()
    return (latest.model_version + 1) if latest else 1


def register_training_start(
    db: Session,
    algorithm: str,
    dataset_id: Optional[int] = None,
    location: str = "Chennai",
    user_id: str = "default_user",
) -> MLModelRecord:
    """Creates a model record in 'training' status."""
    version = get_next_model_version(db, algorithm, dataset_id)
    now = _current_utc()
    record = MLModelRecord(
        user_id=user_id,
        location=location,
        dataset_id=dataset_id,
        algorithm=algorithm,
        model_version=version,
        status="training",
        is_active=False,
        training_record_count=0,
        feature_set="[]",
        metadata_json="{}",
        created_at=now,
        updated_at=now,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def activate_model_record(
    db: Session,
    model_id: int,
    metrics: Dict[str, Any],
    feature_set: List[str],
    model_path: str,
    metadata: Dict[str, Any],
    training_record_count: int,
) -> MLModelRecord:
    """Marks the specified model as active and archives previously active models."""
    record = db.query(MLModelRecord).filter(MLModelRecord.id == model_id).first()
    if not record:
        raise ValueError(f"Model with id {model_id} not found.")

    now = _current_utc()
    # Archive previous active models
    db.query(MLModelRecord).filter(MLModelRecord.is_active == True).update(
        {"is_active": False, "status": "archived", "updated_at": now}
    )

    record.status = "active"
    record.is_active = True
    record.mae = metrics.get("mae")
    record.rmse = metrics.get("rmse")
    record.mape = metrics.get("mape")
    record.r2 = metrics.get("r2")
    record.training_record_count = training_record_count
    record.feature_set = json.dumps(feature_set)
    record.model_path = model_path
    record.metadata_json = json.dumps(metadata)
    record.training_error = None
    record.updated_at = now


    # Update persistent settings
    setting_id = db.query(Setting).filter(Setting.key == "active_ml_model_id").first()
    if setting_id:
        setting_id.value = str(record.id)
    else:
        db.add(Setting(key="active_ml_model_id", value=str(record.id)))

    setting_algo = db.query(Setting).filter(Setting.key == "active_ml_algorithm").first()
    if setting_algo:
        setting_algo.value = record.algorithm
    else:
        db.add(Setting(key="active_ml_algorithm", value=record.algorithm))

    db.commit()
    db.refresh(record)
    return record


def mark_model_training_failed(
    db: Session,
    model_id: int,
    error_message: str,
) -> MLModelRecord:
    """Marks model as failed without altering any currently active model."""
    record = db.query(MLModelRecord).filter(MLModelRecord.id == model_id).first()
    if record:
        record.status = "failed"
        record.is_active = False
        record.training_error = error_message
        record.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(record)
    return record


def list_all_models(db: Session, limit: int = 50) -> List[MLModelRecord]:
    """Lists registered models sorted by latest updated."""
    return db.query(MLModelRecord).order_by(desc(MLModelRecord.updated_at)).limit(limit).all()


def list_evaluated_algorithm_comparison(db: Session, dataset_id: Optional[int] = None) -> List[Dict[str, Any]]:
    """Returns the latest evaluated model for each supported algorithm for side-by-side comparison."""
    results = []
    active_rec = get_active_model_record(db, dataset_id)
    active_id = active_rec.id if active_rec else None

    for algo_key, label in ALGORITHM_LABELS.items():
        query = db.query(MLModelRecord).filter(
            MLModelRecord.algorithm == algo_key,
            MLModelRecord.status.in_(["active", "validated", "archived"])
        )
        if dataset_id is not None:
            query = query.filter(MLModelRecord.dataset_id == dataset_id)
        latest = query.order_by(desc(MLModelRecord.model_version)).first()

        if latest:
            results.append({
                "algorithm": algo_key,
                "label": label,
                "version": latest.model_version,
                "status": latest.status,
                "is_active": latest.id == active_id,
                "mae": latest.mae,
                "rmse": latest.rmse,
                "mape": latest.mape,
                "r2": latest.r2,
                "training_records": latest.training_record_count,
                "last_trained": latest.updated_at.isoformat() + "Z" if latest.updated_at else None,
            })
        else:
            results.append({
                "algorithm": algo_key,
                "label": label,
                "version": None,
                "status": "not_trained",
                "is_active": False,
                "mae": None,
                "rmse": None,
                "mape": None,
                "r2": None,
                "training_records": 0,
                "last_trained": None,
            })

    return results
