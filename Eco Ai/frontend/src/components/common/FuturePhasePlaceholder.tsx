import React from 'react';
import { Clock, ArrowRight, Layers, Cpu, ShieldCheck } from 'lucide-react';
import { WhyWhatCard } from '../layout/WhyWhatCard';

interface FuturePhaseProps {
  moduleName: string;
  phaseNumber: number | string;
  description: string;
  plannedFeatures: string[];
  why: string;
  what: string;
}

export const FuturePhasePlaceholder: React.FC<FuturePhaseProps> = ({
  moduleName,
  phaseNumber,
  description,
  plannedFeatures,
  why,
  what
}) => {
  return (
    <div className="space-y-6">
      <WhyWhatCard featureName={moduleName} why={why} what={what} />

      <div className="glass-panel-glow rounded-2xl p-8 text-center max-w-3xl mx-auto my-8 border border-emerald-500/30">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-5 shadow-lg shadow-emerald-500/10">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-3">
          Level {phaseNumber} — Roadmap Planned
        </div>

        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
          Coming in a future phase
        </h2>

        <p className="text-slate-400 text-sm max-w-xl mx-auto mb-8 leading-relaxed">
          {description}
        </p>

        {/* Planned Architecture Details */}
        <div className="bg-slate-900/90 rounded-xl p-5 border border-slate-800 text-left mb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            <Cpu className="w-4 h-4 text-emerald-400" />
            Planned Module Capabilities (Level {phaseNumber}+)
          </div>

          <ul className="space-y-2.5">
            {plannedFeatures.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-500/60" />
          <span>Levels 1–4 database and API architecture designed for zero-refactor Level 5+ extension</span>
        </div>
      </div>
    </div>
  );
};
