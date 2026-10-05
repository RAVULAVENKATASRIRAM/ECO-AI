import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/layout/Header';
import { fetchIoTDevices, fetchIoTSummary, iotDeviceAction } from '../services/api';
import type { IoTDevice, IoTSummary } from '../types';
import {
  Cpu,
  Wifi,
  WifiOff,
  Radio,
  RotateCw,
  Activity,
  HardDrive,
  Signal,
  CheckCircle2,
  RefreshCw,
  Zap,
  Server
} from 'lucide-react';

export const IotDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [summary, setSummary] = useState<IoTSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [devList, sumData] = await Promise.all([fetchIoTDevices(), fetchIoTSummary()]);
      setDevices(devList || []);
      setSummary(sumData);
    } catch (e) {
      console.error('Failed to load IoT data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (id: number, action: 'ping' | 'reboot' | 'ota_update', deviceName: string) => {
    const key = `${id}-${action}`;
    setActionInProgress(key);
    setFeedbackMessage(null);
    try {
      const res = await iotDeviceAction(id, action);
      if (action === 'ping') {
        setFeedbackMessage(`Ping to ${deviceName} successful (${res.latency_ms} ms)`);
      } else if (action === 'reboot') {
        setFeedbackMessage(`Reboot command dispatched to ${deviceName}`);
      } else {
        setFeedbackMessage(`OTA firmware update scheduled for ${deviceName}`);
      }
      await load();
    } catch (e) {
      console.error(`Failed to execute ${action}:`, e);
      setFeedbackMessage(`Error performing ${action} on ${deviceName}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const getRssiBadge = (rssi: number | null) => {
    if (rssi == null) return <span className="text-slate-500">—</span>;
    if (rssi >= -65) {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-xs">
          <Signal className="w-3.5 h-3.5" /> {rssi} dBm (Excellent)
        </span>
      );
    }
    if (rssi >= -80) {
      return (
        <span className="inline-flex items-center gap-1 text-amber-400 font-mono text-xs">
          <Signal className="w-3.5 h-3.5" /> {rssi} dBm (Good)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-rose-400 font-mono text-xs">
        <Signal className="w-3.5 h-3.5" /> {rssi} dBm (Weak)
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header
        title="IoT Sensor Fleet & Gateway Registry"
        subtitle="Edge meter nodes, current transformer clamps, and smart switch telemetry"
      />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Server className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Edge Fleet</p>
              <p className="text-2xl font-bold text-white">{summary?.total ?? devices.length}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4 bg-gradient-to-br from-emerald-950/20 to-slate-900">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Wifi className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-emerald-400 font-medium">Online Devices</p>
              <p className="text-2xl font-bold text-emerald-300">{summary?.online ?? 0}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-4 bg-gradient-to-br from-rose-950/20 to-slate-900">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
              <WifiOff className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-rose-400 font-medium">Offline Devices</p>
              <p className="text-2xl font-bold text-rose-300">{summary?.offline ?? 0}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Radio className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">MQTT Protocol</p>
              <p className="text-lg font-bold text-white">v3.1.1 / TLS</p>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-xs text-cyan-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
            <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Fleet Registry Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold text-white">Edge Sensor Node Registry</h3>
            </div>
            <button
              onClick={load}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-8 space-y-4 animate-pulse">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-slate-800/50 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Device Name & Type</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">IP & MAC</th>
                    <th className="py-3.5 px-4">Firmware</th>
                    <th className="py-3.5 px-4">Signal (RSSI)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Uptime</th>
                    <th className="py-3.5 px-4 text-right">Edge Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {devices.map(d => {
                    const isOnline = d.status === 'online';
                    return (
                      <tr key={d.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                            <span className="font-bold text-white text-sm">{d.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 capitalize">{d.device_type} {d.model ? `(${d.model})` : ''}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-medium">{d.location || 'Chennai Grid'}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          <div>{d.ip_address || '—'}</div>
                          <div className="text-slate-500">{d.mac_address || '—'}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{d.firmware_version || 'v1.0.0'}</td>
                        <td className="py-3 px-4 whitespace-nowrap">{getRssiBadge(d.rssi)}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                              isOnline
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono">
                          {d.uptime_hours != null ? `${d.uptime_hours.toFixed(1)}h` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              disabled={actionInProgress === `${d.id}-ping`}
                              onClick={() => handleAction(d.id, 'ping', d.name)}
                              className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all"
                            >
                              Ping
                            </button>
                            <button
                              disabled={actionInProgress === `${d.id}-reboot`}
                              onClick={() => handleAction(d.id, 'reboot', d.name)}
                              className="px-2.5 py-1 rounded-lg border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium transition-all"
                            >
                              Reboot
                            </button>
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
