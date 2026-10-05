import {
  KPIs,
  EnergyTrendPoint,
  TempVsEnergyPoint,
  DailyConsumptionPoint,
  ApplianceDistributionItem,
  DatasetItem,
  DatasetPreviewData,
  EnergyDeepAnalytics,
  WeatherDeepSummary
} from '../types';

const API_BASE = 'http://localhost:8000/api';

export async function fetchKPIs(datasetId?: number): Promise<KPIs> {
  const url = datasetId ? `${API_BASE}/dashboard/kpis?dataset_id=${datasetId}` : `${API_BASE}/dashboard/kpis`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load KPIs');
  return res.json();
}

export async function fetchEnergyTrend(period: string = '7d', datasetId?: number): Promise<EnergyTrendPoint[]> {
  const param = datasetId ? `&dataset_id=${datasetId}` : '';
  const res = await fetch(`${API_BASE}/dashboard/energy-trend?period=${period}${param}`);
  if (!res.ok) throw new Error('Failed to load energy trend');
  return res.json();
}

export async function fetchTempVsEnergy(limit: number = 300, datasetId?: number): Promise<TempVsEnergyPoint[]> {
  const param = datasetId ? `&dataset_id=${datasetId}` : '';
  const res = await fetch(`${API_BASE}/dashboard/temp-vs-energy?limit=${limit}${param}`);
  if (!res.ok) throw new Error('Failed to load temp vs energy');
  return res.json();
}

export async function fetchDailyConsumption(days: number = 30, datasetId?: number): Promise<DailyConsumptionPoint[]> {
  const param = datasetId ? `&dataset_id=${datasetId}` : '';
  const res = await fetch(`${API_BASE}/dashboard/daily-consumption?days=${days}${param}`);
  if (!res.ok) throw new Error('Failed to load daily consumption');
  return res.json();
}

export async function fetchApplianceDistribution(datasetId?: number): Promise<ApplianceDistributionItem[]> {
  const url = datasetId ? `${API_BASE}/dashboard/appliance-distribution?dataset_id=${datasetId}` : `${API_BASE}/dashboard/appliance-distribution`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load appliance distribution');
  return res.json();
}

export async function fetchEnergyDeepAnalytics(datasetId?: number): Promise<EnergyDeepAnalytics> {
  const url = datasetId ? `${API_BASE}/energy/analytics?dataset_id=${datasetId}` : `${API_BASE}/energy/analytics`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load deep energy analytics');
  return res.json();
}

export async function fetchWeatherSummary(datasetId?: number): Promise<WeatherDeepSummary> {
  const url = datasetId ? `${API_BASE}/weather/summary?dataset_id=${datasetId}` : `${API_BASE}/weather/summary`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load weather analytics');
  return res.json();
}

export async function fetchDatasets(): Promise<DatasetItem[]> {
  const res = await fetch(`${API_BASE}/datasets/`);
  if (!res.ok) throw new Error('Failed to load datasets');
  return res.json();
}

export async function fetchActiveDataset(): Promise<{ dataset: DatasetItem | null }> {
  const res = await fetch(`${API_BASE}/datasets/active`);
  if (!res.ok) throw new Error('Failed to load active dataset');
  return res.json();
}

export async function activateDataset(id: number): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}/activate`, { method: 'POST' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to activate dataset');
  }
  return res.json();
}

export async function fetchDatasetPreview(id: number): Promise<DatasetPreviewData> {
  const res = await fetch(`${API_BASE}/datasets/${id}/preview`);
  if (!res.ok) throw new Error('Failed to load dataset preview');
  return res.json();
}

export async function uploadDatasetFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/datasets/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload dataset');
  }
  return res.json();
}

export async function importDataset(payload: any): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to import dataset');
  }
  return res.json();
}

export async function triggerReseed(): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/seed`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reseed database');
  return res.json();
}

export async function deleteDataset(id: number): Promise<any> {
  const res = await fetch(`${API_BASE}/datasets/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete dataset');
  return res.json();
}

export function getDemoDownloadUrl(type: 'energy' | 'weather' | 'appliance' | 'combined'): string {
  return `${API_BASE}/datasets/demo/${type}/download`;
}

// ---- Unified ML Core ----
export async function fetchMLAlgorithms(): Promise<import('../types').MLAlgorithmInfo[]> {
  const res = await fetch(`${API_BASE}/ml/algorithms`);
  if (!res.ok) throw new Error('Failed to load ML algorithms');
  return res.json();
}

export async function fetchActiveMLModel(datasetId?: number): Promise<import('../types').MLModelRecord> {
  const param = datasetId ? `?dataset_id=${datasetId}` : '';
  const res = await fetch(`${API_BASE}/ml/active${param}`);
  if (!res.ok) throw new Error('Failed to load active ML model');
  return res.json();
}

export async function selectMLAlgorithm(algorithm: string, datasetId?: number): Promise<{
  status: string;
  message: string;
  model?: import('../types').MLModelRecord;
  error?: string;
  active_model?: import('../types').MLModelRecord;
}> {
  const res = await fetch(`${API_BASE}/ml/select`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ algorithm, dataset_id: datasetId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to select and train ML algorithm');
  }
  return res.json();
}

export async function retrainActiveModel(datasetId?: number): Promise<any> {
  const param = datasetId ? `?dataset_id=${datasetId}` : '';
  const res = await fetch(`${API_BASE}/ml/retrain${param}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to retrain active model');
  return res.json();
}

export async function fetchMLPredictions(horizon = 24, datasetId?: number): Promise<import('../types').MLPredictionResponse> {
  const param = datasetId ? `&dataset_id=${datasetId}` : '';
  const res = await fetch(`${API_BASE}/ml/predictions?horizon=${horizon}${param}`);
  if (!res.ok) throw new Error('Failed to load ML predictions');
  return res.json();
}

export async function fetchMLComparison(datasetId?: number): Promise<import('../types').MLComparisonItem[]> {
  const param = datasetId ? `?dataset_id=${datasetId}` : '';
  const res = await fetch(`${API_BASE}/ml/comparison${param}`);
  if (!res.ok) throw new Error('Failed to load ML model comparison');
  return res.json();
}

export async function fetchMLFeatureImportance(datasetId?: number): Promise<any> {
  const param = datasetId ? `?dataset_id=${datasetId}` : '';
  const res = await fetch(`${API_BASE}/ml/feature-importance${param}`);
  if (!res.ok) throw new Error('Failed to load feature importance');
  return res.json();
}

export async function fetchMLModels(limit = 20): Promise<import('../types').MLModelRecord[]> {
  const res = await fetch(`${API_BASE}/ml/models?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to load ML model history');
  return res.json();
}

// ---- Forecast (Synced with Unified ML) ----
export async function fetchForecast(horizon = 24, datasetId?: number, model = 'random_forest') {
  const datasetParam = datasetId ? `&dataset_id=${datasetId}` : '';
  const res = await fetch(`${API_BASE}/forecast/predict?horizon=${horizon}&model=${model}${datasetParam}`);
  if (!res.ok) throw new Error('Failed to load forecast');
  const payload = await res.json();
  return {
    ...payload,
    forecast: Array.isArray(payload.forecast)
      ? payload.forecast
      : Array.isArray(payload.forecast?.forecast)
        ? payload.forecast.forecast
        : [],
  };
}
export async function fetchForecastMetrics(datasetId?: number, model = 'random_forest') {
  const datasetParam = datasetId ? `&dataset_id=${datasetId}` : '';
  const res = await fetch(`${API_BASE}/forecast/metrics?model=${model}${datasetParam}`);
  if (!res.ok) throw new Error('Failed to load forecast metrics');
  return res.json();
}


// ---- Live Monitoring ----
export async function fetchLiveTelemetry() {
  const res = await fetch(`${API_BASE}/live/telemetry`);
  if (!res.ok) throw new Error('Failed to load live telemetry');
  return res.json();
}
export async function fetchWaveform(cycles = 3) {
  const res = await fetch(`${API_BASE}/live/waveform?cycles=${cycles}`);
  if (!res.ok) throw new Error('Failed to load waveform');
  return res.json();
}

// ---- Appliances ----
export async function fetchAppliancesDetailed(datasetId?: number) {
  const param = datasetId ? `?dataset_id=${datasetId}` : '';
  const res = await fetch(`${API_BASE}/appliances/${param}`);
  if (!res.ok) throw new Error('Failed to load appliances');
  return res.json();
}
export async function fetchApplianceAnalytics(id: number, days = 7) {
  const res = await fetch(`${API_BASE}/appliances/${id}/analytics?days=${days}`);
  if (!res.ok) throw new Error('Failed to load appliance analytics');
  return res.json();
}
export async function fetchHighConsumptionAppliances(): Promise<import('../types').HighConsumptionSummary> {
  const res = await fetch(`${API_BASE}/appliances/high-consumption`);
  if (!res.ok) throw new Error('Failed to load high consumption appliances');
  return res.json();
}
export async function toggleAppliancePower(id: number, targetState?: 'on' | 'off') {
  if (targetState) {
    const res = await fetch(`${API_BASE}/appliances/${id}/set-power`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ power_state: targetState }),
    });
    if (!res.ok) throw new Error('Failed to set appliance power');
    return res.json();
  }
  const res = await fetch(`${API_BASE}/appliances/${id}/toggle-power`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle appliance power');
  return res.json();
}

// ---- Recommendations (Prescriptive Insights) ----
export async function fetchRecommendations(): Promise<import('../types').Recommendation[]> {
  const res = await fetch(`${API_BASE}/recommendations/`);
  if (!res.ok) throw new Error('Failed to load recommendations');
  return res.json();
}
export async function takeRecommendationAction(id: number, action: 'apply' | 'dismiss') {
  const res = await fetch(`${API_BASE}/recommendations/${id}/action?action=${action}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to apply recommendation action');
  return res.json();
}
export async function toggleRecommendationAppliance(recId: number) {
  const res = await fetch(`${API_BASE}/recommendations/${recId}/toggle-appliance`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to toggle recommendation appliance');
  return res.json();
}

// ---- Alerts ----
export async function fetchAlerts(params?: { status?: string; severity?: string; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.severity) q.set('severity', params.severity);
  if (params?.limit) q.set('limit', String(params.limit));
  const res = await fetch(`${API_BASE}/alerts/?${q.toString()}`);
  if (!res.ok) throw new Error('Failed to load alerts');
  return res.json();
}
export async function fetchAlertSummary() {
  const res = await fetch(`${API_BASE}/alerts/summary`);
  if (!res.ok) throw new Error('Failed to load alert summary');
  return res.json();
}
export async function resolveAlert(id: number) {
  const res = await fetch(`${API_BASE}/alerts/${id}/resolve`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to resolve alert');
  return res.json();
}
export async function acknowledgeAlert(id: number) {
  const res = await fetch(`${API_BASE}/alerts/${id}/acknowledge`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to acknowledge alert');
  return res.json();
}
export async function fetchAlertConfigs() {
  const res = await fetch(`${API_BASE}/alerts/configs`);
  if (!res.ok) throw new Error('Failed to load alert configs');
  return res.json();
}
export async function triggerAnomalyScan(datasetId?: number) {
  const param = datasetId ? `?dataset_id=${datasetId}` : '';
  const res = await fetch(`${API_BASE}/alerts/scan${param}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to run anomaly scan');
  return res.json();
}

// ---- IoT Devices ----
export async function fetchIoTDevices() {
  const res = await fetch(`${API_BASE}/iot/devices`);
  if (!res.ok) throw new Error('Failed to load IoT devices');
  return res.json();
}
export async function fetchIoTSummary() {
  const res = await fetch(`${API_BASE}/iot/summary`);
  if (!res.ok) throw new Error('Failed to load IoT summary');
  return res.json();
}
export async function iotDeviceAction(id: number, action: 'ping' | 'reboot' | 'ota_update') {
  const res = await fetch(`${API_BASE}/iot/devices/${id}/action?action=${action}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to perform device action');
  return res.json();
}

// ---- Reports ----
export async function fetchReports() {
  const res = await fetch(`${API_BASE}/reports/`);
  if (!res.ok) throw new Error('Failed to load reports');
  return res.json();
}
export async function fetchReport(id: number) {
  const res = await fetch(`${API_BASE}/reports/${id}`);
  if (!res.ok) throw new Error('Failed to load report');
  return res.json();
}
export async function generateReport(reportType: string, datasetId?: number) {
  const param = datasetId ? `&dataset_id=${datasetId}` : '';
  const res = await fetch(`${API_BASE}/reports/generate?report_type=${reportType}${param}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to generate report');
  return res.json();
}

export async function fetchFutureCostPrediction(datasetId?: number): Promise<import('../types').CostPrediction> {
  const param = datasetId ? `?dataset_id=${datasetId}` : '';
  const res = await fetch(`${API_BASE}/future-intelligence/cost-prediction${param}`);
  if (!res.ok) throw new Error('Failed to load future cost prediction');
  return res.json();
}



