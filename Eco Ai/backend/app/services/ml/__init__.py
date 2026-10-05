"""Unified ML System Package for Eco AI."""
from app.services.ml.service import (
    ensure_default_active_model,
    get_available_algorithms_metadata,
    get_scoped_training_data,
    get_synchronized_predictions,
    invalidate_prediction_cache,
    retrain_active_model_on_data_change,
    select_and_train_algorithm,
)
from app.services.ml.registry import (
    get_active_model_record,
    list_all_models,
    list_evaluated_algorithm_comparison,
)
from app.services.ml.trainer import SUPPORTED_ALGORITHMS
from app.services.ml.features import FEATURE_COLUMNS

__all__ = [
    "ensure_default_active_model",
    "get_available_algorithms_metadata",
    "get_scoped_training_data",
    "get_synchronized_predictions",
    "invalidate_prediction_cache",
    "retrain_active_model_on_data_change",
    "select_and_train_algorithm",
    "get_active_model_record",
    "list_all_models",
    "list_evaluated_algorithm_comparison",
    "SUPPORTED_ALGORITHMS",
    "FEATURE_COLUMNS",
]
