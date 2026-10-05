from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class EnergyReadingBase(BaseModel):
    timestamp: datetime
    consumption: float
    unit: str = "MW"
    location: str = "Chennai"
    source: str = "Chennai Grid Synthetic Feed"


class EnergyReadingOut(EnergyReadingBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class EnergyKPIs(BaseModel):
    current_energy_usage: float
    unit: str = "MW"
    todays_consumption: float
    average_consumption: float
    peak_consumption: float
    latest_temperature: float
    latest_humidity: float
    timestamp: datetime
    total_readings: int


class EnergyTrendPoint(BaseModel):
    timestamp: str
    consumption: float
    temperature: Optional[float] = None
    humidity: Optional[float] = None


class DailyConsumptionPoint(BaseModel):
    date: str
    total_consumption: float
    avg_consumption: float
    peak_consumption: float
    avg_temperature: Optional[float] = None


class TempVsEnergyPoint(BaseModel):
    timestamp: str
    temperature: float
    consumption: float
    humidity: float
    weather_condition: str
