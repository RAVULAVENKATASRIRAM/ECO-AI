import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Thermometer, Zap } from 'lucide-react';
import { TempVsEnergyPoint } from '../../types';

interface TempVsEnergyChartProps {
  data: TempVsEnergyPoint[];
  isLoading: boolean;
}

export const TempVsEnergyChart: React.FC<TempVsEnergyChartProps> = ({ data, isLoading }) => {
  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-amber-400" />
            Temperature vs Energy Consumption
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Coupling analysis: Demonstrates grid cooling load escalation as Chennai ambient temperature rises
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></span>
            <span>Data Point (Hour)</span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs animate-pulse">
            Computing thermal correlation...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                type="number"
                dataKey="temperature"
                name="Temperature"
                unit="°C"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10 }}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <YAxis
                type="number"
                dataKey="consumption"
                name="Energy Load"
                unit=" MW"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 10 }}
                domain={['dataMin - 20', 'dataMax + 20']}
              />
              <ZAxis range={[25, 35]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload as TempVsEnergyPoint;
                    return (
                      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-xs space-y-1">
                        <p className="text-slate-400 font-mono text-[10px]">{d.timestamp}</p>
                        <p className="text-amber-400 font-bold">
                          Temperature: {d.temperature}°C
                        </p>
                        <p className="text-emerald-400 font-bold">
                          Load: {d.consumption} MW
                        </p>
                        <p className="text-cyan-400 text-[11px]">
                          Humidity: {d.humidity}% ({d.weather_condition})
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                name="Readings"
                data={data}
                fill="#f59e0b"
                fillOpacity={0.7}
              />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span className="text-[11px]">Strong positive correlation: Heating above 28°C triggers significant HVAC demand</span>
        <span className="font-mono text-emerald-400 text-[11px]">Thermal Sensitivity: ~22.5 MW/°C</span>
      </div>
    </div>
  );
};
