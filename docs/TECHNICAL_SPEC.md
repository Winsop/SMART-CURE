# Technical Architecture & Specification
## Smart Concrete Curing Monitoring System

**Document Version:** 1.0.0  
**Status:** Approved Specification  
**Architecture Scope:** Transport-Independent Telemetry, Supervisory UI, Reactive Data Flow  

---

### 1. Architectural Overview & Component Layers

The application is structured into strict horizontal tiers with unidirectional data flow. The Presentation layer is completely decoupled from telemetry transport mechanisms.

```
+-----------------------------------------------------------------------+
|                         PRESENTATION LAYER                            |
|  [Overview] [Live Monitoring] [Trends] [Irrigation] [Diagnostics]     |
|              Tailwind CSS (V4) · Lucide Icons · SVG Charts            |
+-----------------------------------------------------------------------+
                                   ▲
                                   │ (Props & Selectors)
+-----------------------------------------------------------------------+
|                      APPLICATION STATE LAYER                          |
|         Telemetry Store · Mode Controller · History Buffer           |
|                Stale Data Detector · Filter Reducer                   |
+-----------------------------------------------------------------------+
                                   ▲
                                   │ (Normalized Domain Events)
+-----------------------------------------------------------------------+
|                   DOMAIN MODEL & VALIDATION LAYER                     |
|        Telemetry Packet Schema · Quality Evaluator (Zod-like)         |
|      Quality States: VALID | UNAVAILABLE | INVALID | STALE            |
+-----------------------------------------------------------------------+
                                   ▲
                                   │ (Standardized Telemetry Frame)
+-----------------------------------------------------------------------+
|                  DATA SOURCE ABSTRACTION (INTERFACE)                  |
|                      ITelemetryDataSource                             |
+-----------------------------------------------------------------------+
           ▲                                               ▲
           │                                               │
+-------------------------+             +-------------------------------+
|    DEMO DATA PROVIDER   |             |   FUTURE LIVE ADAPTER (GATE)  |
| (Deterministic Physics) |             |  (HTTP Polling / WS / Serial) |
|  Explicitly Simulated   |             | *Blocked until firmware check*|
+-------------------------+             +-------------------------------+
```

---

### 2. Confirmed Project Architecture Decisions

| Decision ID | Summary | Architectural Enforcement |
|---|---|---|
| **DEC-001** | Transport Protocol Deferred | Live adapter implementation is gated pending physical ESP32 firmware inspection. Core app communicates exclusively through `ITelemetryDataSource`. |
| **DEC-002** | Moisture Display Integrity | Capacitive moisture sensor is treated as `UNCALIBRATED`. Raw ADC counts are preserved; percentage displays render explicit warning until two-point calibration is supplied. |
| **DEC-003** | Local / Zero-Lockin Deployment | Built as a self-contained Vite SPA deployable to static hosts or paired with a Node.js edge proxy without cloud provider lock-in. |
| **DEC-004** | Demo / Live Mode Separation | Separate provider instances. Switching modes triggers clean buffer reset. Live mode NEVER silently falls back to synthetic data upon disconnect. |
| **DEC-005** | Read-Only Actuator Supervisory | No remote pump activation affordances exist in client codebase. Commanded state is treated strictly as an audit readout. |
| **DEC-006** | Controller Safety Authority | Embedded firmware maintains autonomous authority over pump timeouts, dry-run safety, and relay cycling. |

---

### 3. Domain Models and TypeScript Interfaces

#### 3.1 Quality & Sensor Semantics
```typescript
export type SensorQualityState =
  | 'VALID'          // Reading is present, within physical limits, and fresh
  | 'UNAVAILABLE'    // Sensor hardware unreadable (e.g. 1-Wire NA, probe disconnected)
  | 'INVALID'        // Reading violates physical constraints (e.g. DHT22 reading 140°C)
  | 'STALE'          // No packet received within defined timeout (e.g. > 15s)
  | 'UNCALIBRATED';  // Reading requires transformation parameters that have not been verified

export type OperatingMode = 'DEMO' | 'LIVE';

export type PumpCommandedState = 'IDLE' | 'ACTIVE' | 'LOCKOUT' | 'FAULT';
```

#### 3.2 Sensor Channel Telemetry
```typescript
export interface SensorReading<T = number | null> {
  id: string;                      // 'temp_core' | 'temp_surface' | 'ambient_temp' | 'ambient_rh' | 'moisture_raw'
  name: string;                    // 'Concrete Core Probe 1'
  hardwareType: 'DS18B20' | 'DHT22' | 'Capacitive_ADC' | 'Relay_Feedback';
  value: T;                        // null if UNAVAILABLE or INVALID
  unit: '°C' | '%' | 'ADC' | 'state';
  quality: SensorQualityState;
  qualityReason?: string;          // e.g. "1-Wire bus CRC timeout" or "Uncalibrated raw ADC"
  updatedAt: string;               // ISO 8601 UTC timestamp
  rawAdc?: number;                 // Raw analog count (0-4095) for moisture channel
}
```

#### 3.3 Complete Telemetry Frame
```typescript
export interface TelemetryFrame {
  version: '1.0.0';
  deviceId: string;                // e.g. 'ESP32-CURING-01'
  sequenceNumber: number;
  timestamp: string;               // ISO 8601
  uptimeSeconds: number;
  sensors: {
    tempCore: SensorReading<number | null>;      // DS18B20 #1
    tempSurface: SensorReading<number | null>;   // DS18B20 #2
    ambientTemp: SensorReading<number | null>;   // DHT22 Temp
    ambientRh: SensorReading<number | null>;     // DHT22 RH
    moisture: SensorReading<number | null>;      // Capacitive ADC
  };
  actuator: {
    pumpState: PumpCommandedState;
    lastTriggerReason: string;
    totalRunTimeSeconds: number;
    currentCycleDurationSeconds: number;
  };
  diagnostics: {
    wifiRssi?: number;
    freeHeapBytes: number;
    busErrorsCount: number;
    firmwareVersion: string;
  };
}
```

---

### 4. Telemetry Validation & Sanitization

Incoming telemetry payloads undergo validation before state ingestion:

1. **Envelope Verification:** Must contain `deviceId`, valid `timestamp`, and `sensors` dictionary.
2. **Range Boundary Checking:**
   - DS18B20 Concrete Temperature: Valid between $-10^\circ\text{C}$ and $85^\circ\text{C}$. Values outside marked `INVALID`.
   - DHT22 Ambient Temp: Valid between $-20^\circ\text{C}$ and $60^\circ\text{C}$.
   - DHT22 Relative Humidity: Valid between $5\%$ and $100\%$.
   - Capacitive Moisture ADC: 12-bit SAR ADC valid between $0$ and $4095$. Unconnected pin typically floats near $0$ or $4095$ with extreme jitter.
3. **Stale Data Watchdog:**
   If `Date.now() - new Date(frame.timestamp).getTime() > 15000` (15 seconds), all channel states transition to `STALE`.

---

### 5. Transport Protocol Evaluation & Gate

| Protocol Option | Suitability for ESP32 | Network Requirements | Complexity | Evaluation Status |
|---|---|---|---|---|
| **HTTP Polling** | Standard HTTP web server on ESP32 (`WebServer.h`) | Client must be on same local subnet or port forwarded. | Low. Periodic `GET /api/telemetry`. | Candidate. High polling overhead on ESP32 single core. |
| **WebSocket** | ESP32 `WebSocketsServer` library | Persistent TCP socket. Supports low latency pushes. | Medium. Reconnect and ping/pong handling required. | Strong candidate for local bench setup. |
| **MQTT + Broker** | ESP32 `PubSubClient` to broker (Mosquitto/EMQX) | Requires external MQTT broker and WS-MQTT gateway. | High infrastructure overhead. | Not justified for single prototype slab. |
| **WebSerial API** | Direct USB UART to Chrome/Edge browser | Local physical USB cable to laptop. Zero Wi-Fi setup. | Zero network overhead. Supported by Chrome/Chromium. | Highly reliable for bench testing and lab demos. |

**Protocol Gate Rule:** The live transport adapter will NOT be implemented until Milestone 4. Hardware inspection of the ESP32 source code must first confirm existing communication libraries.

---

### 6. Design System Implementation & Styling Strategy

- **Styling Architecture:** Tailwind CSS V4 imported via `@import "tailwindcss";`.
- **Palette Specification:**
  - Dark Slate Navy: `#172B3A` (structural headers, navigation)
  - Technical Teal: `#167D83` (primary metrics, active selections, nominal indicators)
  - Background Neutral: `#F4F6F7` (canvas)
  - Surface Neutral: `#FFFFFF` (panels, tables)
  - Primary Text: `#202B33` (headings, data labels)
  - Secondary Text: `#65727C` (metadata, units)
  - Border Hairline: `#DCE3E7` (dividers)
  - Safety Amber: `#D99A36` (warnings, demo indicators, stale states)
  - Critical Red: `#C54444` (sensor disconnection, hardware fault)
  - Muted Green: `#34775B` (healthy pump active, hydration target achieved)
- **Typographic System:**
  - UI Prose: `Plus Jakarta Sans`, sans-serif
  - Telemetry & Measurements: `IBM Plex Mono`, monospace with `font-variant-numeric: tabular-nums`

---

### 7. Concrete Hydration Physics & Calculations

#### 7.1 Thermal Gradient Calculation ($\Delta T$)
$$\Delta T = |T_{\text{core}} - T_{\text{surface}}|$$
- Concrete specifications (e.g. ACI 207 / CIRIA C660) restrict thermal gradients to $\le 20^\circ\text{C}$ to prevent thermal shock cracking.
- **Rule:** If either $T_{\text{core}}$ or $T_{\text{surface}}$ is `UNAVAILABLE`, $\Delta T$ evaluates to `null` with explicit label `"Requires both concrete probes"`.

#### 7.2 Maturity Estimation (Nurse–Saul)
$$M(t) = \sum (T - T_0) \Delta t$$
- **Rule:** This calculation is deliberately suppressed and marked `"Insufficient parameters configured"` until continuous historical logging is active and datum temperature ($T_0$) is calibrated for the specific cement blend.
