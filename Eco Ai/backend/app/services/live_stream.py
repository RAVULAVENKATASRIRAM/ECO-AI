"""
Live stream service — generates synthetic real-time electrical telemetry metrics
simulating what an ESP32 + CT-clamp + Modbus smart meter would emit.
"""
import math
import random
from datetime import datetime, timezone
from typing import Dict, Any, List


def _simulate_phase(base_kw: float, phase_offset_deg: float) -> Dict[str, float]:
    """Simulate one AC phase with slight imbalance."""
    imbalance = random.gauss(1.0, 0.02)
    v = round(230.0 * imbalance + random.gauss(0, 1.5), 1)
    i = round((base_kw * 1000 / (v * math.sqrt(3))) * imbalance + random.gauss(0, 0.05), 2)
    kw = round(v * i * math.sqrt(3) / 1000, 2)
    return {"voltage_v": v, "current_a": i, "active_kw": kw}


def get_live_telemetry() -> Dict[str, Any]:
    """
    Returns a snapshot of simulated real-time electrical metrics.
    Suitable for polling at 1–5 second intervals.
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    hour = now.hour

    # Diurnal base load in kW (household/small facility scale)
    if 6 <= hour < 9:
        base_kw = 4.5 + random.gauss(0, 0.3)
    elif 9 <= hour < 16:
        base_kw = 6.2 + random.gauss(0, 0.4)
    elif 16 <= hour < 21:
        base_kw = 5.8 + random.gauss(0, 0.35)
    else:
        base_kw = 2.1 + random.gauss(0, 0.2)
    base_kw = max(1.0, base_kw)

    pf = round(random.uniform(0.87, 0.97), 3)
    freq = round(50.0 + random.gauss(0, 0.08), 2)
    apparent_kva = round(base_kw / pf, 2)
    reactive_kvar = round(math.sqrt(max(0, apparent_kva ** 2 - base_kw ** 2)), 2)
    thd = round(random.uniform(2.0, 6.5), 1)

    # Three-phase voltages (R, Y, B)
    phases = {
        "R": _simulate_phase(base_kw / 3, 0),
        "Y": _simulate_phase(base_kw / 3, 120),
        "B": _simulate_phase(base_kw / 3, 240),
    }

    return {
        "timestamp": now.isoformat(),
        "active_power_kw": round(base_kw, 2),
        "reactive_power_kvar": reactive_kvar,
        "apparent_power_kva": apparent_kva,
        "power_factor": pf,
        "frequency_hz": freq,
        "thd_percent": thd,
        "phases": phases,
        "status": "normal" if base_kw < 7.0 else "high_load",
    }


def get_waveform(cycles: int = 3) -> List[Dict[str, float]]:
    """
    Generate a synthetic sinusoidal waveform (voltage + current) over `cycles` AC cycles.
    Returns list of {t_ms, voltage_v, current_a} samples at ~1ms resolution.
    """
    samples = []
    freq_hz = 50.0
    period_ms = 1000.0 / freq_hz
    total_ms = cycles * period_ms
    step_ms = 1.0
    peak_v = 325.0   # √2 × 230 V
    peak_i = 28.0
    pf_angle = math.acos(0.92)

    t = 0.0
    while t <= total_ms:
        v = peak_v * math.sin(2 * math.pi * freq_hz * t / 1000) + random.gauss(0, 0.8)
        i = peak_i * math.sin(2 * math.pi * freq_hz * t / 1000 - pf_angle) + random.gauss(0, 0.05)
        samples.append({"t_ms": round(t, 1), "voltage_v": round(v, 2), "current_a": round(i, 3)})
        t += step_ms

    return samples
