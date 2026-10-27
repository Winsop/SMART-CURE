import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  OperatingMode, 
  TelemetryFrame, 
  HistoricalTelemetryPoint, 
  IrrigationLogEntry, 
  ControllerEvent 
} from './types/telemetry';
import { 
  DemoDataProvider, 
  LiveTelemetryDataSource, 
  ITelemetryDataSource,
  DemoFaultToggles 
} from './services/telemetrySource';
import { SensorRegistry } from './services/SensorRegistry';
import { EventHistoryService } from './services/EventHistoryService';
import { RecursiveDiagnosticMetrics } from './algorithms/analyzeSensorEvents';
import { Navigation, NavTab } from './components/Navigation';
import { ModeBanner } from './components/ModeBanner';
import { OverviewView } from './components/views/OverviewView';
import { LiveMonitoringView } from './components/views/LiveMonitoringView';
import { TrendsView } from './components/views/TrendsView';
import { IrrigationView } from './components/views/IrrigationView';
import { DiagnosticsView } from './components/views/DiagnosticsView';
import { SettingsView } from './components/views/SettingsView';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [mode, setMode] = useState<OperatingMode>('DEMO');
  const [currentFrame, setCurrentFrame] = useState<TelemetryFrame | null>(null);
  const [history, setHistory] = useState<HistoricalTelemetryPoint[]>([]);
  const [irrigationLogs, setIrrigationLogs] = useState<IrrigationLogEntry[]>([]);
  const [events, setEvents] = useState<ControllerEvent[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Initializing');

  // Fault toggles for demo mode testing
  const [faultToggles, setFaultToggles] = useState<DemoFaultToggles>({
    probe2Disconnected: false,
    unstableAdcNoise: false,
    dht22Timeout: false,
    simulatePumpRun: false,
  });

  const demoProviderRef = useRef<DemoDataProvider | null>(null);
  const liveProviderRef = useRef<LiveTelemetryDataSource | null>(null);

  // DSA Services: Object Registry & Linked-List Event History
  const sensorRegistryRef = useRef<SensorRegistry>(new SensorRegistry());
  const eventHistoryServiceRef = useRef<EventHistoryService>(new EventHistoryService(50));

  const [polymorphicSummary, setPolymorphicSummary] = useState<any[]>(() =>
    sensorRegistryRef.current.getPolymorphicSummary()
  );
  const [recursiveMetrics, setRecursiveMetrics] = useState<RecursiveDiagnosticMetrics | null>(null);
  const [linkedListMetrics, setLinkedListMetrics] = useState<any>(null);

  // Initialize or switch provider based on active mode
  useEffect(() => {
    let unsubscribeTelemetry: (() => void) | null = null;
    let unsubscribeConn: (() => void) | null = null;

    if (mode === 'DEMO') {
      if (!demoProviderRef.current) {
        demoProviderRef.current = new DemoDataProvider();
      }
      const provider = demoProviderRef.current;
      provider.faultToggles = faultToggles;

      unsubscribeTelemetry = provider.subscribe((frame) => {
        setCurrentFrame(frame);
        // DSA Requirement A & B: Polymorphic updates on BaseSensor subclasses
        sensorRegistryRef.current.updateFromFrame(frame);
        setPolymorphicSummary(sensorRegistryRef.current.getPolymorphicSummary());
      });

      unsubscribeConn = provider.subscribeConnection((conn, msg) => {
        setIsConnected(conn);
        setStatusText(msg);
      });

      provider.connect().then(async () => {
        const hist = await provider.getHistoricalData(24);
        const logs = await provider.getIrrigationLogs();
        const evts = await provider.getControllerEvents();
        setHistory(hist);
        setIrrigationLogs(logs);

        // DSA Requirement D: Feed events into SinglyLinkedList
        eventHistoryServiceRef.current.clear();
        eventHistoryServiceRef.current.addEvents(evts);
        const listSnapshot = eventHistoryServiceRef.current.getEvents();
        setEvents(listSnapshot);

        // DSA Requirement C: Execute recursive analysis on linked list events
        const rMetrics = eventHistoryServiceRef.current.getRecursiveAnalysis();
        setRecursiveMetrics(rMetrics);
        setLinkedListMetrics(eventHistoryServiceRef.current.getLinkedListMetrics());
      });
    } else {
      // Live Hardware Mode
      if (!liveProviderRef.current) {
        liveProviderRef.current = new LiveTelemetryDataSource();
      }
      const provider = liveProviderRef.current;

      // Reset data buffers to prevent demo data from leaking into live view (DEC-004)
      setCurrentFrame(null);
      setHistory([]);
      setIrrigationLogs([]);
      eventHistoryServiceRef.current.clear();
      setEvents([]);
      setRecursiveMetrics(null);
      setLinkedListMetrics(eventHistoryServiceRef.current.getLinkedListMetrics());

      unsubscribeTelemetry = provider.subscribe((frame) => {
        setCurrentFrame(frame);
        if (frame) {
          sensorRegistryRef.current.updateFromFrame(frame);
          setPolymorphicSummary(sensorRegistryRef.current.getPolymorphicSummary());
        }
      });

      unsubscribeConn = provider.subscribeConnection((conn, msg) => {
        setIsConnected(conn);
        setStatusText(msg);
      });

      provider.connect();
    }

    return () => {
      if (unsubscribeTelemetry) unsubscribeTelemetry();
      if (unsubscribeConn) unsubscribeConn();
    };
  }, [mode]);

  // Update fault toggles on the active demo provider
  const handleUpdateFaultToggles = (newToggles: DemoFaultToggles) => {
    setFaultToggles(newToggles);
    if (demoProviderRef.current) {
      demoProviderRef.current.faultToggles = newToggles;
      const updated = demoProviderRef.current.generateFrame();
      setCurrentFrame(updated);
      sensorRegistryRef.current.updateFromFrame(updated);
      setPolymorphicSummary(sensorRegistryRef.current.getPolymorphicSummary());
    }
  };

  const handleToggleMode = (newMode: OperatingMode) => {
    setMode(newMode);
  };

  // CSV export handler
  const handleExportCsv = () => {
    if (history.length === 0) return;

    const headers = [
      'Timestamp_ISO',
      'Core_Temp_C',
      'Surface_Temp_C',
      'Ambient_Temp_C',
      'Ambient_RH_Pct',
      'Moisture_ADC',
      'Pump_Active',
    ];

    const rows = history.map((pt) => [
      pt.timestamp,
      pt.tempCore !== null ? pt.tempCore : 'NA',
      pt.tempSurface !== null ? pt.tempSurface : 'NA',
      pt.ambientTemp !== null ? pt.ambientTemp : 'NA',
      pt.ambientRh !== null ? pt.ambientRh : 'NA',
      pt.moistureAdc !== null ? pt.moistureAdc : 'NA',
      pt.pumpActive ? '1' : '0',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `concrete_curing_telemetry_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F7] text-[#202B33]">
      {/* Top Header Navigation */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        mode={mode}
        onToggleMode={handleToggleMode}
        isConnected={isConnected}
        statusText={statusText}
      />

      {/* Mode & Operating State Notice Banner */}
      <ModeBanner
        mode={mode}
        faultToggles={faultToggles}
        onUpdateFaultToggles={handleUpdateFaultToggles}
        onSwitchToDemo={() => setMode('DEMO')}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <OverviewView
            frame={currentFrame}
            history={history}
            events={events}
            mode={mode}
            onNavigate={setActiveTab}
            recursiveMetrics={recursiveMetrics}
          />
        )}

        {activeTab === 'live-monitoring' && (
          <LiveMonitoringView frame={currentFrame} />
        )}

        {activeTab === 'trends' && (
          <TrendsView
            history={history}
            onExportCsv={handleExportCsv}
          />
        )}

        {activeTab === 'irrigation' && (
          <IrrigationView
            frame={currentFrame}
            logs={irrigationLogs}
          />
        )}

        {activeTab === 'diagnostics' && (
          <DiagnosticsView
            frame={currentFrame}
            events={events}
            polymorphicSummary={polymorphicSummary}
            recursiveMetrics={recursiveMetrics}
            linkedListMetrics={linkedListMetrics}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            frame={currentFrame}
            mode={mode}
            onToggleMode={handleToggleMode}
          />
        )}
      </main>

      {/* Industrial Footer (Clean, unboxed metadata, zero decorative orbs or tickers) */}
      <footer className="bg-white border-t border-[#DCE3E7] py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Smart Concrete Curing Monitor</span>
            <span>·</span>
            <span>Automated Water Irrigation Supervisory System</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span>DEC-001 (Protocol Gated)</span>
            <span>·</span>
            <span>DEC-002 (Moisture Integrity)</span>
            <span>·</span>
            <span>DEC-005 (Read-Only Safety)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
