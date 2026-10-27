import React from 'react';
import { OperatingMode } from '../types/telemetry';
import { DemoFaultToggles } from '../services/telemetrySource';
import { AlertCircle, Sliders, ShieldAlert, Cpu } from 'lucide-react';

interface ModeBannerProps {
  mode: OperatingMode;
  faultToggles: DemoFaultToggles;
  onUpdateFaultToggles: (toggles: DemoFaultToggles) => void;
  onSwitchToDemo: () => void;
}

export const ModeBanner: React.FC<ModeBannerProps> = ({
  mode,
  faultToggles,
  onUpdateFaultToggles,
  onSwitchToDemo,
}) => {
  if (mode === 'LIVE') {
    return (
      <aside aria-label="Operating mode banner" className="bg-[#1B2936] border-b border-[#2C3E4F] text-slate-200 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">
                LIVE HARDWARE MODE: Milestone 4 Protocol Selection Gate Active
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Physical hardware connection is paused pending review of ESP32 firmware interfaces. 
                In compliance with <span className="font-mono text-amber-300">DEC-004</span>, the system will NOT silently substitute synthetic data.
              </p>
            </div>
          </div>
          <button
            onClick={onSwitchToDemo}
            className="px-3 py-1.5 text-xs font-semibold bg-[#D99A36] text-[#172B3A] rounded hover:bg-[#C2872D] transition-colors whitespace-nowrap shrink-0"
          >
            Switch to Demo Mode
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Operating mode banner" className="bg-[#FFF8E6] border-b border-[#F0D597] text-[#5C4212] py-2.5 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#D99A36] shrink-0 mt-0.5" />
          <div>
            <span className="text-xs font-bold text-[#172B3A] tracking-wider uppercase mr-2">
              Demo Simulation Mode:
            </span>
            <span className="text-xs text-[#5C4212]">
              Displaying deterministic concrete hydration telemetry. Moisture percentage is held in uncalibrated state per <span className="font-mono font-semibold">DEC-002</span>.
            </span>
          </div>
        </div>

        {/* Interactive fault test controls */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-semibold text-[#8C6418] uppercase tracking-wider mr-1 flex items-center gap-1">
            <Sliders className="w-3 h-3" /> Test Hardware Faults:
          </span>

          <button
            onClick={() =>
              onUpdateFaultToggles({
                ...faultToggles,
                probe2Disconnected: !faultToggles.probe2Disconnected,
              })
            }
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
              faultToggles.probe2Disconnected
                ? 'bg-[#C54444] text-white border-[#A83232]'
                : 'bg-white text-[#5C4212] border-[#DFC27F] hover:bg-[#F9ECCF]'
            }`}
            title="Simulates the historical bench condition where DS18B20 Probe 2 returns NA"
          >
            Probe #2 {faultToggles.probe2Disconnected ? '[DISCONNECTED]' : '[OK]'}
          </button>

          <button
            onClick={() =>
              onUpdateFaultToggles({
                ...faultToggles,
                unstableAdcNoise: !faultToggles.unstableAdcNoise,
              })
            }
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
              faultToggles.unstableAdcNoise
                ? 'bg-[#C54444] text-white border-[#A83232]'
                : 'bg-white text-[#5C4212] border-[#DFC27F] hover:bg-[#F9ECCF]'
            }`}
            title="Simulates floating SAR ADC pin on disconnected capacitive moisture sensor"
          >
            Moisture ADC {faultToggles.unstableAdcNoise ? '[FLOATING NOISE]' : '[NORMAL]'}
          </button>

          <button
            onClick={() =>
              onUpdateFaultToggles({
                ...faultToggles,
                simulatePumpRun: !faultToggles.simulatePumpRun,
              })
            }
            className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
              faultToggles.simulatePumpRun
                ? 'bg-[#167D83] text-white border-[#115E63]'
                : 'bg-white text-[#5C4212] border-[#DFC27F] hover:bg-[#F9ECCF]'
            }`}
            title="Simulates autonomous pump activation by embedded controller"
          >
            Pump State {faultToggles.simulatePumpRun ? '[ACTIVE]' : '[IDLE]'}
          </button>
        </div>
      </div>
    </aside>
  );
};
