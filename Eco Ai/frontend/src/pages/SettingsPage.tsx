import React, { useState } from 'react';
import {
  Settings,
  Database,
  MapPin,
  RefreshCw,
  CheckCircle2,
  Shield,
  Layers,
  Server,
  Zap,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { WhyWhatCard } from '../components/layout/WhyWhatCard';
import { triggerReseed } from '../services/api';
import { useTheme } from '../context/ThemeContext';

export const SettingsPage: React.FC = () => {
  const { theme, setTheme, toggleTheme } = useTheme();
  const [isReseeding, setIsReseeding] = useState(false);
  const [reseedStats, setReseedStats] = useState<any | null>(null);

  const handleReseed = async () => {
    if (confirm('Refresh the database with Chennai regional telemetry data across all module tables?')) {
      try {
        setIsReseeding(true);
        const res = await triggerReseed();
        setReseedStats(res.stats);
      } catch (err) {
        alert('Failed to refresh database: ' + err);
      } finally {
        setIsReseeding(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 transition-colors">
      <Header
        title="Settings & System Preferences"
        subtitle="Theme configuration, operational parameters, and database management"
      />

      <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
        {/* Why & What Card */}
        <WhyWhatCard
          featureName="System Settings"
          why="Allows administrators and operators to customize appearance, inspect environment parameters, and manage active telemetry datasets."
          what="Controls visual themes (Bright / Dark Mode), grid baseline constants, thermal cooling thresholds, and triggers synchronized database seed operations."
        />

        {/* Theme Customization Card */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Monitor className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Appearance & Theme Preferences</h2>
            </div>
            <span className="text-xs text-slate-400">Persistent across browser sessions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <button
              onClick={() => setTheme('dark')}
              className={`p-4 rounded-xl border flex items-center gap-4 transition-all text-left ${
                theme === 'dark'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-md ring-1 ring-emerald-500/50'
                  : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850 text-slate-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                <Moon className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="font-bold text-sm text-white">Dark Mode (Default)</p>
                <p className="text-xs text-slate-400 mt-0.5">High contrast obsidian palette with glowing telemetry accents</p>
              </div>
            </button>

            <button
              onClick={() => setTheme('light')}
              className={`p-4 rounded-xl border flex items-center gap-4 transition-all text-left ${
                theme === 'light'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 shadow-md ring-1 ring-emerald-500/50'
                  : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850 text-slate-300'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-300 flex items-center justify-center shrink-0 shadow-sm">
                <Sun className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">Bright Mode (Light Theme)</p>
                <p className="text-xs text-slate-500 mt-0.5">Crisp bright background optimized for daylight and presentations</p>
              </div>
            </button>
          </div>
        </div>

        {/* System Metadata Card */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Server className="w-5 h-5 text-emerald-400" />
            <span>ECO AI Platform Parameters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 font-mono text-[11px]">Application Name</span>
              <p className="text-white font-bold text-sm mt-0.5">ECO AI Pro</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 font-mono text-[11px]">Official Tagline</span>
              <p className="text-emerald-400 font-bold text-sm mt-0.5">Predict. Monitor. Optimize. Save.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 font-mono text-[11px]">Platform Scope</span>
              <p className="text-white font-bold text-sm mt-0.5">Levels 1 to 10 (Full Smart Energy Suite)</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 font-mono text-[11px]">Regional Target / Location</span>
              <p className="text-white font-bold text-sm mt-0.5">Chennai, Tamil Nadu, India</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 font-mono text-[11px]">Database Architecture</span>
              <p className="text-cyan-400 font-bold text-sm mt-0.5 font-mono">SQLite (SQLAlchemy Modular ORM / PostgreSQL Ready)</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 font-mono text-[11px]">Cooling Demand Threshold</span>
              <p className="text-amber-400 font-bold text-sm mt-0.5 font-mono">28.0°C (+22.5 MW / °C sensitivity)</p>
            </div>
          </div>
        </div>

        {/* Database Management & Reseeding Card */}
        <div className="glass-panel rounded-2xl p-6 border border-emerald-500/30 bg-slate-900/80 space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-400" />
                Database Engine & Regional Telemetry
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate or refresh synchronized regional datasets for Chennai and connected districts
              </p>
            </div>

            <button
              onClick={handleReseed}
              disabled={isReseeding}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReseeding ? 'animate-spin' : ''}`} />
              <span>{isReseeding ? 'Refreshing Data...' : 'Refresh 30-Day Telemetry'}</span>
            </button>
          </div>

          {reseedStats && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Chennai Regional Database Refreshed Successfully!</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-slate-300 pt-1">
                <div>Energy Readings: <strong className="text-white">{reseedStats.energy_readings}</strong></div>
                <div>Weather Readings: <strong className="text-white">{reseedStats.weather_readings}</strong></div>
                <div>Appliance Records: <strong className="text-white">{reseedStats.appliance_readings}</strong></div>
                <div>Cataloged Datasets: <strong className="text-white">{reseedStats.datasets}</strong></div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
