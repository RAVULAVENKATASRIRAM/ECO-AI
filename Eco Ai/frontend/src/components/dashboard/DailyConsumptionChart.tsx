import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { CalendarDays } from 'lucide-react';
import { DailyConsumptionPoint } from '../../types';

interface DailyConsumptionChartProps {
  data: DailyConsumptionPoint[];
  isLoading: boolean;
}

export const DailyConsumptionChart: React.FC<DailyConsumptionChartProps> = ({ data, isLoading }) => {
  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-cyan-400" />
            Daily Energy Consumption
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Aggregated total megawatt-hours consumption per calendar day
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs animate-pulse">
            Aggregating daily logs...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(str) => (str ? str.slice(5) : '')}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10 }}
                unit=" MW"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as DailyConsumptionPoint;
                    return (
                      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-xs space-y-1">
                        <p className="text-slate-400 font-mono text-[11px]">{d.date}</p>
                        <p className="text-cyan-400 font-bold font-mono">
                          Daily Total: {d.total_consumption.toLocaleString()} MW
                        </p>
                        <p className="text-slate-300 text-[11px]">
                          Average Load: {d.avg_consumption} MW
                        </p>
                        <p className="text-emerald-400 text-[11px]">
                          Peak Load: {d.peak_consumption} MW
                        </p>
                        {d.avg_temperature && (
                          <p className="text-amber-400 text-[11px]">
                            Avg Temp: {d.avg_temperature}°C
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="total_consumption"
                fill="#06b6d4"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
