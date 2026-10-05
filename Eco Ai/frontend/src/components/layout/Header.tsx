import React, { useEffect, useState, useRef } from 'react';
import {
  RefreshCw,
  MapPin,
  CheckCircle2,
  Database,
  ChevronDown,
  Check,
  UploadCloud,
  Sun,
  Moon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { triggerReseed, fetchDatasets, activateDataset } from '../../services/api';
import { DatasetItem } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onDataRefresh?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onDataRefresh }) => {
  const { theme, toggleTheme } = useTheme();
  const [isReseeding, setIsReseeding] = useState(false);
  const [reseedSuccess, setReseedSuccess] = useState(false);
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeDataset = datasets.find((d) => d.is_active);

  const loadDatasetList = async () => {
    try {
      const list = await fetchDatasets();
      setDatasets(list);
    } catch (err) {
      console.error('Failed to load dataset list in header:', err);
    }
  };

  useEffect(() => {
    loadDatasetList();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectDataset = async (datasetId: number) => {
    try {
      setIsSwitching(true);
      await activateDataset(datasetId);
      await loadDatasetList();
      setIsDropdownOpen(false);
      if (onDataRefresh) {
        onDataRefresh();
      } else {
        // Dispatch custom event for all listening pages
        window.dispatchEvent(new CustomEvent('eco_dataset_changed', { detail: { datasetId } }));
      }
    } catch (err) {
      alert('Failed to switch dataset: ' + err);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleReseed = async () => {
    if (confirm('Refresh database records across all tables?')) {
      try {
        setIsReseeding(true);
        await triggerReseed();
        setReseedSuccess(true);
        setTimeout(() => setReseedSuccess(false), 3000);
        await loadDatasetList();
        if (onDataRefresh) {
          onDataRefresh();
        } else {
          window.location.reload();
        }
      } catch (err) {
        alert('Failed to reseed database: ' + err);
      } finally {
        setIsReseeding(false);
      }
    }
  };

  const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'energy':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'weather':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'appliance':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'combined':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 sticky top-0 z-30 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Live DB Feed
          </span>
        </div>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Interactive Active Dataset Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={isSwitching}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs text-slate-200 transition-all shadow-sm"
            title="Click to switch active dataset across all application features"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="flex items-center gap-1.5 max-w-[200px] truncate text-left">
              <span className="font-semibold text-white truncate">
                {activeDataset ? activeDataset.name : 'Select Dataset'}
              </span>
              {activeDataset && (
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${getTypeColor(activeDataset.type)}`}>
                  {activeDataset.type}
                </span>
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <span>SELECT ACTIVE DATASET</span>
                <Link
                  to="/data-management"
                  onClick={() => setIsDropdownOpen(false)}
                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                >
                  <UploadCloud className="w-3 h-3" />
                  Upload CSV
                </Link>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
                {datasets.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-slate-500 text-center">
                    No registered datasets found.
                  </div>
                ) : (
                  datasets.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleSelectDataset(d.id)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-slate-800/80 transition-colors flex items-start justify-between gap-2 text-xs ${
                        d.is_active ? 'bg-emerald-500/10' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-semibold truncate ${d.is_active ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {d.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                          <span className={`px-1.5 py-0.2 rounded font-bold uppercase border ${getTypeColor(d.type)}`}>
                            {d.type}
                          </span>
                          <span>{d.row_count.toLocaleString()} rows</span>
                          <span>•</span>
                          <span className="truncate max-w-[120px]">{d.source}</span>
                        </div>
                      </div>
                      {d.is_active && (
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Location pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium">Chennai Grid</span>
        </div>

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-all"
          title={`Switch to ${theme === 'dark' ? 'Bright / Light Background' : 'Dark Background'}`}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Bright Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-cyan-500" />
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>

        {/* Reseed Demo Button */}
        <button
          onClick={handleReseed}
          disabled={isReseeding}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            reseedSuccess
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-slate-600'
          }`}
          title="Refresh database records"
        >
          {reseedSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Refreshed!</span>
            </>
          ) : (
            <>
              <RefreshCw className={`w-3.5 h-3.5 ${isReseeding ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{isReseeding ? 'Refreshing...' : 'Refresh Data'}</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
