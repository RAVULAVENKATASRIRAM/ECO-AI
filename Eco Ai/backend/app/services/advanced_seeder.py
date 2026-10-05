"""Seeds recommendations, alerts, IoT devices, and a seed monthly report."""
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.recommendation import Recommendation
from app.models.alert import Alert, AlertConfig
from app.models.iot_device import IoTDevice
from app.models.report import ReportRecord


def seed_advanced_modules(db: Session) -> None:
    """Idempotent seed — only inserts if tables are empty."""

    # ---- Recommendations ----
    if db.query(Recommendation).count() == 0:
        recs = [
            Recommendation(
                title="Raise HVAC Setpoint by 2°C (18:00–22:00)",
                category="HVAC",
                impact_level="high",
                estimated_kwh_saving=142.5,
                estimated_cost_saving=1140.0,
                carbon_reduction_kg=116.9,
                description=(
                    "Chennai's evening cooling load (18:00–22:00) accounts for ~32% of daily grid demand. "
                    "Raising thermostat setpoints by 2°C during peak tariff hours can cut HVAC energy use "
                    "by 12–18% with negligible comfort impact due to natural evening temperature drop."
                ),
                action_text="Apply Setpoint Policy",
            ),
            Recommendation(
                title="Shift Washing Loads to Off-Peak (23:00–05:00)",
                category="Load Shifting",
                impact_level="medium",
                estimated_kwh_saving=62.0,
                estimated_cost_saving=496.0,
                carbon_reduction_kg=50.8,
                description=(
                    "Water heaters, washing machines, and dishwashers collectively contribute ~18% of "
                    "peak demand. Scheduling these loads to run between 23:00–05:00 (off-peak) reduces "
                    "peak strain and qualifies for Time-Of-Use tariff discounts."
                ),
                action_text="Enable Smart Scheduling",
            ),
            Recommendation(
                title="Eliminate Standby Vampire Power (Server Room)",
                category="Standby",
                impact_level="medium",
                estimated_kwh_saving=38.4,
                estimated_cost_saving=307.2,
                carbon_reduction_kg=31.5,
                description=(
                    "The IoT server and ancillary loads in the control room draw 350W continuously, "
                    "including periods of zero productive activity (nights, weekends). Installing a "
                    "smart power strip with occupancy sensing can reduce standby waste by ~40%."
                ),
                action_text="Deploy Smart Power Strip",
            ),
            Recommendation(
                title="Shift Peak Cooling Load to Off-Peak Operating Window",
                category="Efficiency",
                impact_level="high",
                estimated_kwh_saving=320.0,
                estimated_cost_saving=2560.0,
                carbon_reduction_kg=262.4,
                description=(
                    "The current cooling schedule concentrates demand in the highest-price afternoon period. "
                    "Moving non-critical cooling activity into a lower-demand window reduces both exposure to "
                    "peak tariff periods and operational strain on the cooling system."
                ),
                action_text="Review Cooling Schedule",
            ),
            Recommendation(
                title="Upgrade to BLDC Motors (Fans & Pumps)",
                category="Maintenance",
                impact_level="low",
                estimated_kwh_saving=22.8,
                estimated_cost_saving=182.4,
                carbon_reduction_kg=18.7,
                description=(
                    "Legacy induction motors in fans and circulation pumps operate at 50–60% efficiency. "
                    "Replacing with BLDC (Brushless DC) alternatives yields 30–40% energy reduction at "
                    "equivalent airflow/flow rates."
                ),
                action_text="Request Equipment Audit",
            ),
        ]
        db.add_all(recs)

    # ---- Alert Configs ----
    if db.query(AlertConfig).count() == 0:
        configs = [
            AlertConfig(name="Grid Load Warning", metric="current_load", warning_threshold=850.0, critical_threshold=890.0, unit="MW"),
            AlertConfig(name="Temperature Spike", metric="temperature", warning_threshold=38.0, critical_threshold=41.0, unit="°C"),
            AlertConfig(name="Voltage Dip", metric="voltage_v", warning_threshold=215.0, critical_threshold=205.0, unit="V"),
            AlertConfig(name="Power Factor Drop", metric="power_factor", warning_threshold=0.90, critical_threshold=0.85, unit="PF"),
        ]
        db.add_all(configs)
        db.flush()

    # ---- Seed sample alerts ----
    if db.query(Alert).count() == 0:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        alerts = [
            Alert(title="Critical Load Surge Detected", message="Grid consumption hit 894.2 MW at 14:00 — 2.3σ above 48h mean of 672 MW.", severity="critical", category="anomaly", metric="current_load", metric_value=894.2, threshold=860.0, timestamp=now - timedelta(hours=3), status="active"),
            Alert(title="High Temperature Warning", message="Ambient temperature reached 39.5°C at Chennai Grid Zone 3.", severity="warning", category="threshold", metric="temperature", metric_value=39.5, threshold=38.0, timestamp=now - timedelta(hours=6), status="acknowledged", acknowledged_at=now - timedelta(hours=5)),
            Alert(title="Power Factor Below Threshold", message="Power factor dropped to 0.88 — below configured warning level of 0.90.", severity="warning", category="threshold", metric="power_factor", metric_value=0.88, threshold=0.90, timestamp=now - timedelta(hours=12), status="resolved", resolved_at=now - timedelta(hours=10)),
            Alert(title="Unusual Off-Peak Load Spike", message="Consumption of 745 MW at 03:15 is 3.1σ above overnight mean of 495 MW.", severity="warning", category="anomaly", metric="current_load", metric_value=745.0, threshold=670.0, timestamp=now - timedelta(hours=20), status="resolved", resolved_at=now - timedelta(hours=18)),
            Alert(title="Voltage Fluctuation Detected", message="Phase R voltage dipped to 212V for 8 minutes — below warning threshold.", severity="info", category="threshold", metric="voltage_v", metric_value=212.0, threshold=215.0, timestamp=now - timedelta(days=1), status="resolved", resolved_at=now - timedelta(hours=22)),
        ]
        db.add_all(alerts)

    # ---- IoT Devices ----
    if db.query(IoTDevice).count() == 0:
        devices = [
            IoTDevice(name="ESP32-Energy-Meter-01", device_type="ESP32", model="ESP32-WROOM-32", location="Main Distribution Panel", mac_address="A4:CF:12:BE:01:02", ip_address="192.168.1.101", firmware_version="2.3.1", mqtt_topic="eco_ai/sensors/panel01", status="online", rssi=-52.0, last_seen=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=1), message_rate_per_min=60.0, uptime_hours=312.5),
            IoTDevice(name="Modbus-RTU-Meter-Aux", device_type="Modbus", model="Schneider iEM3115", location="Auxiliary Panel B", mac_address=None, ip_address="192.168.1.105", firmware_version="4.1.0", mqtt_topic="eco_ai/sensors/aux_panel", status="online", rssi=None, last_seen=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=30), message_rate_per_min=30.0, uptime_hours=1024.0),
            IoTDevice(name="ESP32-Weather-Station", device_type="ESP32", model="ESP32-S3", location="Rooftop Zone A", mac_address="A4:CF:12:BE:03:44", ip_address="192.168.1.102", firmware_version="1.8.2", mqtt_topic="eco_ai/sensors/weather01", status="online", rssi=-61.0, last_seen=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=2), message_rate_per_min=60.0, uptime_hours=210.0),
            IoTDevice(name="LoRa-Gateway-01", device_type="Gateway", model="RAK7244 Pi LoRa Gateway", location="Server Room", mac_address="B8:27:EB:AA:11:22", ip_address="192.168.1.10", firmware_version="1.0.5", mqtt_topic=None, status="online", rssi=-35.0, last_seen=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=5), message_rate_per_min=0.0, uptime_hours=720.0),
            IoTDevice(name="Smart Plug - Water Heater", device_type="Smart Plug", model="Tasmota SP6", location="Utility Room", mac_address="DC:4F:22:AB:CD:EF", ip_address="192.168.1.110", firmware_version="12.5.0", mqtt_topic="eco_ai/plugs/water_heater", status="online", rssi=-68.0, last_seen=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(minutes=5), message_rate_per_min=12.0, uptime_hours=96.0),
            IoTDevice(name="ESP32-Submeter-HVAC", device_type="ESP32", model="ESP32-C3", location="HVAC Unit", mac_address="A4:CF:12:BE:09:77", ip_address="192.168.1.103", firmware_version="2.1.0", mqtt_topic="eco_ai/sensors/hvac01", status="offline", rssi=None, last_seen=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=2), message_rate_per_min=0.0, uptime_hours=48.0),
        ]
        db.add_all(devices)

    # ---- Seed Report ----
    if db.query(ReportRecord).count() == 0:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        db.add(ReportRecord(
            title="Monthly Energy Audit — Aug 2026",
            report_type="monthly",
            date_from=now - timedelta(days=30),
            date_to=now,
            total_consumption_mwh=484560.0,
            peak_demand_mw=899.68,
            avg_demand_mw=672.4,
            carbon_footprint_tonnes=397.3,
            cost_inr=3876480.0,
            num_alerts=12,
            num_anomalies=3,
            summary=(
                "August 2026 grid consumption totalled 484,560 MWh with a peak demand of 899.68 MW "
                "recorded on 14 Aug at 14:00 during a heatwave period. Average demand was 672.4 MW. "
                "3 anomalous load spikes were detected and resolved. Estimated carbon footprint: 397.3 tonnes CO₂. "
                "Estimated electricity cost: ₹38,76,480 at ₹8/kWh grid tariff."
            ),
            status="ready",
        ))

    db.commit()
