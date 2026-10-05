import React from 'react';
import { HelpCircle, Activity } from 'lucide-react';

interface WhyWhatCardProps {
  featureName: string;
  why: string;
  what: string;
}

export const WhyWhatCard: React.FC<WhyWhatCardProps> = ({ featureName, why, what }) => {
  return (
    <div className="glass-panel rounded-xl p-5 mb-6 border border-emerald-500/20 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-emerald-950/20 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />
          Feature Overview
        </span>
        <h4 className="text-sm font-semibold text-slate-300">{featureName}</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1.5 text-xs uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Why is this built?
          </div>
          <p className="text-slate-300 leading-relaxed text-xs md:text-sm">{why}</p>
        </div>

        <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1.5 text-xs uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            What does it do?
          </div>
          <p className="text-slate-300 leading-relaxed text-xs md:text-sm">{what}</p>
        </div>
      </div>
    </div>
  );
};
