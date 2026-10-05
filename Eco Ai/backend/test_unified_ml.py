"""Comprehensive test suite for the ECO AI Unified ML System.

Verifies all 5 approved algorithms:
1. Linear Regression (Ridge Regularized)
2. Random Forest Regressor
3. Gradient Boosting Regressor
4. SARIMAX
5. Isolation Forest (Anomaly Detection)
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.ml_model import MLModelRecord
from app.services.ml.registry import get_active_model_record
from app.services.ml.service import ensure_default_active_model


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_unified_ml_algorithms_list(client: TestClient):
    """Test /api/ml/algorithms lists exactly the 5 approved algorithms."""
    res = client.get("/api/ml/algorithms")
    assert res.status_code == 200
    algos = res.json()
    assert isinstance(algos, list)
    algo_ids = [a["id"] for a in algos]
    assert len(algo_ids) == 5
    assert "linear_regression" in algo_ids
    assert "random_forest" in algo_ids
    assert "gradient_boosting" in algo_ids
    assert "sarimax" in algo_ids
    assert "isolation_forest" in algo_ids
    # Ensure unapproved or complex neural architectures are rejected
    assert "lstm" not in algo_ids
    assert "transformer" not in algo_ids
    assert "baseline" not in algo_ids
    assert "hist_gradient_boosting" not in algo_ids


def test_unified_ml_active_model(client: TestClient):
    """Test /api/ml/active returns single active model."""
    res = client.get("/api/ml/active")
    assert res.status_code == 200
    data = res.json()
    assert data["is_active"] is True
    assert data["status"] == "active"
    assert "model_version" in data
    assert "metrics" in data


def test_linear_regression_selection_and_coefficients(client: TestClient):
    """Test Linear Regression produces real coefficients and least-squares regression metrics."""
    res_select = client.post("/api/ml/select", json={"algorithm": "linear_regression"})
    assert res_select.status_code == 200
    active_lr = res_select.json()["model"]
    assert active_lr["algorithm"] == "linear_regression"
    assert active_lr["metrics"]["mae"] is not None
    assert active_lr["metrics"]["rmse"] is not None
    assert active_lr["metrics"]["r2"] is not None

    res_fi = client.get("/api/ml/feature-importance")
    assert res_fi.status_code == 200
    fi_data = res_fi.json()
    assert fi_data["algorithm"] == "linear_regression"
    assert len(fi_data["coefficients"]) > 0


def test_random_forest_selection_and_importance(client: TestClient):
    """Test Random Forest ensemble averaging and feature importances."""
    res_select = client.post("/api/ml/select", json={"algorithm": "random_forest"})
    assert res_select.status_code == 200
    active_rf = res_select.json()["model"]
    assert active_rf["algorithm"] == "random_forest"
    assert active_rf["metrics"]["mae"] is not None
    assert active_rf["metrics"]["rmse"] is not None

    res_fi = client.get("/api/ml/feature-importance")
    assert res_fi.status_code == 200
    fi_data = res_fi.json()
    assert len(fi_data["feature_importance"]) > 0


def test_gradient_boosting_selection(client: TestClient):
    """Test Gradient Boosting sequential boosting and predictions."""
    res_select = client.post("/api/ml/select", json={"algorithm": "gradient_boosting"})
    assert res_select.status_code == 200
    active_gb = res_select.json()["model"]
    assert active_gb["algorithm"] == "gradient_boosting"
    assert active_gb["metrics"]["mae"] is not None

    res_pred = client.get("/api/ml/predictions?horizon=24")
    assert res_pred.status_code == 200
    pred_data = res_pred.json()
    assert pred_data["model"]["algorithm"] == "gradient_boosting"
    assert len(pred_data["forecast_points"]) == 24


def test_sarimax_selection_and_parameters(client: TestClient):
    """Test SARIMAX seasonal time-series and exogenous parameters."""
    res_select = client.post("/api/ml/select", json={"algorithm": "sarimax"})
    assert res_select.status_code == 200
    active_sarima = res_select.json()["model"]
    assert active_sarima["algorithm"] == "sarimax"
    assert active_sarima["metrics"]["mae"] is not None
    assert active_sarima["metrics"]["rmse"] is not None

    res_pred = client.get("/api/ml/predictions?horizon=24")
    assert res_pred.status_code == 200
    pred_data = res_pred.json()
    assert pred_data["model"]["algorithm"] == "sarimax"
    assert len(pred_data["forecast_points"]) == 24
    assert pred_data["summary"]["peak_forecast_mw"] > 0


def test_isolation_forest_anomaly_detection(client: TestClient):
    """Test Isolation Forest anomaly detection metrics and path length calculations."""
    res_select = client.post("/api/ml/select", json={"algorithm": "isolation_forest"})
    assert res_select.status_code == 200
    active_iso = res_select.json()["model"]
    assert active_iso["algorithm"] == "isolation_forest"

    # Must NOT have ordinary regression metrics
    metrics = active_iso["metrics"]
    assert metrics["mae"] is None
    assert metrics["rmse"] is None
    assert metrics["r2"] is None

    # MUST have anomaly detection outputs
    assert metrics.get("is_anomaly_detector") is True
    assert metrics.get("anomaly_count") is not None
    assert metrics.get("normal_count") is not None
    assert metrics.get("anomaly_rate_pct") is not None
    assert metrics.get("c_n") is not None

    # Check predictions endpoint returns anomaly fields
    res_pred = client.get("/api/ml/predictions?horizon=24")
    assert res_pred.status_code == 200
    pred_data = res_pred.json()
    assert pred_data["model"]["algorithm"] == "isolation_forest"
    assert pred_data["is_anomaly_detector"] is True
    assert len(pred_data["forecast_points"]) == 24
    assert "is_anomaly" in pred_data["forecast_points"][0]


def test_model_version_increment_on_retraining(client: TestClient):
    """Test retraining increases the model version for the active algorithm."""
    res1 = client.post("/api/ml/select", json={"algorithm": "random_forest"})
    assert res1.status_code == 200
    v1 = res1.json()["model"]["model_version"]

    res2 = client.post("/api/ml/retrain")
    assert res2.status_code == 200
    v2 = res2.json()["model"]["model_version"]
    assert v2 > v1


def test_invalid_algorithm_preserves_active_model(client: TestClient):
    """Test that requesting an unapproved algorithm returns 400 and preserves active model."""
    res_curr = client.get("/api/ml/active")
    curr_active_id = res_curr.json()["id"]

    res_bad = client.post("/api/ml/select", json={"algorithm": "unapproved_deep_lstm"})
    assert res_bad.status_code == 400

    res_after = client.get("/api/ml/active")
    assert res_after.json()["id"] == curr_active_id
    assert res_after.json()["is_active"] is True


if __name__ == "__main__":
    with TestClient(app) as test_c:
        test_unified_ml_algorithms_list(test_c)
        test_unified_ml_active_model(test_c)
        test_linear_regression_selection_and_coefficients(test_c)
        test_random_forest_selection_and_importance(test_c)
        test_gradient_boosting_selection(test_c)
        test_sarimax_selection_and_parameters(test_c)
        test_isolation_forest_anomaly_detection(test_c)
        test_model_version_increment_on_retraining(test_c)
        test_invalid_algorithm_preserves_active_model(test_c)
        print("ALL 5 ML ALGORITHMS AND ANOMALY TESTS PASSED!")
