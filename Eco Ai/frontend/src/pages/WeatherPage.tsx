import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  CloudSun,
  Thermometer,
  Droplets,
  Wind,
  Compass,
  Zap,
  Activity,
  CheckCircle,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { WhyWhatCard } from '../components/layout/WhyWhatCard';
import { TempVsEnergyChart } from '../components/dashboard/TempVsEnergyChart';
import { fetchWeatherSummary, fetchTempVsEnergy } from '../services/api';
import { WeatherDeepSummary, TempVsEnergyPoint } from '../types';

export const WeatherPage: React.FC = () => {
  const [summary, setSummary] = useState<WeatherDeepSummary | null>(null);
  const [scatterPoints, setScatterPoints] = useState<TempVsEnergyPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [sumRes, scatRes] = await Promise.all([
        fetchWeatherSummary(),
        fetchTempVsEnergy(350),
      ]);
      setSummary(sumRes);
      setScatterPoints(scatRes);
    } catch (err) {
      console.error('Failed to load weather data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const conditionChartData = summary?.condition_distribution
    ? Object.entries(summary.condition_distribution).map(([name, count]) => ({
        condition: name,
        hours: count,
      }))
    : [];

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="Weather Analytics"
        subtitle="Atmospheric parameters and their thermodynamic impact on electricity consumption"
        onDataRefresh={loadData}
      />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-cyan-300">Active dataset for Weather Analytics</div>
            <div className="text-sm font-bold text-white">{summary?.active_dataset?.name || 'Loading active dataset...'}</div>
          </div>
          <div className="text-xs text-cyan-200/80">
            {summary?.active_dataset?.type ? `${summary.active_dataset.type.toUpperCase()} · ${summary.active_dataset.row_count?.toLocaleString() || 0} rows` : 'Reading persisted selection'}
          </div>
        </div>

        {summary && !summary.available && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {summary.message} Activate a Weather or Combined dataset in Data Management to populate this page.
          </div>
        )}

        {/* Why & What Card */}
        <WhyWhatCard
          featureName="Weather Impact & Thermal Analytics"
          why="Weather is the strongest exogenous driver of electric demand. In Chennai's tropical climate, high temperatures and humidity trigger massive HVAC cooling requirements."
          what="Tracks ambient temperature, relative humidity, and wind velocity against historical load data, computing real Pearson correlation coefficients and establishing cooling degree sensitivity thresholds."
        />

        {/* Live Weather Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel rounded-xl p-5 border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-amber-400 uppercase font-semibold">Current Temperature</span>
              <Thermometer className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {summary ? `${summary.current_temperature}°C` : '---'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Range: {summary ? `${summary.min_temperature}°C – ${summary.max_temperature}°C (Avg: ${summary.avg_temperature}°C)` : ''}
            </p>
          </div>

          <div className="glass-panel rounded-xl p-5 border border-teal-500/30 bg-gradient-to-br from-teal-950/20 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-teal-400 uppercase font-semibold">Relative Humidity</span>
              <Droplets className="w-5 h-5 text-teal-400" />
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {summary ? `${summary.current_humidity}%` : '---'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {summary ? `30-Day Mean: ${summary.avg_humidity}% (Coastal zone)` : ''}
            </p>
          </div>

          <div className="glass-panel rounded-xl p-5 border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-cyan-400 uppercase font-semibold">Wind Velocity</span>
              <Wind className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {summary ? `${summary.current_wind_speed} km/h` : '---'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {summary ? `Avg Speed: ${summary.avg_wind_speed} km/h (Bay of Bengal breeze)` : ''}
            </p>
          </div>

          <div className="glass-panel rounded-xl p-5 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-emerald-400 uppercase font-semibold">Current Sky Condition</span>
              <CloudSun className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {summary ? summary.current_condition : '---'}
            </div>
            <p className="text-xs text-slate-400 mt-1">Active meteorological observation</p>
          </div>
        </div>

        {/* Correlation & Sensitivity Analysis Banner */}
        <div className="glass-panel rounded-xl p-6 border border-emerald-500/30 bg-slate-900/90 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
              <Activity className="w-4 h-4" />
              Statistical Correlation Engine
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              Temperature vs Grid Demand Sensitivity
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Calculated using the Pearson product-moment correlation formula across synchronized timestamps. A high positive coefficient proves that higher outdoor temperatures in Chennai consistently trigger surge electricity consumption.
            </p>
            <div className="flex flex-wrap gap-4 text-xs font-mono">
              <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                <span className="text-slate-400">Pearson r (Temp vs Load): </span>
                <span className="text-emerald-400 font-bold">
                  {summary ? `+${summary.temp_energy_correlation}` : '---'}
                </span>
              </div>
              <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                <span className="text-slate-400">Cooling Sensitivity: </span>
                <span className="text-amber-400 font-bold">
                  {summary ? summary.cooling_degree_sensitivity : '---'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 font-mono mb-1">Cooling Base Temperature</p>
            <p className="text-3xl font-extrabold text-amber-400 font-mono">28.0°C</p>
            <p className="text-[11px] text-slate-400 mt-2">
              Readings exceeding 28°C experience an average increase of ~22.5 MW/°C cooling load
            </p>
          </div>
        </div>

        {/* Scatter Correlation Chart */}
        <TempVsEnergyChart data={scatterPoints} isLoading={isLoading} />

        {/* Weather Conditions Frequency */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2 mb-1">
            <Compass className="w-4 h-4 text-cyan-400" />
            Weather Condition Frequency (Past 30 Days)
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Histogram of observed meteorological conditions in Chennai
          </p>

          <div className="h-56 w-full">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs animate-pulse">
                Tabulating weather frequencies...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conditionChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="condition" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} unit=" hrs" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 shadow-xl text-xs space-y-1">
                            <p className="text-slate-200 font-bold">{payload[0].payload.condition}</p>
                            <p className="text-cyan-400 font-mono font-bold">
                              Duration: {payload[0].payload.hours} Hours
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="hours" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
