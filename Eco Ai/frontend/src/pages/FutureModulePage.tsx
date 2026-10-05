import React from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '../components/layout/Header';
import { FuturePhasePlaceholder } from '../components/common/FuturePhasePlaceholder';

interface ModuleConfig {
  title: string;
  phase: string | number;
  description: string;
  why: string;
  what: string;
  features: string[];
}

const MODULE_REGISTRY: Record<string, ModuleConfig> = {
  '/ai-forecast': {
    title: 'AI Energy Forecast',
    phase: 5,
    description:
      'Predictive machine learning algorithms (LSTM, XGBoost, Temporal Fusion Transformers) trained on historical grid consumption and meteorological telemetry to forecast future demand.',
    why: 'Anticipating peak load hours before they occur gives operators and consumers the foresight needed to pre-cool buildings, schedule battery charging, and avoid peak demand tariffs.',
    what: 'Will execute inference on the latest 24–72 hour feature vectors to output hourly forecasted load curves with 95% confidence intervals.',
    features: [
      '24-hour and 7-day ahead rolling energy consumption forecast',
      'Confidence bands and anomaly probability indicators',
      'Weather forecast feature ingestion pipeline',
      'Peak surge warning alerts'
    ]
  },
  '/live-monitoring': {
    title: 'Live Monitoring',
    phase: 6,
    description:
      'Real-time sub-second streaming telemetry dashboard connected to physical IoT microcontrollers, high-frequency smart meters, and edge gateways.',
    why: 'Hourly aggregated logs cannot capture momentary current spikes, voltage dips, power factor drops, or harmonic distortion.',
    what: 'Will ingest WebSocket streams from edge sensors to render sub-second oscilloscopes, active/reactive power gauges, and instant fault flags.',
    features: [
      'Real-time WebSocket telemetry ingestion at 1Hz–10Hz',
      'Voltage, Current, Active Power (kW), Reactive Power (kVAR), and Power Factor gauges',
      'Frequency fluctuation and phase balance monitoring',
      'Instantaneous load threshold indicators'
    ]
  },
  '/appliances': {
    title: 'Appliance Management & Sub-metering',
    phase: 5,
    description:
      'Dedicated granular appliance-level tracking, health diagnostics, duty cycle analysis, and baseline comparison across individual equipment.',
    why: 'Total facility consumption is only the sum of its parts; pinpointing energy waste requires isolating malfunctioning or inefficient appliances.',
    what: 'Will provide individual equipment profiles, historical energy breakdown by device, standby power leakage detection, and energy efficiency ratings.',
    features: [
      'Individual appliance health score and efficiency degradation tracking',
      'Standby vampire power consumption isolation',
      'Duty cycle and compressor cycling health analysis',
      'Sub-meter device pairing and calibration'
    ]
  },
  '/recommendations': {
    title: 'Energy Optimization Recommendations',
    phase: 6,
    description:
      'Prescriptive analytics engine providing actionable insights, cost-saving suggestions, and behavioral recommendations to minimize energy waste.',
    why: 'Raw charts tell users what happened; recommendations tell users what actions they should take to reduce cost and carbon footprint.',
    what: 'Will synthesize usage patterns against weather indices to generate prioritized recommendations with estimated rupee/kWh savings.',
    features: [
      'HVAC setpoint optimization suggestions for Chennai climate',
      'Off-peak scheduling recommendations for heavy loads',
      'Quantified estimated cost savings per action',
      'Carbon footprint reduction score'
    ]
  },
  '/alerts': {
    title: 'Intelligent Alerts & Anomaly Detection',
    phase: 5,
    description:
      'Continuous anomaly detection system that identifies consumption surges, unexpected equipment operation, and potential wiring faults.',
    why: 'Equipment failure or unmonitored baseline shifts can go unnoticed for weeks, resulting in inflated electricity bills and safety hazards.',
    what: 'Will compare live readings against expected statistical boundaries and dispatch notifications via Email, SMS, and Webhook when thresholds breach.',
    features: [
      'Statistical z-score and isolation-forest anomaly detector',
      'Configurable warning and critical load thresholds',
      'Multi-channel dispatch (In-app, Webhook, SMS, Email)',
      'Alert acknowledgment and resolution history'
    ]
  },
  '/iot-devices': {
    title: 'IoT Devices & Gateways',
    phase: 6,
    description:
      'Hardware provisioning, MQTT broker management, ESP32 microcontroller registration, and OTA firmware updates for field sensors.',
    why: 'Managing physical hardware requires secure cryptographic credentials, connection status tracking, and remote reboot capabilities.',
    what: 'Will display connected ESP32 sensor nodes, current Wi-Fi/MQTT status, RSSI signal strength, and sensor calibration parameters.',
    features: [
      'ESP32 microcontroller device registry and token authentication',
      'MQTT topic hierarchy and message rate monitor',
      'Hardware heartbeat, Wi-Fi RSSI, and ping telemetry',
      'Over-the-Air (OTA) firmware deployment'
    ]
  },
  '/reports': {
    title: 'Automated Reports & Auditing',
    phase: 6,
    description:
      'Formal academic and enterprise energy auditing report generator with executive summaries, PDF exports, and regulatory compliance tables.',
    why: 'Stakeholders, facility directors, and academic evaluators require structured, shareable reports detailing energy performance.',
    what: 'Will compile monthly consumption statistics, peak demand incidents, weather correlations, and appliance shares into downloadable PDFs.',
    features: [
      'Automated weekly and monthly PDF energy audit report generation',
      'Energy Star and green building compliance benchmarking',
      'Executive summary cards and high-resolution chart exports',
      'Scheduled email report distribution'
    ]
  }
};

export const FutureModulePage: React.FC = () => {
  const location = useLocation();
  const config = MODULE_REGISTRY[location.pathname] || {
    title: 'Advanced Module',
    phase: 5,
    description: 'This feature is slated for implementation in an upcoming development phase.',
    why: 'Expands the core foundation with predictive intelligence and physical IoT hardware actuation.',
    what: 'Will connect with the Level 1–4 database schema to provide extended capabilities.',
    features: ['Extended capability planned for future release']
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        title={config.title}
        subtitle={`Roadmap module scheduled for Level ${config.phase}+ development`}
      />

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        <FuturePhasePlaceholder
          moduleName={config.title}
          phaseNumber={config.phase}
          description={config.description}
          why={config.why}
          what={config.what}
          plannedFeatures={config.features}
        />
      </main>
    </div>
  );
};
