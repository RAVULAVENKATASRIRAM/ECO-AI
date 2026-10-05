import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { PieChart as PieIcon, Cpu } from 'lucide-react';
import { ApplianceDistributionItem } from '../../types';

interface ApplianceDistributionProps {
  data: ApplianceDistributionItem[];
  isLoading: boolean;
}

const COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export const ApplianceDistributionChart: React.FC<ApplianceDistributionProps> = ({
  data,
  isLoading,
}) => {
  return (
    <div className="glass-panel rounded-xl p-5 border border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-400" />
            Appliance Energy Distribution
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Computed dynamically from real database appliance readings
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-xs animate-pulse">
          Calculating appliance shares...
        </div>
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-slate-500 text-xs">
          No appliance readings recorded in database.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4">
          <div className="h-60 md:col-span-6 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="percentage"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {data.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload as ApplianceDistributionItem;
                      return (
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-xs space-y-1">
                          <p className="text-slate-200 font-bold">{d.name}</p>
                          <p className="text-slate-400 text-[11px]">Type: {d.type}</p>
                          <p className="text-emerald-400 font-bold font-mono">
                            Share: {d.percentage}%
                          </p>
                          <p className="text-slate-300 text-[11px]">
                            Energy: {d.total_energy_kwh} kWh
                          </p>
                          <p className="text-slate-400 text-[11px]">
                            Rated: {d.rated_power_w} W
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Breakdown Legend Table */}
          <div className="md:col-span-6 space-y-2">
            {data.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  ></span>
                  <div className="truncate max-w-[140px] sm:max-w-[170px]">
                    <p className="text-slate-200 font-medium truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-500">{item.type} • {item.rated_power_w}W</p>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="font-bold text-slate-100">{item.percentage}%</span>
                  <p className="text-[10px] text-slate-400">{item.total_energy_kwh} kWh</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
