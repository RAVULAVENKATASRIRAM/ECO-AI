import React, { useEffect, useState } from 'react';
import {
  Zap,
  CalendarCheck,
  TrendingUp,
  Activity,
  Thermometer,
  Droplets,
  Database,
  Info,
  Layers,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { WhyWhatCard } from '../components/layout/WhyWhatCard';
import { KPICard } from '../components/dashboard/KPICard';
import { EnergyTimeChart } from '../components/dashboard/EnergyTimeChart';
import { TempVsEnergyChart } from '../components/dashboard/TempVsEnergyChart';
import { DailyConsumptionChart } from '../components/dashboard/DailyConsumptionChart';
import { ApplianceDistributionChart } from '../components/dashboard/ApplianceDistributionChart';
import {
  fetchKPIs,
  fetchEnergyTrend,
  fetchTempVsEnergy,
  fetchDailyConsumption,
  fetchApplianceDistribution,
  deleteDataset,
} from '../services/api';
import {
  KPIs,
  EnergyTrendPoint,
  TempVsEnergyPoint,
  DailyConsumptionPoint,
  ApplianceDistributionItem,
} from '../types';

export const DashboardPage: React.FC = () => {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [energyTrend, setEnergyTrend] = useState<EnergyTrendPoint[]>([]);
  const [trendPeriod, setTrendPeriod] = useState('7d');
  const [tempVsEnergy, setTempVsEnergy] = useState<TempVsEnergyPoint[]>([]);
  const [dailyData, setDailyData] = useState<DailyConsumptionPoint[]>([]);
  const [applianceData, setApplianceData] = useState<ApplianceDistributionItem[]>([]);

  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true);
  const [isLoadingTrend, setIsLoadingTrend] = useState(true);
  const [isLoadingTempVsEnergy, setIsLoadingTempVsEnergy] = useState(true);
  const [isLoadingDaily, setIsLoadingDaily] = useState(true);
  const [isLoadingAppliance, setIsLoadingAppliance] = useState(true);

  const loadAllData = async () => {
    try {
      setIsLoadingKPIs(true);
      const kpiRes = await fetchKPIs();
      setKpis(kpiRes);
    } catch (err) {
      console.error('KPI error:', err);
    } finally {
      setIsLoadingKPIs(false);
    }

    try {
      setIsLoadingTempVsEnergy(true);
      const teRes = await fetchTempVsEnergy(250);
      setTempVsEnergy(teRes);
    } catch (err) {
      console.error('TempVsEnergy error:', err);
    } finally {
      setIsLoadingTempVsEnergy(false);
    }

    try {
      setIsLoadingDaily(true);
      const dRes = await fetchDailyConsumption(30);
      setDailyData(dRes);
    } catch (err) {
      console.error('Daily error:', err);
    } finally {
      setIsLoadingDaily(false);
    }

    try {
      setIsLoadingAppliance(true);
      const appRes = await fetchApplianceDistribution();
      setApplianceData(appRes);
    } catch (err) {
      console.error('Appliance error:', err);
    } finally {
      setIsLoadingAppliance(false);
    }
  };

  const handlePeriodChange = async (period: string, start?: string, end?: string) => {
    setTrendPeriod(period);
    try {
      setIsLoadingTrend(true);
      const trendRes = await fetchEnergyTrend(period);
      setEnergyTrend(trendRes);
    } catch (err) {
      console.error('Trend error:', err);
    } finally {
      setIsLoadingTrend(false);
    }
  };

  useEffect(() => {
    loadAllData();
    handlePeriodChange('7d');
  }, []);

  const activeDataset = kpis?.active_dataset;
  const datasetType = activeDataset?.type?.toLowerCase() || 'unknown';
  const hasEnergy = kpis?.has_energy ?? true;
  const hasWeather = kpis?.has_weather ?? true;
  const activeUnit = kpis?.unit || 'MW';

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
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

  const handleDeleteActiveDataset = async () => {
    if (!activeDataset || !activeDataset.id) return;
    if (confirm(`Delete active dataset "${activeDataset.name}"? All associated telemetry and models will be deleted, and the system will switch to the next available dataset.`)) {
      try {
        await deleteDataset(activeDataset.id);
        window.dispatchEvent(new CustomEvent('eco_dataset_changed', { detail: { datasetId: activeDataset.id } }));
        await loadAllData();
      } catch (err: any) {
        alert('Failed to delete dataset: ' + (err.message || err));
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="Dashboard"
        subtitle="Real-time energy and weather intelligence"
        onDataRefresh={() => {
          loadAllData();
          handlePeriodChange(trendPeriod);
        }}
      />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Dynamic Active Dataset Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Active Dataset
                </span>
                {activeDataset && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getTypeBadgeColor(datasetType)}`}>
                    {activeDataset.type}
                  </span>
                )}
                {activeDataset && (
                  <button
                    onClick={handleDeleteActiveDataset}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition-all ml-1"
                    title={`Delete active dataset "${activeDataset.name}"`}
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {activeDataset ? activeDataset.name : 'Loading active dataset...'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            {activeDataset && (
              <div className="hidden sm:block text-right">
                <div className="font-mono text-emerald-400 font-bold">
                  {activeDataset.row_count?.toLocaleString()} records
                </div>
                <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                  {activeDataset.source}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              {activeDataset && (
                <button
                  onClick={handleDeleteActiveDataset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 font-medium text-xs border border-rose-500/30 transition-all shrink-0"
                  title={`Delete active dataset "${activeDataset.name}"`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
              <Link
                to="/data-management"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 hover:border-slate-600 transition-all shrink-0"
              >
                <span>Manage Datasets</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Informational alert for single-domain datasets */}
        {!hasEnergy && (
          <div className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-xs text-cyan-200">
            <Info className="w-5 h-5 shrink-0 text-cyan-400" />
            <div>
              <span className="font-bold uppercase tracking-wide">Weather-Only Dataset Active: </span>
              Atmospheric metrics (temperature, humidity, condition frequency) are actively populated from your dataset. Switch to an Energy or Combined dataset in the header to view grid consumption charts.
            </div>
          </div>
        )}

        {!hasWeather && hasEnergy && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
            <Info className="w-5 h-5 shrink-0 text-emerald-400" />
            <div>
              <span className="font-bold uppercase tracking-wide">Energy-Only Dataset Active: </span>
              Grid demand, historical trends, and daily aggregations are dynamically computed from your uploaded file. Activate a Combined dataset for full thermal correlation.
            </div>
          </div>
        )}

        {/* Why & What Card */}
        <WhyWhatCard
          featureName="System Dashboard"
          why="The dashboard provides a single location where users can understand the current and historical energy situation."
          what="It collects information from the active dataset and presents energy, weather, and usage intelligence through dynamic KPI cards and interactive charts."
        />

        {/* 6 Real Database KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <KPICard
            title="Current Usage"
            value={kpis && hasEnergy ? kpis.current_energy_usage.toLocaleString() : '---'}
            unit={hasEnergy ? activeUnit : ''}
            subtitle={hasEnergy ? 'Latest live reading' : 'No energy telemetry'}
            icon={Zap}
            colorScheme="emerald"
            trend={hasEnergy ? 'Active demand' : 'Inactive'}
          />

          <KPICard
            title="Today's Consumption"
            value={kpis && hasEnergy ? kpis.todays_consumption.toLocaleString() : '---'}
            unit={hasEnergy ? activeUnit : ''}
            subtitle={hasEnergy ? 'Accumulated so far today' : 'No energy telemetry'}
            icon={CalendarCheck}
            colorScheme="cyan"
            trend={hasEnergy ? 'Current day sum' : 'Inactive'}
          />

          <KPICard
            title="Average Consumption"
            value={kpis && hasEnergy ? kpis.average_consumption.toLocaleString() : '---'}
            unit={hasEnergy ? activeUnit : ''}
            subtitle={hasEnergy ? 'Historical baseline' : 'No energy telemetry'}
            icon={TrendingUp}
            colorScheme="indigo"
            trend={hasEnergy ? 'Mean load' : 'Inactive'}
          />

          <KPICard
            title="Peak Consumption"
            value={kpis && hasEnergy ? kpis.peak_consumption.toLocaleString() : '---'}
            unit={hasEnergy ? activeUnit : ''}
            subtitle={hasEnergy ? 'Maximum recorded' : 'No energy telemetry'}
            icon={Activity}
            colorScheme="rose"
            trend={hasEnergy ? 'Maximum load' : 'Inactive'}
          />

          <KPICard
            title="Temperature"
            value={kpis && hasWeather ? `${kpis.latest_temperature}` : '---'}
            unit={hasWeather ? '°C' : ''}
            subtitle={hasWeather ? 'Latest Ambient' : 'No weather feed'}
            icon={Thermometer}
            colorScheme="amber"
            trend={hasWeather ? 'Sensory feed' : 'Inactive'}
          />

          <KPICard
            title="Humidity"
            value={kpis && hasWeather ? `${kpis.latest_humidity}` : '---'}
            unit={hasWeather ? '%' : ''}
            subtitle={hasWeather ? 'Relative level' : 'No weather feed'}
            icon={Droplets}
            colorScheme="teal"
            trend={hasWeather ? 'Atmospheric' : 'Inactive'}
          />
        </div>

        {/* Primary Chart: Energy Consumption Over Time */}
        <EnergyTimeChart
          data={energyTrend}
          period={trendPeriod}
          onPeriodChange={handlePeriodChange}
          isLoading={isLoadingTrend}
        />

        {/* Secondary Charts: Temp vs Energy & Daily Consumption */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TempVsEnergyChart data={tempVsEnergy} isLoading={isLoadingTempVsEnergy} />
          <DailyConsumptionChart data={dailyData} isLoading={isLoadingDaily} />
        </div>

        {/* Appliance Energy Distribution */}
        <ApplianceDistributionChart
          data={applianceData}
          isLoading={isLoadingAppliance}
        />
      </main>
    </div>
  );
};
