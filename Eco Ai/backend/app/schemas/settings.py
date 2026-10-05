from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SettingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    key: str
    value: str
    updated_at: datetime


class SettingUpdate(BaseModel):
    value: str
