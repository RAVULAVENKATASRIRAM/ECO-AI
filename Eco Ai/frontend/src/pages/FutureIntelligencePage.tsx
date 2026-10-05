import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, BatteryCharging, CheckCircle2,
  Cpu, Gauge, Lightbulb, RefreshCw, TrendingUp, TrendingDown, Zap, Clock, Database, Layers,
  Receipt, PiggyBank, DollarSign, Calendar
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { CostPrediction } from '../types';

interface FutureOverviewResponse {
  current_usage: {
    label: string;
    value: number;
    unit: string;
    today: number;
    average: number;
    peak: number;
    timestamp?: string;
  };
  historical_comparison: {
    current_usage: number;
    historical_average: number;
    difference: number;
    percentage_change: number;
    trend: string;
    unit: string;
    message: string;
  };
  future_prediction: {
    predicted_usage: number;
    average_hourly_mw: number;
    peak_forecast_mw: number;
    peak_hour: string;
    horizon: string;
    unit: string;
    algorithm: string;
    algorithm_label: string;
    model_version: number;
    version_tag: string;
    training_data_count: number;
    last_model_update?: string | null;
    message: string;
    metrics: {
      mae: number | null;
      rmse: number | null;
      mape: number | null;
      r_squared: number | null;
      r2?: number | null;
    };
    forecast_points?: Array<{
      timestamp: string;
      hour: number;
      forecast_mw: number;
      lower_mw: number;
      upper_mw: number;
      temperature_c: number;
      is_peak: boolean;
      day_label?: string;
    }>;
    history_series?: Array<{
      timestamp: string;
      actual_mw: number;
      temperature_c: number;
      label: string;
    }>;
    evaluation_series?: {
      timestamps: string[];
      actual: number[];
      predicted: number[];
      residuals: number[];
    };
  };
  cost_prediction?: CostPrediction;
  efficiency: {
    score: number;
    formula: string;
    explanation: string;
    current_usage: number;
    historical_average: number;
    unit: string;
  };
  top_appliances: Array<{
    id: number;
    name: string;
    type: string;
    total_energy_kwh: number;
    current_usage_kwh?: number;
    share_of_total: number;
  }>;
  alerts: Array<{
    id: number;
    title: string;
    message: string;
    severity: string;
    category: string;
    status: string;
    timestamp: string;
  }>;
  recommendations: Array<{
    id: number;
    title: string;
    reason: string;
    evidence: string;
    action: string;
    estimated_impact_kwh: number;
    estimated_cost_saving: number;
    status: string;
  }>;
  model_status: {
    algorithm: string;
    algorithm_label: string;
    model_version: number;
    version_tag: string;
    last_updated?: string | null;
    training_data_count: number;
    metrics: { mae: number | null; rmse: number | null; mape: number | null; r_squared: number | null };
    status: string;
  };
  data_status: {
    ready: boolean;
    message: string;
  };
}

const formatNumber = (value: number | null | undefined, digits = 2) => {
  if (value == null || Number.isNaN(value)) return '—';
  return Number(value).toFixed(digits);
};

const formatCurrency = (val: number | null | undefined) => {
  if (val == null || Number.isNaN(val)) return '—';
  if (Math.abs(val) >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(val) >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  }
  return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

export const FutureIntelligencePage: React.FC = () => {
  const [data, setData] = useState<FutureOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [costViewMode, setCostViewMode] = useState<'hourly' | 'cumulative'>('hourly');

  const loadData = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/future-intelligence/overview');
      if (!res.ok) throw new Error('Failed to load Future Intelligence overview');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Error fetching future intelligence overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('http://localhost:8000/api/future-intelligence/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      const json = await res.json();
      setSyncMessage(json.message || 'Synchronized with active ML model.');
      await loadData();
    } catch (err: any) {
      setSyncMessage(err.message || 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const comparisonTone = useMemo(() => {
    if (!data) return 'text-slate-300';
    if (data.historical_comparison.percentage_change > 0) return 'text-amber-400';
    if (data.historical_comparison.percentage_change < 0) return 'text-emerald-400';
    return 'text-slate-300';
  }, [data]);

  // Forecast graph data from active model
  const predictionPoints = data?.future_prediction?.forecast_points || [];
  const historyPoints = data?.future_prediction?.history_series || [];

  const combinedForecastData = useMemo(() => {
    return [
      ...historyPoints.map(h => ({
        label: new Date(h.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }),
        actual: h.actual_mw,
        forecast: null as number | null,
        lower: null as number | null,
        upper: null as number | null,
      })),
      ...predictionPoints.map(p => ({
        label: new Date(p.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }),
        actual: null as number | null,
        forecast: p.forecast_mw,
        lower: p.lower_mw,
        upper: p.upper_mw,
      })),
    ];
  }, [historyPoints, predictionPoints]);

  // Cost series data with cumulative accumulation
  const costChartData = useMemo(() => {
    const series = data?.cost_prediction?.hourly_cost_series || [];
    let cumulative = 0;
    return series.map((pt) => {
      cumulative += pt.cost_inr;
      return {
        label: `${String(pt.hour).padStart(2, '0')}:00`,
        time: new Date(pt.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        cost_lakhs: pt.cost_inr_lakhs,
        cost_inr: pt.cost_inr,
        cumulative_lakhs: roundTo(cumulative / 100000, 2),
        rate: pt.rate_per_kwh,
        load_mw: pt.forecast_mw,
        tier: pt.tier,
        is_peak: pt.is_peak,
      };
    });
  }, [data]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header
        title="Future Intelligence"
        subtitle="Active ML Inference • Cost & Dynamic Tariff Prediction • Predictive Demand • Prescriptive Optimization"
      />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {loading ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
            Synchronizing Future Intelligence with Active ML Engine…
          </div>
        ) : !data ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            Future Intelligence is temporarily unavailable. Stored data remains safe.
          </div>
        ) : (
          <>
            {/* Synchronized Active Model Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Cpu className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unified ML Active Model</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                      {data.model_status.algorithm_label} ({data.model_status.version_tag})
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>Records: <strong className="text-white">{data.model_status.training_data_count.toLocaleString()}</strong></span>
                    <span>•</span>
                    <span>MAE: <strong className="text-emerald-400">{formatNumber(data.model_status.metrics.mae, 2)} MW</strong></span>
                    <span>•</span>
                    <span>RMSE: <strong className="text-cyan-400">{formatNumber(data.model_status.metrics.rmse, 2)} MW</strong></span>
                    <span>•</span>
                    <span>R²: <strong className="text-amber-400">{formatNumber(data.model_status.metrics.r_squared, 3)}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-stretch sm:self-auto">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all ml-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
                  <span>{syncing ? 'Synchronizing…' : 'Sync Intelligence'}</span>
                </button>
              </div>
            </div>

            {syncMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{syncMessage}</span>
              </div>
            )}

            {/* 4 Core KPI Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                  <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-emerald-400" /> Current Usage</span>
                  <span className="text-[10px] text-slate-500">Live</span>
                </div>
                <div className="mt-3 text-2xl font-bold font-mono text-white">
                  {formatNumber(data.current_usage.value, 2)} <span className="text-sm font-sans font-normal text-slate-400">{data.current_usage.unit}</span>
                </div>
                <div className="mt-2 text-xs text-slate-400">Today: {formatNumber(data.current_usage.today, 2)} {data.current_usage.unit}</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                  <span className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-cyan-400" /> Historical Change</span>
                  <span className="text-[10px] text-slate-500">24h Baseline</span>
                </div>
                <div className={`mt-3 text-2xl font-bold font-mono ${comparisonTone}`}>
                  {data.historical_comparison.percentage_change > 0 ? '+' : ''}{formatNumber(data.historical_comparison.percentage_change, 1)}%
                </div>
                <div className="mt-2 text-xs text-slate-400">Avg {formatNumber(data.historical_comparison.historical_average, 2)} {data.historical_comparison.unit}</div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                  <span className="flex items-center gap-1.5"><BatteryCharging className="w-4 h-4 text-violet-400" /> Next 24h Projected</span>
                  <span className="text-[10px] font-mono text-violet-400">{data.future_prediction.version_tag}</span>
                </div>
                <div className="mt-3 text-2xl font-bold font-mono text-white">
                  {formatNumber(data.future_prediction.predicted_usage, 1)} <span className="text-sm font-sans font-normal text-slate-400">MWh</span>
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  Peak {formatNumber(data.future_prediction.peak_forecast_mw, 1)} MW ({data.future_prediction.peak_hour})
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                  <span className="flex items-center gap-1.5"><Gauge className="w-4 h-4 text-amber-400" /> Efficiency Score</span>
                  <span className="text-[10px] text-slate-500">Benchmark</span>
                </div>
                <div className="mt-3 text-2xl font-bold font-mono text-white">
                  {formatNumber(data.efficiency.score, 1)}<span className="text-sm font-sans font-normal text-slate-400">/100</span>
                </div>
                <div className="mt-2 text-xs text-slate-400">Baseline: {formatNumber(data.efficiency.historical_average, 2)} {data.efficiency.unit}</div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* NEW: AI COST PREDICTION & DYNAMIC TARIFF INTELLIGENCE SECTION */}
            {/* ========================================================= */}
            {data.cost_prediction && (
              <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 space-y-6 shadow-xl">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-white tracking-tight">
                          AI Cost Prediction & Time-of-Day (ToD) Tariff Intelligence
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          TARIFF ENGINE
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Dynamic cost projections driven by active {data.future_prediction.algorithm_label} demand curves
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 text-xs">
                      <button
                        onClick={() => setCostViewMode('hourly')}
                        className={`px-3 py-1 rounded-md transition-all font-medium ${
                          costViewMode === 'hourly'
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Hourly Tariff
                      </button>
                      <button
                        onClick={() => setCostViewMode('cumulative')}
                        className={`px-3 py-1 rounded-md transition-all font-medium ${
                          costViewMode === 'cumulative'
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Cumulative Cost
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4 Cost KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <Receipt className="w-3.5 h-3.5" /> Next 24h Projected Cost
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">24 Hours</span>
                    </div>
                    <div className="mt-2 text-2xl font-bold font-mono text-white">
                      {formatCurrency(data.cost_prediction.projected_24h_cost_inr)}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                      <span>Historical Baseline:</span>
                      <strong className="text-slate-300 font-mono">
                        {formatCurrency(data.cost_prediction.historical_daily_cost_inr)}
                      </strong>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <PiggyBank className="w-3.5 h-3.5" /> AI Optimization Savings
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400">Potential</span>
                    </div>
                    <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">
                      {formatCurrency(data.cost_prediction.potential_monthly_savings_inr)}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                      <span>Daily Potential:</span>
                      <strong className="text-emerald-400 font-mono">
                        {formatCurrency(data.cost_prediction.potential_daily_savings_inr)}/day
                      </strong>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <Clock className="w-3.5 h-3.5" /> Peak Surcharge Share
                      </span>
                      <span className="text-[10px] font-mono text-amber-400">{data.cost_prediction.peak_hours_count} Peak Hrs</span>
                    </div>
                    <div className="mt-2 text-2xl font-bold font-mono text-amber-400">
                      {data.cost_prediction.peak_cost_share_pct}%
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Peak Cost: <strong className="text-slate-300 font-mono">{formatCurrency(data.cost_prediction.peak_cost_sum_inr)}</strong>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1.5 text-violet-400">
                        <Calendar className="w-3.5 h-3.5" /> 30-Day Projected Bill
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">Monthly</span>
                    </div>
                    <div className="mt-2 text-2xl font-bold font-mono text-white">
                      {formatCurrency(data.cost_prediction.projected_monthly_bill_inr)}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Off-Peak Share: <strong className="text-cyan-400 font-mono">{data.cost_prediction.offpeak_cost_share_pct}%</strong>
                    </div>
                  </div>
                </div>

                {/* Interactive Recharts Cost Projection Graph */}
                <div className="p-5 rounded-xl bg-slate-950/90 border border-slate-800/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        {costViewMode === 'hourly'
                          ? '24-Hour Predicted Hourly Cost (₹ Lakhs) & Dynamic Tariff Rate Tiers'
                          : 'Cumulative 24-Hour Projected Electricity Expenditure (₹ Lakhs)'}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Peak Hours (₹{data.cost_prediction.tariff_structure.peak_rate_per_kwh}/kWh) • Standard (₹{data.cost_prediction.tariff_structure.base_rate_per_kwh}/kWh) • Off-Peak (₹{data.cost_prediction.tariff_structure.offpeak_rate_per_kwh}/kWh)
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5 text-amber-400">
                        <span className="w-3 h-3 rounded bg-amber-500/80 inline-block" /> Peak Tier
                      </span>
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-3 h-3 rounded bg-emerald-500/80 inline-block" /> Standard Tier
                      </span>
                      <span className="flex items-center gap-1.5 text-cyan-400">
                        <span className="w-3 h-3 rounded bg-cyan-500/80 inline-block" /> Off-Peak Tier
                      </span>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={260}>
                    {costViewMode === 'hourly' ? (
                      <ComposedChart data={costChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis yAxisId="cost" tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 'auto']} unit=" L" />
                        <YAxis yAxisId="mw" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} domain={['auto', 'auto']} unit=" MW" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
                                  <div className="font-bold text-white flex items-center justify-between gap-4">
                                    <span>Hour: {d.label}</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                      d.tier === 'peak' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                      d.tier === 'off_peak' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                                      'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    }`}>
                                      {d.tier.replace('_', ' ')}
                                    </span>
                                  </div>
                                  <div className="text-slate-300 font-mono">Predicted Load: <strong className="text-white">{d.load_mw} MW</strong></div>
                                  <div className="text-slate-300 font-mono">Applicable Tariff: <strong className="text-emerald-400">₹{d.rate}/kWh</strong></div>
                                  <div className="text-slate-300 font-mono">Hourly Cost: <strong className="text-white">₹{d.cost_inr?.toLocaleString('en-IN')}</strong> ({d.cost_lakhs} Lakhs)</div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          yAxisId="cost"
                          dataKey="cost_lakhs"
                          name="Hourly Cost (₹ Lakhs)"
                          radius={[4, 4, 0, 0]}
                          fill="#10b981"
                        />
                        <Line
                          yAxisId="mw"
                          type="monotone"
                          dataKey="load_mw"
                          name="Predicted Load (MW)"
                          stroke="#38bdf8"
                          strokeWidth={2}
                          dot={false}
                        />
                      </ComposedChart>
                    ) : (
                      <AreaChart data={costChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="costCumGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={[0, 'auto']} unit=" L" />
                        <Tooltip
                          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: '#94a3b8' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="cumulative_lakhs"
                          name="Cumulative Expenditure (₹ Lakhs)"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fill="url(#costCumGrad)"
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>

                {/* Explanation and Tariff Structure Details */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                  <div className="lg:col-span-2 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-emerald-400" /> AI Cost Optimization Insights
                    </span>
                    <p className="text-slate-300 leading-relaxed">{data.cost_prediction.explanation}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                    <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                      Time-of-Day (ToD) Rate Card
                    </span>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="flex justify-between text-amber-400">
                        <span>Peak (18:00 - 22:00):</span>
                        <span>₹{data.cost_prediction.tariff_structure.peak_rate_per_kwh} / kWh</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Standard (Daytime):</span>
                        <span>₹{data.cost_prediction.tariff_structure.base_rate_per_kwh} / kWh</span>
                      </div>
                      <div className="flex justify-between text-cyan-400">
                        <span>Off-Peak (23:00 - 06:00):</span>
                        <span>₹{data.cost_prediction.tariff_structure.offpeak_rate_per_kwh} / kWh</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Synchronized ML Forecast Graph */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Synchronized Demand Curve — Historical Actuals vs Next 24h Inference
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Calculated exclusively by the active unified model: {data.future_prediction.algorithm_label} ({data.future_prediction.version_tag})
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-cyan-400 font-medium">
                    <span className="w-3 h-0.5 bg-cyan-400 inline-block" /> Actual
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> ML Prediction
                  </span>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={combinedForecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="fiCiGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} interval={Math.floor(combinedForecastData.length / 8)} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} unit=" MW" />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  <ReferenceLine y={850} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Peak Threshold (850 MW)', fill: '#ef4444', fontSize: 10 }} />
                  <Area type="monotone" dataKey="actual" name="Historical Actual (MW)" stroke="#38bdf8" strokeWidth={2} fill="none" />
                  <Area type="monotone" dataKey="upper" name="95% Upper CI" stroke="#6366f1" strokeWidth={1} fill="url(#fiCiGrad)" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="forecast" name="Predicted Demand (MW)" stroke="#10b981" strokeWidth={2} fill="url(#fiGrad)" />
                  <Area type="monotone" dataKey="lower" name="95% Lower CI" stroke="#6366f1" strokeWidth={1} fill="none" strokeDasharray="3 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Current vs Historical Analysis & Model Validation Accuracy */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white">Current vs Historical Baseline</h2>
                  <span className="text-xs font-mono uppercase tracking-wide text-slate-400">{data.historical_comparison.trend}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-800/80 p-3">
                    <div className="text-slate-400 text-[10px] uppercase">Current Usage</div>
                    <div className="mt-1 text-lg font-bold font-mono text-white">{formatNumber(data.historical_comparison.current_usage, 2)} <span className="text-xs font-sans font-normal text-slate-400">MW</span></div>
                  </div>
                  <div className="rounded-lg bg-slate-800/80 p-3">
                    <div className="text-slate-400 text-[10px] uppercase">Historical Avg</div>
                    <div className="mt-1 text-lg font-bold font-mono text-white">{formatNumber(data.historical_comparison.historical_average, 2)} <span className="text-xs font-sans font-normal text-slate-400">MW</span></div>
                  </div>
                  <div className="rounded-lg bg-slate-800/80 p-3">
                    <div className="text-slate-400 text-[10px] uppercase">Net Difference</div>
                    <div className="mt-1 text-lg font-bold font-mono text-white">{formatNumber(data.historical_comparison.difference, 2)} <span className="text-xs font-sans font-normal text-slate-400">MW</span></div>
                  </div>
                  <div className="rounded-lg bg-slate-800/80 p-3">
                    <div className="text-slate-400 text-[10px] uppercase">Percentage Change</div>
                    <div className={`mt-1 text-lg font-bold font-mono ${comparisonTone}`}>{formatNumber(data.historical_comparison.percentage_change, 1)}%</div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-300 leading-relaxed">{data.historical_comparison.message}</p>
              </div>

              {/* Active Model Status Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Active ML Core Status</span>
                  </div>
                  <div className="space-y-2.5 text-xs text-slate-300">
                    <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                      <span className="text-slate-400">Algorithm</span>
                      <span className="font-semibold text-white">{data.future_prediction.algorithm_label}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                      <span className="text-slate-400">Version</span>
                      <span className="font-mono text-emerald-400">{data.future_prediction.version_tag}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                      <span className="text-slate-400">Trained Records</span>
                      <span className="font-mono text-white">{data.future_prediction.training_data_count.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/60 pb-1.5">
                      <span className="text-slate-400">Validation MAE</span>
                      <span className="font-mono text-emerald-400">{formatNumber(data.future_prediction.metrics.mae, 2)} MW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Validation R²</span>
                      <span className="font-mono text-amber-400">{formatNumber(data.future_prediction.metrics.r_squared, 3)}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-[11px] text-slate-500">{data.future_prediction.message}</p>
              </div>
            </div>

            {/* Appliances Breakdown & Efficiency Card */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
                  <Zap className="w-4 h-4 text-emerald-400" /> Top Sub-Metered Appliances
                </div>
                <div className="space-y-2.5">
                  {data.top_appliances.length ? data.top_appliances.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-800/80 p-3 text-xs">
                      <div>
                        <div className="font-medium text-white">{item.name}</div>
                        <div className="text-[11px] text-slate-400">{item.type} • {formatNumber(item.share_of_total, 1)}% of total</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400">{formatNumber(item.total_energy_kwh, 1)} kWh</div>
                        <div className="text-[10px] text-slate-500">{item.current_usage_kwh ? `${formatNumber(item.current_usage_kwh, 1)} current` : 'cumulative'}</div>
                      </div>
                    </div>
                  )) : <div className="text-xs text-slate-400">No appliance data recorded yet.</div>}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                    <Lightbulb className="w-4 h-4 text-amber-400" /> Efficiency & Demand Sensitivity
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{data.efficiency.explanation}</p>
                </div>
                <div className="mt-4 rounded-lg bg-slate-950/80 border border-slate-800 p-3 text-xs text-slate-300">
                  <div className="font-semibold text-slate-400 text-[10px] uppercase">Mathematical Formulation</div>
                  <div className="mt-1 font-mono text-[11px] text-emerald-300">{data.efficiency.formula}</div>
                </div>
              </div>
            </div>

            {/* Alerts & Action Recommendations */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> Active System & Load Alerts
                </div>
                <div className="space-y-2.5">
                  {data.alerts.length ? data.alerts.map((alert) => (
                    <div key={alert.id} className="rounded-lg bg-slate-800/80 p-3 text-xs">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-white">{alert.title}</div>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                          alert.severity === 'critical' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                      <div className="mt-1 text-slate-300">{alert.message}</div>
                    </div>
                  )) : <div className="text-xs text-slate-400">No active alerts at this time.</div>}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" /> AI-Driven Optimization Actions
                </div>
                <div className="space-y-2.5">
                  {data.recommendations.length ? data.recommendations.map((item) => (
                    <div key={item.id} className="rounded-lg bg-slate-800/80 p-3 text-xs">
                      <div className="font-medium text-white">{item.title}</div>
                      <div className="mt-1 text-slate-300">{item.reason}</div>
                      <div className="mt-2 text-[11px] text-emerald-400">Action: {item.action}</div>
                    </div>
                  )) : <div className="text-xs text-slate-400">No recommendations available yet.</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

function roundTo(num: number, dec: number) {
  const factor = Math.pow(10, dec);
  return Math.round(num * factor) / factor;
}
