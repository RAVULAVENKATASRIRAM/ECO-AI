import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Calendar, Filter } from 'lucide-react';
import { EnergyTrendPoint } from '../../types';

interface EnergyTimeChartProps {
  data: EnergyTrendPoint[];
  period: string;
  onPeriodChange: (period: string, customStart?: string, customEnd?: string) => void;
  isLoading: boolean;
}

export const EnergyTimeChart: React.FC<EnergyTimeChartProps> = ({
  data,
  period,
  onPeriodChange,
  isLoading,
}) => {
  const [customStart, setCustomStart] = useState('2026-09-01');
  const [customEnd, setCustomEnd] = useState('2026-09-15');
  const [showCustomModal, setShowCustomModal] = useState(false);

  const handleApplyCustom = () => {
    onPeriodChange('custom', customStart, customEnd);
    setShowCustomModal(false);
  };

  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            Energy Consumption Over Time
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Hourly consumption retrieved dynamically from the active database
          </p>
        </div>

        {/* Range Selector Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-lg border border-slate-800 text-xs">
          {(['24h', '7d', '30d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                period === p
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {p === '24h' ? '24 Hours' : p === '7d' ? '7 Days' : '30 Days'}
            </button>
          ))}

          <button
            onClick={() => setShowCustomModal(!showCustomModal)}
            className={`px-3 py-1.5 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
              period === 'custom'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Custom</span>
          </button>
        </div>
      </div>

      {/* Custom Range Drawer */}
      {showCustomModal && (
        <div className="mb-4 p-3 bg-slate-900 rounded-lg border border-slate-800 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-slate-400 font-medium">Select Range:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <span className="text-slate-500">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={handleApplyCustom}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded"
          >
            Apply Range
          </button>
        </div>
      )}

      {/* Chart Canvas */}
      <div className="h-72 w-full">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs animate-pulse">
            Loading database telemetry...
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            No energy readings found for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="energyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="timestamp"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(str) => {
                  if (!str) return '';
                  // Format e.g. "09-15 14:00"
                  return str.length > 11 ? str.slice(5) : str;
                }}
                minTickGap={25}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10 }}
                unit=" MW"
                domain={['dataMin - 30', 'dataMax + 30']}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as EnergyTrendPoint;
                    return (
                      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-xs space-y-1">
                        <p className="text-slate-400 font-mono text-[11px]">{d.timestamp}</p>
                        <p className="text-emerald-400 font-bold font-mono text-sm">
                          Load: {d.consumption} MW
                        </p>
                        {d.temperature !== undefined && (
                          <p className="text-amber-400 text-[11px]">
                            Ambient Temp: {d.temperature}°C
                          </p>
                        )}
                        {d.humidity !== undefined && (
                          <p className="text-cyan-400 text-[11px]">Humidity: {d.humidity}%</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="consumption"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#energyGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
