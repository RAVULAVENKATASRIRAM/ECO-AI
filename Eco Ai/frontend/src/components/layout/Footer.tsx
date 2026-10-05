import React from 'react';
import { Award, ShieldCheck } from 'lucide-react';
import { EcoLogo } from '../common/EcoLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 py-6 px-6 border-t border-slate-800 bg-slate-950/60 text-slate-400 text-xs transition-colors">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <EcoLogo size="xs" />
          <span className="font-bold text-slate-200">ECO AI</span>
          <span className="text-slate-600">|</span>
          <span className="font-mono text-emerald-400">Predict. Monitor. Optimize. Save.</span>
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <Award className="w-3.5 h-3.5 text-teal-400" />
          <span>Complete AI + IoT Smart Energy Management Platform</span>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-400/90 text-[11px] bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Real-Time In-Memory & SQL Engine Active</span>
        </div>
      </div>
    </footer>
  );
};
