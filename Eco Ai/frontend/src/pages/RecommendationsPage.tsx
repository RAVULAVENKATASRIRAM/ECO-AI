import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/layout/Header';
import {
  fetchRecommendations,
  takeRecommendationAction,
  fetchHighConsumptionAppliances,
  toggleAppliancePower,
  toggleRecommendationAppliance
} from '../services/api';
import type { Recommendation, HighConsumptionNotice, HighConsumptionSummary } from '../types';
import {
  Lightbulb,
  TrendingDown,
  Leaf,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Zap,
  Layers,
  ArrowRight,
  Power,
  PowerOff,
  AlertTriangle,
  BellRing,
  Volume2,
  VolumeX,
  ShieldAlert,
  SlidersHorizontal,
  RefreshCw,
  Cpu
} from 'lucide-react';

export const RecommendationsPage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [highConsumption, setHighConsumption] = useState<HighConsumptionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'applied' | 'dismissed'>('all');
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);
  const [togglingApplianceId, setTogglingApplianceId] = useState<number | null>(null);
  const [notificationMuted, setNotificationMuted] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warn' | 'info' } | null>(null);
  const [showWatchdog, setShowWatchdog] = useState(true);

  const showToast = (text: string, type: 'success' | 'warn' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recsData, highData] = await Promise.all([
        fetchRecommendations().catch(() => []),
        fetchHighConsumptionAppliances().catch(() => null),
      ]);
      setRecommendations(recsData || []);
      setHighConsumption(highData);
    } catch (e) {
      console.error('Error fetching recommendations or high consumption notices:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Periodic refresh every 30 seconds for live appliance cost tracking
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const handleAction = async (id: number, action: 'apply' | 'dismiss') => {
    setActionInProgress(id);
    try {
      await takeRecommendationAction(id, action);
      setRecommendations(prev =>
        prev.map(r => (r.id === id ? { ...r, status: action === 'apply' ? 'applied' : 'dismissed' } : r))
      );
      showToast(
        action === 'apply' ? 'Recommendation applied successfully!' : 'Optimization suggestion dismissed.',
        action === 'apply' ? 'success' : 'info'
      );
    } catch (e) {
      console.error(`Error performing action ${action}:`, e);
      showToast('Failed to apply recommendation action.', 'warn');
    } finally {
      setActionInProgress(null);
    }
  };

  // Toggle appliance power directly
  const handleAppliancePowerToggle = async (applianceId: number, currentPowerState: 'on' | 'off') => {
    setTogglingApplianceId(applianceId);
    const targetState = currentPowerState === 'on' ? 'off' : 'on';
    try {
      const res = await toggleAppliancePower(applianceId);
      
      // Update highConsumption state locally
      if (highConsumption) {
        setHighConsumption({
          ...highConsumption,
          notices: highConsumption.notices.map(n =>
            n.appliance_id === applianceId
              ? {
                  ...n,
                  power_state: res.power_state,
                  current_power_w: res.current_power_w,
                  hourly_cost_inr: res.hourly_cost_inr,
                }
              : n
          ),
        });
      }

      // Update recommendations linked to this appliance
      setRecommendations(prev =>
        prev.map(r => {
          if (r.appliance && r.appliance.id === applianceId) {
            return {
              ...r,
              status: res.power_state === 'off' ? 'applied' : r.status,
              appliance: {
                ...r.appliance,
                power_state: res.power_state,
                current_power_w: res.current_power_w,
                hourly_cost_inr: res.hourly_cost_inr,
              },
            };
          }
          return r;
        })
      );

      if (res.power_state === 'off') {
        showToast(res.message || `Appliance powered down. Savings activated!`, 'success');
      } else {
        showToast(res.message || `Appliance turned ON.`, 'info');
      }

      // Refresh data in background
      fetchHighConsumptionAppliances().then(data => setHighConsumption(data)).catch(() => {});
    } catch (e) {
      console.error('Error toggling appliance power:', e);
      showToast('Failed to toggle appliance power.', 'warn');
    } finally {
      setTogglingApplianceId(null);
    }
  };

  // Toggle appliance from within recommendation card
  const handleRecApplianceToggle = async (recId: number) => {
    setActionInProgress(recId);
    try {
      const res = await toggleRecommendationAppliance(recId);
      const appRes = res.appliance;

      setRecommendations(prev =>
        prev.map(r => {
          if (r.id === recId) {
            return {
              ...r,
              status: res.recommendation_status,
              appliance: r.appliance
                ? {
                    ...r.appliance,
                    power_state: appRes.power_state,
                    current_power_w: appRes.current_power_w,
                    hourly_cost_inr: appRes.hourly_cost_inr,
                  }
                : null,
            };
          }
          return r;
        })
      );

      showToast(
        appRes.power_state === 'off'
          ? `Optimization applied! ${appRes.name} turned OFF (Saving ₹${appRes.hourly_cost_inr || 0}/hr).`
          : `${appRes.name} turned ON.`,
        'success'
      );

      // Refresh high consumption notices
      fetchHighConsumptionAppliances().then(data => setHighConsumption(data)).catch(() => {});
    } catch (e) {
      console.error('Error toggling recommendation appliance:', e);
      showToast('Failed to toggle appliance for this recommendation.', 'warn');
    } finally {
      setActionInProgress(null);
    }
  };

  const activeRecs = recommendations.filter(r => r.status === 'active');
  const totalPotentialSavingINR = activeRecs.reduce((sum, r) => sum + (r.estimated_cost_saving || 0), 0);
  const totalPotentialKwh = activeRecs.reduce((sum, r) => sum + (r.estimated_kwh_saving || 0), 0);
  const totalCarbonKg = activeRecs.reduce((sum, r) => sum + (r.carbon_reduction_kg || 0), 0);

  const filtered = recommendations.filter(r => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  const getImpactBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">High Impact</span>;
      case 'medium':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">Medium Impact</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">Low Impact</span>;
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'hvac':
        return <Sparkles className="w-5 h-5 text-cyan-400" />;
      case 'load_shifting':
      case 'load shifting':
        return <Clock className="w-5 h-5 text-amber-400" />;
      case 'standby':
        return <Zap className="w-5 h-5 text-violet-400" />;
      default:
        return <Layers className="w-5 h-5 text-emerald-400" />;
    }
  };

  // Find top critical high-consumption appliance for prominent notification banner
  const activeCriticalNotices = highConsumption?.notices?.filter(
    n => n.power_state === 'on' && (n.current_power_w > 800 || n.hourly_cost_inr >= 10.0)
  ) || [];

  const topCriticalNotice = activeCriticalNotices.length > 0 ? activeCriticalNotices[0] : null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header
        title="AI Energy Recommendations & Perspective Insights"
        subtitle="Prescriptive optimizations, high-consumption notification watchdog, and direct remote ON/OFF power control"
      />

      {/* Floating Action Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 border border-emerald-500/40 text-white px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage.text}</span>
        </div>
      )}

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">

        {/* 1. HIGH CONSUMPTION & COST NOTIFICATION ALERT BANNER */}
        {topCriticalNotice && (
          <div className="relative overflow-hidden rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-950/70 via-slate-900 to-amber-950/40 p-5 shadow-2xl shadow-red-950/40 animate-pulse-slow">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0 text-red-400 mt-0.5">
                  <BellRing className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-red-500 text-white tracking-wide uppercase">
                      CRITICAL COST NOTIFICATION
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-red-500/20 text-red-300 border border-red-500/30">
                      {highConsumption?.tariff_tier} Tariff (₹{highConsumption?.tariff_rate_inr}/kWh)
                    </span>
                    <span className="text-xs text-slate-400">
                      {activeCriticalNotices.length} appliance(s) consuming excess power
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1.5 flex items-center gap-2">
                    {topCriticalNotice.name} is consuming {topCriticalNotice.current_power_w.toFixed(0)}W (₹{topCriticalNotice.hourly_cost_inr.toFixed(2)}/hr)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                    {topCriticalNotice.warning_message} Turning OFF this appliance now prevents excessive billing and avoids peak grid strain.
                  </p>
                </div>
              </div>

              {/* 1-Click Turn Off Remote Action */}
              <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto justify-end">
                <button
                  onClick={() => setNotificationMuted(!notificationMuted)}
                  title={notificationMuted ? 'Unmute alerts' : 'Mute notification sound'}
                  className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
                >
                  {notificationMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
                </button>

                <button
                  disabled={togglingApplianceId === topCriticalNotice.appliance_id}
                  onClick={() => handleAppliancePowerToggle(topCriticalNotice.appliance_id, topCriticalNotice.power_state)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold text-sm shadow-lg shadow-red-500/20 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                >
                  <PowerOff className="w-4 h-4" />
                  {togglingApplianceId === topCriticalNotice.appliance_id ? 'Turning OFF...' : `Switch OFF (Save ₹${topCriticalNotice.hourly_cost_inr.toFixed(2)}/hr)`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. TOP SUMMARY BANNER */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Total Monthly Savings</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <IndianRupee className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              ₹{totalPotentialSavingINR.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-400 mt-2">from {activeRecs.length} actionable suggestions</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-500/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Energy Reduction</span>
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <TrendingDown className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {totalPotentialKwh.toLocaleString('en-IN')} <span className="text-lg font-normal text-slate-400">kWh</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Potential consumption offset</p>
          </div>

          <div className="bg-gradient-to-br from-teal-950/40 via-slate-900 to-slate-900 border border-teal-500/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-400">CO₂ Avoidance</span>
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
                <Leaf className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {totalCarbonKg.toLocaleString('en-IN')} <span className="text-lg font-normal text-slate-400">kg CO₂</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">Tamil Nadu grid factor (0.82 kg/kWh)</p>
          </div>

          {/* High Consumption Watchdog Summary KPI */}
          <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/20 rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Active High-Cost Load</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-amber-400 tracking-tight">
              ₹{highConsumption?.total_excess_cost_per_hr?.toFixed(1) || '0.0'}{' '}
              <span className="text-sm font-normal text-slate-400">/hr</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {highConsumption?.active_high_count || 0} device(s) drawing {highConsumption?.total_high_power_kw || 0} kW
            </p>
          </div>
        </div>

        {/* 3. APPLIANCE ENERGY WATCHDOG & REMOTE ON/OFF SWITCHBOARD */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Appliance Energy & Cost Watchdog — Remote ON/OFF Switchboard
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    PRESCRIPTIVE CONTROL
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time power monitoring with instant power cutoff switch to halt excessive tariffs and energy loss
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => load()}
                title="Refresh appliance readings"
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowWatchdog(!showWatchdog)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                {showWatchdog ? 'Collapse Fleet' : 'Expand Fleet'}
              </button>
            </div>
          </div>

          {showWatchdog && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
              {highConsumption?.notices?.map(item => {
                const isOn = item.power_state === 'on';
                const isToggling = togglingApplianceId === item.appliance_id;

                return (
                  <div
                    key={item.appliance_id}
                    className={`rounded-xl border p-4 transition-all duration-200 ${
                      isOn
                        ? item.severity === 'critical'
                          ? 'border-red-500/40 bg-red-950/20 shadow-md shadow-red-950/20'
                          : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                        : 'border-slate-800/60 bg-slate-950/40 opacity-75'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isOn
                                ? item.severity === 'critical'
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isOn ? (item.severity === 'critical' ? 'High Cost' : 'Running') : 'Powered OFF'}
                          </span>
                          <span className="text-[10px] text-slate-500 truncate">{item.location}</span>
                        </div>
                        <h4 className="text-sm font-semibold text-white truncate" title={item.name}>
                          {item.name}
                        </h4>
                      </div>

                      {/* Interactive ON / OFF Switch */}
                      <button
                        disabled={isToggling}
                        onClick={() => handleAppliancePowerToggle(item.appliance_id, item.power_state)}
                        className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                          isOn ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-800 border-slate-700'
                        } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
                        title={isOn ? 'Click to turn OFF appliance' : 'Click to turn ON appliance'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                            isOn ? 'translate-x-7' : 'translate-x-0'
                          }`}
                        >
                          <Power className={`w-3 h-3 ${isOn ? 'text-emerald-600' : 'text-slate-500'}`} />
                        </span>
                      </button>
                    </div>

                    {/* Telemetry & Financial Breakdown */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center">
                      <div className="bg-slate-900/80 p-2 rounded-lg">
                        <div className="text-[10px] text-slate-500 uppercase">Power</div>
                        <div className={`text-xs font-mono font-bold ${isOn ? 'text-cyan-400' : 'text-slate-500'}`}>
                          {isOn ? `${item.current_power_w.toFixed(0)}W` : '0W'}
                        </div>
                      </div>

                      <div className="bg-slate-900/80 p-2 rounded-lg">
                        <div className="text-[10px] text-slate-500 uppercase">Hourly Cost</div>
                        <div className={`text-xs font-mono font-bold ${isOn ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {isOn ? `₹${item.hourly_cost_inr.toFixed(2)}` : '₹0.00'}
                        </div>
                      </div>

                      <div className="bg-slate-900/80 p-2 rounded-lg">
                        <div className="text-[10px] text-slate-500 uppercase">Status</div>
                        <div className={`text-xs font-bold ${isOn ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {isOn ? 'Active' : 'Stopped'}
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Footer */}
                    <div className="mt-3 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        {isOn ? (
                          <span className="text-amber-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Turn off to save ₹{item.hourly_cost_inr.toFixed(2)}/hr
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Saving energy & cost
                          </span>
                        )}
                      </span>

                      <button
                        disabled={isToggling}
                        onClick={() => handleAppliancePowerToggle(item.appliance_id, item.power_state)}
                        className={`font-semibold hover:underline ${isOn ? 'text-red-400' : 'text-emerald-400'}`}
                      >
                        {isOn ? 'Power OFF' : 'Power ON'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. FILTER NAVIGATION */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Prescriptive Optimization Actions</h2>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
              {filtered.length}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            {(['all', 'active', 'applied', 'dismissed'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  filter === tab
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* 5. RECOMMENDATION CARDS LIST */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-56 bg-slate-900 border border-slate-800 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
            <h3 className="text-lg font-medium text-white mb-1">No recommendations found</h3>
            <p className="text-sm text-slate-400">All optimizations in this category have been processed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map(rec => {
              const isApplied = rec.status === 'applied';
              const isDismissed = rec.status === 'dismissed';
              const hasAppliance = !!rec.appliance;
              const app = rec.appliance;
              const isAppOn = app?.power_state === 'on';

              return (
                <div
                  key={rec.id}
                  className={`bg-slate-900/90 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:border-slate-700 ${
                    isApplied
                      ? 'border-emerald-500/30 bg-emerald-950/10'
                      : isDismissed
                      ? 'border-slate-800/50 opacity-60'
                      : 'border-slate-800 shadow-lg'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                          {getCategoryIcon(rec.category)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-white text-base leading-snug">{rec.title}</h3>
                          <span className="text-xs text-slate-400 capitalize">{rec.category.replace('_', ' ')}</span>
                        </div>
                      </div>
                      {getImpactBadge(rec.impact_level)}
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed mb-4">{rec.description}</p>

                    {/* Action Suggestion Pill */}
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 mb-4 flex items-start gap-2.5">
                      <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-xs text-slate-300">
                        <span className="font-semibold text-emerald-400">Suggested Action: </span>
                        {rec.action_text}
                      </div>
                    </div>

                    {/* Linked Appliance Control Strip */}
                    {hasAppliance && app && (
                      <div className="bg-slate-950/90 border border-cyan-500/30 rounded-xl p-3.5 mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate flex items-center gap-1.5">
                              {app.name}
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                  isAppOn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {isAppOn ? 'ON' : 'OFF'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {isAppOn ? `${app.current_power_w}W • ₹${app.hourly_cost_inr}/hr` : 'Power cut • 0W'}
                            </div>
                          </div>
                        </div>

                        {/* Direct Remote ON/OFF Switch inside recommendation card */}
                        <button
                          disabled={actionInProgress === rec.id}
                          onClick={() => handleRecApplianceToggle(rec.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                            isAppOn
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-slate-950'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {isAppOn ? 'Turn OFF Now' : 'Turn ON'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Savings & Action Footer */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Est. Savings</span>
                        <span className="font-bold text-emerald-400 text-sm">₹{rec.estimated_cost_saving}</span>
                      </div>
                      <div className="h-6 w-px bg-slate-800" />
                      <div>
                        <span className="text-slate-500 block">Energy</span>
                        <span className="font-semibold text-slate-200">{rec.estimated_kwh_saving} kWh</span>
                      </div>
                      <div className="h-6 w-px bg-slate-800" />
                      <div>
                        <span className="text-slate-500 block">CO₂</span>
                        <span className="font-semibold text-slate-200">{rec.carbon_reduction_kg} kg</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {rec.status === 'active' ? (
                        <>
                          <button
                            disabled={actionInProgress === rec.id}
                            onClick={() => handleAction(rec.id, 'dismiss')}
                            className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs font-medium transition-colors"
                          >
                            Dismiss
                          </button>
                          <button
                            disabled={actionInProgress === rec.id}
                            onClick={() => handleAction(rec.id, 'apply')}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Apply
                          </button>
                        </>
                      ) : isApplied ? (
                        <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Applied
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-lg">
                          <XCircle className="w-3.5 h-3.5" /> Dismissed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
