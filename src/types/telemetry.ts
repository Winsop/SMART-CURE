/**
 * Core domain types and telemetry models for Smart Concrete Curing Monitor
 */

export type SensorQualityState =
  | 'VALID'          // Reading is present, verified within physical boundaries
  | 'UNAVAILABLE'    // Sensor unreadable (e.g. 1-Wire CRC error, probe disconnected, NA)
  | 'INVALID'        // Reading physically implausible (e.g. out of range)
  | 'STALE'          // Telemetry heartbeat exceeded timeout (>15s)
  | 'UNCALIBRATED';  // Requires physical calibration baseline before valid conversion

export type OperatingMode = 'DEMO' | 'LIVE';

export type PumpCommandedState = 'IDLE' | 'ACTIVE' | 'LOCKOUT' | 'FAULT';

export interface SensorReading<T = number | null> {
  id: string;
  name: string;
  channelLabel: string;
  hardwareType: 'DS18B20' | 'DHT22' | 'Capacitive_ADC' | 'Relay_Feedback';
  value: T;
  unit: string;
  quality: SensorQualityState;
  qualityReason?: string;
  updatedAt: string;
  hardwareAddress?: string;
  gpioPin?: number;
  rawAdc?: number;
  minRange?: number;
  maxRange?: number;
}

export interface ActuatorTelemetry {
  pumpState: PumpCommandedState;
  lastTriggerReason: string;
  totalRunTimeSeconds: number;
  currentCycleDurationSeconds: number;
  lastCycleTimestamp: string;
  safetyTimeoutSeconds: number;
}

export interface DiagnosticTelemetry {
  esp32UptimeSeconds: number;
  freeHeapBytes: number;
  wifiRssi?: number;
  oneWireBusErrors: number;
  dht22Timeouts: number;
  adcNoiseEstimateMv: number;
  firmwareVersion: string;
  supplyVoltage12vEstimated: number;
}

export interface TelemetryFrame {
  version: '1.0.0';
  deviceId: string;
  sequenceNumber: number;
  timestamp: string;
  sensors: {
    tempCore: SensorReading<number | null>;      // DS18B20 #1
    tempSurface: SensorReading<number | null>;   // DS18B20 #2
    ambientTemp: SensorReading<number | null>;   // DHT22
    ambientRh: SensorReading<number | null>;     // DHT22
    moisture: SensorReading<number | null>;      // Capacitive ADC
  };
  actuator: ActuatorTelemetry;
  diagnostics: DiagnosticTelemetry;
}

export interface IrrigationLogEntry {
  id: string;
  timestamp: string;
  eventType: 'TRIGGER' | 'SHUTOFF' | 'INHIBIT' | 'TIMEOUT';
  durationSeconds: number;
  decisionReason: string;
  moistureAdc: number;
  surfaceTemp: number | null;
  ambientRh: number | null;
}

export interface ControllerEvent {
  id: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  category: 'IRRIGATION' | 'SENSOR' | 'COMMUNICATION' | 'SAFETY';
  message: string;
  channelId?: string;
}

export interface HistoricalTelemetryPoint {
  timestamp: string;
  tempCore: number | null;
  tempSurface: number | null;
  ambientTemp: number | null;
  ambientRh: number | null;
  moistureAdc: number | null;
  pumpActive: boolean;
}
