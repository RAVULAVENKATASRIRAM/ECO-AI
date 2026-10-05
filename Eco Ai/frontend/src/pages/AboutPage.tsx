import React, { useState } from 'react';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  Award,
  Database,
  CloudSun,
  Activity,
  Brain,
  Radio,
  Tv,
  BellRing,
  Lightbulb,
  Wifi,
  FileBarChart,
  Settings,
  Receipt,
  Cpu,
  Server,
  Zap,
  CheckCircle2,
  ExternalLink,
  Code2,
  Gauge
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { WhyWhatCard } from '../components/layout/WhyWhatCard';
import { EcoLogo } from '../components/common/EcoLogo';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'features' | 'architecture' | 'techstack' | 'parameters'>('features');

  const modules = [
    {
      title: 'Core Grid Dashboard',
      path: '/',
      icon: Activity,
      tag: 'Core Analytics',
      desc: 'Real-time power demand monitoring with 6 live database-driven KPIs, dynamic time-series charts (24h/7d/30d/custom), thermal coupling scatter plot, daily MWh bar charts, and appliance energy share.',
      status: 'Active',
      color: 'emerald',
    },
    {
      title: 'Data Management & Multi-Dataset Hub',
      path: '/data-management',
      icon: Database,
      tag: 'Core Analytics',
      desc: 'Multi-format CSV dataset ingestion, schema auto-validation, real-time dataset activation/switching, cataloged demo downloads (Energy, Weather, Appliance, Combined), and tabular preview modal.',
      status: 'Active',
      color: 'cyan',
    },
    {
      title: 'Deep Energy Analytics',
      path: '/energy-analytics',
      icon: Layers,
      tag: 'Core Analytics',
      desc: 'Diurnal 24-hour comparative curve (Weekday Average vs. Weekend Average), Load Duration Curve (LDC) sorting hours by exceedance percentile, and Peak (57.8%) vs Off-Peak load partition analysis.',
      status: 'Active',
      color: 'teal',
    },
    {
      title: 'Weather Impact & Thermal Coupling',
      path: '/weather',
      icon: CloudSun,
      tag: 'Core Analytics',
      desc: 'Real-time ambient meteorological telemetry, Pearson correlation matrix (r > 0.85 thermal coupling), Cooling Degree Day (CDD) sensitivity modeling above 28°C threshold, and condition histogram.',
      status: 'Active',
      color: 'amber',
    },
    {
      title: 'Future Intelligence & Cost Prediction',
      path: '/future-intelligence',
      icon: Brain,
      tag: 'Intelligence',
      desc: 'AI command center featuring active ML inferences, real-time 95% confidence intervals, Time-of-Day (ToD) Dynamic Tariff Cost Predictions (₹ INR), peak surcharge split, and 30-day bill forecasts.',
      status: 'Active (Updated)',
      color: 'violet',
    },
    {
      title: 'Unified AI Energy Forecast & Model Hub',
      path: '/ai-forecast',
      icon: Cpu,
      tag: 'Intelligence',
      desc: 'Multi-algorithm machine learning framework (Random Forest, Gradient Boosting, Ridge, Linear Regression), 24h/48h/7d horizon switching, validation metrics (MAE, RMSE, MAPE, R²), and residual analysis.',
      status: 'Active',
      color: 'indigo',
    },
    {
      title: '3-Phase Live Oscilloscope Monitoring',
      path: '/live-monitoring',
      icon: Radio,
      tag: 'Intelligence',
      desc: 'Sub-second real-time electrical telemetry stream for 3-Phase power grids (R, Y, B phases), active power (kW), reactive power (kVAR), apparent power (kVA), power factor, frequency (Hz), and THD waveform.',
      status: 'Active',
      color: 'rose',
    },
    {
      title: 'Appliance Health & Sub-Metering',
      path: '/appliances',
      icon: Tv,
      tag: 'Intelligence',
      desc: 'Granular sub-metering of major energy-consuming appliances (Master Bed AC, Living Room AC, BLDC Fans, Refrigerator, Smart Lighting), operational health scoring (0–100%), and vampire standby leakage detection.',
      status: 'Active',
      color: 'blue',
    },
    {
      title: 'Intelligent Anomaly Alerts',
      path: '/alerts',
      icon: BellRing,
      tag: 'Intelligence',
      desc: 'Automated multi-threshold z-score anomaly detection engine, real-time severity classification (Critical, Warning, Info), one-click acknowledgement, resolution auditing, and configurable limits.',
      status: 'Active',
      color: 'red',
    },
    {
      title: 'Prescriptive Insights & Recommendations',
      path: '/recommendations',
      icon: Lightbulb,
      tag: 'Intelligence',
      desc: 'AI-generated demand-side management actions, actionable tariff optimization, quantified financial savings (₹ INR), energy reduction (kWh), and carbon avoidance (kg CO₂) metrics.',
      status: 'Active',
      color: 'yellow',
    },
    {
      title: 'IoT Edge Fleet Registry',
      path: '/iot-devices',
      icon: Wifi,
      tag: 'Operations',
      desc: 'Connected IoT sensor nodes and smart gateway management, real-time online/offline status, RSSI signal indicators, message rates, ping latency tests, and Over-the-Air (OTA) firmware upgrade simulation.',
      status: 'Active',
      color: 'emerald',
    },
    {
      title: 'Carbon & Compliance Audit Reports',
      path: '/reports',
      icon: FileBarChart,
      tag: 'Operations',
      desc: 'Automated energy and ESG compliance audit report generator (Weekly, Monthly, Quarterly), grid carbon emission accounting (0.82 kg CO₂/kWh grid factor), and one-click CSV export.',
      status: 'Active',
      color: 'sky',
    },
    {
      title: 'Settings & Theme Customization',
      path: '/settings',
      icon: Settings,
      tag: 'System',
      desc: 'High-contrast obsidian Dark Mode and daylight Bright Mode theme switcher, regional grid baseline configuration (Chennai, Tamil Nadu), thermal threshold tuning, and database re-seeding.',
      status: 'Active',
      color: 'slate',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 transition-colors">
      <Header
        title="System Information & Platform Architecture"
        subtitle="Complete technical specifications, implemented capabilities, and AI system reference"
      />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
        {/* Why & What Card */}
        <WhyWhatCard
          featureName="System Information & Architecture Reference"
          why="Provides full transparency into system capabilities, active AI algorithms, thermodynamic load modeling, and hardware-software pipeline."
          what="Interactive system guide covering all 13 active modules, the Unified ML framework, Time-of-Day (ToD) cost prediction engines, and regional telemetry parameters."
        />

        {/* Hero Card */}
        <div className="rounded-2xl p-8 border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3.5">
                <EcoLogo size="lg" rounded className="shadow-emerald-500/25 border-emerald-500/30" />
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">
                    ECO <span className="text-emerald-400">AI</span> Pro
                  </h1>
                  <p className="text-sm font-semibold text-emerald-400 font-mono mt-0.5">
                    Predict. Monitor. Optimize. Save.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold font-mono">
                  13 Active Modules
                </span>
                <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-xs font-bold font-mono">
                  Unified ML v10
                </span>
                <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/30 text-xs font-bold font-mono">
                  Cost Prediction Engine
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed max-w-4xl mb-6">
              <strong>ECO AI Pro</strong> is an enterprise-grade AI + IoT smart energy management and predictive analytics platform. It combines thermodynamic load modeling, Time-of-Day (ToD) cost forecasting, sub-second 3-phase telemetry, and multi-algorithm machine learning to minimize grid stress, reduce commercial electricity costs, and prevent peak anomalies.
            </p>

            {/* Core Pipeline */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                End-to-End Autonomous Data & Intelligence Pipeline
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" /> IoT Ingestion & Multi-Datasets
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 flex items-center gap-1.5">
                  <CloudSun className="w-3.5 h-3.5 text-cyan-400" /> CDD Thermal Coupling
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-violet-400" /> Unified ML & Cost Forecasting
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-200 border border-slate-800 flex items-center gap-1.5">
                  <BellRing className="w-3.5 h-3.5 text-amber-400" /> Anomaly Alerts & Prescriptions
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('features')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'features'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Award className="w-4 h-4" /> Implemented Modules ({modules.length})
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'architecture'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" /> System Architecture
          </button>
          <button
            onClick={() => setActiveTab('techstack')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'techstack'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Code2 className="w-4 h-4" /> Technology Stack
          </button>
          <button
            onClick={() => setActiveTab('parameters')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'parameters'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
            }`}
          >
            <Gauge className="w-4 h-4" /> Regional & Operational Constants
          </button>
        </div>

        {/* Tab 1: Implemented Features Catalog */}
        {activeTab === 'features' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Full Implemented Features & Modules Catalog</h2>
              </div>
              <span className="text-xs text-slate-400 font-mono">13 Production Modules Active</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((m, idx) => {
                const Icon = m.icon;
                return (
                  <Link
                    key={idx}
                    to={m.path}
                    className="group bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-5 space-y-3 transition-all duration-200 hover:-translate-y-0.5 shadow-md flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-all">
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-emerald-400 border border-slate-700">
                          {m.status}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {m.tag}
                        </span>
                        <h3 className="font-bold text-white text-sm mt-0.5 group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                          {m.title}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400" />
                        </h3>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">{m.desc}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span>Route: {m.path}</span>
                      <span className="text-emerald-400 font-semibold group-hover:underline">Open Module →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: System Architecture */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                End-to-End Architectural Architecture
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                The platform is designed with clean loose coupling across four operational tiers: Ingestion & Telemetry, Relational Storage & Multi-Dataset Isolation, Unified ML & Analytical Intelligence, and High-Fidelity Reactive Presentation.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    01
                  </div>
                  <h4 className="text-xs font-bold text-white">Edge Ingestion Tier</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Processes sub-second 3-phase electrical streams, environmental weather sensors, and custom multi-dataset CSV uploads with instant schema normalization.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    02
                  </div>
                  <h4 className="text-xs font-bold text-white">Relational Data Tier</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    SQLite + SQLAlchemy ORM with indexed time-series tables, multi-dataset isolation, dynamic re-seeding, and PostgreSQL migration compatibility.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center font-bold text-xs">
                    03
                  </div>
                  <h4 className="text-xs font-bold text-white">Unified ML & AI Tier</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Scikit-Learn ML registry supporting Random Forest, Gradient Boosting, Ridge, Linear Regression, and Time-of-Day (ToD) tariff cost simulation.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                    04
                  </div>
                  <h4 className="text-xs font-bold text-white">Reactive Frontend Tier</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    React 19 + TypeScript + Vite + Tailwind CSS with dual Obsidian Dark / Bright Daylight themes, interactive Recharts visualizations, and live telemetry polling.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Technology Stack */}
        {activeTab === 'techstack' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" /> Backend Stack & Data Engines
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Framework</span>
                  <span className="font-bold text-white font-mono">FastAPI 0.110+ (Asynchronous ASGI)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Application Server</span>
                  <span className="font-bold text-white font-mono">Uvicorn (StatReload Enabled)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">ORM & Database</span>
                  <span className="font-bold text-cyan-400 font-mono">SQLAlchemy 2.0+ & SQLite Engine</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Machine Learning</span>
                  <span className="font-bold text-violet-400 font-mono">Scikit-Learn, NumPy, Pandas</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">API Documentation</span>
                  <span className="font-bold text-emerald-400 font-mono">OpenAPI 3.0 / Swagger UI (:8000/docs)</span>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" /> Frontend Stack & UI Framework
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Core UI Framework</span>
                  <span className="font-bold text-white font-mono">React 19.2 + TypeScript 6.0</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Build Tooling</span>
                  <span className="font-bold text-white font-mono">Vite 8.3 (Hot Module Replacement)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Styling & Design System</span>
                  <span className="font-bold text-cyan-400 font-mono">Tailwind CSS 4.3 + CSS Variables</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Data Visualizations</span>
                  <span className="font-bold text-violet-400 font-mono">Recharts 3.10 (Area, Bar, Composed, Line)</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Iconography</span>
                  <span className="font-bold text-emerald-400 font-mono">Lucide React 1.46</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Regional & Operational Parameters */}
        {activeTab === 'parameters' && (
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Gauge className="w-5 h-5 text-emerald-400" /> Regional Grid & Tariff Specifications
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Pre-configured baseline constants calibrated for Chennai (Tamil Nadu, India) industrial and commercial smart facilities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Regional Target</span>
                <p className="font-bold text-white text-sm">Chennai, Tamil Nadu, India</p>
                <p className="text-[11px] text-slate-400">Latitude 13.0827° N, Longitude 80.2707° E</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Cooling Threshold (CDD)</span>
                <p className="font-bold text-amber-400 text-sm font-mono">28.0°C Baseline</p>
                <p className="text-[11px] text-slate-400">Thermal sensitivity: +22.5 MW / °C above 28°C</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Carbon Emission Factor</span>
                <p className="font-bold text-emerald-400 text-sm font-mono">0.82 kg CO₂ / kWh</p>
                <p className="text-[11px] text-slate-400">Standard Indian Central Electricity Authority (CEA) factor</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Peak Tariff Surcharge</span>
                <p className="font-bold text-amber-400 text-sm font-mono">₹10.50 / kWh (+40%)</p>
                <p className="text-[11px] text-slate-400">Active between 18:00 - 22:00 IST and high load periods</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Standard Base Tariff</span>
                <p className="font-bold text-emerald-400 text-sm font-mono">₹7.50 / kWh</p>
                <p className="text-[11px] text-slate-400">Normal daytime operating hours (07:00 - 17:00 IST)</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-slate-500 font-mono text-[10px] uppercase">Off-Peak Night Tariff</span>
                <p className="font-bold text-cyan-400 text-sm font-mono">₹5.80 / kWh (-22.6%)</p>
                <p className="text-[11px] text-slate-400">Off-peak nighttime window (23:00 - 06:00 IST)</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
