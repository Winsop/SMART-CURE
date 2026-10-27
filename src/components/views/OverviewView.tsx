import React, { useState } from 'react';
import { 
  TelemetryFrame, 
  HistoricalTelemetryPoint, 
  ControllerEvent, 
  OperatingMode 
} from '../../types/telemetry';
import { RecursiveDiagnosticMetrics } from '../../algorithms/analyzeSensorEvents';
import { TimeSeriesChart, TraceConfig } from '../charts/TimeSeriesChart';
import { 
  Thermometer, 
  Droplet, 
  Wind, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap, 
  Scale, 
  Info,
  ArrowRight
} from 'lucide-react';

interface OverviewViewProps {
  frame: TelemetryFrame | null;
  history: HistoricalTelemetryPoint[];
  events: ControllerEvent[];
  mode: OperatingMode;
  onNavigate: (tab: any) => void;
  recursiveMetrics?: RecursiveDiagnosticMetrics | null;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  frame,
  history,
  events,
  mode,
  onNavigate,
  recursiveMetrics,
}) => {
  const [activeTraces, setActiveTraces] = useState<TraceConfig[]>([
    { key: 'tempCore', label: 'Concrete Core (T1)', color: '#167D83', unit: '°C', visible: true, yAxis: 'left' },
    { key: 'tempSurface', label: 'Concrete Surface (T2)', color: '#2B455A', unit: '°C', visible: true, yAxis: 'left' },
    { key: 'ambientTemp', label: 'Ambient Air', color: '#D99A36', unit: '°C', visible: true, yAxis: 'left' },
    { key: 'ambientRh', label: 'Ambient RH', color: '#65727C', unit: '%', visible: false, yAxis: 'left' },
  ]);

  if (!frame) {
    return (
      <div className="bg-white border border-[#DCE3E7] rounded-lg p-12 text-center text-slate-500">
        <Clock className="w-8 h-8 text-slate-400 mx-auto mb-3 animate-spin" />
        <h3 className="text-base font-semibold text-slate-800">Connecting to telemetry provider...</h3>
        <p className="text-xs text-slate-500 mt-1">Initializing data frames and validating sensor payload integrity.</p>
      </div>
    );
  }

  const { sensors, actuator, diagnostics } = frame;

  // Sensor health counting
  const sensorList = [
    sensors.tempCore,
    sensors.tempSurface,
    sensors.ambientTemp,
    sensors.ambientRh,
    sensors.moisture,
  ];

  const validCount = sensorList.filter((s) => s.quality === 'VALID').length;
  const uncalibratedCount = sensorList.filter((s) => s.quality === 'UNCALIBRATED').length;
  const unavailableCount = sensorList.filter((s) => s.quality === 'UNAVAILABLE').length;
  const invalidCount = sensorList.filter((s) => s.quality === 'INVALID').length;

  // Thermal Gradient calculation
  const coreVal = sensors.tempCore.value;
  const surfaceVal = sensors.tempSurface.value;
  let thermalDelta: number | null = null;
  let deltaState: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'UNAVAILABLE' = 'UNAVAILABLE';
  let deltaMessage = 'Requires both concrete temperature probes';

  if (coreVal !== null && surfaceVal !== null) {
    thermalDelta = Number(Math.abs(coreVal - surfaceVal).toFixed(1));
    if (thermalDelta <= 15) {
      deltaState = 'NORMAL';
      deltaMessage = 'Within safe hydration gradient (ACI 207 limit ≤ 20°C)';
    } else if (thermalDelta <= 20) {
      deltaState = 'WARNING';
      deltaMessage = 'Approaching thermal shock limit (ΔT > 15°C)';
    } else {
      deltaState = 'CRITICAL';
      deltaMessage = 'Exceeds maximum cracking gradient (ΔT > 20°C)';
    }
  }

  // System Operating State evaluation
  let systemState: 'NOMINAL' | 'ATTENTION' | 'FAULT' = 'NOMINAL';
  let systemStateReason = 'All primary thermal channels healthy and telemetry streaming';

  if (unavailableCount > 0 || invalidCount > 0) {
    systemState = unavailableCount >= 2 ? 'FAULT' : 'ATTENTION';
    systemStateReason = `${unavailableCount} sensor channel unavailable. Inspect physical probe connection.`;
  } else if (actuator.pumpState === 'FAULT') {
    systemState = 'FAULT';
    systemStateReason = 'Irrigation pump relay fault or feedback mismatch detected.';
  }

  const toggleTrace = (key: string) => {
    setActiveTraces((prev) =>
      prev.map((t) => (t.key === key ? { ...t, visible: !t.visible } : t))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header Summary Strip */}
      <div className="bg-white border border-[#DCE3E7] rounded-lg p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#202B33] tracking-tight">
                System Overview & Curing Telemetry
              </h1>
              <span className="text-xs text-slate-400 font-mono">
                {frame.deviceId}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time thermal kinetics, ambient evaporation parameters, and autonomous irrigation status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400">LAST UPDATE:</span>{' '}
              <span className="text-slate-800 font-bold tabular-nums">
                {new Date(frame.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div>
              <span className="text-slate-400">SYSTEM STATE:</span>{' '}
              <span
                className={`font-bold ${
                  systemState === 'NOMINAL'
                    ? 'text-emerald-700'
                    : systemState === 'ATTENTION'
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}
              >
                ● {systemState}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200" />
            <div className="text-slate-600">
              <span className="text-emerald-700 font-bold">{validCount}</span> Valid ·{' '}
              <span className="text-amber-600 font-bold">{uncalibratedCount}</span> Uncal ·{' '}
              <span className="text-rose-600 font-bold">{unavailableCount}</span> Unavail
            </div>
          </div>
        </div>
      </div>

      {/* Primary Sensor Metric Tiles (Grid 4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Concrete Core Temp (DS18B20 #1) */}
        <div className="bg-white border border-[#DCE3E7] rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px] font-semibold text-[#167D83] tracking-wide">
                {sensors.tempCore.channelLabel}
              </span>
              <span className="font-semibold text-emerald-700 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> VALID
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mt-1">
              {sensors.tempCore.name}
            </h3>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
                {sensors.tempCore.value !== null ? sensors.tempCore.value.toFixed(1) : '—'}
              </span>
              <span className="text-sm font-mono text-slate-500">°C</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Internal slab exothermic hydration point
          </div>
        </div>

        {/* Metric 2: Concrete Surface Temp (DS18B20 #2) */}
        <div
          className={`bg-white border rounded-lg p-4 flex flex-col justify-between ${
            sensors.tempSurface.quality === 'UNAVAILABLE'
              ? 'border-amber-300 bg-amber-50/20'
              : 'border-[#DCE3E7]'
          }`}
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px] font-semibold text-[#202B33] tracking-wide">
                {sensors.tempSurface.channelLabel}
              </span>
              {sensors.tempSurface.quality === 'UNAVAILABLE' ? (
                <span className="font-semibold text-amber-700 text-[11px] flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> UNAVAILABLE
                </span>
              ) : (
                <span className="font-semibold text-emerald-700 text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> VALID
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mt-1">
              {sensors.tempSurface.name}
            </h3>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
                {sensors.tempSurface.value !== null ? sensors.tempSurface.value.toFixed(1) : '—'}
              </span>
              <span className="text-sm font-mono text-slate-500">°C</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            {sensors.tempSurface.quality === 'UNAVAILABLE' ? (
              <span className="text-amber-800 font-medium">
                Hardware: 1-Wire CRC error / Device returned NA
              </span>
            ) : (
              'Surface boundary layer temperature'
            )}
          </div>
        </div>

        {/* Metric 3: Ambient Weather (DHT22) */}
        <div className="bg-white border border-[#DCE3E7] rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px] font-semibold text-[#D99A36] tracking-wide">
                AMBIENT DUAL · DHT22
              </span>
              <span className="font-semibold text-emerald-700 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> VALID
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mt-1">
              Ambient Air Temp & Humidity
            </h3>

            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
                  {sensors.ambientTemp.value !== null ? sensors.ambientTemp.value.toFixed(1) : '—'}
                </span>
                <span className="text-sm font-mono text-slate-500 ml-1">°C</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold font-mono text-slate-700 tabular-nums">
                  {sensors.ambientRh.value !== null ? sensors.ambientRh.value.toFixed(1) : '—'}
                </span>
                <span className="text-xs font-mono text-slate-500 ml-1">% RH</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Evaporative boundary condition (ambient drying force)
          </div>
        </div>

        
        {/* Metric 4: Moisture (Capacitive Probe) */}
        <div className="bg-white border border-[#DCE3E7] rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px] font-semibold text-[#202B33] tracking-wide">
                {sensors.moisture.channelLabel}
              </span>
              <span
                className={`font-semibold text-[11px] flex items-center gap-1 ${
                  sensors.moisture.quality === 'VALID'
                    ? 'text-emerald-700'
                    : sensors.moisture.quality === 'INVALID'
                      ? 'text-rose-700'
                      : 'text-amber-700'
                }`}
              >
                {sensors.moisture.quality === 'VALID' ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                {sensors.moisture.quality === 'VALID'
                  ? 'INDEX AVAILABLE'
                  : sensors.moisture.quality === 'INVALID'
                    ? 'INVALID'
                    : 'UNAVAILABLE'}
              </span>
            </div>

            <h3 className="text-sm font-semibold text-slate-800 mt-1">
              Moisture Index
            </h3>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
                {sensors.moisture.value !== null
                  ? sensors.moisture.value
                  : '—'}
              </span>
              <span className="text-sm font-mono text-slate-500">%</span>
            </div>

            <div className="mt-2 text-xs text-slate-500 font-mono">
              Raw ADC: {sensors.moisture.rawAdc ?? '—'} / 4095
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
            Relative moisture index from calibrated dry/wet ADC endpoints; not a validated concrete moisture-content percentage.
          </div>
        </div>
      </div>

      {/* Dual Row: Thermal Gradient Check & Pump Actuator Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Thermal Gradient (ΔT) Card */}
        <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#167D83]" />
              <h2 className="text-base font-semibold text-slate-900">
                Hydration Thermal Gradient (ΔT)
              </h2>
            </div>
            <span
              className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-sm ${
                deltaState === 'NORMAL'
                  ? 'bg-emerald-50 text-emerald-800'
                  : deltaState === 'WARNING'
                  ? 'bg-amber-50 text-amber-800'
                  : deltaState === 'CRITICAL'
                  ? 'bg-rose-50 text-rose-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {deltaState}
            </span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-4xl font-bold font-mono text-slate-900 tabular-nums">
              {thermalDelta !== null ? `${thermalDelta} °C` : '—'}
            </span>
            <span className="text-xs text-slate-500">
              Differential = |T_core - T_surface|
            </span>
          </div>

          <p className="text-xs text-slate-600 mt-2">
            {deltaMessage}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Critical cracking limit: ≤ 20.0°C (CIRIA C660 / ACI 207)</span>
            <button
              onClick={() => onNavigate('live-monitoring')}
              className="text-[#167D83] hover:underline flex items-center gap-1 font-medium"
            >
              Inspect probes <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Pump Actuator Status Card */}
        <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#167D83]" />
              <h2 className="text-base font-semibold text-slate-900">
                Irrigation Actuator Status
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-sm ${
                  actuator.pumpState === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                RELAY: {actuator.pumpState}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-bold font-mono text-slate-900">
              {actuator.pumpState === 'ACTIVE' ? 'IRRIGATION RUNNING' : 'PUMP STANDBY (IDLE)'}
            </span>
          </div>

          <p className="text-xs text-slate-600 mt-2">
            <span className="font-semibold text-slate-800">Controller Decision:</span>{' '}
            {actuator.lastTriggerReason}
          </p>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Safety timeout: {actuator.safetyTimeoutSeconds}s · Total runtime: {actuator.totalRunTimeSeconds}s
            </span>
            <button
              onClick={() => onNavigate('irrigation')}
              className="text-[#167D83] hover:underline flex items-center gap-1 font-medium"
            >
              View activity log <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Sensor Trend Chart Section */}
      <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Recent Sensor Trends (Hydration History)
            </h2>
            <p className="text-xs text-slate-500">
              Thermal trajectory across concrete core, concrete surface, and ambient air.
            </p>
          </div>

          {/* Trace visibility toggles */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {activeTraces.map((trace) => (
              <button
                key={trace.key}
                onClick={() => toggleTrace(trace.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                  trace.visible
                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                    : 'bg-white border-slate-200 text-slate-400 opacity-60'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-xs"
                  style={{ backgroundColor: trace.visible ? trace.color : '#A0AEC0' }}
                />
                <span>{trace.label}</span>
              </button>
            ))}
          </div>
        </div>

        <TimeSeriesChart data={history} traces={activeTraces} height={280} />
      </div>

      {/* Bottom Split: Curing Condition Assessment & Recent Controller Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Curing Condition Engineering Assessment */}
        <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-[#167D83]" />
            <h2 className="text-base font-semibold text-slate-900">
              Curing Condition Summary & Factor Analysis
            </h2>
          </div>

          <div className="mt-3 space-y-2.5 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-1">
                Hydration Heat Dissipation Rate:
              </span>
              Core temperature at{' '}
              <span className="font-mono font-bold text-slate-900">
                {sensors.tempCore.value ?? '—'}°C
              </span>{' '}
              indicates sustained hydration reaction. Thermal gradient remains stable.
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-1">
                Ambient Moisture Evaporation Risk:
              </span>
              Ambient RH at{' '}
              <span className="font-mono font-bold text-slate-900">
                {sensors.ambientRh.value ?? '—'}%
              </span>{' '}
              with ambient temperature at{' '}
              <span className="font-mono font-bold text-slate-900">
                {sensors.ambientTemp.value ?? '—'}°C
              </span>
              . High relative humidity prevents rapid surface drying, reducing plastic shrinkage risk.
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="font-semibold text-slate-800 block mb-1">
                Maturity & Strength Estimation Notice:
              </span>
              Nurse–Saul concrete maturity calculation is held in{' '}
              <span className="font-mono font-semibold text-slate-800">
                INSUFFICIENT PARAMETERS
              </span>{' '}
              state until continuous calibrated thermal history and mix-specific datum temperature are configured.
            </div>
          </div>
        </div>

        {/* Recent Controller Events & Audit Log */}
        <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Recent Controller Decisions
              </h2>
              {recursiveMetrics && (
                <span className="text-[11px] font-mono text-slate-500 block mt-0.5">
                  Recursive Audit: {recursiveMetrics.maxConsecutiveFailures === 0 ? 'Nominal (0 failure streak)' : `Peak Failure Streak: ${recursiveMetrics.maxConsecutiveFailures} consecutive`}
                </span>
              )}
            </div>
            <button
              onClick={() => onNavigate('diagnostics')}
              className="text-xs text-[#167D83] hover:underline font-medium"
            >
              Full Diagnostics
            </button>
          </div>

          <div className="space-y-2">
            {events.slice(0, 4).map((evt) => (
              <div
                key={evt.id}
                className="p-2.5 rounded border border-slate-100 bg-slate-50 text-xs flex items-start gap-2.5"
              >
                <span
                  className={`mt-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold ${
                    evt.severity === 'WARNING'
                      ? 'bg-amber-100 text-amber-800'
                      : evt.severity === 'CRITICAL'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {evt.category}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800">{evt.message}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
