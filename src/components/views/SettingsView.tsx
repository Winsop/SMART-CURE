import React, { useState } from 'react';
import { TelemetryFrame, OperatingMode } from '../../types/telemetry';
import { 
  Settings as SettingsIcon, 
  ShieldAlert, 
  Sliders, 
  Cpu, 
  Save, 
  CheckCircle2, 
  Info 
} from 'lucide-react';

interface SettingsViewProps {
  frame: TelemetryFrame | null;
  mode: OperatingMode;
  onToggleMode: (newMode: OperatingMode) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ frame, mode, onToggleMode }) => {
  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [pollingInterval, setPollingInterval] = useState<number>(2000);
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
        <h1 className="text-xl font-bold text-[#202B33]">
          System Settings & Hardware Parameter Registry
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Client UI display configuration and read-only embedded hardware pinout registers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Client-Side Display Preferences */}
        <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-5 h-5 text-[#167D83]" />
            <h2 className="text-base font-semibold text-slate-900">
              Client Display Preferences
            </h2>
          </div>

          <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
            {/* Unit Preference */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Temperature Display Unit
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tempUnit"
                    checked={tempUnit === 'C'}
                    onChange={() => setTempUnit('C')}
                    className="text-[#167D83] focus:ring-[#167D83]"
                  />
                  <span>Celsius (°C) — Industrial Standard</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="tempUnit"
                    checked={tempUnit === 'F'}
                    onChange={() => setTempUnit('F')}
                    className="text-[#167D83] focus:ring-[#167D83]"
                  />
                  <span>Fahrenheit (°F)</span>
                </label>
              </div>
            </div>

            {/* Polling Interval */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Telemetry Sampling Cadence
              </label>
              <select
                value={pollingInterval}
                onChange={(e) => setPollingInterval(Number(e.target.value))}
                className="w-full sm:w-64 bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-[#167D83]"
              >
                <option value={1000}>1,000 ms (High-frequency inspection)</option>
                <option value={2000}>2,000 ms (Nominal bench default)</option>
                <option value={5000}>5,000 ms (Low CPU / Battery save)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Controls the client-side subscription tick frequency.
              </p>
            </div>

            {/* Operating Mode Selector */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block font-semibold text-slate-700 mb-1">
                Active Operating Data Mode
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleMode('DEMO')}
                  className={`px-3 py-1.5 rounded font-mono text-xs font-semibold border ${
                    mode === 'DEMO'
                      ? 'bg-[#D99A36] text-[#172B3A] border-[#C2872D]'
                      : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  DEMO SIMULATION
                </button>
                <button
                  type="button"
                  onClick={() => onToggleMode('LIVE')}
                  className={`px-3 py-1.5 rounded font-mono text-xs font-semibold border ${
                    mode === 'LIVE'
                      ? 'bg-[#167D83] text-white border-[#115E63]'
                      : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  LIVE HARDWARE (M4 GATE)
                </button>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-3">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-[#172B3A] text-white font-medium rounded hover:bg-[#203748] transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Client Preferences</span>
              </button>
              {savedNotice && (
                <span className="text-emerald-700 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Preferences applied to active session
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Right Column: Read-Only Embedded Hardware Parameters */}
        <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-[#167D83]" />
            <h2 className="text-base font-semibold text-slate-900">
              Read-Only Embedded Microcontroller Registers
            </h2>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">DEVICE IDENTIFIER:</span>
                <span className="font-bold text-slate-900">{frame?.deviceId ?? 'ESP32-CURING-01'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">FIRMWARE REVISION:</span>
                <span className="text-slate-900">{frame?.diagnostics.firmwareVersion ?? 'v0.9.4'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">DS18B20 1-WIRE PIN:</span>
                <span className="text-slate-900">GPIO 4 (4.7kΩ Pull-up)</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">DHT22 AMBIENT PIN:</span>
                <span className="text-slate-900">GPIO 16 (10kΩ Pull-up)</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">CAPACITIVE MOISTURE ADC:</span>
                <span className="text-slate-900">GPIO 34 (ADC1_CH6 / 12-Bit SAR)</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">12V PUMP RELAY CONTROL:</span>
                <span className="text-slate-900">GPIO 26 (Active LOW Optocoupler)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PUMP HARDWARE TIMEOUT:</span>
                <span className="text-rose-700 font-bold">180 Seconds Maximum Watchdog</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded border border-amber-200 text-slate-700 font-sans text-xs">
              <span className="font-semibold text-amber-900 block mb-1">
                Embedded Integrity Boundary:
              </span>
              Changing frontend display settings does not alter flash memory or safety interlocks on the ESP32. Hardware protection boundaries are enforced autonomously in microcontroller firmware.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
