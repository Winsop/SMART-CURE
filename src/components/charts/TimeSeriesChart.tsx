import React, { useState, useId } from 'react';
import { HistoricalTelemetryPoint } from '../../types/telemetry';

export interface TraceConfig {
  key: 'tempCore' | 'tempSurface' | 'ambientTemp' | 'ambientRh' | 'moistureAdc';
  label: string;
  color: string;
  unit: string;
  visible: boolean;
  yAxis: 'left' | 'right'; // left for temp/RH (0-100), right for ADC (0-4095)
}

interface TimeSeriesChartProps {
  data: HistoricalTelemetryPoint[];
  traces: TraceConfig[];
  height?: number;
  showLegend?: boolean;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  traces,
  height = 320,
  showLegend = true,
}) => {
  const chartId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div 
        style={{ height }} 
        className="w-full flex flex-col items-center justify-center bg-white border border-[#DCE3E7] rounded-lg text-slate-500 text-sm"
      >
        <span className="font-semibold text-slate-700">No telemetry records available</span>
        <span className="text-xs text-slate-400 mt-1">Awaiting data ingestion or historical query response</span>
      </div>
    );
  }

  // Layout boundaries
  const padding = { top: 20, right: 55, bottom: 35, left: 45 };
  const width = 800; // SVG viewBox coordinates
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Left axis range (Temperature °C & RH %: 0 to 100 or auto-scale around 20-50 for temperature)
  const leftMin = 15;
  const leftMax = 45;

  // Right axis range for raw ADC (0 to 4095)
  const rightMin = 1500;
  const rightMax = 3200;

  // Scale helpers
  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (index / (data.length - 1)) * innerWidth;
  };

  const getLeftY = (val: number | null) => {
    if (val === null) return null;
    const clamped = Math.max(leftMin, Math.min(leftMax, val));
    const ratio = (clamped - leftMin) / (leftMax - leftMin);
    return padding.top + innerHeight - ratio * innerHeight;
  };

  const getRightY = (val: number | null) => {
    if (val === null) return null;
    const clamped = Math.max(rightMin, Math.min(rightMax, val));
    const ratio = (clamped - rightMin) / (rightMax - rightMin);
    return padding.top + innerHeight - ratio * innerHeight;
  };

  // Generate SVG path for a trace
  const generatePath = (trace: TraceConfig): string => {
    let path = '';
    let inSegment = false;

    data.forEach((pt, i) => {
      const val = pt[trace.key];
      const y = trace.yAxis === 'right' ? getRightY(val) : getLeftY(val);

      if (y !== null) {
        const x = getX(i);
        if (!inSegment) {
          path += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
          inSegment = true;
        } else {
          path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        }
      } else {
        inSegment = false;
      }
    });

    return path;
  };

  // Selected hover point
  const hoverPoint = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden bg-white border border-[#DCE3E7] rounded-lg p-2 sm:p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * width;
            if (mouseX >= padding.left && mouseX <= width - padding.right) {
              const relX = mouseX - padding.left;
              const idx = Math.round((relX / innerWidth) * (data.length - 1));
              setHoverIndex(Math.max(0, Math.min(data.length - 1, idx)));
            }
          }}
        >
          {/* Horizontal grid lines for left axis (Temp) */}
          {[20, 25, 30, 35, 40].map((tick) => {
            const y = getLeftY(tick);
            if (y === null) return null;
            return (
              <g key={`grid-${tick}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#E9ECEF"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] fill-[#65727C] font-mono"
                >
                  {tick}°C
                </text>
              </g>
            );
          })}

          {/* Right axis ticks (ADC) */}
          {[1800, 2300, 2800].map((adcTick) => {
            const y = getRightY(adcTick);
            if (y === null) return null;
            return (
              <text
                key={`adc-tick-${adcTick}`}
                x={width - padding.right + 8}
                y={y + 3}
                textAnchor="start"
                className="text-[10px] fill-[#8A959E] font-mono"
              >
                {adcTick}
              </text>
            );
          })}

          {/* Time axis ticks (bottom) */}
          {data.length > 0 &&
            [0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor((3 * data.length) / 4), data.length - 1].map(
              (idx) => {
                const pt = data[idx];
                if (!pt) return null;
                const x = getX(idx);
                const d = new Date(pt.timestamp);
                const timeStr = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
                return (
                  <g key={`time-${idx}`}>
                    <line
                      x1={x}
                      y1={padding.top + innerHeight}
                      x2={x}
                      y2={padding.top + innerHeight + 5}
                      stroke="#AAB5BC"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={padding.top + innerHeight + 18}
                      textAnchor="middle"
                      className="text-[10px] fill-[#65727C] font-mono"
                    >
                      {timeStr}
                    </text>
                  </g>
                );
              }
            )}

          {/* Render lines for active visible traces */}
          {traces
            .filter((t) => t.visible)
            .map((trace) => {
              const d = generatePath(trace);
              if (!d) return null;
              return (
                <path
                  key={trace.key}
                  d={d}
                  fill="none"
                  stroke={trace.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

          {/* Crosshair on hover */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={padding.top + innerHeight}
                stroke="#172B3A"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {traces
                .filter((t) => t.visible)
                .map((trace) => {
                  if (!hoverPoint) return null;
                  const val = hoverPoint[trace.key];
                  const y = trace.yAxis === 'right' ? getRightY(val) : getLeftY(val);
                  if (y === null) return null;
                  return (
                    <circle
                      key={`dot-${trace.key}`}
                      cx={getX(hoverIndex)}
                      cy={y}
                      r="4"
                      fill={trace.color}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  );
                })}
            </g>
          )}
        </svg>

        {/* Tabular tooltip on hover */}
        {hoverPoint && (
          <div className="mt-2 pt-2 border-t border-[#DCE3E7] flex flex-wrap items-center justify-between text-xs text-[#202B33] gap-2 font-mono">
            <div className="text-slate-500">
              <span className="font-semibold text-slate-800">Time:</span>{' '}
              {new Date(hoverPoint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {traces
                .filter((t) => t.visible)
                .map((t) => {
                  const val = hoverPoint[t.key];
                  return (
                    <div key={`tip-${t.key}`} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: t.color }} />
                      <span className="text-slate-600">{t.label}:</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {val !== null ? `${val} ${t.unit}` : 'UNAVAILABLE'}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Axis annotations and legend */}
      {showLegend && (
        <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-slate-500 px-1">
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-slate-600 font-medium">Left Axis: Temp (°C) / RH (%)</span>
            <span className="text-[11px] text-slate-600 font-medium">Right Axis: Moisture (ADC 0-4095)</span>
          </div>
          <div className="text-[11px] text-slate-600">
            Click labels in legend to toggle traces
          </div>
        </div>
      )}
    </div>
  );
};
