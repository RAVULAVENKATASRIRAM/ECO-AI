import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/layout/Header';
import {
  fetchAlerts,
  fetchAlertSummary,
  resolveAlert,
  acknowledgeAlert,
  fetchAlertConfigs,
  triggerAnomalyScan,
} from '../services/api';
import type { AlertItem, AlertSummary, AlertConfig } from '../types';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Settings2,
  RefreshCw,
  Search,
  Sliders,
  Bell,
  Check,
  Zap,
  Radio
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summary, setSummary] = useState<AlertSummary | null>(null);
  const [configs, setConfigs] = useState<AlertConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsData, summaryData, configsData] = await Promise.all([
        fetchAlerts({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          severity: severityFilter !== 'all' ? severityFilter : undefined,
          limit: 100,
        }),
        fetchAlertSummary(),
        fetchAlertConfigs(),
      ]);
      setAlerts(alertsData || []);
      setSummary(summaryData);
      setConfigs(configsData || []);
    } catch (e) {
      console.error('Failed to load alert data:', e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResolve = async (id: number) => {
    setActionLoading(id);
    try {
      await resolveAlert(id);
      setAlerts(prev =>
        prev.map(a => (a.id === id ? { ...a, status: 'resolved', resolved_at: new Date().toISOString() } : a))
      );
      if (summary) setSummary({ ...summary, active: Math.max(0, summary.active - 1) });
    } catch (e) {
      console.error('Failed to resolve alert:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcknowledge = async (id: number) => {
    setActionLoading(id);
    try {
      await acknowledgeAlert(id);
      setAlerts(prev =>
        prev.map(a => (a.id === id ? { ...a, status: 'acknowledged', acknowledged_at: new Date().toISOString() } : a))
      );
    } catch (e) {
      console.error('Failed to acknowledge alert:', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRunScan = async () => {
    setScanning(true);
    try {
      await triggerAnomalyScan();
      await loadData();
    } catch (e) {
      console.error('Failed anomaly scan:', e);
    } finally {
      setScanning(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev?.toLowerCase()) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            Critical
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Warning
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Info
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-400">Active</span>;
      case 'acknowledged':
        return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400">Acknowledged</span>;
      case 'resolved':
        return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400">Resolved</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header
        title="Intelligent Alert Center"
        subtitle="Real-time multi-threshold anomaly detector & critical event dispatch"
      />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
              <Bell className="w-6 h-6 text-slate-300" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Alerts</p>
              <p className="text-2xl font-bold text-white">{summary?.total ?? alerts.length}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-4 bg-gradient-to-br from-rose-950/20 to-slate-900">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/30">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-rose-400 font-medium">Critical Unresolved</p>
              <p className="text-2xl font-bold text-rose-300">{summary?.critical ?? 0}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4 bg-gradient-to-br from-amber-950/20 to-slate-900">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-amber-400 font-medium">Active Anomalies</p>
              <p className="text-2xl font-bold text-amber-300">{summary?.active ?? 0}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4 bg-gradient-to-br from-emerald-950/20 to-slate-900">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-emerald-400 font-medium">Resolved Events</p>
              <p className="text-2xl font-bold text-emerald-300">
                {Math.max(0, (summary?.total ?? alerts.length) - (summary?.active ?? 0))}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
              {(['all', 'active', 'acknowledged', 'resolved'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                    statusFilter === tab
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
              {(['all', 'critical', 'warning', 'info'] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                    severityFilter === sev
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfigModal(!showConfigModal)}
              className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Threshold Rules ({configs.length})
            </button>

            <button
              disabled={scanning}
              onClick={handleRunScan}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Scanning Energy Stream...' : 'Run Anomaly Scan'}
            </button>
          </div>
        </div>

        {/* Threshold Rules Panel (Collapsible) */}
        {showConfigModal && (
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-white">Active Anomaly Thresholds</h3>
              </div>
              <span className="text-xs text-slate-400">Configured detection rules</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {configs.map(c => (
                <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-200">{c.name}</span>
                    <span className={`w-2 h-2 rounded-full ${c.enabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  </div>
                  <p className="text-xs text-slate-400">Metric: <code className="text-cyan-400">{c.metric}</code></p>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80">
                    <span className="text-amber-400">Warning: {c.warning_threshold} {c.unit}</span>
                    <span className="text-rose-400">Critical: {c.critical_threshold} {c.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          {loading ? (
            <div className="p-8 space-y-4 animate-pulse">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-slate-800/50 rounded-xl" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-medium text-white mb-1">No alerts matching filter</h3>
              <p className="text-xs text-slate-400">The grid and telemetry streams are operating within normal limits.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Severity</th>
                    <th className="py-3.5 px-4">Alert Details</th>
                    <th className="py-3.5 px-4">Category / Metric</th>
                    <th className="py-3.5 px-4">Recorded Value</th>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {alerts.map(a => {
                    const isActioning = actionLoading === a.id;
                    return (
                      <tr key={a.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getSeverityBadge(a.severity)}
                        </td>
                        <td className="py-3 px-4 max-w-sm">
                          <p className="font-semibold text-slate-200 text-sm leading-snug">{a.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{a.message}</p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-slate-300 font-medium capitalize">{a.category || 'Grid'}</span>
                          {a.metric && (
                            <span className="block text-[11px] text-slate-500 font-mono mt-0.5">{a.metric}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {a.metric_value != null ? (
                            <span className="font-mono font-semibold text-rose-300">
                              {a.metric_value} {a.threshold ? <span className="text-slate-500 text-[10px]">(&gt; {a.threshold})</span> : ''}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                          {new Date(a.timestamp).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getStatusBadge(a.status)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {a.status === 'active' && (
                              <button
                                disabled={isActioning}
                                onClick={() => handleAcknowledge(a.id)}
                                title="Acknowledge Alert"
                                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-medium transition-all"
                              >
                                Ack
                              </button>
                            )}
                            {a.status !== 'resolved' && (
                              <button
                                disabled={isActioning}
                                onClick={() => handleResolve(a.id)}
                                title="Resolve Alert"
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-medium transition-all flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" /> Resolve
                              </button>
                            )}
                            {a.status === 'resolved' && (
                              <span className="text-[11px] text-slate-500 italic">Resolved</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
