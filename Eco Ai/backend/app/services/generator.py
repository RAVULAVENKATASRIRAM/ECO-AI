import math
import random
from datetime import datetime, timedelta
from typing import List, Dict, Tuple
from sqlalchemy.orm import Session
from app.models.energy import EnergyReading
from app.models.weather import WeatherReading
from app.models.appliance import Appliance, ApplianceReading
from app.models.dataset import Dataset
from app.models.setting import Setting


def generate_realistic_chennai_data(
    days: int = 30,
    end_date: datetime = None
) -> Tuple[List[EnergyReading], List[WeatherReading], List[Appliance], List[ApplianceReading]]:
    """
    Generates realistic synthetic energy and weather data for Chennai.
    Includes:
    - Daily temperature and humidity cycles across the day
    - Diurnal grid load curve (morning peak, afternoon cooling peak, evening residential peak)
    - Strong temperature sensitivity: Cooling demand rises as ambient conditions warm
    - Weekday vs weekend load shifts
    - Correlated appliance cycles (Air Conditioning, Fans, Refrigeration, Lighting, Others)
    """
    if end_date is None:
        end_date = datetime(2026, 9, 15, 14, 0, 0)

    start_date = end_date - timedelta(days=days)
    current_time = start_date

    # 1. Base Appliances
    appliances_meta = [
        {"name": "Master Bed Inverter AC (1.5 Ton)", "type": "AC", "rated_power": 1500.0, "location": "Floor 2 - Zone A"},
        {"name": "Living Room Dual Inverter AC", "type": "AC", "rated_power": 1800.0, "location": "Floor 1 - Zone B"},
        {"name": "High-Efficiency BLDC Fans", "type": "Fan", "rated_power": 70.0, "location": "All Zones"},
        {"name": "Frost-Free Smart Refrigerator", "type": "Refrigerator", "rated_power": 260.0, "location": "Kitchen Hub"},
        {"name": "Smart Architectural LED Lighting", "type": "Lighting", "rated_power": 120.0, "location": "Common Areas"},
        {"name": "IoT Server & Ancillary Loads", "type": "Other", "rated_power": 350.0, "location": "Control Room"},
    ]

    appliances_list = [
        Appliance(
            name=m["name"],
            type=m["type"],
            rated_power=m["rated_power"],
            location=m["location"],
            status="active",
            source="Smart Submeter Network"
        )
        for m in appliances_meta
    ]

    weather_readings: List[WeatherReading] = []
    energy_readings: List[EnergyReading] = []
    appliance_readings: List[ApplianceReading] = []

    # Weather conditions palette
    conditions = ["Clear", "Partly Cloudy", "Sunny", "Hazy", "Scattered Showers"]

    # Generate hourly readings
    step_hours = 1
    total_hours = days * 24

    for hour_idx in range(total_hours):
        t = start_date + timedelta(hours=hour_idx)
        hour = t.hour
        day_of_week = t.weekday() # 0 = Monday, 6 = Sunday
        is_weekend = day_of_week >= 5

        # --- WEATHER SIMULATION ---
        # Diurnal temp cycle: Peak at 14:00 (hour 14), lowest at 05:00
        diurnal_temp_phase = math.cos((hour - 14) * 2 * math.pi / 24)
        base_temp = 31.5 # Chennai tropical baseline
        daily_temp_swing = 4.5
        noise_temp = (math.sin(hour_idx * 0.15) * 1.2) + ((random.random() - 0.5) * 0.8)
        temperature = round(base_temp + (diurnal_temp_phase * daily_temp_swing) + noise_temp, 1)

        # Humidity: generally inverse of temperature in coastal Chennai
        humidity_base = 72.0
        humidity_swing = -15.0 * diurnal_temp_phase
        humidity_noise = (math.cos(hour_idx * 0.11) * 3.0) + ((random.random() - 0.5) * 2.0)
        humidity = max(40.0, min(95.0, round(humidity_base + humidity_swing + humidity_noise, 1)))

        # Wind speed: sea breezes pick up in late afternoon (15:00 - 19:00)
        wind_base = 12.0
        breeze_boost = 6.0 if 14 <= hour <= 19 else 0.0
        wind_speed = max(4.0, round(wind_base + breeze_boost + (random.random() * 4.0), 1))

        if humidity > 85 and temperature < 29:
            condition = "Scattered Showers"
        elif temperature > 34:
            condition = "Sunny"
        elif 11 <= hour <= 16:
            condition = "Clear" if random.random() > 0.3 else "Partly Cloudy"
        else:
            condition = "Hazy" if hour < 8 else "Partly Cloudy"

        w_read = WeatherReading(
            timestamp=t,
            temperature=temperature,
            humidity=humidity,
            wind_speed=wind_speed,
            weather_condition=condition,
            location="Chennai",
            source="Chennai Meteorological Observatory"
        )
        weather_readings.append(w_read)

        # --- ENERGY CONSUMPTION SIMULATION (MW for Regional / kW for Sub-system) ---
        # Chennai city/sector scale grid consumption model in MW
        # 1. Base grid load
        grid_base = 560.0

        # 2. Hourly activity curve
        # Morning ramp (06:00-10:00), Evening peak (18:00-22:00), Night trough (02:00-05:00)
        if 0 <= hour < 5:
            hourly_factor = 0.85 + (hour * 0.01)
        elif 5 <= hour < 9:
            hourly_factor = 0.92 + ((hour - 5) * 0.05)
        elif 9 <= hour < 14:
            hourly_factor = 1.15 + ((hour - 9) * 0.02)
        elif 14 <= hour < 18:
            hourly_factor = 1.18 - ((hour - 14) * 0.01)
        elif 18 <= hour < 22:
            hourly_factor = 1.25 - ((hour - 18) * 0.02)
        else:
            hourly_factor = 1.05 - ((hour - 22) * 0.08)

        # 3. Weekend difference (residential up in morning/afternoon, commercial down)
        weekend_modifier = 0.92 if is_weekend else 1.0

        # 4. Temperature sensitivity: Cooling load threshold (28.0°C)
        cooling_delta = max(0.0, temperature - 28.0)
        thermal_cooling_load = cooling_delta * 22.5 # ~22.5 MW per degree of cooling

        # 5. Stochastic variation
        random_load_jitter = (random.random() - 0.5) * 15.0

        grid_consumption = round(
            (grid_base * hourly_factor * weekend_modifier) + thermal_cooling_load + random_load_jitter,
            2
        )

        e_read = EnergyReading(
            timestamp=t,
            consumption=grid_consumption,
            unit="MW",
            location="Chennai",
            source="Chennai Grid Telemetry"
        )
        energy_readings.append(e_read)

        # --- APPLIANCE READINGS (Synchronized to this hour) ---
        # 1. Master Bed AC (1500W) - on at night (22:00 to 07:00) and hot afternoons (13:00-16:00)
        ac1_on = (hour >= 22 or hour <= 7) or (13 <= hour <= 16 and temperature > 32)
        ac1_power = (1200 + (cooling_delta * 35) + (random.random() * 80)) if ac1_on else 5.0 # 5W standby
        ac1_energy = ac1_power / 1000.0 # kWh for 1 hour

        # 2. Living Room AC (1800W) - on in evening and afternoon
        ac2_on = (18 <= hour <= 23) or (12 <= hour <= 17 and is_weekend)
        ac2_power = (1450 + (cooling_delta * 40) + (random.random() * 90)) if ac2_on else 6.0
        ac2_energy = ac2_power / 1000.0

        # 3. Fans (70W total) - on most times if warm
        fans_on = temperature > 27 or hour >= 8
        fans_power = (55.0 + (random.random() * 12.0)) if fans_on else 15.0
        fans_energy = fans_power / 1000.0

        # 4. Refrigerator (260W rated) - compressor cycling
        # higher duty cycle when ambient temp is hot
        duty_cycle = 0.55 if temperature > 32 else 0.40
        fridge_power = (210.0 + (temperature * 1.5)) * duty_cycle + (random.random() * 10.0)
        fridge_energy = fridge_power / 1000.0

        # 5. Smart Lighting (120W) - evening peak (18:00 to 23:00)
        if 18 <= hour <= 23:
            light_power = 95.0 + (random.random() * 20.0)
        elif 6 <= hour <= 8:
            light_power = 35.0
        else:
            light_power = 4.0 # standby
        light_energy = light_power / 1000.0

        # 6. IoT Server & Other (350W) - constant with daytime usage spikes
        other_power = 180.0 + (50.0 if 9 <= hour <= 18 else 0.0) + (random.random() * 25.0)
        other_energy = other_power / 1000.0

        app_powers = [
            (0, ac1_power, ac1_energy, "on" if ac1_on else "standby"),
            (1, ac2_power, ac2_energy, "on" if ac2_on else "standby"),
            (2, fans_power, fans_energy, "on" if fans_on else "standby"),
            (3, fridge_power, fridge_energy, "active"),
            (4, light_power, light_energy, "on" if light_power > 20 else "standby"),
            (5, other_power, other_energy, "active"),
        ]

        # Note: We assign appliance_id after appliances are committed or by index
        for app_idx, pwr, nrg, stat in app_powers:
            app_reading = ApplianceReading(
                appliance_id=app_idx + 1,
                timestamp=t,
                power=round(pwr, 2),
                energy=round(nrg, 4),
                status=stat
            )
            appliance_readings.append(app_reading)

    return energy_readings, weather_readings, appliances_list, appliance_readings


def generate_tenkasi_energy_data(
    days: int = 30,
    end_date: datetime = None
) -> List[EnergyReading]:
    """
    Generates 30 days of energy telemetry for Tenkasi grid.
    Characteristics:
    - High industrial baseline load (1,150 MW - 1,650 MW)
    - 24/7 continuous 3-shift manufacturing profile
    - Weekdays and Saturdays remain heavily loaded (~0.96 shift factor on weekends)
    - Reactive machine load surges during morning shift startup (07:00-11:00)
    """
    if end_date is None:
        end_date = datetime(2026, 9, 15, 14, 0, 0)

    start_date = end_date - timedelta(days=days)
    energy_readings: List[EnergyReading] = []
    total_hours = days * 24

    for hour_idx in range(total_hours):
        t = start_date + timedelta(hours=hour_idx)
        hour = t.hour
        is_sunday = t.weekday() == 6

        # Base industrial baseline
        base_load = 1220.0

        # Continuous 3-shift manufacturing profile
        if 6 <= hour < 14:  # Shift 1: Morning Heavy Production
            shift_factor = 1.28 + ((hour - 6) * 0.015)
        elif 14 <= hour < 22:  # Shift 2: Afternoon & Evening Processing
            shift_factor = 1.22 - ((hour - 14) * 0.008)
        else:  # Shift 3: Night Smelting & Automated Assembly
            shift_factor = 1.05 + (math.sin(hour) * 0.03)

        weekend_mod = 0.94 if is_sunday else 1.0
        thermal_jit = (math.sin(hour_idx * 0.22) * 25.0) + ((random.random() - 0.5) * 18.0)

        load_mw = round((base_load * shift_factor * weekend_mod) + thermal_jit, 2)

        energy_readings.append(EnergyReading(
            timestamp=t,
            consumption=load_mw,
            unit="MW",
            location="Tenkasi",
            source="Tenkasi Grid Telemetry"
        ))

    return energy_readings


def generate_tirichi_weather_data(
    days: int = 30,
    end_date: datetime = None
) -> List[WeatherReading]:
    """
    Generates 30 days of weather telemetry for Tirichi.
    Characteristics:
    - Warm regional inland climate (32.0°C to 42.5°C)
    - Moderate humidity swings (25% to 58%)
    - Afternoon gusty winds up to 22 km/h
    - Weather conditions: Sunny, Clear, Warm Breeze, Hazy
    """
    if end_date is None:
        end_date = datetime(2026, 9, 15, 14, 0, 0)

    start_date = end_date - timedelta(days=days)
    weather_readings: List[WeatherReading] = []
    total_hours = days * 24

    for hour_idx in range(total_hours):
        t = start_date + timedelta(hours=hour_idx)
        hour = t.hour

        # Diurnal thermal cycle peaking at 15:00
        diurnal_phase = math.cos((hour - 15) * 2 * math.pi / 24)
        base_temp = 36.5
        daily_swing = 5.2
        noise_temp = (math.sin(hour_idx * 0.12) * 1.5) + ((random.random() - 0.5) * 1.0)
        temperature = round(base_temp + (diurnal_phase * daily_swing) + noise_temp, 1)

        # Humidity
        base_humidity = 42.0
        humidity_swing = -14.0 * diurnal_phase
        humidity_noise = (math.cos(hour_idx * 0.14) * 3.0) + ((random.random() - 0.5) * 2.0)
        humidity = max(22.0, min(75.0, round(base_humidity + humidity_swing + humidity_noise, 1)))

        wind_base = 10.0
        breeze_boost = 7.0 if 12 <= hour <= 18 else 0.0
        wind_speed = max(4.0, round(wind_base + breeze_boost + (random.random() * 4.0), 1))

        if temperature >= 41.0:
            condition = "Extreme Heat"
        elif 13 <= hour <= 17 and wind_speed > 16.0:
            condition = "Warm Breeze"
        elif temperature >= 36.0:
            condition = "Sunny"
        else:
            condition = "Hazy" if hour < 8 else "Clear"

        weather_readings.append(WeatherReading(
            timestamp=t,
            temperature=temperature,
            humidity=humidity,
            pressure=round(1008.0 - (temperature * 0.12) + (random.random() * 1.5), 1),
            wind_speed=wind_speed,
            weather_condition=condition,
            location="Tirichi",
            source="Tirichi Meteorological Station"
        ))

    return weather_readings


def generate_dindigal_appliance_data(
    days: int = 30,
    end_date: datetime = None
) -> Tuple[List[Appliance], List[ApplianceReading]]:
    """
    Generates 30 days of appliance telemetry for Dindigal facility.
    6 Endpoints:
    1. Precision Server Room Chiller (4500W) - 24/7 continuous cooling
    2. Floor AHU Air Handling Units (3200W) - Operating hours 07:30 to 20:30
    3. Workstation Smart Plug Loops (2800W) - Daytime workstation loads
    4. Commercial Cafeteria Blast Freezers (2400W) - Cyclic temperature control
    5. Smart Corridor LED Lighting Grid (850W) - Automated daylight harvesting
    6. Fleet EV Level-2 Fast Charging Hub (7400W) - Morning arrivals & evening top-ups
    """
    if end_date is None:
        end_date = datetime(2026, 9, 15, 14, 0, 0)

    start_date = end_date - timedelta(days=days)
    total_hours = days * 24

    appliances_meta = [
        {"name": "Precision Data Center Chiller Bank", "type": "HVAC", "rated_power": 4500.0, "location": "Dindigal Facility - Server Wing"},
        {"name": "Floor AHU Central Air Handling Units", "type": "HVAC", "rated_power": 3200.0, "location": "Dindigal Facility - AHU Rooms"},
        {"name": "Workstation Smart Plug Loops (300 Pods)", "type": "Workstation", "rated_power": 2800.0, "location": "Dindigal Facility - Main Office"},
        {"name": "Commercial Cafeteria Blast Freezers", "type": "Refrigeration", "rated_power": 2400.0, "location": "Dindigal Facility - Dining Hub"},
        {"name": "Architectural Smart Corridor LED Matrix", "type": "Lighting", "rated_power": 850.0, "location": "Dindigal Facility - Common Atrium"},
        {"name": "Fleet Level-2 EV Fast Charging Bank", "type": "EV Charger", "rated_power": 7400.0, "location": "Dindigal Facility - Fleet Bay"},
    ]

    appliances = [
        Appliance(
            name=m["name"],
            type=m["type"],
            rated_power=m["rated_power"],
            location=m["location"],
            status="active",
            source="Dindigal Submeter Network"
        )
        for m in appliances_meta
    ]

    appliance_readings: List[ApplianceReading] = []

    for hour_idx in range(total_hours):
        t = start_date + timedelta(hours=hour_idx)
        hour = t.hour
        is_weekend = t.weekday() >= 5

        # 1. Chiller (continuous ~3800W)
        p1 = 3600.0 + (math.sin(hour_idx * 0.1) * 250.0) + (random.random() * 120.0)
        # 2. AHU (work hours 07:30 to 20:30, minimal on weekends)
        p2 = (2800.0 + (random.random() * 200.0)) if (7 <= hour <= 20 and not is_weekend) else 120.0
        # 3. Workstations (work hours 09:00 to 19:00)
        p3 = (2450.0 + (random.random() * 250.0)) if (9 <= hour <= 19 and not is_weekend) else 85.0
        # 4. Cafeteria Freezers (cycling 1600-2200W)
        p4 = 1800.0 + (math.sin(hour * 0.8) * 350.0) + (random.random() * 100.0)
        # 5. Smart Lighting (daylight dimming during 10:00-16:00, on at night)
        if 18 <= hour <= 23 or 6 <= hour <= 8:
            p5 = 780.0 + (random.random() * 40.0)
        elif 9 <= hour <= 17:
            p5 = 320.0 + (random.random() * 50.0)
        else:
            p5 = 65.0
        # 6. EV Charging (morning 08:30-11:30 and evening 16:30-19:30 peaks)
        if (8 <= hour <= 11 or 16 <= hour <= 19) and not is_weekend:
            p6 = 6200.0 + (random.random() * 900.0)
        elif 12 <= hour <= 15 and not is_weekend:
            p6 = 2100.0 + (random.random() * 400.0)
        else:
            p6 = 25.0

        powers = [p1, p2, p3, p4, p5, p6]
        for app_idx, pwr in enumerate(powers):
            appliance_readings.append(ApplianceReading(
                appliance_id=app_idx + 1,
                timestamp=t,
                power=round(pwr, 2),
                energy=round(pwr / 1000.0, 4),
                status="on" if pwr > 100 else "standby"
            ))

    return appliances, appliance_readings


def generate_madurai_combined_data(
    days: int = 30,
    end_date: datetime = None
) -> Tuple[List[EnergyReading], List[WeatherReading]]:
    """
    Generates 30 days of synchronized multi-variate energy & weather telemetry for Madurai.
    Characteristics:
    - Regional climate: 24.5°C to 36.0°C, humidity 45% to 82%
    - Grid demand profile: 720 MW - 1,180 MW
    - Daytime commercial and evening domestic peaks
    """
    if end_date is None:
        end_date = datetime(2026, 9, 15, 14, 0, 0)

    start_date = end_date - timedelta(days=days)
    energy_readings: List[EnergyReading] = []
    weather_readings: List[WeatherReading] = []
    total_hours = days * 24

    for hour_idx in range(total_hours):
        t = start_date + timedelta(hours=hour_idx)
        hour = t.hour
        is_weekend = t.weekday() >= 5

        # Weather
        diurnal_phase = math.cos((hour - 14) * 2 * math.pi / 24)
        temp = round(28.5 + (diurnal_phase * 4.5) + ((random.random() - 0.5) * 0.8), 1)
        humidity = max(40.0, min(90.0, round(65.0 - (diurnal_phase * 15.0) + ((random.random() - 0.5) * 2.5), 1)))
        wind_speed = max(4.0, round(8.5 + (math.sin(hour_idx * 0.1) * 3.0) + (random.random() * 2.5), 1))

        if humidity > 80 and temp < 26:
            cond = "Passing Showers"
        elif 11 <= hour <= 16:
            cond = "Sunny" if random.random() > 0.4 else "Clear"
        else:
            cond = "Clear" if hour >= 18 else "Mild Breeze"

        w_read = WeatherReading(
            timestamp=t,
            temperature=temp,
            humidity=humidity,
            pressure=round(1011.0 + (random.random() * 1.5), 1),
            wind_speed=wind_speed,
            weather_condition=cond,
            location="Madurai",
            source="Madurai Regional Grid & Weather Feed"
        )
        weather_readings.append(w_read)

        # Energy
        base_load = 680.0
        if 8 <= hour <= 19 and not is_weekend:
            load_factor = 1.35 + ((hour - 8) * 0.01 if hour <= 14 else (19 - hour) * 0.015)
        elif is_weekend:
            load_factor = 0.90 + (math.sin(hour * 0.2) * 0.05)
        else:
            load_factor = 0.84 + (hour * 0.008)

        load_mw = round((base_load * load_factor) + ((random.random() - 0.5) * 12.0), 2)

        e_read = EnergyReading(
            timestamp=t,
            consumption=load_mw,
            unit="MW",
            location="Madurai",
            source="Madurai Regional Grid & Weather Feed"
        )
        energy_readings.append(e_read)

    return energy_readings, weather_readings


def seed_database_if_empty(db: Session, force: bool = False) -> Dict[str, int]:
    """
    Seeds database with all 8 realistic synthetic datasets across all 4 types,
    along with global electricity tariff and unit cost settings.
    """
    existing_datasets = db.query(Dataset).count()
    if existing_datasets >= 8 and not force:
        return {"status": "already_seeded", "datasets_count": existing_datasets}

    if force or existing_datasets < 8:
        # Clear existing tables for a clean, consistent seed
        db.query(ApplianceReading).delete()
        db.query(Appliance).delete()
        db.query(WeatherReading).delete()
        db.query(EnergyReading).delete()
        db.query(Dataset).delete()
        db.commit()

    end_dt = datetime(2026, 9, 15, 14, 0, 0)

    # 1. Generate Dataset 1-4 (Chennai suite)
    e_chennai, w_chennai, app_chennai, app_r_chennai = generate_realistic_chennai_data(days=30, end_date=end_dt)

    # 2. Generate Dataset 5: Tenkasi Energy
    e_tenkasi = generate_tenkasi_energy_data(days=30, end_date=end_dt)

    # 3. Generate Dataset 6: Tirichi Weather
    w_tirichi = generate_tirichi_weather_data(days=30, end_date=end_dt)

    # 4. Generate Dataset 7: Dindigal Appliances
    app_dindigal, app_r_dindigal = generate_dindigal_appliance_data(days=30, end_date=end_dt)

    # 5. Generate Dataset 8: Madurai Combined
    e_madurai, w_madurai = generate_madurai_combined_data(days=30, end_date=end_dt)

    # ---- Register All 8 Datasets in Registry ----
    ds_e_chennai = Dataset(
        name="Chennai Energy Dataset",
        type="energy",
        filename="chennai_energy_dataset.csv",
        description="Electricity consumption data capturing Chennai grid demand and hourly load patterns.",
        source="Chennai Grid Telemetry",
        row_count=len(e_chennai),
        date_start=e_chennai[0].timestamp,
        date_end=e_chennai[-1].timestamp
    )
    ds_w_chennai = Dataset(
        name="Chennai Weather Dataset",
        type="weather",
        filename="chennai_weather_dataset.csv",
        description="Weather telemetry containing temperature, humidity, wind speed and atmospheric conditions for coastal Chennai.",
        source="Chennai Meteorological Observatory",
        row_count=len(w_chennai),
        date_start=w_chennai[0].timestamp,
        date_end=w_chennai[-1].timestamp
    )
    ds_a_chennai = Dataset(
        name="Chennai Appliance Dataset",
        type="appliance",
        filename="chennai_appliance_dataset.csv",
        description="Residential appliance-level power telemetry (AC, Fans, Fridge, Lighting, Server) for sub-metering analytics.",
        source="Chennai Submeter Network",
        row_count=len(app_r_chennai),
        date_start=app_r_chennai[0].timestamp,
        date_end=app_r_chennai[-1].timestamp
    )
    ds_c_chennai = Dataset(
        name="Chennai Combined Dataset",
        type="combined",
        filename="chennai_combined_dataset.csv",
        description="Complete multi-variate synchronized feed containing energy load, weather metrics, and appliance allocations for Chennai.",
        source="Chennai Integrated Grid & Weather Feed",
        row_count=len(e_chennai),
        date_start=e_chennai[0].timestamp,
        date_end=e_chennai[-1].timestamp
    )

    # Dataset 5 (Energy) - Tenkasi
    ds_e_tenkasi = Dataset(
        name="Tenkasi Energy Dataset",
        type="energy",
        filename="tenkasi_energy_dataset.csv",
        description="Continuous grid telemetry capturing electrical demand and load dynamics for Tenkasi.",
        source="Tenkasi Grid Telemetry",
        row_count=len(e_tenkasi),
        date_start=e_tenkasi[0].timestamp,
        date_end=e_tenkasi[-1].timestamp
    )

    # Dataset 6 (Weather) - Tirichi
    ds_w_tirichi = Dataset(
        name="Tirichi Weather Dataset",
        type="weather",
        filename="tirichi_weather_dataset.csv",
        description="Regional weather telemetry tracking temperature, humidity swings, and ambient weather in Tirichi.",
        source="Tirichi Meteorological Station",
        row_count=len(w_tirichi),
        date_start=w_tirichi[0].timestamp,
        date_end=w_tirichi[-1].timestamp
    )

    # Dataset 7 (Appliance) - Dindigal
    ds_a_dindigal = Dataset(
        name="Dindigal Appliance Dataset",
        type="appliance",
        filename="dindigal_appliance_dataset.csv",
        description="Commercial sub-metering telemetry featuring chiller banks, AHU units, workstation loops, and fleet EV charging in Dindigal.",
        source="Dindigal Submeter Network",
        row_count=len(app_r_dindigal),
        date_start=app_r_dindigal[0].timestamp,
        date_end=app_r_dindigal[-1].timestamp
    )

    # Dataset 8 (Combined) - Madurai
    ds_c_madurai = Dataset(
        name="Madurai Combined Dataset",
        type="combined",
        filename="madurai_combined_dataset.csv",
        description="Synchronized multi-variate energy and regional weather telemetry for Madurai.",
        source="Madurai Regional Grid & Weather Feed",
        row_count=len(e_madurai),
        date_start=e_madurai[0].timestamp,
        date_end=e_madurai[-1].timestamp
    )

    all_datasets = [
        ds_e_chennai, ds_w_chennai, ds_a_chennai, ds_c_chennai,
        ds_e_tenkasi, ds_w_tirichi, ds_a_dindigal, ds_c_madurai,
    ]
    db.add_all(all_datasets)
    db.flush()

    # ---- Assign Dataset IDs & Insert Telemetry ----
    # 1. Chennai Readings
    for e in e_chennai:
        e.dataset_id = ds_e_chennai.id
    for w in w_chennai:
        w.dataset_id = ds_w_chennai.id
    for app in app_chennai:
        app.dataset_id = ds_a_chennai.id
    db.add_all(app_chennai)
    db.flush()
    app_id_map_chennai = {idx: app.id for idx, app in enumerate(app_chennai)}
    for r in app_r_chennai:
        orig_idx = r.appliance_id - 1
        r.appliance_id = app_id_map_chennai[orig_idx]
        r.dataset_id = ds_a_chennai.id

    db.add_all(e_chennai)
    db.add_all(w_chennai)
    db.add_all(app_r_chennai)

    # 2. Tenkasi Readings
    for e in e_tenkasi:
        e.dataset_id = ds_e_tenkasi.id
    db.add_all(e_tenkasi)

    # 3. Tirichi Readings
    for w in w_tirichi:
        w.dataset_id = ds_w_tirichi.id
    db.add_all(w_tirichi)

    # 4. Dindigal Appliance Readings
    for app in app_dindigal:
        app.dataset_id = ds_a_dindigal.id
    db.add_all(app_dindigal)
    db.flush()
    app_id_map_dindigal = {idx: app.id for idx, app in enumerate(app_dindigal)}
    for r in app_r_dindigal:
        orig_idx = r.appliance_id - 1
        r.appliance_id = app_id_map_dindigal[orig_idx]
        r.dataset_id = ds_a_dindigal.id
    db.add_all(app_r_dindigal)

    # 5. Madurai Combined Readings
    for e in e_madurai:
        e.dataset_id = ds_c_madurai.id
    for w in w_madurai:
        w.dataset_id = ds_c_madurai.id
    db.add_all(e_madurai)
    db.add_all(w_madurai)

    # ---- System Configuration & Energy Tariff Settings ----
    settings_records = [
        Setting(key="system_name", value="ECO AI Pro"),
        Setting(key="tagline", value="Predict. Monitor. Optimize. Save."),
        Setting(key="location", value="Chennai, Tamil Nadu, India"),
        Setting(key="grid_unit", value="MW"),
        Setting(key="cooling_threshold_temp", value="28.0"),
        Setting(key="data_mode", value="Regional Grid Telemetry"),
        Setting(key="active_level", value="Levels 1-10 Complete"),
        # Energy Cost & Electricity Tariff Settings
        Setting(key="tariff_cost_per_kwh", value="8.00"),
        Setting(key="tariff_unit", value="INR/kWh"),
        Setting(key="tariff_peak_rate", value="10.00"),
        Setting(key="tariff_offpeak_rate", value="6.40"),
        Setting(key="currency_symbol", value="₹"),
        Setting(key="currency_code", value="INR"),
        Setting(key="carbon_emission_factor_kg_per_kwh", value="0.82"),
    ]

    for s in settings_records:
        existing = db.query(Setting).filter(Setting.key == s.key).first()
        if not existing:
            db.add(s)
        else:
            existing.value = s.value

    # Set default active dataset to Chennai Combined if not set
    active_ds_setting = db.query(Setting).filter(Setting.key == "active_dataset_id").first()
    if not active_ds_setting:
        db.add(Setting(key="active_dataset_id", value=str(ds_c_chennai.id)))

    db.commit()

    total_energy_rows = len(e_chennai) + len(e_tenkasi) + len(e_madurai)
    total_weather_rows = len(w_chennai) + len(w_tirichi) + len(w_madurai)
    total_appliance_rows = len(app_r_chennai) + len(app_r_dindigal)

    return {
        "status": "seeded_successfully",
        "energy_readings": total_energy_rows,
        "weather_readings": total_weather_rows,
        "appliances": len(app_chennai) + len(app_dindigal),
        "appliance_readings": total_appliance_rows,
        "datasets": len(all_datasets),
    }

