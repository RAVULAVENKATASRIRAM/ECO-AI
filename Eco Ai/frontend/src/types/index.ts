export interface KPIs {
  current_energy_usage: number;
  unit: string;
  todays_consumption: number;
  average_consumption: number;
  peak_consumption: number;
  latest_temperature: number;
  latest_humidity: number;
  timestamp: string;
  total_readings: number;
  active_dataset?: ActiveDatasetInfo;
  has_energy?: boolean;
  has_weather?: boolean;
}

export interface EnergyTrendPoint {
  timestamp: string;
  consumption: number;
  unit?: string;
  temperature?: number;
  humidity?: number;
}

export interface TempVsEnergyPoint {
  timestamp: string;
  temperature: number;
  consumption: number;
  humidity: number;
  weather_condition: string;
}

export interface DailyConsumptionPoint {
  date: string;
  total_consumption: number;
  avg_consumption: number;
  peak_consumption: number;
  avg_temperature?: number;
}

export interface ApplianceDistributionItem {
  id: number;
  name: string;
  type: string;
  rated_power_w: number;
  total_energy_kwh: number;
  percentage: number;
  status: string;
}

export interface DatasetItem {
  id: number;
  name: string;
  type: string;
  filename: string;
  description?: string;
  source: string;
  row_count: number;
  date_start?: string;
  date_end?: string;
  created_at: string;
  is_active?: boolean;
}

export interface DatasetPreviewData {
  id: number;
  name: string;
  type: string;
  filename: string;
  total_rows: number;
  columns: string[];
  rows: Record<string, any>[];
}

export interface HourlyCurvePoint {
  hour: string;
  weekday_avg: number;
  weekend_avg: number;
  overall_avg: number;
}

export interface LoadDurationPoint {
  percentile: number;
  load_mw: number;
}

export interface EnergyDeepAnalytics {
  active_dataset: ActiveDatasetInfo;
  available: boolean;
  message?: string;
  total_energy_mw_sum: number;
  peak_energy: number;
  peak_percentage: number;
  offpeak_energy: number;
  offpeak_percentage: number;
  hourly_curve: HourlyCurvePoint[];
  load_duration_curve: LoadDurationPoint[];
  highest_recorded: number;
  lowest_recorded: number;
}

export interface ActiveDatasetInfo {
  id: number | null;
  name: string;
  type: string | null;
  filename?: string | null;
  source?: string;
  row_count?: number;
}

export interface WeatherDeepSummary {
  active_dataset: ActiveDatasetInfo;
  available: boolean;
  message?: string;
  current_temperature: number;
  current_humidity: number;
  current_wind_speed: number;
  current_condition: string;
  avg_temperature: number;
  max_temperature: number;
  min_temperature: number;
  avg_humidity: number;
  avg_wind_speed: number;
  temp_energy_correlation: number;
  humidity_energy_correlation: number;
  condition_distribution: Record<string, number>;
  cooling_degree_sensitivity: string;
}

// ---- Unified ML System & Forecast ----
export interface ForecastPoint {
  timestamp: string;
  hour: number;
  forecast_mw: number;
  lower_mw: number;
  upper_mw: number;
  temperature_c: number;
  humidity_pct?: number;
  is_peak: boolean;
  is_anomaly?: boolean;
  anomaly_score?: number;
  day_label?: string;
}

export interface ForecastMetrics {
  mae: number | null;
  rmse: number | null;
  mape: number | null;
  r_squared: number | null;
  r2?: number | null;
  samples_used?: number;
  mean_actual_mw?: number;
  model_name?: string;
  model_label?: string;
  model_version?: number;
  is_anomaly_detector?: boolean;
  anomaly_count?: number;
  normal_count?: number;
  anomaly_rate_pct?: number;
  contamination?: number;
  avg_anomaly_score?: number;
  c_n?: number;
  subsample_size?: number;
}

export interface MLAlgorithmInfo {
  id: string;
  name: string;
  label: string;
  description: string;
  category: string;
  supports_feature_importance: boolean;
  supports_coefficients: boolean;
  is_anomaly_detector?: boolean;
  typical_training_time_ms: number;
}

export interface MLFeatureImportance {
  feature: string;
  importance: number;
  percentage: number;
}

export interface MLCoefficient {
  feature: string;
  coefficient: number;
  impact: 'positive' | 'negative';
}

export interface EvaluationSeries {
  timestamps: string[];
  actual: number[];
  predicted: number[];
  residuals: number[];
  anomaly_scores?: number[];
  is_anomaly?: boolean[];
}

export interface MLModelRecord {
  id: number;
  user_id?: string;
  location: string;
  dataset_id?: number | null;
  algorithm: string;
  algorithm_label: string;
  algorithm_description: string;
  model_version: number;
  version_tag: string;
  status: 'training' | 'validated' | 'active' | 'failed' | 'archived';
  is_active: boolean;
  training_record_count: number;
  feature_set: string[];
  prediction_horizon: number;
  metrics: {
    mae: number | null;
    rmse: number | null;
    mape: number | null;
    r2: number | null;
    r_squared: number | null;
    is_anomaly_detector?: boolean;
    anomaly_count?: number;
    normal_count?: number;
    anomaly_rate_pct?: number;
    contamination?: number;
    avg_anomaly_score?: number;
    c_n?: number;
    subsample_size?: number;
  };
  metadata?: Record<string, any>;
  feature_importance: MLFeatureImportance[];
  coefficients: MLCoefficient[];
  evaluation_series?: EvaluationSeries;
  training_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MLComparisonItem {
  algorithm: string;
  label: string;
  version: number | null;
  status: string;
  is_active: boolean;
  mae: number | null;
  rmse: number | null;
  mape: number | null;
  r2: number | null;
  training_records: number;
  last_trained: string | null;
}

export interface HistorySeriesPoint {
  timestamp: string;
  actual_mw: number;
  temperature_c: number;
  label: string;
  is_anomaly?: boolean;
  anomaly_score?: number | null;
}

export interface MLPredictionResponse {
  model: MLModelRecord;
  prediction: {
    value: number;
    average_hourly_mw: number;
    peak_forecast_mw: number;
    peak_hour: string;
    unit: string;
    horizon_hours: number;
    horizon_label: string;
    timestamp: string;
  };
  metrics: {
    mae: number | null;
    rmse: number | null;
    mape: number | null;
    r2: number | null;
    r_squared: number | null;
  };
  forecast_points: ForecastPoint[];
  history_series: HistorySeriesPoint[];
  summary: {
    total_forecast_mwh: number;
    avg_forecast_mw: number;
    peak_forecast_mw: number;
    peak_hour: string;
    peak_count: number;
  };
  generated_at: string;
}


// ---- Phase 6: Live Monitoring ----
export interface PhaseData {
  voltage_v: number;
  current_a: number;
  active_kw: number;
}

export interface LiveTelemetry {
  timestamp: string;
  active_power_kw: number;
  reactive_power_kvar: number;
  apparent_power_kva: number;
  power_factor: number;
  frequency_hz: number;
  thd_percent: number;
  phases: { R: PhaseData; Y: PhaseData; B: PhaseData };
  status: string;
}

export interface WaveformSample {
  t_ms: number;
  voltage_v: number;
  current_a: number;
}

// ---- Phase 5: Appliances ----
export interface ApplianceDetail {
  id: number;
  name: string;
  type: string;
  rated_power_w: number;
  location: string;
  status: string;
  power_state?: 'on' | 'off';
  health_score: number;
  current_power_w: number | null;
  current_energy_kwh: number | null;
  total_energy_kwh: number;
  last_seen: string | null;
  standby_leakage_w: number;
  hourly_cost_inr?: number;
  daily_projected_cost_inr?: number;
  tariff_tier?: string;
  tariff_rate_inr?: number;
  is_high_consumption?: boolean;
  cost_severity?: 'critical' | 'warning' | 'normal';
}

export interface HighConsumptionNotice {
  appliance_id: number;
  name: string;
  type: string;
  location: string;
  rated_power_w: number;
  current_power_w: number;
  power_state: 'on' | 'off';
  tariff_tier: string;
  current_tariff_rate_inr: number;
  hourly_cost_inr: number;
  daily_projected_cost_inr: number;
  severity: 'critical' | 'warning' | 'info';
  warning_title: string;
  warning_message: string;
  suggested_action: string;
  hourly_saving_if_off_inr: number;
}

export interface HighConsumptionSummary {
  tariff_tier: string;
  tariff_rate_inr: number;
  active_high_count: number;
  total_excess_cost_per_hr: number;
  total_high_power_kw: number;
  notices: HighConsumptionNotice[];
}

export interface RecommendationApplianceInfo {
  id: number;
  name: string;
  type: string;
  power_state: 'on' | 'off';
  current_power_w: number;
  hourly_cost_inr: number;
  rated_power_w: number;
}

// ---- Phase 6: Recommendations ----
export interface Recommendation {
  id: number;
  title: string;
  category: string;
  impact_level: string;
  estimated_kwh_saving: number;
  estimated_cost_saving: number;
  carbon_reduction_kg: number;
  description: string;
  action_text: string;
  status: string;
  appliance_id?: number | null;
  appliance?: RecommendationApplianceInfo | null;
  created_at: string;
  applied_at: string | null;
}

// ---- Phase 5: Alerts ----
export interface AlertItem {
  id: number;
  title: string;
  message: string;
  severity: string;
  category: string;
  metric: string | null;
  metric_value: number | null;
  threshold: number | null;
  status: string;
  timestamp: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
}

export interface AlertSummary {
  total: number;
  active: number;
  critical: number;
}

export interface AlertConfig {
  id: number;
  name: string;
  metric: string;
  warning_threshold: number;
  critical_threshold: number;
  unit: string | null;
  enabled: boolean;
}

// ---- Phase 6: IoT Devices ----
export interface IoTDevice {
  id: number;
  name: string;
  device_type: string;
  model: string | null;
  location: string | null;
  mac_address: string | null;
  ip_address: string | null;
  firmware_version: string | null;
  mqtt_topic: string | null;
  status: string;
  rssi: number | null;
  last_seen: string | null;
  message_rate_per_min: number;
  uptime_hours: number;
  registered_at: string;
}

export interface IoTSummary {
  total: number;
  online: number;
  offline: number;
}

// ---- Phase 6: Reports ----
export interface ReportItem {
  id: number;
  title: string;
  report_type: string;
  date_from: string;
  date_to: string;
  total_consumption_mwh: number;
  peak_demand_mw: number;
  avg_demand_mw: number;
  carbon_footprint_tonnes: number;
  cost_inr: number;
  num_alerts: number;
  status: string;
  generated_at: string;
}

export interface ReportDetail extends ReportItem {
  avg_demand_mw: number;
  num_anomalies: number;
  summary: string;
  readings_count?: number;
}

export interface HourlyCostPoint {
  timestamp: string;
  hour: number;
  forecast_mw: number;
  rate_per_kwh: number;
  cost_inr: number;
  cost_inr_lakhs: number;
  tier: 'peak' | 'off_peak' | 'standard';
  is_peak: boolean;
}

export interface TariffStructure {
  base_rate_per_kwh: number;
  peak_rate_per_kwh: number;
  offpeak_rate_per_kwh: number;
  currency: string;
  unit: string;
  policy: string;
}

export interface CostPrediction {
  projected_24h_cost_inr: number;
  projected_24h_cost_lakhs: number;
  today_cost_inr: number;
  historical_daily_cost_inr: number;
  cost_difference_inr: number;
  cost_percentage_change: number;
  projected_monthly_bill_inr: number;
  projected_monthly_bill_lakhs: number;
  potential_daily_savings_inr: number;
  potential_monthly_savings_inr: number;
  peak_cost_sum_inr: number;
  offpeak_cost_sum_inr: number;
  peak_cost_share_pct: number;
  offpeak_cost_share_pct: number;
  peak_hours_count: number;
  currency: string;
  currency_symbol: string;
  tariff_structure: TariffStructure;
  hourly_cost_series: HourlyCostPoint[];
  explanation: string;
}

