"""API test suite for the active ECO AI features."""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_root_and_health(client: TestClient):
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["application"] == "ECO AI"

    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"


def test_dashboard_endpoints(client: TestClient):
    res = client.get("/api/dashboard/kpis")
    assert res.status_code == 200
    assert "current_energy_usage" in res.json()

    res = client.get("/api/dashboard/energy-trend?period=7d")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    res = client.get("/api/dashboard/appliance-distribution")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_energy_analytics(client: TestClient):
    res = client.get("/api/energy/analytics")
    assert res.status_code == 200
    assert "hourly_curve" in res.json()


def test_weather_endpoints(client: TestClient):
    res = client.get("/api/weather/summary")
    assert res.status_code == 200
    assert "current_temperature" in res.json()


def test_forecast_endpoints(client: TestClient):
    res = client.get("/api/forecast/24h")
    assert res.status_code == 200
    assert "points" in res.json()

    res = client.get("/api/forecast/7d")
    assert res.status_code == 200
    assert "days" in res.json()

    res = client.get("/api/forecast/predict?horizon=24")
    assert res.status_code == 200
    assert "forecast" in res.json()

    res = client.get("/api/forecast/predict?horizon=24&model=gradient_boosting")
    assert res.status_code == 200
    assert res.json()["forecast"]["model_name"] == "gradient_boosting"
    assert res.json()["forecast"]["model_label"] == "Gradient Boosting Regressor"

    res = client.get("/api/forecast/metrics")
    assert res.status_code == 200


def test_future_intelligence_overview(client: TestClient):
    res = client.get("/api/future-intelligence/overview")
    assert res.status_code == 200
    payload = res.json()
    assert "current_usage" in payload
    assert "historical_comparison" in payload
    assert "future_prediction" in payload
    assert "efficiency" in payload
    assert "top_appliances" in payload
    assert "alerts" in payload
    assert "recommendations" in payload


def test_live_telemetry(client: TestClient):
    res = client.get("/api/live/telemetry")
    assert res.status_code == 200
    assert "phases" in res.json()

    res = client.get("/api/live/waveform?cycles=3")
    assert res.status_code == 200
    assert "samples" in res.json()


def test_appliances(client: TestClient):
    res = client.get("/api/appliances/")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        app_id = data[0]["id"]
        res_detail = client.get(f"/api/appliances/{app_id}/analytics")
        assert res_detail.status_code == 200


def test_alerts(client: TestClient):
    res = client.get("/api/alerts/")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    res = client.get("/api/alerts/summary")
    assert res.status_code == 200
    assert "total" in res.json()

    res = client.get("/api/alerts/configs")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_recommendations(client: TestClient):
    res = client.get("/api/recommendations/")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        rec_id = data[0]["id"]
        res_action = client.post(f"/api/recommendations/{rec_id}/action?action=apply")
        assert res_action.status_code == 200


def test_iot(client: TestClient):
    res = client.get("/api/iot/devices")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)

    res_summary = client.get("/api/iot/summary")
    assert res_summary.status_code == 200
    assert "online" in res_summary.json()

    if len(data) > 0:
        dev_id = data[0]["id"]
        res_ping = client.post(f"/api/iot/devices/{dev_id}/action?action=ping")
        assert res_ping.status_code == 200


def test_reports(client: TestClient):
    res = client.get("/api/reports/")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    res_gen = client.post("/api/reports/generate?report_type=monthly")
    assert res_gen.status_code == 200
    assert "id" in res_gen.json()


if __name__ == "__main__":
    with TestClient(app) as client:
        print("Running all API endpoint tests within application lifespan...")
        test_root_and_health(client)
        test_dashboard_endpoints(client)
        test_energy_analytics(client)
        test_weather_endpoints(client)
        test_forecast_endpoints(client)
        test_live_telemetry(client)
        test_appliances(client)
        test_alerts(client)
        test_recommendations(client)
        test_iot(client)
        test_reports(client)
        print("SUCCESS: All active ECO AI API endpoint tests passed!")
