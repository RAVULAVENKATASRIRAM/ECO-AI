"""Model persistence and storage utilities for the Unified ML System."""
import os
import joblib
from typing import Any, Optional

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage", "models")


def ensure_storage_dir() -> str:
    os.makedirs(MODELS_DIR, exist_ok=True)
    return MODELS_DIR


def save_model_artifact(pipeline: Any, algorithm: str, version: int, model_id: Optional[int] = None) -> str:
    """Saves trained model pipeline to disk and returns absolute path."""
    storage_dir = ensure_storage_dir()
    id_suffix = f"_{model_id}" if model_id else ""
    filename = f"model_{algorithm}_v{version}{id_suffix}.joblib"
    filepath = os.path.join(storage_dir, filename)
    joblib.dump(pipeline, filepath)
    return filepath


def load_model_artifact(filepath: str) -> Optional[Any]:
    """Safely loads model pipeline from disk."""
    if not filepath or not os.path.exists(filepath):
        return None
    try:
        return joblib.load(filepath)
    except Exception as e:
        print(f"Error loading model artifact from {filepath}: {e}")
        return None
