import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit: string;
  subtitle?: string;
  icon: LucideIcon;
  colorScheme: 'emerald' | 'cyan' | 'amber' | 'indigo' | 'rose' | 'teal';
  trend?: string;
}

const colorMap = {
  emerald: {
    bg: 'from-emerald-500/10 to-transparent',
    border: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/20 text-emerald-400',
    text: 'text-emerald-400',
  },
  cyan: {
    bg: 'from-cyan-500/10 to-transparent',
    border: 'border-cyan-500/30',
    iconBg: 'bg-cyan-500/20 text-cyan-400',
    text: 'text-cyan-400',
  },
  amber: {
    bg: 'from-amber-500/10 to-transparent',
    border: 'border-amber-500/30',
    iconBg: 'bg-amber-500/20 text-amber-400',
    text: 'text-amber-400',
  },
  indigo: {
    bg: 'from-indigo-500/10 to-transparent',
    border: 'border-indigo-500/30',
    iconBg: 'bg-indigo-500/20 text-indigo-400',
    text: 'text-indigo-400',
  },
  rose: {
    bg: 'from-rose-500/10 to-transparent',
    border: 'border-rose-500/30',
    iconBg: 'bg-rose-500/20 text-rose-400',
    text: 'text-rose-400',
  },
  teal: {
    bg: 'from-teal-500/10 to-transparent',
    border: 'border-teal-500/30',
    iconBg: 'bg-teal-500/20 text-teal-400',
    text: 'text-teal-400',
  },
};

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  colorScheme,
  trend,
}) => {
  const c = colorMap[colorScheme];

  return (
    <div
      className={`glass-panel rounded-xl p-5 border ${c.border} bg-gradient-to-br ${c.bg} relative overflow-hidden transition-all hover:scale-[1.01] hover:shadow-xl`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight font-mono">
              {value}
            </span>
            <span className={`text-xs font-bold ${c.text} font-mono`}>{unit}</span>
          </div>
          {subtitle && <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>}
        </div>

        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.iconBg} shadow-inner`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};
