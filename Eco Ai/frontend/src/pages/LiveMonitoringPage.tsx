import React, { useEffect, useState, useRef } from 'react';
import { Header } from '../components/layout/Header';
import { fetchLiveTelemetry, fetchWaveform } from '../services/api';
import type { LiveTelemetry, WaveformSample } from '../types';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from 'recharts';
import { Zap, Activity, Radio, Thermometer, RefreshCw, Wifi } from 'lucide-react';

function GaugeBar({ label, value, min, max, unit, color }: {
  label: string; value: number; min: number; max: number; unit: string; color: string;
}) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  return (
    <div className="bg-slate-800/60 rounded-xl p-4 space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-lg font-bold text-${color}-400`}>{value.toFixed(2)} <span className="text-xs text-slate-500">{unit}</span></span>
      </div>
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-2 bg-${color}-400 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

function PhaseCard({ phase, data }: { phase: string; data: { voltage_v: number; current_a: number; active_kw: number } }) {
  const colors: Record<string, string> = { R: 'red', Y: 'yellow', B: 'blue' };
  const c = colors[phase] || 'slate';
  return (
    <div className={`bg-slate-800/60 border border-${c}-500/20 rounded-xl p-4 space-y-1`}>
      <p className={`text-xs font-bold text-${c}-400`}>Phase {phase}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] text-slate-500">Voltage</p>
          <p className="text-sm font-bold text-white">{data.voltage_v.toFixed(0)}V</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Current</p>
          <p className="text-sm font-bold text-white">{data.current_a.toFixed(2)}A</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500">Power</p>
          <p className="text-sm font-bold text-white">{data.active_kw.toFixed(2)}kW</p>
        </div>
      </div>
    </div>
  );
}

export const LiveMonitoringPage: React.FC = () => {
  const [telemetry, setTelemetry] = useState<LiveTelemetry | null>(null);
  const [waveform, setWaveform] = useState<WaveformSample[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = async () => {
    try {
      const [t, w] = await Promise.all([fetchLiveTelemetry(), fetchWaveform(2)]);
      setTelemetry(t);
      setWaveform(w.samples || []);
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refresh, 3000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh]);

  const t = telemetry;

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="Live Monitoring"
        subtitle="Real-time electrical telemetry — Active Power, Reactive Power, Voltage, Current, Frequency, PF"
      />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">

        {/* Auto-refresh control */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400">Last updated: {lastRefresh.toLocaleTimeString()}</span>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              autoRefresh ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refresh ON (3s)' : 'Auto-refresh OFF'}
          </button>
        </div>

        {t && (
          <>
            {/* Status Banner */}
            <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${
              t.status === 'high_load'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}>
              <Wifi className="w-4 h-4" />
              <span className="text-sm font-semibold">
                System Status: <span className="uppercase">{t.status.replace('_', ' ')}</span>
              </span>
              <span className="ml-auto text-xs text-slate-400 font-mono">{t.timestamp.substring(0, 19)}</span>
            </div>

            {/* Primary Gauges */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <GaugeBar label="Active Power" value={t.active_power_kw} min={0} max={10} unit="kW" color="emerald" />
              <GaugeBar label="Reactive Power" value={t.reactive_power_kvar} min={0} max={5} unit="kVAR" color="violet" />
              <GaugeBar label="Apparent Power" value={t.apparent_power_kva} min={0} max={12} unit="kVA" color="cyan" />
              <GaugeBar label="Power Factor" value={t.power_factor} min={0.7} max={1.0} unit="PF" color="amber" />
              <GaugeBar label="Frequency" value={t.frequency_hz} min={49} max={51} unit="Hz" color="sky" />
              <GaugeBar label="THD" value={t.thd_percent} min={0} max={10} unit="%" color="rose" />
            </div>

            {/* Three-Phase Balance */}
            <div>
              <h2 className="text-sm font-semibold text-slate-300 mb-3">Three-Phase R–Y–B Balance</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['R', 'Y', 'B'] as const).map(ph => (
                  <PhaseCard key={ph} phase={ph} data={t.phases[ph]} />
                ))}
              </div>
            </div>

            {/* Waveform Oscilloscope */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">
                Oscilloscope — Voltage & Current Waveform (2 AC cycles @ 50 Hz)
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={waveform} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#1e293b" />
                  <XAxis dataKey="t_ms" tick={{ fill: '#64748b', fontSize: 9 }} unit="ms" interval={Math.floor(waveform.length / 10)} />
                  <YAxis yAxisId="v" orientation="left" tick={{ fill: '#10b981', fontSize: 10 }} unit="V" />
                  <YAxis yAxisId="i" orientation="right" tick={{ fill: '#f59e0b', fontSize: 10 }} unit="A" />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', fontSize: 11 }} />
                  <Line yAxisId="v" type="monotone" dataKey="voltage_v" stroke="#10b981" strokeWidth={2} dot={false} name="Voltage (V)" />
                  <Line yAxisId="i" type="monotone" dataKey="current_a" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Current (A)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
        {!t && (
          <div className="flex items-center justify-center h-64 text-slate-500">Loading telemetry…</div>
        )}
      </main>
    </div>
  );
};
