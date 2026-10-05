import React, { useEffect, useState } from 'react';
import { Header } from '../components/layout/Header';
import { fetchAppliancesDetailed, toggleAppliancePower } from '../services/api';
import type { ApplianceDetail } from '../types';
import { Cpu, Zap, MapPin, Heart, AlertTriangle, CheckCircle, Power, IndianRupee } from 'lucide-react';

const typeColors: Record<string, string> = {
  AC: 'cyan', Fan: 'sky', Refrigerator: 'blue', Lighting: 'amber', Other: 'violet',
};

function HealthBar({ score }: { score: number }) {
  const color = score >= 90 ? 'emerald' : score >= 75 ? 'amber' : 'red';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-slate-500">Health</span>
        <span className={`text-${color}-400 font-semibold`}>{score}/100</span>
      </div>
      <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-1.5 bg-${color}-400 rounded-full`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export const AppliancesPage: React.FC = () => {
  const [appliances, setAppliances] = useState<ApplianceDetail[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadData = () => {
    fetchAppliancesDetailed()
      .then(setAppliances)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (applianceId: number) => {
    setTogglingId(applianceId);
    try {
      const res = await toggleAppliancePower(applianceId);
      setAppliances(prev =>
        prev.map(a =>
          a.id === applianceId
            ? {
                ...a,
                power_state: res.power_state,
                current_power_w: res.current_power_w,
                hourly_cost_inr: res.hourly_cost_inr,
              }
            : a
        )
      );
    } catch (e) {
      console.error('Error toggling appliance:', e);
    } finally {
      setTogglingId(null);
    }
  };

  const types = ['All', ...Array.from(new Set(appliances.map(a => a.type)))];
  const filtered = filter === 'All' ? appliances : appliances.filter(a => a.type === filter);
  const totalStandby = appliances.reduce((s, a) => s + a.standby_leakage_w, 0);
  const totalEnergy = appliances.reduce((s, a) => s + a.total_energy_kwh, 0);
  const avgHealth = appliances.length ? appliances.reduce((s, a) => s + a.health_score, 0) / appliances.length : 0;
  const totalHourlyCost = appliances.reduce((s, a) => s + (a.hourly_cost_inr || 0), 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header
        title="Appliances & Sub-metering"
        subtitle="Granular device-level energy tracking, live cost analytics, and remote ON/OFF power control"
      />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Devices', value: appliances.length, unit: '', icon: Cpu, color: 'emerald' },
            { label: 'Total Energy', value: totalEnergy.toFixed(1), unit: 'kWh', icon: Zap, color: 'cyan' },
            { label: 'Fleet Cost Rate', value: `₹${totalHourlyCost.toFixed(1)}`, unit: '/hr', icon: IndianRupee, color: 'amber' },
            { label: 'Avg Health', value: avgHealth.toFixed(0), unit: '/100', icon: Heart, color: 'violet' },
          ].map(kpi => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg bg-${kpi.color}-500/10 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${kpi.color}-400`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{kpi.label}</p>
                  <p className="text-lg font-bold text-white">{kpi.value} <span className="text-xs text-slate-500">{kpi.unit}</span></p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === t ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Appliance Cards Grid */}
        {loading ? (
          <div className="text-center text-slate-500 py-16">Loading appliances…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(a => {
              const color = typeColors[a.type] || 'slate';
              const isOn = a.power_state !== 'off';
              const isToggling = togglingId === a.id;

              return (
                <div
                  key={a.id}
                  className={`border rounded-xl p-5 space-y-4 transition-all ${
                    isOn
                      ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/60 border-slate-800/60 opacity-80'
                  }`}
                >
                  {/* Header & ON/OFF Switch */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
                          {a.type}
                        </span>
                        <span className={`flex items-center gap-1 text-[10px] ${isOn ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {isOn ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {isOn ? 'Active (ON)' : 'Power Cut (OFF)'}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white leading-tight truncate">{a.name}</h3>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 shrink-0" /> {a.location}
                      </p>
                    </div>

                    {/* Remote ON / OFF Toggle Switch */}
                    <button
                      disabled={isToggling}
                      onClick={() => handleToggle(a.id)}
                      className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                        isOn ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-800 border-slate-700'
                      } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
                      title={isOn ? 'Click to turn OFF' : 'Click to turn ON'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                          isOn ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      >
                        <Power className={`w-2.5 h-2.5 ${isOn ? 'text-emerald-600' : 'text-slate-500'}`} />
                      </span>
                    </button>
                  </div>

                  {/* Health Bar */}
                  <HealthBar score={a.health_score} />

                  {/* Metrics grid */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-800/60 rounded-lg p-2">
                      <p className="text-slate-500 text-[10px]">Power</p>
                      <p className={`font-bold font-mono ${isOn ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {isOn && a.current_power_w != null ? `${a.current_power_w.toFixed(0)}W` : '0W'}
                      </p>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-2">
                      <p className="text-slate-500 text-[10px]">Hourly Cost</p>
                      <p className={`font-bold font-mono ${isOn ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {isOn && a.hourly_cost_inr != null ? `₹${a.hourly_cost_inr.toFixed(2)}` : '₹0.00'}
                      </p>
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-2">
                      <p className="text-slate-500 text-[10px]">Total Energy</p>
                      <p className="font-bold text-cyan-400 font-mono">{a.total_energy_kwh.toFixed(1)} kWh</p>
                    </div>
                  </div>

                  {a.last_seen && (
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                      <span>Rated: {a.rated_power_w.toFixed(0)}W</span>
                      <span>Last seen: {new Date(a.last_seen).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
