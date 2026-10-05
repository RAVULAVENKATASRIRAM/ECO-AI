from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from app.core.database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    type = Column(String(50), nullable=False)  # energy, weather, appliance, combined
    filename = Column(String(200), nullable=False)
    description = Column(String(500), nullable=True)
    source = Column(String(100), default="User Upload / Synthetic Generator", nullable=False)
    row_count = Column(Integer, default=0, nullable=False)
    date_start = Column(DateTime, nullable=True)
    date_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
