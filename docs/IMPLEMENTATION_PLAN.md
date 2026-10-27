# Project Implementation Plan
## Smart Concrete Curing Monitoring System

**Document Version:** 1.0.0  
**Status:** In Execution (Phases 0-2)  

---

### Milestone 0: Requirements & Architecture Definition
- **Scope:** PRD, Technical Spec, Application Flow, Design Schema, Implementation Plan, Rules, and Tracker files.
- **Prerequisites:** Workspace directory inspection, environment constraint analysis.
- **Deliverables:**
  - `docs/PRD.md`
  - `docs/TECHNICAL_SPEC.md`
  - `docs/APP_FLOW.md`
  - `docs/DESIGN_SCHEMA.md`
  - `docs/IMPLEMENTATION_PLAN.md`
  - `TRACKER.md`
  - `RULES.md`
- **Acceptance Criteria:** All 7 documents created and aligned with DEC-001 through DEC-006.
- **Status:** **DONE**

---

### Milestone 1: Frontend Foundation & Design Tokens
- **Scope:** Application scaffolding, navigation layout, design tokens, typography, and reusable layout containers.
- **Prerequisites:** Milestone 0 complete.
- **Tasks:**
  - [x] Configure Tailwind CSS V4 color palette tokens and custom utility classes.
  - [x] Import and configure `Plus Jakarta Sans` and `IBM Plex Mono` Google Fonts in `index.html`.
  - [x] Implement top navigation shell complying with the Top Bar Contract (Brand Zone, Navigation Tabs, Mode Toggle, System Health).
  - [x] Implement responsive layout shell with mobile drawer/tab support.
- **Deliverables:** Working shell running on Vite with navigation routing across 6 primary views.
- **Status:** **IN PROGRESS**

---

### Milestone 2: Demo Dashboard & Industrial UI Components
- **Scope:** Build the 6 primary application views populated by the deterministic Demo Data Provider.
- **Prerequisites:** Milestone 1 complete.
- **Tasks:**
  - [ ] **Overview Page:**
    - Telemetry cards for Concrete Core Probe (DS18B20), Concrete Surface Probe (DS18B20), Ambient Temp & RH (DHT22), Moisture Sensor (Capacitive ADC).
    - Thermal Gradient card with $\Delta T$ calculation and differential limit alert.
    - Actuator / Pump Status card with commanded state, cycle duration, and controller reason.
    - Recent multi-sensor trend mini-chart with toggleable traces.
    - Controller event feed with explicit decision explanations.
  - [ ] **Live Monitoring Page:**
    - Per-channel deep telemetry cards with hardware identifiers (1-Wire 64-bit ROM IDs, GPIO mappings).
    - Live min/max range limits, reading freshness timer, and noise indicators.
    - Raw ADC inspection table for the capacitive moisture probe.
  - [ ] **Trends & History Page:**
    - High-density SVG time-series charts for Temperature (Core, Surface, Ambient) and Humidity.
    - Time-range selector (1h, 6h, 24h, 7d).
    - Tabular data point hover tooltip.
    - CSV telemetry export trigger.
  - [ ] **Irrigation Activity Page:**
    - Real-time commanded pump state banner (IDLE / ACTIVE / FAULT).
    - Historical irrigation cycles table (Start, End, Duration, Trigger Condition, Result).
    - Explanation of autonomous hydration logic (hysteresis bands, interlocks).
  - [ ] **System Diagnostics Page:**
    - ESP32 microcontroller health (uptime, free heap, RSSI, reboot counter).
    - Sensor communication bus integrity table (1-Wire CRC, DHT22 timeout, ADC reference).
    - Raw incoming telemetry JSON packet inspector.
    - Physical hardware troubleshooting checklists for known issues.
  - [ ] **Settings Page:**
    - Telemetry update interval controls (client-side polling frequency).
    - Unit selection (°C / °F).
    - Read-only ESP32 hardware configuration and safety parameters.
- **Acceptance Criteria:** All views interactive; no dead clicks; missing probes display `UNAVAILABLE`; moisture displays `UNCALIBRATED`; zero remote pump actuation controls.
- **Status:** **READY**

---

### Milestone 3: Data Abstraction & Telemetry Validation
- **Scope:** Strongly-typed domain models, Zod-like runtime schema validator, `ITelemetryDataSource` interface, and deterministic generator.
- **Prerequisites:** Milestone 2 complete.
- **Tasks:**
  - [ ] Define TypeScript types in `src/types/telemetry.ts`.
  - [ ] Implement `DemoDataProvider` with realistic diurnal ambient cycles, hydration core heat peaks, and simulated probe failure toggle.
  - [ ] Implement runtime validator rejecting corrupted payloads or out-of-range readings.
  - [ ] Implement stale data detector (>15s watchdog).
- **Status:** **READY**

---

### Milestone 4: Firmware Inspection & Protocol Selection (GATE)
- **Scope:** Review physical ESP32 C++/Arduino firmware code to determine actual communication capabilities.
- **Prerequisites:** Milestone 3 complete; physical hardware firmware provided by engineer.
- **Tasks:**
  - [ ] Inspect ESP32 sketch for WiFi libraries (`WiFi.h`, `WebServer.h`, `WebSocketsServer`, `PubSubClient`).
  - [ ] Confirm 1-Wire pin assignment, DHT22 pin, and ADC channel.
  - [ ] Select transport: WebSerial API vs. Local HTTP Polling vs. WebSocket.
  - [ ] Author formal interface contract specification.
- **Status:** **BLOCKED** (Awaiting physical firmware inspection).

---

### Milestone 5: Live Hardware Telemetry Integration
- **Scope:** Implement live transport adapter according to selected protocol from Milestone 4.
- **Prerequisites:** Milestone 4 approved and unblocked.
- **Tasks:**
  - [ ] Build transport adapter implementing `ITelemetryDataSource`.
  - [ ] Verify packet parsing against real ESP32 frames.
  - [ ] Test graceful recovery during USB disconnect or Wi-Fi loss.
- **Status:** **BLOCKED** (Depends on Milestone 4).

---

### Milestone 6: Calibration, Verification & Final Audit
- **Scope:** Moisture calibration validation, end-to-end testing, responsive layout verification, production build audit.
- **Prerequisites:** Milestone 5 complete.
- **Tasks:**
  - [ ] Multi-point moisture calibration table verification.
  - [ ] Automated and manual test suite execution.
  - [ ] Full production build (`npm run build`) and bundle size audit.
- **Status:** **BACKLOG**
