import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  LineChart,
  CloudSun,
  BrainCircuit,
  Radio,
  Tv,
  Lightbulb,
  BellRing,
  Wifi,
  FileBarChart,
  Settings,
  Info,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { EcoLogo } from '../common/EcoLogo';

interface NavGroup {
  groupName: string;
  items: {
    name: string;
    path: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const navGroups: NavGroup[] = [
  {
    groupName: 'Core Analytics',
    items: [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Data Management', path: '/data-management', icon: Database },
      { name: 'Energy Analytics', path: '/energy-analytics', icon: LineChart },
      { name: 'Weather Impact', path: '/weather', icon: CloudSun },
    ],
  },
  {
    groupName: 'Intelligence & Operations',
    items: [
      { name: 'Future Intelligence', path: '/future-intelligence', icon: BrainCircuit },
      { name: 'AI Energy Forecast', path: '/ai-forecast', icon: BrainCircuit },
      { name: 'Live Monitoring', path: '/live-monitoring', icon: Radio },
      { name: 'Appliance Health', path: '/appliances', icon: Tv },
      { name: 'Intelligent Alerts', path: '/alerts', icon: BellRing },
      { name: 'Prescriptive Insights', path: '/recommendations', icon: Lightbulb },
    ],
  },
  {
    groupName: 'Operations',
    items: [
      { name: 'IoT Fleet Registry', path: '/iot-devices', icon: Wifi },
      { name: 'Audit Reports', path: '/reports', icon: FileBarChart },
    ],
  },
  {
    groupName: 'System',
    items: [
      { name: 'Settings', path: '/settings', icon: Settings },
      { name: 'System Info', path: '/about', icon: Info },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col h-screen sticky top-0 select-none z-30 transition-all shadow-[0_0_0_1px_rgba(15,23,42,0.8)]">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <EcoLogo size="md" rounded className="shadow-emerald-500/25 border-emerald-500/30" />
            <div>
              <span className="text-xl font-extrabold tracking-tight text-white font-sans">
                ECO <span className="text-emerald-400">AI</span>
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            PRO
          </span>
        </div>
        {/* Tagline */}
        <p className="text-[11px] font-medium tracking-wide text-emerald-400/90 mt-2 font-mono">
          Predict. Monitor. Optimize. Save.
        </p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.groupName} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {group.groupName}
            </div>

            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20 ring-1 ring-emerald-300/60'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white hover:translate-x-0.5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </div>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Pill inside Sidebar with Theme Switcher */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-mono text-xs">Engine Active</span>
        </div>

        {/* Quick Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs"
          title={`Switch to ${theme === 'dark' ? 'Bright Mode' : 'Dark Mode'}`}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dark</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
