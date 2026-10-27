import React from 'react';
import { TelemetryFrame, SensorReading } from '../../types/telemetry';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Cpu, 
  HelpCircle,
  Hash,
  Compass
} from 'lucide-react';

interface LiveMonitoringViewProps {
  frame: TelemetryFrame | null;
}

export const LiveMonitoringView: React.FC<LiveMonitoringViewProps> = ({ frame }) => {
  if (!frame) {
    return (
      <div className="bg-white border border-[#DCE3E7] rounded-lg p-12 text-center text-slate-500">
        <Clock className="w-8 h-8 text-slate-400 mx-auto mb-3 animate-spin" />
        <h3 className="text-base font-semibold text-slate-800">Awaiting live telemetry packet...</h3>
      </div>
    );
  }

  const { sensors } = frame;

  const sensorCards: Array<{
    sensor: SensorReading<number | null>;
    location: string;
    protocol: string;
    description: string;
    diagnosticNotes: string;
  }> = [
    {
      sensor: sensors.tempCore,
      location: 'Internal Concrete Core (Embedded at 50mm depth)',
      protocol: '1-Wire Digital Bus (DS18B20 12-bit ADC)',
      description: 'Measures adiabatic hydration heat accumulation in the structural core.',
      diagnosticNotes: 'Reading passed configured temperature range validation.',
    },
    {
      sensor: sensors.tempSurface,
      location: 'Upper Slab Surface Boundary Layer (Direct Contact)',
      protocol: '1-Wire Digital Bus (DS18B20 12-bit ADC)',
      description: 'Measures outer boundary temperature subjected to ambient cooling and evaporation.',
      diagnosticNotes:
        sensors.tempSurface.quality === 'UNAVAILABLE'
          ? 'DS18B20 reading unavailable (device returned NA).'
          : 'Reading passed configured temperature range validation.',
    },
    {
      sensor: sensors.ambientTemp,
      location: 'Atmospheric Boundary 1.0m above slab surface',
      protocol: 'Single-Bus Proprietary Digital Protocol (DHT22)',
      description: 'Ambient dry-bulb air temperature driving sensible convective heat flux.',
      diagnosticNotes:
        sensors.ambientTemp.quality === 'UNAVAILABLE'
          ? 'DHT22 ambient temperature reading unavailable.'
          : 'Reading passed configured range validation.',
    },
    {
      sensor: sensors.ambientRh,
      location: 'Atmospheric Boundary 1.0m above slab surface',
      protocol: 'Single-Bus Proprietary Digital Protocol (DHT22)',
      description: 'Relative humidity of ambient air governing vapor pressure deficit.',
      diagnosticNotes:
        sensors.ambientRh.quality === 'UNAVAILABLE'
          ? 'DHT22 ambient humidity reading unavailable.'
          : 'Reading passed configured range validation.',
    },
    {
      sensor: sensors.moisture,
      location: 'Top Surface Mortar Layer (Capacitive Dielectric)',
      protocol: 'ESP32 12-Bit SAR ADC (Channel ADC1_CH6 / GPIO34)',
      description: 'Capacitive dielectric frequency shift based on free water content.',
      diagnosticNotes:
        'Raw counts reflect oscillator frequency. Uncalibrated state active in compliance with DEC-002.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#202B33]">
              Live Sensor Telemetry & Channel Diagnostics
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Detailed inspection of individual sensor communication, physical addresses, signal validity, and raw ADC parameters.
            </p>
          </div>
          <div className="text-xs font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
            FRAME SEQ: <span className="text-slate-900 font-bold">{frame.sequenceNumber}</span> · UPTIME: <span className="text-slate-900 font-bold">{Math.floor(frame.diagnostics.esp32UptimeSeconds / 3600)}h {Math.floor((frame.diagnostics.esp32UptimeSeconds % 3600) / 60)}m</span>
          </div>
        </div>
      </div>

      {/* Sensor Cards Deep Inspection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sensorCards.map(({ sensor, location, protocol, description, diagnosticNotes }) => {
          const isUnavailable = sensor.quality === 'UNAVAILABLE';
          const isUncalibrated = sensor.quality === 'UNCALIBRATED';
          const isInvalid = sensor.quality === 'INVALID';

          return (
            <div
              key={sensor.id}
              className={`bg-white border rounded-lg p-5 flex flex-col justify-between ${
                isUnavailable
                  ? 'border-amber-300 bg-amber-50/15'
                  : isInvalid
                  ? 'border-rose-300 bg-rose-50/15'
                  : 'border-[#DCE3E7]'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 tracking-wider">
                      {sensor.channelLabel}
                    </span>
                  </div>
                  <div>
                    {isUnavailable ? (
                      <span className="text-xs font-mono font-bold text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> UNAVAILABLE
                      </span>
                    ) : isUncalibrated ? (
                      <span className="text-xs font-mono font-bold text-amber-600 flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5" /> UNCALIBRATED
                      </span>
                    ) : isInvalid ? (
                      <span className="text-xs font-mono font-bold text-rose-700 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> INVALID
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> VALID
                      </span>
                    )}
                  </div>
                </div>

                {/* Sensor Title and Location */}
                <div className="mt-3">
                  <h3 className="text-base font-semibold text-slate-900">
                    {sensor.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {location}
                  </p>
                </div>

                {/* Primary Metric Readout */}
                <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-mono text-slate-400 block mb-0.5">
                      LATEST TELEMETRY VALUE
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold font-mono text-slate-900 tabular-nums">
                        {sensor.value !== null
                          ? sensor.value.toFixed(1)
                          : sensor.rawAdc !== undefined
                          ? sensor.rawAdc
                          : '—'}
                      </span>
                      <span className="text-sm font-mono text-slate-600">
                        {sensor.unit}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-xs font-mono text-slate-500">
                    <span>Range Limits:</span>
                    <div className="text-slate-800 font-medium">
                      {sensor.minRange} to {sensor.maxRange} {sensor.unit}
                    </div>
                  </div>
                </div>

                {/* Hardware Spec Strip */}
                <div className="mt-4 space-y-1.5 text-xs text-slate-600 font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">HARDWARE TYPE:</span>
                    <span className="text-slate-800 font-medium">{sensor.hardwareType}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-400">INTERFACE PROTOCOL:</span>
                    <span className="text-slate-800">{protocol}</span>
                  </div>
                  {sensor.hardwareAddress && (
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">1-WIRE ROM ADDRESS:</span>
                      <span className="text-slate-800 font-semibold">{sensor.hardwareAddress}</span>
                    </div>
                  )}
                  {sensor.gpioPin !== undefined && (
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">ESP32 GPIO PIN:</span>
                      <span className="text-slate-800">GPIO {sensor.gpioPin}</span>
                    </div>
                  )}
                  {sensor.rawAdc !== undefined && (
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-400">RAW SAR ADC COUNT:</span>
                      <span className="text-slate-900 font-bold">{sensor.rawAdc} / 4095</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Diagnostic Notes Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
                <span className="font-semibold text-slate-700 block mb-0.5">
                  Channel Diagnostics:
                </span>
                <p className="text-slate-600">
                  {sensor.qualityReason || diagnosticNotes}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Capacitive Moisture Technical Baseline Card */}
      <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-[#167D83]" />
          <h2 className="text-base font-semibold text-slate-900">
            Capacitive Moisture Sensor Calibration Benchmark (DEC-002)
          </h2>
        </div>
        <p className="text-xs text-slate-600 mt-1">
          Capacitive probes measure dielectric permittivity (dielectric constant K ≈ 1 for air, K ≈ 80 for water, K ≈ 4 to 8 for dry concrete).
          A raw ADC reading cannot be linearly converted to volumetric water content without validated 2-point calibration.
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 block">DRY AIR REFERENCE (P1)</span>
            <span className="text-lg font-bold text-slate-800">~ 1,050 ADC</span>
            <span className="text-[11px] text-slate-500 block mt-1">Free air dielectric baseline</span>
          </div>

          <div className="p-3 bg-amber-50 rounded border border-amber-200">
            <span className="text-amber-800 font-semibold block">CURRENT BENCH READING</span>
            <span className="text-lg font-bold text-amber-900">
              {sensors.moisture.rawAdc ?? '—'} ADC
            </span>
            <span className="text-[11px] text-amber-700 block mt-1">Uncalibrated concrete slab contact</span>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-slate-500 block">SATURATED SLAB REFERENCE (P2)</span>
            <span className="text-lg font-bold text-slate-800">~ 2,850 ADC</span>
            <span className="text-[11px] text-slate-500 block mt-1">Ponded concrete calibration target</span>
          </div>
        </div>
      </div>
    </div>
  );
};
