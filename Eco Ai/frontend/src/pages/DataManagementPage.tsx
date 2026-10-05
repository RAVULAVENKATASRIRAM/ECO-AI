import React, { useEffect, useState } from 'react';
import {
  Download,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Trash2,
  X,
  Database,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { WhyWhatCard } from '../components/layout/WhyWhatCard';
import {
  fetchDatasets,
  fetchDatasetPreview,
  uploadDatasetFile,
  importDataset,
  activateDataset,
  deleteDataset,
  getDemoDownloadUrl,
} from '../services/api';
import { DatasetItem, DatasetPreviewData } from '../types';

export const DataManagementPage: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<any>(null);
  const [pendingImport, setPendingImport] = useState<any>(null);
  const activeDataset = datasets.find((dataset) => dataset.is_active);

  const [previewData, setPreviewData] = useState<DatasetPreviewData | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const loadDatasets = async () => {
    try {
      setIsLoading(true);
      const data = await fetchDatasets();
      setDatasets(data);
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);
    setUploadError(null);
    setUploadSummary(null);
    setPendingImport(null);

    try {
      const res = await uploadDatasetFile(file);
      const summary = res.data;
      setUploadSummary(summary);
      if (summary.schema_status === 'correct' && summary.valid_rows > 0) {
        setPendingImport({
          filename: file.name,
          dataset_type: summary.dataset_type,
          normalized_rows: summary.normalized_rows,
          location: summary.location,
        });
        setUploadStatus(`CORRECT: ${summary.dataset_label} | Valid rows: ${summary.valid_rows} | Invalid rows: ${summary.invalid_rows}`);
      } else {
        setPendingImport(null);
        setUploadStatus(`INCORRECT: ${summary.dataset_label}. Review the missing and additional columns below.`);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Validation failed. Please verify CSV schema.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleImportDataset = async () => {
    if (!pendingImport) return;
    try {
      setIsImporting(true);
      setUploadError(null);
      const result = await importDataset(pendingImport);
      setUploadStatus(`Dataset imported and activated! ${result.data.rows_ingested} records ingested. Respective features across the application (Dashboard, Energy Analytics, Weather) are now displaying analytics for this dataset.`);
      setUploadSummary((prev: any) => ({ ...prev, imported: true }));
      await loadDatasets();
    } catch (err: any) {
      setUploadError(err.message || 'Import failed.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleActivate = async (id: number) => {
    try {
      setUploadError(null);
      await activateDataset(id);
      await loadDatasets();
      setUploadStatus('Dataset activated and saved. It will remain selected after restarting the application.');
    } catch (err: any) {
      setUploadError(err.message || 'Failed to activate dataset.');
    }
  };

  const handlePreview = async (id: number) => {
    try {
      setIsPreviewLoading(true);
      const prev = await fetchDatasetPreview(id);
      setPreviewData(prev);
    } catch (err) {
      alert('Failed to preview dataset: ' + err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Delete dataset "${name}" from registry? All associated readings and models will be removed.`)) {
      try {
        await deleteDataset(id);
        await loadDatasets();
        window.dispatchEvent(new CustomEvent('eco_dataset_changed', { detail: { datasetId: id } }));
        setUploadStatus(`Dataset "${name}" deleted successfully.`);
      } catch (err: any) {
        alert('Failed to delete dataset: ' + (err.message || err));
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title="Data Management"
        subtitle="Manage, upload, validate, and download smart energy & weather datasets"
        onDataRefresh={loadDatasets}
      />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
        {/* Why & What Card */}
        <WhyWhatCard
          featureName="Data Management & Download Center"
          why="High-fidelity datasets are the core prerequisite for reliable energy intelligence and upcoming AI forecasting models."
          what="Provides standardized Chennai energy, weather, and sub-metered datasets for benchmarking, enables uploading custom external CSV telemetry with automated schema validation, and allows inspecting raw database records."
        />

        {/* Datasets Download Center */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                Download Datasets
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Standardized benchmark datasets formatted for Eco AI analytics and modeling
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              <Database className="w-4 h-4 shrink-0" />
              <span>
                <strong>Regional Telemetry:</strong> Standardized energy, weather, and sub-metered datasets for analytics and AI forecasting.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Chennai Energy Dataset */}
            <div className="glass-panel rounded-xl p-5 border border-emerald-500/30 flex flex-col justify-between hover:border-emerald-400/50 transition-all bg-gradient-to-b from-emerald-950/20 to-transparent">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ENERGY
                  </span>
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Chennai Energy Dataset
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Electricity-consumption telemetry designed for Eco AI's energy analytics and grid load monitoring.
                </p>
                <div className="text-[11px] text-slate-500 font-mono mb-4 space-y-1">
                  <p>Fields: timestamp, location, energy_consumption, unit</p>
                  <p>Cadence: Hourly (30 Days)</p>
                </div>
              </div>
              <a
                href={getDemoDownloadUrl('energy')}
                download="chennai_energy_dataset.csv"
                className="w-full py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV
              </a>
            </div>

            {/* Card 2: Chennai Weather Dataset */}
            <div className="glass-panel rounded-xl p-5 border border-cyan-500/30 flex flex-col justify-between hover:border-cyan-400/50 transition-all bg-gradient-to-b from-cyan-950/20 to-transparent">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    WEATHER
                  </span>
                  <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Chennai Weather Dataset
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Meteorological data containing temperature, humidity, wind speed and weather conditions.
                </p>
                <div className="text-[11px] text-slate-500 font-mono mb-4 space-y-1">
                  <p>Fields: timestamp, location, temperature, humidity, wind_speed, condition</p>
                  <p>Cadence: Hourly (30 Days)</p>
                </div>
              </div>
              <a
                href={getDemoDownloadUrl('weather')}
                download="chennai_weather_dataset.csv"
                className="w-full py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV
              </a>
            </div>

            {/* Card 3: Chennai Appliance Dataset */}
            <div className="glass-panel rounded-xl p-5 border border-amber-500/30 flex flex-col justify-between hover:border-amber-400/50 transition-all bg-gradient-to-b from-amber-950/20 to-transparent">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    APPLIANCES
                  </span>
                  <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Chennai Appliance Dataset
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Appliance-level energy consumption telemetry for demonstrating sub-metered appliance analytics.
                </p>
                <div className="text-[11px] text-slate-500 font-mono mb-4 space-y-1">
                  <p>Fields: timestamp, appliance, appliance_type, power, energy, status</p>
                  <p>6 Sub-metered Endpoints</p>
                </div>
              </div>
              <a
                href={getDemoDownloadUrl('appliance')}
                download="chennai_appliance_dataset.csv"
                className="w-full py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV
              </a>
            </div>

            {/* Card 4: Full Combined Dataset */}
            <div className="glass-panel rounded-xl p-5 border border-indigo-500/30 flex flex-col justify-between hover:border-indigo-400/50 transition-all bg-gradient-to-b from-indigo-950/20 to-transparent">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    COMBINED
                  </span>
                  <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  Chennai Combined Dataset
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Comprehensive synchronized dataset merging grid load, temperature, humidity, and weather conditions.
                </p>
                <div className="text-[11px] text-slate-500 font-mono mb-4 space-y-1">
                  <p>Fields: Synchronized Load & Met</p>
                  <p>Ideal for AI Training</p>
                </div>
              </div>
              <a
                href={getDemoDownloadUrl('combined')}
                download="chennai_combined_dataset.csv"
                className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV
              </a>
            </div>
          </div>
        </section>

        {/* Upload Custom Dataset Section */}
        <section className="glass-panel rounded-xl p-6 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-400" />
              Upload & Ingest Custom Dataset
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload one of the supported CSV dataset types below. Headers are detected automatically, rows are previewed, and the file is validated before import.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-emerald-300">1. Energy Dataset</h4>
                <span className="text-[10px] font-bold text-emerald-400">ENERGY</span>
              </div>
              <p className="text-xs text-slate-300 mb-2">One row per grid or building energy reading.</p>
              <p className="text-[11px] text-slate-400"><strong className="text-slate-200">Required:</strong> timestamp/date and energy_consumption.</p>
              <p className="text-[11px] text-slate-400"><strong className="text-slate-200">Optional:</strong> location, unit, source.</p>
              <p className="text-[11px] text-slate-500 mt-2 font-mono">timestamp, location, energy_consumption, unit</p>
              <p className="text-[11px] text-slate-500 mt-1">Accepted aliases: consumption, electricity, load, power_mw, load_mw, energy_kwh.</p>
            </div>

            <div className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-cyan-300">2. Weather Dataset</h4>
                <span className="text-[10px] font-bold text-cyan-400">WEATHER</span>
              </div>
              <p className="text-xs text-slate-300 mb-2">One row per weather observation or station reading.</p>
              <p className="text-[11px] text-slate-400"><strong className="text-slate-200">Required:</strong> date/timestamp, temperature, and humidity.</p>
              <p className="text-[11px] text-slate-400"><strong className="text-slate-200">Optional:</strong> time, pressure, wind_speed, condition, location, station.</p>
              <p className="text-[11px] text-slate-500 mt-2 font-mono">Date, Time, Temperature (C), Relative Humidity (%), Wind Speed (km/h)</p>
              <p className="text-[11px] text-slate-500 mt-1">Pressure is interpreted as hPa when supplied; weather condition is inferred when omitted.</p>
            </div>

            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-amber-300">3. Appliance Dataset</h4>
                <span className="text-[10px] font-bold text-amber-400">APPLIANCE</span>
              </div>
              <p className="text-xs text-slate-300 mb-2">One row per appliance or sub-meter reading.</p>
              <p className="text-[11px] text-slate-400"><strong className="text-slate-200">Required:</strong> timestamp/date, appliance/device, and power or energy.</p>
              <p className="text-[11px] text-slate-400"><strong className="text-slate-200">Optional:</strong> location, appliance_type, status, source.</p>
              <p className="text-[11px] text-slate-500 mt-2 font-mono">timestamp, appliance, power_watts, energy_kwh, status</p>
              <p className="text-[11px] text-slate-500 mt-1">Accepted aliases: device, equipment, wattage, appliance_power, appliance_energy.</p>
            </div>

            <div className="rounded-lg border border-indigo-500/25 bg-indigo-500/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-indigo-300">4. Combined Dataset</h4>
                <span className="text-[10px] font-bold text-indigo-400">COMBINED</span>
              </div>
              <p className="text-xs text-slate-300 mb-2">One synchronized row containing both energy and weather measurements.</p>
              <p className="text-[11px] text-slate-400"><strong className="text-slate-200">Required:</strong> timestamp, energy_consumption, temperature, and humidity.</p>
              <p className="text-[11px] text-slate-400"><strong className="text-slate-200">Optional:</strong> location, unit, pressure, wind_speed, weather_condition, source.</p>
              <p className="text-[11px] text-slate-500 mt-2 font-mono">timestamp, location, energy_consumption, unit, temperature, humidity, wind_speed, weather_condition</p>
              <p className="text-[11px] text-slate-500 mt-1">Combined rows are written to both energy and weather records using the same timestamp.</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-6 text-center transition-all bg-slate-950/40">
            <input
              type="file"
              accept=".csv"
              id="csvUploadInput"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
            <label
              htmlFor="csvUploadInput"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white">
                <UploadCloud className="w-6 h-6 text-emerald-400" />
              </div>
              <span className="text-sm font-semibold text-slate-200">
                {isUploading ? 'Validating and importing records...' : 'Click to select or drop CSV file'}
              </span>
              <span className="text-xs text-slate-500">
                Supports Energy readings (timestamp, energy_consumption), Weather, or Sub-metered logs
              </span>
            </label>
          </div>

          {uploadStatus && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{uploadStatus}</span>
            </div>
          )}

          {uploadSummary && (
            <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
              <div className={`flex items-start gap-3 rounded-lg border p-3 ${uploadSummary.schema_status === 'correct' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'}`}>
                {uploadSummary.schema_status === 'correct' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
                <div>
                  <div className={`text-sm font-bold uppercase ${uploadSummary.schema_status === 'correct' ? 'text-emerald-300' : 'text-rose-300'}`}>
                    Dataset schema: {uploadSummary.schema_status === 'correct' ? 'CORRECT' : 'INCORRECT'}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    {uploadSummary.schema_status === 'correct' ? 'All required columns were found. You can review the rows and import this dataset.' : 'This file cannot be imported until the required columns are present.'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-3">
                  <div className="font-semibold text-rose-300">Missing required columns</div>
                  <div className="mt-2 text-slate-300">
                    {uploadSummary.missing_columns?.length ? uploadSummary.missing_columns.join(', ') : 'None'}
                  </div>
                </div>
                <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
                  <div className="font-semibold text-amber-300">Additional or unrecognized columns</div>
                  <div className="mt-2 text-slate-300">
                    {uploadSummary.additional_columns?.length ? uploadSummary.additional_columns.join(', ') : 'None'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-slate-300">
                <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                  <div className="text-slate-400 uppercase tracking-wide">Detected Dataset</div>
                  <div className="mt-1 text-base font-bold text-cyan-400">{uploadSummary.dataset_label}</div>
                </div>
                <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                  <div className="text-slate-400 uppercase tracking-wide">Location</div>
                  <div className="mt-1 text-base font-bold text-emerald-400">{uploadSummary.location || 'N/A'}</div>
                </div>
                <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                  <div className="text-slate-400 uppercase tracking-wide">Rows detected</div>
                  <div className="mt-1 text-base font-bold text-white">{uploadSummary.rows_detected}</div>
                </div>
                <div className="rounded-lg bg-slate-900 p-3 border border-slate-800">
                  <div className="text-slate-400 uppercase tracking-wide">Valid / Invalid</div>
                  <div className="mt-1 text-base font-bold text-amber-300">{uploadSummary.valid_rows} / {uploadSummary.invalid_rows}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  <span className="font-semibold text-white">Preview Data</span>
                </div>
                <button
                  type="button"
                  onClick={handleImportDataset}
                  disabled={isImporting || !pendingImport}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold"
                >
                  {isImporting ? 'Importing…' : 'Import Dataset'}
                </button>
              </div>

              {uploadSummary.preview && uploadSummary.preview.length > 0 && (
                <div className="overflow-auto border border-slate-800 rounded-lg">
                  <table className="min-w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase font-mono">
                      <tr>
                        {Object.keys(uploadSummary.preview[0]).map((col) => (
                          <th key={col} className="py-2 px-3 border-b border-slate-800">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadSummary.preview.map((row: Record<string, any>, idx: number) => (
                        <tr key={`${row.timestamp || idx}-${idx}`} className="border-b border-slate-800 hover:bg-slate-900/60">
                          {Object.keys(uploadSummary.preview[0]).map((col) => (
                            <td key={`${col}-${idx}`} className="py-2 px-3 font-mono">{String(row[col] ?? '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {uploadSummary.invalid_row_details && uploadSummary.invalid_row_details.length > 0 && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                  <div className="text-xs font-semibold text-rose-300 mb-2">Invalid rows and reasons</div>
                  <ul className="space-y-1 text-[11px] text-slate-300">
                    {uploadSummary.invalid_row_details.slice(0, 10).map((item: any, idx: number) => (
                      <li key={`${item.row_number}-${idx}`} className="flex gap-2">
                        <span className="text-rose-400">Row {item.row_number}:</span>
                        <span>{item.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {uploadError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </section>

        {/* Active Datasets Registry Table */}
        <section className="glass-panel rounded-xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Database className="w-5 h-5 text-teal-400" />
                Active Datasets Registry
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Registered database tables and ingested collections available to the analytics engine
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {datasets.length} Datasets Cataloged
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-[10px] uppercase tracking-widest text-emerald-300">Currently active</div>
                <div className="text-sm font-bold text-white">
                  {activeDataset ? activeDataset.name : 'No dataset selected'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-emerald-200/80">
                {activeDataset ? `${activeDataset.type.toUpperCase()} · ${activeDataset.row_count.toLocaleString()} rows · persisted selection` : 'Activate a dataset below'}
              </div>
              {activeDataset && (
                <button
                  onClick={() => handleDelete(activeDataset.id, activeDataset.name)}
                  className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                  title={`Delete currently active dataset "${activeDataset.name}"`}
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Active</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Dataset Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Filename</th>
                  <th className="py-3 px-4">Row Count</th>
                  <th className="py-3 px-4">Coverage</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Loading datasets registry...
                    </td>
                  </tr>
                ) : datasets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No datasets found. Click 'Re-seed Demo Data' in the header.
                    </td>
                  </tr>
                ) : (
                  datasets.map((ds) => (
                    <tr key={ds.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{ds.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {ds.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{ds.filename}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        {ds.row_count.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {ds.date_start ? `${ds.date_start.slice(0, 10)} to ${ds.date_end?.slice(0, 10)}` : 'Live Telemetry'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 truncate max-w-[150px]">{ds.source}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handlePreview(ds.id)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1 transition-all"
                            title="Preview Records"
                          >
                            <Eye className="w-3 h-3 text-cyan-400" />
                            <span>Preview</span>
                          </button>
                          <button
                            onClick={() => handleActivate(ds.id)}
                            disabled={ds.is_active}
                            className="px-2.5 py-1 rounded bg-emerald-600/90 hover:bg-emerald-500 disabled:bg-emerald-950 disabled:text-emerald-300 text-white font-medium transition-all"
                            title={ds.is_active ? 'Currently active dataset' : 'Activate this dataset'}
                          >
                            {ds.is_active ? 'Active' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(ds.id, ds.name)}
                            className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 font-medium flex items-center gap-1 transition-all"
                            title={`Delete dataset "${ds.name}"`}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Data Preview Modal */}
        {previewData && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel rounded-2xl border border-slate-700 w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl bg-slate-900">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-white text-sm">
                    Dataset Preview: {previewData.name} ({previewData.total_rows} Total Records)
                  </h3>
                </div>
                <button
                  onClick={() => setPreviewData(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] sticky top-0">
                    <tr>
                      {previewData.columns.map((col) => (
                        <th key={col} className="py-2.5 px-3 border-b border-slate-800">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {previewData.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-800/50">
                        {previewData.columns.map((col) => (
                          <td key={col} className="py-2 px-3 font-mono text-[11px]">
                            {String(row[col] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
                <span>Showing top sample records from the active database table</span>
                <button
                  onClick={() => setPreviewData(null)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
