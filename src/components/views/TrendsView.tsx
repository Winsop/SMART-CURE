import React, { useState } from 'react';
import { HistoricalTelemetryPoint } from '../../types/telemetry';
import { TimeSeriesChart, TraceConfig } from '../charts/TimeSeriesChart';
import { 
  LineChart, 
  Download, 
  Calendar, 
  Sliders, 
  BarChart2, 
  Info 
} from 'lucide-react';

interface TrendsViewProps {
  history: HistoricalTelemetryPoint[];
  onExportCsv: () => void;
}

export const TrendsView: React.FC<TrendsViewProps> = ({ history, onExportCsv }) => {
  const [timeRangeHours, setTimeRangeHours] = useState<number>(24);
  const [traces, setTraces] = useState<TraceConfig[]>([
    { key: 'tempCore', label: 'Concrete Core Temp (T1)', color: '#167D83', unit: '°C', visible: true, yAxis: 'left' },
    { key: 'tempSurface', label: 'Concrete Surface Temp (T2)', color: '#2B455A', unit: '°C', visible: true, yAxis: 'left' },
    { key: 'ambientTemp', label: 'Ambient Air Temp', color: '#D99A36', unit: '°C', visible: true, yAxis: 'left' },
    { key: 'ambientRh', label: 'Ambient RH', color: '#65727C', unit: '%', visible: false, yAxis: 'left' },
    { key: 'moistureAdc', label: 'Moisture Raw ADC', color: '#8A959E', unit: 'ADC', visible: false, yAxis: 'right' },
  ]);

  // Filter history by selected hours
  const filteredHistory = React.useMemo(() => {
    if (history.length === 0) return [];
    const pointsNeeded = Math.min(history.length, Math.round(timeRangeHours * 4));
    return history.slice(-pointsNeeded);
  }, [history, timeRangeHours]);

  // Compute summary stats
  const stats = React.useMemo(() => {
    if (filteredHistory.length === 0) return null;

    const coreVals = filteredHistory.map((h) => h.tempCore).filter((v): v is number => v !== null);
    const surfaceVals = filteredHistory.map((h) => h.tempSurface).filter((v): v is number => v !== null);
    const ambVals = filteredHistory.map((h) => h.ambientTemp).filter((v): v is number => v !== null);

    const minCore = coreVals.length > 0 ? Math.min(...coreVals) : null;
    const maxCore = coreVals.length > 0 ? Math.max(...coreVals) : null;
    const avgCore = coreVals.length > 0 ? (coreVals.reduce((a, b) => a + b, 0) / coreVals.length).toFixed(1) : null;

    const minSurface = surfaceVals.length > 0 ? Math.min(...surfaceVals) : null;
    const maxSurface = surfaceVals.length > 0 ? Math.max(...surfaceVals) : null;

    // Thermal delta max observed
    let maxDelta = 0;
    filteredHistory.forEach((h) => {
      if (h.tempCore !== null && h.tempSurface !== null) {
        const d = Math.abs(h.tempCore - h.tempSurface);
        if (d > maxDelta) maxDelta = d;
      }
    });

    return {
      minCore,
      maxCore,
      avgCore,
      minSurface,
      maxSurface,
      maxDelta: maxDelta > 0 ? maxDelta.toFixed(1) : '—',
      pointCount: filteredHistory.length,
    };
  }, [filteredHistory]);

  const toggleTrace = (key: string) => {
    setTraces((prev) =>
      prev.map((t) => (t.key === key ? { ...t, visible: !t.visible } : t))
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Range Controls */}
      <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#202B33]">
              Trends & Historical Telemetry
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Time-series observations of concrete core hydration, slab boundary temperature, and atmospheric evaporative forcing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Time range selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-md border border-slate-200">
              {[
                { hours: 1, label: '1 Hour' },
                { hours: 6, label: '6 Hours' },
                { hours: 24, label: '24 Hours' },
              ].map((r) => (
                <button
                  key={r.hours}
                  onClick={() => setTimeRangeHours(r.hours)}
                  className={`px-3 py-1 text-xs font-semibold rounded transition-colors whitespace-nowrap ${
                    timeRangeHours === r.hours
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* CSV Export Button */}
            <button
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#172B3A] hover:bg-[#203748] rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Canvas Panel */}
      <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-[#167D83]" />
            <h2 className="text-base font-semibold text-slate-900">
              Multi-Channel Thermal Profile
            </h2>
          </div>

          {/* Trace selection checkboxes */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {traces.map((trace) => (
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

        <TimeSeriesChart data={filteredHistory} traces={traces} height={340} />
      </div>

      {/* Statistical Summary Grid */}
      {stats && (
        <div className="bg-white border border-[#DCE3E7] rounded-lg p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-5 h-5 text-[#167D83]" />
            <h2 className="text-base font-semibold text-slate-900">
              Statistical Summary for Selected Window ({timeRangeHours}h · {stats.pointCount} Telemetry Points)
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block">CORE TEMP (PEAK / LOW)</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                {stats.maxCore ?? '—'}°C / {stats.minCore ?? '—'}°C
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Avg: {stats.avgCore ?? '—'}°C
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block">SURFACE TEMP (RANGE)</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                {stats.maxSurface ?? '—'}°C / {stats.minSurface ?? '—'}°C
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                DS18B20 Surface probe
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block">MAX THERMAL GRADIENT (ΔT)</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                {stats.maxDelta} °C
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Permissible: ≤ 20.0°C
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded border border-slate-200">
              <span className="text-slate-500 block">TIME RESOLUTION</span>
              <span className="text-base font-bold text-slate-900 mt-1 block">
                15 min
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Synchronized sampling
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
