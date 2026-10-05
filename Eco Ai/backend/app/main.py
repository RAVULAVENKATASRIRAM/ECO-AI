import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

import app.models  # Ensures all models are registered
from app.api.router import api_router
from app.core.database import Base, SessionLocal, engine
from app.services.generator import seed_database_if_empty
from app.services.advanced_seeder import seed_advanced_modules

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("eco_ai")


def ensure_database_schema() -> None:
    with engine.begin() as conn:
        # Remove tables belonging only to retired control, simulation, and model-studio features.
        conn.execute(text("DROP TABLE IF EXISTS automation_logs"))
        conn.execute(text("DROP TABLE IF EXISTS automation_rules"))
        conn.execute(text("DROP TABLE IF EXISTS ai_models"))

        # 1. Weather readings pressure & dataset_id
        weather_columns = conn.execute(text("PRAGMA table_info(weather_readings)")).fetchall()
        weather_column_names = {row[1] for row in weather_columns}
        if "pressure" not in weather_column_names:
            conn.execute(text("ALTER TABLE weather_readings ADD COLUMN pressure FLOAT DEFAULT 1013.0"))
        if "dataset_id" not in weather_column_names:
            conn.execute(text("ALTER TABLE weather_readings ADD COLUMN dataset_id INTEGER DEFAULT NULL"))

        # 2. Energy readings dataset_id
        energy_columns = conn.execute(text("PRAGMA table_info(energy_readings)")).fetchall()
        energy_column_names = {row[1] for row in energy_columns}
        if "dataset_id" not in energy_column_names:
            conn.execute(text("ALTER TABLE energy_readings ADD COLUMN dataset_id INTEGER DEFAULT NULL"))

        # 3. Appliances dataset_id
        app_columns = conn.execute(text("PRAGMA table_info(appliances)")).fetchall()
        app_column_names = {row[1] for row in app_columns}
        if "dataset_id" not in app_column_names:
            conn.execute(text("ALTER TABLE appliances ADD COLUMN dataset_id INTEGER DEFAULT NULL"))

        # 4. Appliance readings dataset_id
        app_read_columns = conn.execute(text("PRAGMA table_info(appliance_readings)")).fetchall()
        app_read_column_names = {row[1] for row in app_read_columns}
        if "dataset_id" not in app_read_column_names:
            conn.execute(text("ALTER TABLE appliance_readings ADD COLUMN dataset_id INTEGER DEFAULT NULL"))

        # 5. Appliance power_state ('on' or 'off')
        if "power_state" not in app_column_names:
            conn.execute(text("ALTER TABLE appliances ADD COLUMN power_state VARCHAR(20) DEFAULT 'on'"))
            conn.execute(text("UPDATE appliances SET power_state = 'on' WHERE power_state IS NULL"))

        # 6. Recommendations appliance_id
        rec_columns = conn.execute(text("PRAGMA table_info(recommendations)")).fetchall()
        rec_column_names = {row[1] for row in rec_columns}
        if "appliance_id" not in rec_column_names:
            conn.execute(text("ALTER TABLE recommendations ADD COLUMN appliance_id INTEGER DEFAULT NULL"))

        # 7. Backfill existing demo data if dataset_id is NULL
        # Find demo datasets
        datasets = conn.execute(text("SELECT id, type, filename FROM datasets")).fetchall()
        dataset_by_type = {row[1]: row[0] for row in datasets}
        if "energy" in dataset_by_type:
            conn.execute(text(f"UPDATE energy_readings SET dataset_id = {dataset_by_type['energy']} WHERE dataset_id IS NULL"))
        if "weather" in dataset_by_type:
            conn.execute(text(f"UPDATE weather_readings SET dataset_id = {dataset_by_type['weather']} WHERE dataset_id IS NULL"))
        if "appliance" in dataset_by_type:
            conn.execute(text(f"UPDATE appliances SET dataset_id = {dataset_by_type['appliance']} WHERE dataset_id IS NULL"))
            conn.execute(text(f"UPDATE appliance_readings SET dataset_id = {dataset_by_type['appliance']} WHERE dataset_id IS NULL"))

        # Link sample recommendations to appliances if not linked
        conn.execute(text("UPDATE recommendations SET appliance_id = 1 WHERE title LIKE '%HVAC%' AND appliance_id IS NULL"))
        conn.execute(text("UPDATE recommendations SET appliance_id = 2 WHERE title LIKE '%Peak Cooling%' AND appliance_id IS NULL"))
        conn.execute(text("UPDATE recommendations SET appliance_id = 3 WHERE title LIKE '%BLDC Motors%' AND appliance_id IS NULL"))
        conn.execute(text("UPDATE recommendations SET appliance_id = 6 WHERE title LIKE '%Vampire%' AND appliance_id IS NULL"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schema
    logger.info("Initializing Eco AI SQLite database schema...")
    Base.metadata.create_all(bind=engine)
    ensure_database_schema()

    # Seed realistic Chennai demo data if table empty
    db = SessionLocal()
    try:
        res = seed_database_if_empty(db)
        logger.info(f"Database seed status: {res}")
        seed_advanced_modules(db)
        logger.info("Advanced modules (Phases 5-10) seeded successfully.")
        from app.services.ml.service import ensure_default_active_model
        active_ml = ensure_default_active_model(db)
        if active_ml:
            logger.info(f"Unified ML System active: {active_ml.algorithm} (v{active_ml.model_version})")
    finally:
        db.close()
    yield



app = FastAPI(
    title="ECO AI — AI + IoT Smart Energy Management System",
    description="Backend API for Eco AI (All Levels 1–10): Predict. Monitor. Optimize. Save.",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
def root():
    return {
        "application": "ECO AI",
        "tagline": "Predict. Monitor. Optimize. Save.",
        "status": "online",
        "version": "2.0.0",
        "scope": "All Levels 1–10 Active",
        "modules": ["Dashboard", "Data Management", "Energy Analytics", "Weather",
                    "AI Forecast", "Live Monitoring", "Appliances", "Recommendations",
                    "Alerts", "IoT Devices", "Reports"],
        "docs_url": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "eco-ai-backend"}
