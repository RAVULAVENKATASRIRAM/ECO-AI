from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class WeatherReadingBase(BaseModel):
    timestamp: datetime
    temperature: float
    humidity: float
    wind_speed: float
    weather_condition: str
    location: str = "Chennai"
    source: str = "Chennai Met Synthetic Station"


class WeatherReadingOut(WeatherReadingBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class WeatherSummary(BaseModel):
    current_temperature: float
    current_humidity: float
    current_wind_speed: float
    current_condition: str
    avg_temperature: float
    max_temperature: float
    min_temperature: float
    avg_humidity: float
    correlation_with_energy: float
    weather_condition_distribution: dict
