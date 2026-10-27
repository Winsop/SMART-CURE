import React from 'react';
import { TelemetryFrame, IrrigationLogEntry } from '../../types/telemetry';
import { 
  Droplets, 
  ShieldCheck, 
  AlertCircle, 
  Clock, 
  Zap, 
  Power, 
  CheckCircle2, 
  Lock,
  Layers
} from 'lucide-react';

interface IrrigationViewProps {
  frame: TelemetryFrame | null;
  logs: IrrigationLogEntry[];
}

export const IrrigationView: React.FC<IrrigationViewProps> = ({ frame, logs }) => {
  if (!frame) {
    return (
      <div className="bg-white border border-[#DCE3E7] rounded-lg p-12 text-center text-slate-500">
        <Clock className="w-8 h-8 text-slate-400 mx-auto mb-3 animate-spin" />
        <h3 className="text-base font-semibold text-slate-800">Awaiting actuator state...</h3>
      </div>
    );
  }

  const { actuator } = frame;
  const isPumpActive = actuator.pumpState === 'ACTIVE';

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#202B33]">
              Irrigation Activity & Actuator Supervisory Audit
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Autonomous water pump relay cycles, duration auditing, and embedded controller decision rationale.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded border border-slate-200 text-xs font-mono text-slate-700">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <span>DEC-005 COMPLIANT: READ-ONLY SUPERVISORY INTERFACE</span>
          </div>
        </div>
      </div>

      {/* Actuator Status & Decision Hero Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card 1: Live Commanded Pump State */}
        <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-xs font-semibold text-[#167D83]">
                ACTUATOR RELAY #1 (12V)
              </span>
              <span
                className={`font-mono text-xs font-bold px-2 py-0.5 rounded-sm ${
                  isPumpActive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                ● {actuator.pumpState}
              </span>
            </div>

            <div className="mt-4">
              <span className="text-xs font-mono text-slate-400 block mb-1">
                COMMANDED RELAY STATE
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-mono text-slate-900">
                  {isPumpActive ? 'IRRIGATING' : 'STANDBY'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">CURRENT CYCLE:</span>
              <span className="font-bold text-slate-900">
                {isPumpActive ? `${actuator.currentCycleDurationSeconds} s` : '0 s'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">HARDWARE TIMEOUT:</span>
              <span className="text-slate-800">{actuator.safetyTimeoutSeconds} s maximum</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">TOTAL LIFETIME RUN:</span>
              <span className="text-slate-800">{actuator.totalRunTimeSeconds} s</span>
            </div>
          </div>
        </div>

        {/* Card 2: Controller Decision Rationale */}
        <div className="bg-white border border-[#DCE3E7] rounded-lg p-5 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#167D83]" />
              <h2 className="text-base font-semibold text-slate-900">
                Autonomous Controller Decision & Audit Reason
              </h2>
            </div>

            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded text-xs">
              <span className="font-mono text-[11px] text-slate-400 block uppercase mb-1">
                Active Policy Evaluation
              </span>
              <p className="text-sm font-medium text-slate-900 leading-relaxed">
                "{actuator.lastTriggerReason}"
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="font-semibold text-slate-800 block mb-0.5">
                  Sense → Decide → Irrigate Cycle:
                </span>
                Embedded ESP32 firmware continuously samples slab boundary conditions, verifies interlock timers, and commands the 12V relay.
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-100">
                <span className="font-semibold text-slate-800 block mb-0.5">
                  Flow & Reservoir Instrumentation:
                </span>
                No digital water flow meter or reservoir level sensor is installed in current hardware. Water volume metrics are omitted to prevent fabrication.
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Last Cycle Event: {new Date(actuator.lastCycleTimestamp).toLocaleString()}</span>
            <span className="font-mono text-emerald-700">Safety Interlocks: ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Historical Irrigation Cycles Table */}
      <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-[#167D83]" />
            <h2 className="text-base font-semibold text-slate-900">
              Irrigation Cycles & Autonomous Trigger Log
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {logs.length} Recorded Controller Events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#DCE3E7] bg-slate-50 text-slate-600 font-mono">
                <th className="py-2.5 px-3 font-semibold">TIMESTAMP (UTC)</th>
                <th className="py-2.5 px-3 font-semibold">EVENT TYPE</th>
                <th className="py-2.5 px-3 font-semibold">DURATION</th>
                <th className="py-2.5 px-3 font-semibold">MOISTURE ADC</th>
                <th className="py-2.5 px-3 font-semibold">SURFACE TEMP</th>
                <th className="py-2.5 px-3 font-semibold">DECISION REASON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap font-bold">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        log.eventType === 'TRIGGER'
                          ? 'bg-blue-50 text-blue-800'
                          : log.eventType === 'SHUTOFF'
                          ? 'bg-slate-100 text-slate-800'
                          : log.eventType === 'INHIBIT'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-rose-50 text-rose-800'
                      }`}
                    >
                      {log.eventType}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {log.durationSeconds > 0 ? `${log.durationSeconds} s` : '—'}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap tabular-nums">
                    {log.moistureAdc} ADC
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap tabular-nums">
                    {log.surfaceTemp !== null ? `${log.surfaceTemp} °C` : '—'}
                  </td>
                  <td className="py-3 px-3 text-slate-800 font-sans text-xs">
                    {log.decisionReason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safety Interlock Architecture Explainer */}
      <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-emerald-700" />
          <h2 className="text-base font-semibold text-slate-900">
            Embedded Hardware Safety Architecture (DEC-005 & DEC-006)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="font-semibold text-slate-800 block mb-1">
              1. Electrical Isolation
            </span>
            The 12V pump uses a separate external power supply and optocoupled relay with flyback diode protection to isolate inductive spikes from the ESP32 5V logic bus.
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="font-semibold text-slate-800 block mb-1">
              2. Maximum Run Timeout (180s)
            </span>
            Firmware watchdog timer shuts off the pump relay after 180 consecutive seconds to prevent pump burnout or water reservoir exhaustion.
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="font-semibold text-slate-800 block mb-1">
              3. Read-Only Web Interface
            </span>
            In compliance with DEC-005, the web application cannot command pump activation. All time-critical actuator logic is executed natively on the embedded microcontroller.
          </div>
        </div>
      </div>
    </div>
  );
};
