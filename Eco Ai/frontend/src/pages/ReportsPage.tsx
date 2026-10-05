import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '../components/layout/Header';
import { fetchReports, fetchReport, generateReport } from '../services/api';
import type { ReportItem, ReportDetail } from '../types';
import {
  FileText,
  Download,
  Plus,
  Calendar,
  IndianRupee,
  Leaf,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowDownToLine,
  Eye,
  AlertCircle
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState<string>('monthly');
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReports();
      setReports(data || []);
    } catch (e) {
      console.error('Failed to load reports:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateReport(reportType);
      await load();
    } catch (e) {
      console.error('Failed to generate report:', e);
    } finally {
      setGenerating(false);
    }
  };

  const handleViewDetail = async (id: number) => {
    setLoadingDetail(true);
    try {
      const data = await fetchReport(id);
      setSelectedReport(data);
    } catch (e) {
      console.error('Failed to view report:', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownloadCsv = (report: ReportItem) => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        'Metric,Value',
        `Report Title,"${report.title}"`,
        `Report Type,${report.report_type}`,
        `Date From,${report.date_from}`,
        `Date To,${report.date_to}`,
        `Total Consumption (MWh),${report.total_consumption_mwh}`,
        `Peak Demand (MW),${report.peak_demand_mw}`,
        `Carbon Footprint (Tonnes CO2),${report.carbon_footprint_tonnes}`,
        `Cost Estimate (INR),${report.cost_inr}`,
        `Alerts Count,${report.num_alerts}`,
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ECO_AI_Report_${report.report_type}_${report.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Header
        title="Energy Compliance & Audit Reports"
        subtitle="Automated periodic reporting, carbon emission accounting, and billing audits"
      />
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Generate Report Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Generate Energy Audit Report</h3>
              <p className="text-xs text-slate-400">Compile aggregated energy, peak power, billing, and carbon footprint telemetry</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 font-medium focus:outline-none focus:border-emerald-500"
            >
              <option value="weekly">Weekly Operational Summary</option>
              <option value="monthly">Monthly Tariff & Carbon Audit</option>
              <option value="quarterly">Quarterly Grid Compliance</option>
            </select>

            <button
              disabled={generating}
              onClick={handleGenerate}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
            >
              <Plus className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Compiling Report...' : 'Generate New Report'}
            </button>
          </div>
        </div>

        {/* Report Detail Modal / Drawer */}
        {selectedReport && (
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-lg text-white">{selectedReport.title}</h3>
                  <p className="text-xs text-slate-400">
                    Period: {new Date(selectedReport.date_from).toLocaleDateString()} to {new Date(selectedReport.date_to).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadCsv(selectedReport)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" /> Download CSV
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Total MWh</p>
                <p className="text-xl font-black text-white">{selectedReport.total_consumption_mwh.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Peak Demand</p>
                <p className="text-xl font-black text-amber-400">{selectedReport.peak_demand_mw} MW</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">CO₂ Footprint</p>
                <p className="text-xl font-black text-teal-400">{selectedReport.carbon_footprint_tonnes} T</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-[11px] text-slate-400 uppercase font-semibold">Est. Cost</p>
                <p className="text-xl font-black text-emerald-400">₹{selectedReport.cost_inr.toLocaleString('en-IN')}</p>
              </div>
            </div>

            {selectedReport.summary && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Executive Summary</p>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedReport.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* Reports Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-semibold text-white">Archived Audit Reports</h3>
            <span className="text-xs text-slate-400">{reports.length} reports generated</span>
          </div>

          {loading ? (
            <div className="p-8 space-y-4 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-12 bg-slate-800/50 rounded-xl" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-medium text-white mb-1">No reports generated yet</h3>
              <p className="text-xs text-slate-400">Click &quot;Generate New Report&quot; above to compile your first audit report.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3.5 px-4">Report Title & Type</th>
                    <th className="py-3.5 px-4">Period</th>
                    <th className="py-3.5 px-4">Total MWh</th>
                    <th className="py-3.5 px-4">Peak MW</th>
                    <th className="py-3.5 px-4">CO₂ (Tonnes)</th>
                    <th className="py-3.5 px-4">Cost (INR)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reports.map(r => (
                    <tr key={r.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-white text-sm">{r.title}</p>
                        <span className="text-[11px] text-slate-400 capitalize">{r.report_type} Report</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {new Date(r.date_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} –{' '}
                        {new Date(r.date_to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">
                        {r.total_consumption_mwh.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-mono text-amber-400 font-semibold">{r.peak_demand_mw}</td>
                      <td className="py-3 px-4 font-mono text-teal-400 font-semibold">{r.carbon_footprint_tonnes}</td>
                      <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                        ₹{r.cost_inr.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewDetail(r.id)}
                            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all"
                            title="View Summary"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadCsv(r)}
                            className="p-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all"
                            title="Download CSV"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
