from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class ApplianceOut(BaseModel):
    id: int
    name: str
    type: str
    rated_power: float
    location: str
    status: str
    source: str
    created_at: datetime

    class Config:
        from_attributes = True


class ApplianceDistributionItem(BaseModel):
    name: str
    type: str
    total_energy_kwh: float
    percentage: float
    rated_power_w: float
    status: str
