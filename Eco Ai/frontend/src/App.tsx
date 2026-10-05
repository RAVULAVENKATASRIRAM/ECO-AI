import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { DashboardPage } from './pages/DashboardPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { EnergyAnalyticsPage } from './pages/EnergyAnalyticsPage';
import { WeatherPage } from './pages/WeatherPage';
import { ForecastPage } from './pages/ForecastPage';
import { FutureIntelligencePage } from './pages/FutureIntelligencePage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { AppliancesPage } from './pages/AppliancesPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { AlertsPage } from './pages/AlertsPage';
import { IotDevicesPage } from './pages/IotDevicesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';

export function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950 transition-colors">
          {/* Persistent Sidebar Navigation */}
          <Sidebar />

          {/* Dynamic Route View */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1">
              <Routes>
                {/* Core Analytics */}
                <Route path="/" element={<DashboardPage />} />
                <Route path="/data-management" element={<DataManagementPage />} />
                <Route path="/energy-analytics" element={<EnergyAnalyticsPage />} />
                <Route path="/weather" element={<WeatherPage />} />

                {/* Intelligence & Operations */}
                <Route path="/future-intelligence" element={<FutureIntelligencePage />} />
                <Route path="/ai-forecast" element={<ForecastPage />} />
                <Route path="/live-monitoring" element={<LiveMonitoringPage />} />
                <Route path="/appliances" element={<AppliancesPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/recommendations" element={<RecommendationsPage />} />

                {/* Operations */}
                <Route path="/iot-devices" element={<IotDevicesPage />} />
                <Route path="/reports" element={<ReportsPage />} />

                {/* System */}
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/about" element={<AboutPage />} />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>

            <Footer />
          </div>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
