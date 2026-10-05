import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/layout/Header';
import { MathematicalFormulaSection } from '../components/forecast/MathematicalFormulaSection';
import {
  fetchActiveMLModel,
  fetchMLAlgorithms,
  fetchMLComparison,
  fetchMLPredictions,
  selectMLAlgorithm,
} from '../services/api';
import type {
  ForecastPoint,
  HistorySeriesPoint,
  MLAlgorithmInfo,
  MLComparisonItem,
  MLModelRecord,
} from '../types';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import {
  TrendingUp, AlertTriangle, Activity, Target, Zap, Clock,
  CheckCircle2, RefreshCw, Cpu, Layers, BarChart3, Database,
  Play, ShieldAlert, Check
} from 'lucide-react';

const horizonOptions = [
  { label: '24h', value: 24 },
  { label: '48h', value: 48 },
  { label: '7d', value: 168 },
];

export const ForecastPage: React.FC = () => {
  const [algorithms, setAlgorithms] = useState<MLAlgorithmInfo[]>([]);
  const [activeModel, setActiveModel] = useState<MLModelRecord | null>(null);
  const [selectedAlgo, setSelectedAlgo] = useState<string>('linear_regression');
  const [comparisonList, setComparisonList] = useState<MLComparisonItem[]>([]);
  const [horizon, setHorizon] = useState<number>(24);
  const [forecastPoints, setForecastPoints] = useState<ForecastPoint[]>([]);
  const [historySeries, setHistorySeries] = useState<HistorySeriesPoint[]>([]);
  const [trainingLoading, setTrainingLoading] = useState<boolean>(false);
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [trainingMessage, setTrainingMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [algosData, activeData, compData, predData] = await Promise.all([
        fetchMLAlgorithms(),
        fetchActiveMLModel(),
        fetchMLComparison(),
        fetchMLPredictions(horizon),
      ]);

      setAlgorithms(algosData);
      setActiveModel(activeData);
      if (activeData) {
        setSelectedAlgo(activeData.algorithm);
      }
      setComparisonList(compData);
      setForecastPoints(predData.forecast_points || []);
      setHistorySeries(predData.history_series || []);
    } catch (e) {
      console.error('Failed loading ML Forecast data:', e);
    } finally {
      setPageLoading(false);
    }
  }, [horizon]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectAndTrain = async (algoId: string) => {
    setSelectedAlgo(algoId);
    setTrainingLoading(true);
    setTrainingMessage(null);
    try {
      const res = await selectMLAlgorithm(algoId);
      if (res.status === 'failed') {
        setTrainingMessage({
          text: `Training failed: ${res.error || res.message}. Previous active model preserved.`,
          type: 'error',
        });
        if (res.active_model) {
          setActiveModel(res.active_model);
        }
      } else if (res.model) {
        setActiveModel(res.model);
        setTrainingMessage({
          text: `Successfully trained and activated ${res.model.algorithm_label} (${res.model.version_tag})!`,
          type: 'success',
        });
      }
      // Refresh comparison and prediction
      const [compData, predData] = await Promise.all([
        fetchMLComparison(),
        fetchMLPredictions(horizon),
      ]);
      setComparisonList(compData);
      setForecastPoints(predData.forecast_points || []);
      setHistorySeries(predData.history_series || []);
    } catch (err: any) {
      setTrainingMessage({
        text: err.message || 'Failed to train selected algorithm. Previous model remains active.',
        type: 'error',
      });
    } finally {
      setTrainingLoading(false);
    }
  };

  const isAnomalyDetectorActive = activeModel?.algorithm === 'isolation_forest';
  const peakHours = forecastPoints.filter(f => f.is_peak);
  const maxForecast = forecastPoints.length ? Math.max(...forecastPoints.map(f => f.forecast_mw)) : 0;
  const anomalyCountInHorizon = forecastPoints.filter(f => f.is_anomaly).length;

  // Combine history and forecast for continuous chart
  const combinedChartData = [
    ...historySeries.map(h => ({
      label: new Date(h.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }),
      actual: h.actual_mw,
      forecast: null as number | null,
      lower: null as number | null,
      upper: null as number | null,
      temp: h.temperature_c,
      isHistory: true,
      isAnomaly: Boolean(h.is_anomaly),
      anomalyScore: h.anomaly_score != null ? h.anomaly_score : null,
    })),
    ...forecastPoints.map(f => ({
      label: new Date(f.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }),
      actual: null as number | null,
      forecast: f.forecast_mw,
      lower: f.lower_mw,
      upper: f.upper_mw,
      temp: f.temperature_c,
      isHistory: false,
      isAnomaly: Boolean(f.is_anomaly),
      anomalyScore: f.anomaly_score != null ? f.anomaly_score : null,
    })),
  ];

  // Validation series data (actual vs predicted on test split)
  const evalData = activeModel?.evaluation_series && activeModel.evaluation_series.timestamps?.length
    ? activeModel.evaluation_series.timestamps.map((ts, idx) => ({
        time: new Date(ts).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }),
        actual: activeModel.evaluation_series!.actual[idx],
        predicted: activeModel.evaluation_series!.predicted[idx],
        residual: activeModel.evaluation_series!.residuals ? activeModel.evaluation_series!.residuals[idx] : 0,
        isAnomaly: activeModel.evaluation_series!.is_anomaly ? activeModel.evaluation_series!.is_anomaly[idx] : false,
        anomalyScore: activeModel.evaluation_series!.anomaly_scores ? activeModel.evaluation_series!.anomaly_scores[idx] : null,
      }))
    : [];

  const featureImportance = activeModel?.feature_importance?.slice(0, 10) || [];
  const coefficients = activeModel?.coefficients?.slice(0, 10) || [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header
        title="AI Energy Forecast"
        subtitle="Unified ML Engine • Multi-Algorithm Selection & Chronological Prediction — Chennai Grid"
      />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">

        {/* Why / What Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">Why This Module</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Provides the centralized ML forecasting core for the entire Eco AI application. Selecting and activating
              an algorithm here automatically trains, validates, and synchronizes predictions across Future Intelligence,
              AI alerts, and load recommendations.
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <span className="text-sm font-semibold text-cyan-400">What It Does</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Trains genuine Scikit-Learn regressors and Isolation Forest with chronological cross-validation, extracts feature importances and coefficients,
              and generates autoregressive forecasts with 95% confidence intervals and peak load warnings.
            </p>
          </div>
        </div>

        {/* Algorithm Selection Hub */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">ML Algorithm Selector</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Choose an algorithm to display its mathematical formula and train it on live Chennai telemetry. Exactly 5 approved algorithms available.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Active Version:</span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                {activeModel ? `${activeModel.algorithm} ${activeModel.version_tag}` : 'Loading...'}
              </span>
            </div>
          </div>

          {/* Algorithm Cards Grid - Exactly 5 Approved Algorithms */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {algorithms.map((algo) => {
              const isSelected = selectedAlgo === algo.id;
              const isActive = activeModel?.algorithm === algo.id;
              return (
                <div
                  key={algo.id}
                  onClick={() => setSelectedAlgo(algo.id)}
                  className={`flex flex-col justify-between text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'border-emerald-500/80 bg-emerald-500/10 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30'
                      : isSelected
                        ? 'border-cyan-500 bg-slate-800/90 shadow-md ring-1 ring-cyan-500/30'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {algo.category}
                      </span>
                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> ACTIVE
                        </span>
                      )}
                      {!isActive && isSelected && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded">
                          SELECTED
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-white mb-1.5 leading-snug">
                      {algo.name}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                      {algo.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Train ~{algo.typical_training_time_ms}ms</span>
                    {isActive ? (
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Running
                      </span>
                    ) : isSelected ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectAndTrain(algo.id);
                        }}
                        disabled={trainingLoading}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        Run
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAlgo(algo.id);
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        Select
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Training Notification Alert */}
          {trainingLoading && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Training and validating <strong>{algorithms.find(a => a.id === selectedAlgo)?.name}</strong> on chronological dataset split…</span>
            </div>
          )}

          {trainingMessage && (
            <div className={`flex items-center gap-3 p-3.5 rounded-xl border text-xs ${
              trainingMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}>
              {trainingMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{trainingMessage.text}</span>
            </div>
          )}

          {/* Active Model Summary Details */}
          {activeModel && (
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <div className="text-white font-semibold flex items-center gap-2">
                    <span>{activeModel.algorithm_label}</span>
                    <span className="text-emerald-400 font-mono">({activeModel.version_tag})</span>
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    {activeModel.algorithm_description}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-500" />
                  <span>Records: <strong className="text-white">{activeModel.training_record_count.toLocaleString()}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Last trained: <strong className="text-white">{new Date(activeModel.updated_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section: Mathematical Formula Used (Positioned directly below ML algorithm selector and above results) */}
        <MathematicalFormulaSection
          selectedAlgo={selectedAlgo}
          activeModel={activeModel}
          trainingLoading={trainingLoading}
          onTrainModel={handleSelectAndTrain}
        />

        {/* Dynamic Real Metrics Cards (Differentiated for Anomaly Detection vs Regression Forecasting) */}
        {activeModel && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {isAnomalyDetectorActive ? 'Anomaly Detection Evaluation Metrics' : 'Regression Forecasting Metrics'}
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                {activeModel.algorithm_label} ({activeModel.version_tag})
              </span>
            </div>

            {isAnomalyDetectorActive ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Detected Anomalies',
                    value: activeModel.metrics.anomaly_count != null ? activeModel.metrics.anomaly_count.toLocaleString() : '—',
                    icon: ShieldAlert,
                    color: 'amber',
                    desc: 'Irregular surges & trips',
                  },
                  {
                    label: 'Anomaly Rate',
                    value: activeModel.metrics.anomaly_rate_pct != null ? `${activeModel.metrics.anomaly_rate_pct.toFixed(2)}%` : '—',
                    icon: Activity,
                    color: 'cyan',
                    desc: 'Outliers in test split',
                  },
                  {
                    label: 'Normal Records',
                    value: activeModel.metrics.normal_count != null ? activeModel.metrics.normal_count.toLocaleString() : '—',
                    icon: CheckCircle2,
                    color: 'emerald',
                    desc: 'Expected telemetry profile',
                  },
                  {
                    label: 'Subsample Size (n)',
                    value: activeModel.metrics.subsample_size != null ? activeModel.metrics.subsample_size.toString() : '256',
                    icon: Zap,
                    color: 'violet',
                    desc: `BST c(n) = ${activeModel.metrics.c_n ? activeModel.metrics.c_n.toFixed(2) : '10.24'}`,
                  },
                ].map(m => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400">{m.label}</p>
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-emerald-400" />
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-xl font-bold font-mono text-white">{m.value}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{m.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'MAE (Mean Absolute Error)', value: activeModel.metrics.mae != null ? `${activeModel.metrics.mae.toFixed(2)} MW` : '—', icon: Target, color: 'emerald', desc: 'Average error magnitude' },
                  { label: 'RMSE (Root Mean Sq Error)', value: activeModel.metrics.rmse != null ? `${activeModel.metrics.rmse.toFixed(2)} MW` : '—', icon: Activity, color: 'cyan', desc: 'Penalizes large deviations' },
                  { label: 'MAPE (Percentage Error)', value: activeModel.metrics.mape != null ? `${activeModel.metrics.mape.toFixed(2)}%` : '—', icon: TrendingUp, color: 'violet', desc: 'Relative accuracy' },
                  { label: 'R² (Goodness of Fit)', value: activeModel.metrics.r2 != null ? activeModel.metrics.r2.toFixed(4) : '—', icon: Zap, color: 'amber', desc: 'Variance explained' },
                ].map(m => {
                  const Icon = m.icon;
                  return (
                    <div key={m.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400">{m.label.split(' (')[0]}</p>
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-emerald-400" />
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-xl font-bold font-mono text-white">{m.value}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{m.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Horizon Selector & Warning Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-300">Analysis Horizon:</span>
            <div className="flex gap-2">
              {horizonOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setHorizon(opt.value)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    horizon === opt.value
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {opt.label} Ahead
                </button>
              ))}
            </div>
          </div>

          {isAnomalyDetectorActive ? (
            anomalyCountInHorizon > 0 ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-300 font-medium">
                  {anomalyCountInHorizon} potential anomaly window{anomalyCountInHorizon > 1 ? 's' : ''} detected in next {horizon}h
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero anomalous demand events projected in next {horizon}h</span>
              </div>
            )
          ) : peakHours.length > 0 ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-300 font-medium">
                {peakHours.length} peak hour{peakHours.length > 1 ? 's' : ''} detected — Peak {maxForecast.toFixed(1)} MW
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Grid load projected within normal thresholds</span>
            </div>
          )}
        </div>

        {/* Main Forecast Chart: Continuous History + Predictions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white">
                {isAnomalyDetectorActive
                  ? `Telemetry & Anomaly Timeline: Historical Actuals & Next ${horizon}h Horizon`
                  : `Continuous Demand Timeline: Historical Actuals & Next ${horizon}h Forecast`}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAnomalyDetectorActive
                  ? `Evaluated using Isolation Forest path length anomaly score s(x, n) by ${activeModel?.algorithm_label || 'Active Model'} (${activeModel?.version_tag})`
                  : `Autoregressive prediction generated with 95% confidence band by ${activeModel?.algorithm_label || 'Active Model'} (${activeModel?.version_tag})`}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-cyan-400 font-medium">
                <span className="w-3 h-0.5 bg-cyan-400 inline-block" /> Actual History
              </span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <span className="w-3 h-0.5 bg-emerald-400 inline-block" /> {isAnomalyDetectorActive ? 'Baseline' : 'Forecast'}
              </span>
              {isAnomalyDetectorActive && (
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Anomaly Event
                </span>
              )}
            </div>
          </div>

          {pageLoading ? (
            <div className="h-80 flex items-center justify-center text-slate-500 text-sm">Loading forecast data…</div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={combinedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} interval={Math.floor(combinedChartData.length / 8)} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} domain={['auto', 'auto']} unit=" MW" />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={(value: any, name: any, item: any) => {
                    if (item?.payload?.isAnomaly) {
                      return [`${value} MW ⚠️ (Anomaly Score: ${item?.payload?.anomalyScore ?? '>0.5'})`, name];
                    }
                    return [value != null ? `${value} MW` : '—', name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <ReferenceLine y={850} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Peak Threshold (850 MW)', fill: '#ef4444', fontSize: 10 }} />
                
                <Area type="monotone" dataKey="actual" name="Historical Actual (MW)" stroke="#38bdf8" strokeWidth={2} fill="none" connectNulls={false} />
                <Area type="monotone" dataKey="upper" name="95% Upper CI" stroke="#6366f1" strokeWidth={1} fill="url(#ciGrad)" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="forecast" name={isAnomalyDetectorActive ? 'Baseline Reference (MW)' : 'Forecast (MW)'} stroke="#10b981" strokeWidth={2.5} fill="url(#fcGrad)" />
                <Area type="monotone" dataKey="lower" name="95% Lower CI" stroke="#6366f1" strokeWidth={1} fill="none" strokeDasharray="3 3" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Model Specific Insights & Validation Accuracy Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Validation Split: Actual vs Predicted / Anomaly Scores */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white">
                  {isAnomalyDetectorActive ? 'Validation Set: Telemetry Anomaly Classification' : 'Validation Set: Actual vs Predicted'}
                </h3>
              </div>
              <span className="text-xs text-slate-400">Test split (last 20% of data)</span>
            </div>
            {evalData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={evalData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9 }} interval={Math.floor(evalData.length / 6)} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={['auto', 'auto']} unit=" MW" />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  <Line type="monotone" dataKey="actual" name="Test Actual" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    name={isAnomalyDetectorActive ? 'Baseline Actual' : 'Model Prediction'}
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-slate-500 text-xs">
                Evaluation series available once model completes chronological validation.
              </div>
            )}
          </div>

          {/* Model-Specific Feature Insights / Parameters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">
                  {activeModel?.algorithm === 'linear_regression'
                    ? 'Model Coefficients (Ridge Weights β)'
                    : activeModel?.algorithm === 'sarimax'
                      ? 'SARIMAX Fitted Parameters & Exogenous Weights'
                      : activeModel?.algorithm === 'isolation_forest'
                        ? 'Isolation Forest Anomaly Isolation Structure'
                        : 'Feature Importance Contributions (%)'}
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-400">{activeModel?.version_tag}</span>
            </div>

            {(activeModel?.algorithm === 'linear_regression' || activeModel?.algorithm === 'sarimax') && coefficients.length > 0 ? (
              <div className="overflow-y-auto max-h-64 space-y-2 pr-1">
                {coefficients.map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg text-xs">
                    <span className="font-mono text-slate-300">{c.feature}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-semibold ${c.impact === 'positive' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {c.coefficient > 0 ? `+${c.coefficient.toFixed(3)}` : c.coefficient.toFixed(3)}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded uppercase ${c.impact === 'positive' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {c.impact}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeModel?.algorithm === 'isolation_forest' ? (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span>Ensemble Forest Size:</span>
                  <strong className="text-white font-mono">120 Isolation Trees</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Subsample Size (n):</span>
                  <strong className="text-white font-mono">256 samples per tree</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>BST Normalization c(256):</span>
                  <strong className="text-cyan-400 font-mono">10.24 path edges</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Anomaly Threshold s(x, n):</span>
                  <strong className="text-amber-400 font-mono">&gt; 0.50 score</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Contamination Expectation:</span>
                  <strong className="text-emerald-400 font-mono">5.0% expected outliers</strong>
                </div>
                <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                  Observations with short isolation depth isolate near the tree root and are categorized as anomalous telemetry events.
                </p>
              </div>
            ) : featureImportance.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={featureImportance} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} unit="%" />
                  <YAxis dataKey="feature" type="category" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                    formatter={(val: any) => [`${val}%`, 'Importance']}
                  />
                  <Bar dataKey="percentage" name="Importance" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-60 flex items-center justify-center text-slate-500 text-xs">
                Feature importance not applicable for current model type.
              </div>
            )}
          </div>
        </div>

        {/* Algorithm Comparison Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Algorithm Benchmark & Performance Matrix</h2>
              <p className="text-xs text-slate-400 mt-0.5">Chronological evaluation results on active dataset</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 bg-slate-950/60">
                  <th className="text-left py-2.5 px-3">Algorithm</th>
                  <th className="text-center py-2.5 px-3">Latest Version</th>
                  <th className="text-right py-2.5 px-3">MAE (MW)</th>
                  <th className="text-right py-2.5 px-3">RMSE (MW)</th>
                  <th className="text-right py-2.5 px-3">MAPE (%)</th>
                  <th className="text-right py-2.5 px-3">R² Score</th>
                  <th className="text-right py-2.5 px-3">Records</th>
                  <th className="text-center py-2.5 px-3">Active Status</th>
                </tr>
              </thead>
              <tbody>
                {comparisonList.map((item) => (
                  <tr
                    key={item.algorithm}
                    className={`border-b border-slate-800/60 transition-colors ${
                      item.is_active ? 'bg-emerald-500/10 hover:bg-emerald-500/15' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-medium text-white flex items-center gap-2">
                      <span>{item.label}</span>
                    </td>
                    <td className="text-center py-2.5 px-3 font-mono text-slate-300">
                      {item.version ? `v${item.version}` : '—'}
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono text-emerald-400">
                      {item.algorithm === 'isolation_forest' ? 'N/A (Anomaly)' : item.mae != null ? item.mae.toFixed(2) : '—'}
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono text-cyan-400">
                      {item.algorithm === 'isolation_forest' ? 'N/A (Anomaly)' : item.rmse != null ? item.rmse.toFixed(2) : '—'}
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono text-violet-400">
                      {item.algorithm === 'isolation_forest' ? 'N/A' : item.mape != null ? `${item.mape.toFixed(2)}%` : '—'}
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono text-amber-400">
                      {item.algorithm === 'isolation_forest' ? 'N/A' : item.r2 != null ? item.r2.toFixed(4) : '—'}
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono text-slate-400">
                      {item.training_records ? item.training_records.toLocaleString() : '—'}
                    </td>
                    <td className="text-center py-2.5 px-3">
                      {item.is_active ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                          ACTIVE MODEL
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSelectAndTrain(item.algorithm)}
                          disabled={trainingLoading}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hourly Inferred Demand Points Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">
            {isAnomalyDetectorActive
              ? `Hourly Anomaly Classification & Inferred Telemetry — Next ${horizon} Hours`
              : `Hourly Inferred Demand Points — Next ${horizon} Hours`}
          </h2>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 sticky top-0 bg-slate-900">
                  <th className="text-left py-2 pr-4">Timestamp</th>
                  <th className="text-right pr-4">{isAnomalyDetectorActive ? 'Baseline (MW)' : 'Forecast (MW)'}</th>
                  <th className="text-right pr-4">95% Lower CI</th>
                  <th className="text-right pr-4">95% Upper CI</th>
                  <th className="text-right pr-4">Projected Temp (°C)</th>
                  <th className="text-right">{isAnomalyDetectorActive ? 'Anomaly Classification' : 'Grid Load Status'}</th>
                </tr>
              </thead>
              <tbody>
                {forecastPoints.map((f, i) => (
                  <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                    <td className="py-2 pr-4 text-slate-300 font-medium">
                      {new Date(f.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                    </td>
                    <td className="text-right pr-4 font-mono font-bold text-emerald-400">{f.forecast_mw.toFixed(1)}</td>
                    <td className="text-right pr-4 font-mono text-slate-500">{f.lower_mw.toFixed(1)}</td>
                    <td className="text-right pr-4 font-mono text-slate-500">{f.upper_mw.toFixed(1)}</td>
                    <td className="text-right pr-4 font-mono text-amber-400">{f.temperature_c.toFixed(1)}°C</td>
                    <td className="text-right">
                      {isAnomalyDetectorActive ? (
                        f.is_anomaly ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold text-[10px]">
                            ANOMALOUS (s &gt; 0.5)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">
                            Normal (s &le; 0.5)
                          </span>
                        )
                      ) : f.is_peak ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold text-[10px]">PEAK LOAD</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">Normal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
};
