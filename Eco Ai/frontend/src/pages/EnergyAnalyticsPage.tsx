import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  LineChart as ChartIcon,
  Flame,
  Moon,
  Clock,
  TrendingUp,
  Activity,
  Zap,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { WhyWhatCard } from '../components/layout/WhyWhatCard';
import { fetchEnergyDeepAnalytics } from '../services/api';
import { EnergyDeepAnalytics } from '../types';

export const EnergyAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<EnergyDeepAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await fetchEnergyDeepAnalytics();
      setAnalytics(res);
    } catch (err) {
      console.error('Failed to load energy analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="Energy Analytics"
        subtitle="Deep dive load analysis: Peak vs off-peak, hourly profiles, and load duration curves"
        onDataRefresh={loadData}
      />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-emerald-300">Active dataset for Energy Analytics</div>
            <div className="text-sm font-bold text-white">{analytics?.active_dataset?.name || 'Loading active dataset...'}</div>
          </div>
          <div className="text-xs text-emerald-200/80">
            {analytics?.active_dataset?.type ? `${analytics.active_dataset.type.toUpperCase()} · ${analytics.active_dataset.row_count?.toLocaleString() || 0} rows` : 'Reading persisted selection'}
          </div>
        </div>

        {analytics && !analytics.available && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {analytics.message} Activate an Energy or Combined dataset in Data Management to populate this page.
          </div>
        )}

        {/* Why & What Card */}
        <WhyWhatCard
          featureName="Energy Analytics Engine"
          why="Understanding temporal load dynamics and peak-to-offpeak ratios allows facility and grid managers to design tariff-shifting, peak-shaving, and demand-response strategies."
          what="Analyzes 30-day historical time-series to separate peak from off-peak energy, plots 24-hour weekday vs weekend load comparisons, and graphs the Load Duration Curve (LDC) to reveal baseload vs peak capacity needs."
        />

        {/* Peak vs Off-Peak Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel rounded-xl p-5 border border-rose-500/30 bg-gradient-to-br from-rose-950/20 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-rose-400 uppercase font-semibold">Peak Demand Share</span>
              <Flame className="w-5 h-5 text-rose-400" />
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {analytics ? `${analytics.peak_percentage}%` : '---'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {analytics ? `${analytics.peak_energy.toLocaleString()} MW consumed in peak hours` : ''}
            </p>
          </div>

          <div className="glass-panel rounded-xl p-5 border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-cyan-400 uppercase font-semibold">Off-Peak Share</span>
              <Moon className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {analytics ? `${analytics.offpeak_percentage}%` : '---'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {analytics ? `${analytics.offpeak_energy.toLocaleString()} MW in valley hours` : ''}
            </p>
          </div>

          <div className="glass-panel rounded-xl p-5 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-emerald-400 uppercase font-semibold">Baseload Floor</span>
              <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {analytics ? `${analytics.lowest_recorded} MW` : '---'}
            </div>
            <p className="text-xs text-slate-400 mt-1">Minimum continuous grid draw</p>
          </div>

          <div className="glass-panel rounded-xl p-5 border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-transparent">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-amber-400 uppercase font-semibold">All-Time Peak</span>
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-white font-mono">
              {analytics ? `${analytics.highest_recorded} MW` : '---'}
            </div>
            <p className="text-xs text-slate-400 mt-1">Maximum instantaneous spike</p>
          </div>
        </div>

        {/* Chart 1: Weekday vs Weekend Hourly Load Curves */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                Hourly Load Profile: Weekdays vs Weekends
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Shows average hourly MW consumption across 24 hours of the diurnal cycle
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs animate-pulse">
                Processing hourly profiles...
              </div>
            ) : !analytics ? null : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.hourly_curve} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="hour" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} unit=" MW" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-xs space-y-1">
                            <p className="text-slate-400 font-mono text-[11px]">Hour: {payload[0].payload.hour}</p>
                            <p className="text-emerald-400 font-bold">
                              Weekday Avg: {payload[0].payload.weekday_avg} MW
                            </p>
                            <p className="text-cyan-400 font-bold">
                              Weekend Avg: {payload[0].payload.weekend_avg} MW
                            </p>
                            <p className="text-amber-400 text-[11px]">
                              Combined Avg: {payload[0].payload.overall_avg} MW
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="weekday_avg"
                    name="Weekday Average"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weekend_avg"
                    name="Weekend Average"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    dot={{ r: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Load Duration Curve */}
        <div className="glass-panel rounded-xl p-5 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <ChartIcon className="w-4 h-4 text-teal-400" />
                Load Duration Curve (LDC)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Displays electricity consumption values sorted in descending order to analyze capacity utilization
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
              Standard Power Engineering Tool
            </span>
          </div>

          <div className="h-64 w-full">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs animate-pulse">
                Constructing Load Duration Curve...
              </div>
            ) : !analytics ? null : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.load_duration_curve} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ldcGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="percentile"
                    stroke="#64748b"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    unit="%"
                    label={{ value: '% of Time Load is Exceeded', position: 'insideBottom', offset: -4, fill: '#64748b', fontSize: 10 }}
                  />
                  <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 10 }} unit=" MW" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 border border-slate-700 rounded-lg p-2.5 shadow-xl text-xs space-y-1">
                            <p className="text-slate-400 text-[10px]">
                              Time Duration: {payload[0].payload.percentile}%
                            </p>
                            <p className="text-teal-400 font-bold font-mono">
                              Exceeded Load: {payload[0].payload.load_mw} MW
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="load_mw"
                    stroke="#14b8a6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#ldcGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
