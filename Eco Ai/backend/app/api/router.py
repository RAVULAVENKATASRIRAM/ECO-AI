from fastapi import APIRouter
from app.api.endpoints.dashboard import router as dashboard_router
from app.api.endpoints.energy import router as energy_router
from app.api.endpoints.weather import router as weather_router
from app.api.endpoints.datasets import router as datasets_router
from app.api.endpoints.settings import router as settings_router
from app.api.endpoints.forecast import router as forecast_router
from app.api.endpoints.live import router as live_router
from app.api.endpoints.appliances_api import router as appliances_router
from app.api.endpoints.recommendations_api import router as recommendations_router
from app.api.endpoints.alerts_api import router as alerts_router
from app.api.endpoints.iot_api import router as iot_router
from app.api.endpoints.reports_api import router as reports_router
from app.api.endpoints.future_intelligence import router as future_intelligence_router
from app.api.endpoints.ml_api import router as ml_router

api_router = APIRouter(prefix="/api")
api_router.include_router(dashboard_router)
api_router.include_router(energy_router)
api_router.include_router(weather_router)
api_router.include_router(datasets_router)
api_router.include_router(settings_router)
api_router.include_router(forecast_router)
api_router.include_router(live_router)
api_router.include_router(appliances_router)
api_router.include_router(recommendations_router)
api_router.include_router(alerts_router)
api_router.include_router(iot_router)
api_router.include_router(reports_router)
api_router.include_router(future_intelligence_router)
api_router.include_router(ml_router)

