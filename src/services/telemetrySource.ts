/**
 * Transport-independent Telemetry Data Source Interface and Providers
 */

import {
  TelemetryFrame,
  HistoricalTelemetryPoint,
  IrrigationLogEntry,
  ControllerEvent,
} from '../types/telemetry';

export type TelemetryListener = (frame: TelemetryFrame) => void;
export type ConnectionStatusListener = (connected: boolean, statusText: string) => void;

export interface ITelemetryDataSource {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  subscribe(listener: TelemetryListener): () => void;
  subscribeConnection(listener: ConnectionStatusListener): () => void;
  getHistoricalData(rangeHours: number): Promise<HistoricalTelemetryPoint[]>;
  getIrrigationLogs(): Promise<IrrigationLogEntry[]>;
  getControllerEvents(): Promise<ControllerEvent[]>;
}

export interface DemoFaultToggles {
  probe2Disconnected: boolean;    // Simulates historical observed condition: DS18B20 #2 returns NA
  unstableAdcNoise: boolean;       // Simulates floating ADC on moisture channel
  dht22Timeout: boolean;           // Simulates intermittent DHT22 bus timeout
  simulatePumpRun: boolean;        // Simulates active irrigation cycle
}

/**
 * Deterministic Demo Data Provider simulating physical concrete hydration kinetics
 */
export class DemoDataProvider implements ITelemetryDataSource {
  private connected: boolean = false;
  private listeners: Set<TelemetryListener> = new Set();
  private connListeners: Set<ConnectionStatusListener> = new Set();
  private intervalTimer: number | null = null;
  private sequence: number = 1042;
  private uptime: number = 86420; // 24 hours in seconds

  public faultToggles: DemoFaultToggles = {
    probe2Disconnected: false, // can be toggled by user in UI to test NA state
    unstableAdcNoise: false,
    dht22Timeout: false,
    simulatePumpRun: false,
  };

  private historyCache: HistoricalTelemetryPoint[] = [];
  private irrigationLogs: IrrigationLogEntry[] = [];
  private controllerEvents: ControllerEvent[] = [];

  constructor() {
    this.seedDeterministicHistory();
  }

  private seedDeterministicHistory() {
    const points: HistoricalTelemetryPoint[] = [];
    const now = Date.now();
    const totalPoints = 96; // 24 hours of 15-minute points
    const intervalMs = 15 * 60 * 1000;

    for (let i = totalPoints; i >= 0; i--) {
      const time = new Date(now - i * intervalMs);
      const hoursAgo = (now - time.getTime()) / (3600 * 1000);

      // Hydration curve simulation:
      // Peak core hydration heat dissipation curve
      const baseCore = 34.8 - Math.sin(hoursAgo / 6) * 1.5;
      const baseSurface = 30.2 - Math.sin(hoursAgo / 6) * 1.2;
      // Ambient temp and RH (reflecting warm lab bench: ~31.3°C, 88.2% RH)
      const ambTemp = 31.3 + Math.sin(hoursAgo / 4) * 0.8;
      const ambRh = 88.2 - Math.sin(hoursAgo / 4) * 2.1;
      // Capacitive ADC raw count
      const rawAdc = Math.round(2340 + Math.sin(hoursAgo / 3) * 65);
      const isPumpActive = (i % 28 === 0 && i > 0);

      points.push({
        timestamp: time.toISOString(),
        tempCore: Number(baseCore.toFixed(1)),
        tempSurface: Number(baseSurface.toFixed(1)),
        ambientTemp: Number(ambTemp.toFixed(1)),
        ambientRh: Number(ambRh.toFixed(1)),
        moistureAdc: rawAdc,
        pumpActive: isPumpActive,
      });
    }
    this.historyCache = points;

    // Seed realistic controller irrigation logs
    this.irrigationLogs = [
      {
        id: 'irr-log-04',
        timestamp: new Date(now - 42 * 60 * 1000).toISOString(),
        eventType: 'SHUTOFF',
        durationSeconds: 180,
        decisionReason: 'Pump auto-shutoff: 180s maximum cycle duration limit reached.',
        moistureAdc: 2420,
        surfaceTemp: 30.1,
        ambientRh: 87.9,
      },
      {
        id: 'irr-log-03',
        timestamp: new Date(now - 45 * 60 * 1000).toISOString(),
        eventType: 'TRIGGER',
        durationSeconds: 0,
        decisionReason: 'Autonomous cycle initiated: High thermal gradient (ΔT > 4.2°C) and dry surface ADC detected.',
        moistureAdc: 2190,
        surfaceTemp: 30.4,
        ambientRh: 86.8,
      },
      {
        id: 'irr-log-02',
        timestamp: new Date(now - 310 * 60 * 1000).toISOString(),
        eventType: 'SHUTOFF',
        durationSeconds: 150,
        decisionReason: 'Hydration pulse completed: Scheduled maintenance spray interval.',
        moistureAdc: 2450,
        surfaceTemp: 29.8,
        ambientRh: 88.4,
      },
      {
        id: 'irr-log-01',
        timestamp: new Date(now - 480 * 60 * 1000).toISOString(),
        eventType: 'INHIBIT',
        durationSeconds: 0,
        decisionReason: 'Irrigation inhibited: Moisture calibration baseline unverified (DEC-002 safety hold).',
        moistureAdc: 2110,
        surfaceTemp: 29.5,
        ambientRh: 89.0,
      },
    ];

    // Seed events
    this.controllerEvents = [
      {
        id: 'evt-01',
        timestamp: new Date(now - 12 * 60 * 1000).toISOString(),
        severity: 'INFO',
        category: 'COMMUNICATION',
        message: 'ESP32 telemetry frame received. 1-Wire bus CRC verified OK.',
      },
      {
        id: 'evt-02',
        timestamp: new Date(now - 42 * 60 * 1000).toISOString(),
        severity: 'INFO',
        category: 'IRRIGATION',
        message: 'Pump relay switched to IDLE after 180s cycle.',
      },
      {
        id: 'evt-03',
        timestamp: new Date(now - 85 * 60 * 1000).toISOString(),
        severity: 'WARNING',
        category: 'SAFETY',
        message: 'Capacitive moisture probe: Operating in uncalibrated mode. Percentage calculation suppressed.',
        channelId: 'moisture',
      },
      {
        id: 'evt-04',
        timestamp: new Date(now - 190 * 60 * 1000).toISOString(),
        severity: 'INFO',
        category: 'SENSOR',
        message: 'DHT22 ambient reading refreshed: 31.3°C, 88.2% RH.',
        channelId: 'dht22',
      },
    ];
  }

  public async connect(): Promise<void> {
    this.connected = true;
    this.notifyConn(true, 'Demo Simulation Active (Deterministic Engine)');
    this.emitCurrentFrame();
    if (this.intervalTimer) window.clearInterval(this.intervalTimer);
    this.intervalTimer = window.setInterval(() => {
      this.sequence++;
      this.uptime += 2;
      this.emitCurrentFrame();
    }, 2000);
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
    if (this.intervalTimer) {
      window.clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.notifyConn(false, 'Demo Simulation Paused');
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    if (this.connected) {
      listener(this.generateFrame());
    }
    return () => this.listeners.delete(listener);
  }

  public subscribeConnection(listener: ConnectionStatusListener): () => void {
    this.connListeners.add(listener);
    listener(this.connected, this.connected ? 'Demo Simulation Active' : 'Disconnected');
    return () => this.connListeners.delete(listener);
  }

  private notifyConn(status: boolean, msg: string) {
    this.connListeners.forEach((l) => l(status, msg));
  }

  private emitCurrentFrame() {
    const frame = this.generateFrame();
    this.listeners.forEach((l) => l(frame));
  }

  public generateFrame(): TelemetryFrame {
    const nowIso = new Date().toISOString();
    const t = Date.now() / 10000;

    // Small natural jitter for simulated physics
    const coreTempVal = Number((34.2 + Math.sin(t) * 0.15).toFixed(1));
    const surfaceTempBase = Number((29.8 + Math.cos(t) * 0.12).toFixed(1));

    // Handle fault toggle for Probe 2 (simulating observed NA condition)
    const surfaceIsUnavailable = this.faultToggles.probe2Disconnected;
    const surfaceTempVal = surfaceIsUnavailable ? null : surfaceTempBase;

    // Handle DHT22 fault toggle
    const dhtIsFault = this.faultToggles.dht22Timeout;
    const ambTempVal = dhtIsFault ? null : Number((31.3 + Math.sin(t * 0.8) * 0.1).toFixed(1));
    const ambRhVal = dhtIsFault ? null : Number((88.2 + Math.cos(t * 0.5) * 0.2).toFixed(1));

    // Capacitive ADC handling
    let adcVal = 2340 + Math.round(Math.sin(t * 1.2) * 15);
    if (this.faultToggles.unstableAdcNoise) {
      adcVal = Math.round(150 + Math.random() * 3800); // erratic floating pin
    }

    const pumpIsActive = this.faultToggles.simulatePumpRun;

    return {
      version: '1.0.0',
      deviceId: 'ESP32-CURING-01 (DEMO)',
      sequenceNumber: this.sequence,
      timestamp: nowIso,
      sensors: {
        tempCore: {
          id: 'temp_core',
          name: 'Concrete Core Temperature',
          channelLabel: 'PROBE 01 · CORE (T1)',
          hardwareType: 'DS18B20',
          value: coreTempVal,
          unit: '°C',
          quality: 'VALID',
          qualityReason: 'Reading passed configured temperature range validation',
          updatedAt: nowIso,
          hardwareAddress: '28-00000712E3B1',
          gpioPin: 4,
          minRange: -10,
          maxRange: 85,
        },
        tempSurface: {
          id: 'temp_surface',
          name: 'Concrete Surface Temperature',
          channelLabel: 'PROBE 02 · SURFACE (T2)',
          hardwareType: 'DS18B20',
          value: surfaceTempVal,
          unit: '°C',
          quality: surfaceIsUnavailable ? 'UNAVAILABLE' : 'VALID',
          qualityReason: surfaceIsUnavailable
            ? 'DS18B20 reading unavailable (device returned NA)'
            : 'Reading passed configured temperature range validation',
          updatedAt: nowIso,
          hardwareAddress: '28-00000712E3F8',
          gpioPin: 4,
          minRange: -10,
          maxRange: 85,
        },
        ambientTemp: {
          id: 'ambient_temp',
          name: 'Ambient Air Temperature',
          channelLabel: 'CHANNEL A · AMBIENT TEMP',
          hardwareType: 'DHT22',
          value: ambTempVal,
          unit: '°C',
          quality: dhtIsFault ? 'UNAVAILABLE' : 'VALID',
          qualityReason: dhtIsFault ? 'DHT22 ambient temperature reading unavailable' : 'Reading passed configured range validation',
          updatedAt: nowIso,
          gpioPin: 16,
          minRange: -20,
          maxRange: 60,
        },
        ambientRh: {
          id: 'ambient_rh',
          name: 'Ambient Relative Humidity',
          channelLabel: 'CHANNEL B · AMBIENT RH',
          hardwareType: 'DHT22',
          value: ambRhVal,
          unit: '%',
          quality: dhtIsFault ? 'UNAVAILABLE' : 'VALID',
          qualityReason: dhtIsFault ? 'DHT22 ambient humidity reading unavailable' : 'Reading passed configured range validation',
          updatedAt: nowIso,
          gpioPin: 16,
          minRange: 5,
          maxRange: 100,
        },
        moisture: {
          id: 'moisture',
          name: 'Slab Surface Moisture',
          channelLabel: 'CHANNEL M · CAPACITIVE PROBE',
          hardwareType: 'Capacitive_ADC',
          value: null, // PERCENTAGE IS DELIBERATELY NULL (DEC-002)
          unit: 'ADC',
          quality: this.faultToggles.unstableAdcNoise ? 'INVALID' : 'UNCALIBRATED',
          qualityReason: this.faultToggles.unstableAdcNoise
            ? 'Floating ADC detected: readings exceed stable baseline variance'
            : 'Uncalibrated sensor: Raw ADC active, volumetric percentage requires 2-point calibration (DEC-002)',
          updatedAt: nowIso,
          rawAdc: adcVal,
          gpioPin: 34,
          minRange: 0,
          maxRange: 4095,
        },
      },
      actuator: {
        pumpState: pumpIsActive ? 'ACTIVE' : 'IDLE',
        lastTriggerReason: pumpIsActive
          ? 'Surface hydration spray requested by autonomous moisture evaluator'
          : 'Pump idle: autonomous hydration cycle in standby',
        totalRunTimeSeconds: 1420,
        currentCycleDurationSeconds: pumpIsActive ? 42 : 0,
        lastCycleTimestamp: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
        safetyTimeoutSeconds: 180,
      },
      diagnostics: {
        esp32UptimeSeconds: this.uptime,
        freeHeapBytes: 198420,
        wifiRssi: -58,
        oneWireBusErrors: surfaceIsUnavailable ? 14 : 0,
        dht22Timeouts: dhtIsFault ? 8 : 1,
        adcNoiseEstimateMv: this.faultToggles.unstableAdcNoise ? 480 : 18,
        firmwareVersion: 'ESP32-CURING-v0.9.4-PROTOTYPE',
        supplyVoltage12vEstimated: 12.14,
      },
    };
  }

  public async getHistoricalData(rangeHours: number): Promise<HistoricalTelemetryPoint[]> {
    const pointsNeeded = Math.min(this.historyCache.length, Math.round(rangeHours * 4));
    return this.historyCache.slice(-pointsNeeded);
  }

  public async getIrrigationLogs(): Promise<IrrigationLogEntry[]> {
    return [...this.irrigationLogs];
  }

  public async getControllerEvents(): Promise<ControllerEvent[]> {
    return [...this.controllerEvents];
  }
}

/**
 * Gated Live Hardware Telemetry Data Source
 * Strictly isolates live mode from synthetic data fallback (DEC-004)
 */

export class LiveTelemetryDataSource implements ITelemetryDataSource {
  private connected = false;
  private listeners: Set<TelemetryListener> = new Set();
  private connListeners: Set<ConnectionStatusListener> = new Set();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private sequence = 0;
  private lastFrame: TelemetryFrame | null = null;
  private lastStatusMessage = 'Waiting for the local ESP32 bridge';
  private requestInProgress = false;

  public async connect(): Promise<void> {
    await this.disconnect();
    this.lastStatusMessage = 'Connecting to local ESP32 bridge';
    this.notifyConn(false, this.lastStatusMessage);

    await this.pollOnce();

    this.pollTimer = setInterval(() => {
      void this.pollOnce();
    }, 1000);
  }

  public async disconnect(): Promise<void> {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    this.connected = false;
    this.requestInProgress = false;
    this.lastStatusMessage = 'Disconnected from live hardware';
    this.notifyConn(false, this.lastStatusMessage);
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    if (this.lastFrame && this.connected) listener(this.lastFrame);
    return () => this.listeners.delete(listener);
  }

  public subscribeConnection(listener: ConnectionStatusListener): () => void {
    this.connListeners.add(listener);
    listener(this.connected, this.lastStatusMessage);
    return () => this.connListeners.delete(listener);
  }

  private notifyConn(connected: boolean, message: string): void {
    this.connListeners.forEach((listener) => listener(connected, message));
  }

  private async pollOnce(): Promise<void> {
    if (this.requestInProgress) return;
    this.requestInProgress = true;

    try {
      const response = await fetch('/api/telemetry', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Bridge returned HTTP ${response.status}`);
      }

      const payload: {
        connected: boolean;
        receivedAt: string | null;
        telemetry: {
          deviceId: string;
          receivedAt: string | null;
          uptimeSeconds: number | null;
          ambientTempC: number | null;
          ambientRhPercent: number | null;
          ds1TempC: number | null;
          ds2TempC: number | null;
          ds1Status: string;
          ds2Status: string;
          moistureRawAdc: number | null;
          moisturePercent: number | null;
          moistureStatus: string;
          pumpState: string | null;
          relayGpio: number | null;
          filteredTempC: number | null;
          maturityCHours: number | null;
          readiness: string | null;
        };
      } = await response.json();

      const t = payload.telemetry;
      const now = new Date().toISOString();
      const receivedMs = t.receivedAt ? Date.parse(t.receivedAt) : NaN;
      const fresh = Number.isFinite(receivedMs) && Date.now() - receivedMs <= 10000;
      const available = payload.connected && fresh;

      if (!available) {
        this.connected = false;
        this.lastStatusMessage = payload.connected
          ? 'Serial data is stale; waiting for fresh ESP32 readings'
          : 'ESP32 bridge is running, but serial is disconnected';
        this.notifyConn(false, this.lastStatusMessage);
        return;
      }

      this.connected = true;
      this.lastStatusMessage = 'Live telemetry received from ESP32 over USB';
      this.notifyConn(true, this.lastStatusMessage);

      const quality = (
        value: number | null,
        min: number,
        max: number,
      ): 'VALID' | 'UNAVAILABLE' | 'INVALID' => {
        if (value === null || !Number.isFinite(value)) return 'UNAVAILABLE';
        return value >= min && value <= max ? 'VALID' : 'INVALID';
      };

      const reading = (
        id: string,
        name: string,
        channelLabel: string,
        hardwareType: 'DS18B20' | 'DHT22' | 'Capacitive_ADC',
        value: number | null,
        unit: string,
        state: 'VALID' | 'UNAVAILABLE' | 'INVALID' | 'UNCALIBRATED',
        reason: string,
        minRange?: number,
        maxRange?: number,
        gpioPin?: number,
        rawAdc?: number,
      ) => ({
        id,
        name,
        channelLabel,
        hardwareType,
        value,
        unit,
        quality: state,
        qualityReason: reason,
        updatedAt: t.receivedAt ?? now,
        ...(minRange !== undefined ? { minRange } : {}),
        ...(maxRange !== undefined ? { maxRange } : {}),
        ...(gpioPin !== undefined ? { gpioPin } : {}),
        ...(rawAdc !== undefined ? { rawAdc } : {}),
      });

      const ds1IsMirrored = t.ds1Status === 'DEMO_MIRRORED';
      const ds2IsMirrored = t.ds2Status === 'DEMO_MIRRORED';
      
      const ds1Quality = ds1IsMirrored
      ? (t.ds1TempC !== null ? 'VALID' : 'UNAVAILABLE')
      : quality(t.ds1TempC, -10, 85);

const ds2Quality = ds2IsMirrored
  ? (t.ds2TempC !== null ? 'VALID' : 'UNAVAILABLE')
  : quality(t.ds2TempC, -10, 85);


      const pumpState =
        t.pumpState === 'ON' ? 'ACTIVE'
        : t.pumpState === 'FAULT' ? 'FAULT'
        : 'IDLE';

      const frame: TelemetryFrame = {
        version: '1.0.0',
        deviceId: t.deviceId,
        sequenceNumber: ++this.sequence,
        timestamp: t.receivedAt ?? now,
        sensors: {
          tempCore: reading(
            'temp_core', 'Concrete Core Temperature', 'PROBE 01 · CORE (T1)',
            'DS18B20', t.ds1TempC, '°C',
            ds1Quality,
            ds1IsMirrored ? 'Firmware explicitly identifies this as a DHT22-mirrored demo value'
              : 'Value parsed from ESP32 serial output',
            -10, 85, 4,
          ),
          tempSurface: reading(
            'temp_surface', 'Concrete Surface Temperature', 'PROBE 02 · SURFACE (T2)',
            'DS18B20',  t.ds2TempC, '°C',
            ds2Quality,
            ds2IsMirrored ? 'Firmware explicitly identifies this as a DHT22-mirrored demo value'
              : 'Value parsed from ESP32 serial output',
            -10, 85, 4,
          ),
          ambientTemp: reading(
            'ambient_temp', 'Ambient Air Temperature', 'CHANNEL A · AMBIENT TEMP',
            'DHT22', t.ambientTempC, '°C',
            quality(t.ambientTempC, -20, 60),
            'DHT22 temperature parsed from ESP32 serial output',
            -20, 60, 27,
          ),
          ambientRh: reading(
            'ambient_rh', 'Ambient Relative Humidity', 'CHANNEL B · AMBIENT RH',
            'DHT22', t.ambientRhPercent, '%',
            quality(t.ambientRhPercent, 5, 100),
            'DHT22 humidity parsed from ESP32 serial output',
            5, 100, 27,
          ),
          moisture: reading(
          'moisture',
          'Moisture Index',
          'CHANNEL M · CAPACITIVE PROBE',
          'Capacitive_ADC',
          t.moisturePercent,
          '%',
          t.moistureStatus === 'INDEX_AVAILABLE' &&
            t.moisturePercent !== null &&
            t.moistureRawAdc !== null
              ? 'VALID'
              : t.moistureStatus === 'INVALID'
                ? 'INVALID'
                : 'UNCALIBRATED',
          'Relative moisture index calculated by ESP32 using configured dry/wet ADC endpoints; not validated volumetric concrete moisture content',
          0,
          100,
          32,
          t.moistureRawAdc ?? undefined,
        ),
        },
        actuator: {
          pumpState,
          lastTriggerReason: 'Read-only pump state reported by ESP32 firmware',
          totalRunTimeSeconds: 0,
          currentCycleDurationSeconds: 0,
          lastCycleTimestamp: '',
          safetyTimeoutSeconds: 0,
        },
        diagnostics: {
          esp32UptimeSeconds: t.uptimeSeconds ?? 0,
          freeHeapBytes: 0,
          oneWireBusErrors: 0,
          dht22Timeouts: 0,
          adcNoiseEstimateMv: 0,
          firmwareVersion: 'Not reported by current serial protocol',
          supplyVoltage12vEstimated: 0,
        },
      };

      this.lastFrame = frame;
      this.listeners.forEach((listener) => listener(frame));
    } catch (error) {
      this.connected = false;
      this.lastStatusMessage = error instanceof Error
        ? `Bridge error: ${error.message}`
        : 'Bridge communication failed';
      this.notifyConn(false, this.lastStatusMessage);
    } finally {
      this.requestInProgress = false;
    }
  }

  public async getHistoricalData(
    _rangeHours: number,
  ): Promise<HistoricalTelemetryPoint[]> {
    return [];
  }

  public async getIrrigationLogs(): Promise<IrrigationLogEntry[]> {
    return [];
  }

  public async getControllerEvents(): Promise<ControllerEvent[]> {
    return [];
  }
}

