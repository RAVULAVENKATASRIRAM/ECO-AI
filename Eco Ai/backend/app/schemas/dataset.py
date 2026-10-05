from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class DatasetBase(BaseModel):
    name: str
    type: str
    filename: str
    description: Optional[str] = None
    source: str = "User Upload / Synthetic Generator"
    row_count: int = 0
    date_start: Optional[datetime] = None
    date_end: Optional[datetime] = None


class DatasetCreate(DatasetBase):
    pass


class DatasetOut(DatasetBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class DatasetPreview(BaseModel):
    id: int
    name: str
    type: str
    total_rows: int
    columns: List[str]
    rows: List[Dict[str, Any]]
