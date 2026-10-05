from fastapi import APIRouter, Query
from app.services.live_stream import get_live_telemetry, get_waveform

router = APIRouter(prefix="/live", tags=["Live Monitoring"])


@router.get("/telemetry")
def live_telemetry():
    """Returns a real-time snapshot of electrical metrics (Active/Reactive Power, V, A, Hz, PF)."""
    return get_live_telemetry()


@router.get("/waveform")
def live_waveform(cycles: int = Query(3, ge=1, le=10)):
    """Returns synthetic sinusoidal voltage + current waveform data for oscilloscope display."""
    return {"cycles": cycles, "samples": get_waveform(cycles=cycles)}
