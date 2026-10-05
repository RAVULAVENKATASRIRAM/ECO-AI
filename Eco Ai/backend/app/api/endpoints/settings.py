from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.setting import Setting
from app.schemas.settings import SettingOut, SettingUpdate

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("/", response_model=List[SettingOut])
def get_all_settings(db: Session = Depends(get_db)):
    """Returns all system configuration key-values."""
    return db.query(Setting).all()


@router.put("/{key}", response_model=SettingOut)
def update_setting(key: str, payload: SettingUpdate, db: Session = Depends(get_db)):
    """Updates a configuration setting."""
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        setting = Setting(key=key, value=payload.value)
        db.add(setting)
    else:
        setting.value = payload.value
    db.commit()
    db.refresh(setting)
    return setting
