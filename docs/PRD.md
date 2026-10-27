# Product Requirements Document (PRD)
## Smart Concrete Curing Monitoring and Automated Water Irrigation System

**Document Version:** 1.0.0  
**Status:** Approved Baseline  
**Domain:** Civil Engineering, Construction IoT, Embedded Supervisory Systems  
**Product Name:** Smart Concrete Curing Monitor  

---

### 1. Product Vision & Executive Summary

The **Smart Concrete Curing Monitor** is an engineering-grade supervisory and telemetry interface designed to observe and evaluate the environmental and internal thermodynamic conditions of curing concrete slabs, while monitoring the automated water irrigation mechanisms controlled by an ESP32 embedded microcontroller.

During early-age concrete curing (typically 0–28 days, with critical focus on 24h–168h), inadequate moisture and extreme temperature differentials lead to premature shrinkage cracks, plastic shrinkage, thermal cracking, and compromised compressive strength. The embedded system senses slab temperatures, ambient conditions, and surface moisture to make localized irrigation decisions. The web application provides site engineers, materials researchers, and operators with verifiable, truthful telemetry, decision auditing, diagnostics, and historical trends without masking hardware faults or fabricating missing measurements.

---

### 2. Problem Statement

1. **Dangerous Silent Failures:** Conventional IoT monitoring tools often smooth away null readings or substitute default/zero values. In concrete curing, presenting a missing temperature probe as 0°C or substituting ambient air temperature leads to catastrophic miscalculations of hydration kinetics and thermal gradients.
2. **Moisture Calibration Ambiguity:** Capacitive moisture sensors output raw ADC voltages that are nonlinear and heavily dependent on dielectric variations, salinity, and cement paste chemistry. Displaying uncalibrated moisture as a definitive percentage misleads operators into withholding critical hydration water.
3. **Black-Box Irrigation:** Autonomous irrigation systems often switch pumps without exposing the underlying algorithmic justification (e.g., hysteresis thresholds, minimum cycle lockouts, safety timeouts). Operators cannot audit whether watering occurred due to dry concrete or sensor failure.
4. **Hardware Development Realities:** In early deployment, embedded sensors experience connection dropouts, bus errors (1-Wire DS18B20 CRC failures), and calibration drifts. Monitoring software must clearly separate hardware connection, communication health, and reading validity.

---

### 3. Product Goals and Non-Goals

#### 3.1 Goals
- **G-01:** Provide instantaneous, truthful visibility into all 4 physical sensor channels: Concrete Probe 1 (DS18B20), Concrete Probe 2 (DS18B20), Ambient Temperature/RH (DHT22), and Capacitive Moisture (ADC).
- **G-02:** Maintain a strict physical and visual distinction between Demo Mode (deterministic simulated data) and Live Mode (direct hardware telemetry).
- **G-03:** Enforce data integrity states: `VALID`, `UNAVAILABLE`, `INVALID`, `STALE`, and `UNCALIBRATED`. Raw ADC counts are never disguised as calibrated percentages.
- **G-04:** Provide transparent audit logs for all embedded controller decisions (irrigation triggers, interlocks, moisture threshold evaluations, safety shutoffs).
- **G-05:** Present actionable system diagnostics for the ESP32 board, 1-Wire bus, DHT22 timing, ADC channel, and pump relay feedback.
- **G-06:** Provide accessible, responsive, high-density visualization compliant with industrial WCAG AA standards.

#### 3.2 Non-Goals
- **NG-01:** No remote manual pump activation in initial release. Remote actuation introduces unverified site safety hazards (pump running dry, electrical shorts, overwatering).
- **NG-02:** No fabricated concrete maturity (Nurse–Saul) or compressive strength predictions until calibrated datum temperature and continuous temperature logs are verified.
- **NG-03:** No agricultural, crop health, or garden monitoring terminology or visualizations.
- **NG-04:** No cloud dependency or third-party AI assistant/chatbot integration.
- **NG-05:** No simulated water volume or flow meter statistics in the absence of a physical flow meter sensor.

---

### 4. Target Users and Use Cases

| User Persona | Context & Goal | Key Needs |
|---|---|---|
| **Civil Engineering Student / Researcher** | Monitoring test slabs in laboratory conditions; evaluating hydration heat dissipation. | High-frequency time-series charts, raw ADC visibility, probe gradient calculation, exportable logs. |
| **Field Site Technician** | Daily inspection of precast or cast-in-place slabs; verifying irrigation pump operation. | Rapid glanceable status (nominal/warning/critical), pump cycle duration, sensor fault alarms. |
| **Embedded Systems Engineer** | Debugging ESP32 firmware, 1-Wire DS18B20 bus stability, and ADC noise. | Diagnostics panel, communication latency, packet loss, raw telemetry payloads, bus CRC status. |

---

### 5. Hardware Specification & Known Constraints

| Subsystem | Hardware Component | Electrical / Interface | Known Constraints & Observed Behaviors |
|---|---|---|---|
| Microcontroller | ESP32-WROOM-32 Dev Kit | USB 5V Logic / Wi-Fi / Serial | Microcontroller power supply must remain electrically isolated from 12V pump inductive noise. |
| Concrete Core Temp (T1) | DS18B20 Waterproof Probe | 1-Wire Digital Bus (GPIO) | Previously observed unavailable (`NA`) due to bus pull-up resistor or timing faults. |
| Concrete Surface Temp (T2) | DS18B20 Waterproof Probe | 1-Wire Digital Bus (GPIO) | Previously observed unavailable (`NA`). Must be displayed as unavailable, not 0°C. |
| Ambient Temp & Humidity | DHT22 (AM2302) | Single-bus proprietary timing | Historically measured ~31.3°C and 88.2% RH in warm ambient test environments. |
| Moisture Sensor | Capacitive Soil/Concrete Probe | ESP32 ADC (SAR ADC1) | Unstable floating ADC readings when disconnected. Uncalibrated for cured cement paste. |
| Irrigation Actuator | 12V Diaphragm Pump | Optocoupled Relay / Flyback Diode | Dedicated external 12V power supply. Relay commanded state does not prove physical fluid flow. |
| Reservoir / Safety | Gravity tank / Tubing | Siphon / Level float | No confirmed digital level sensor in prototype. Reservoir must not be fabricated. |

---

### 6. Functional Requirements (FR)

| ID | Category | Requirement Description | Verification Criteria |
|---|---|---|---|
| **FR-01** | Telemetry | System shall display latest readings for Concrete Probe 1, Concrete Probe 2, Ambient Temp, Ambient RH, and Moisture. | Verified in Overview and Live Monitoring screens with proper units (°C, %, ADC counts). |
| **FR-02** | Integrity | If a sensor reading is missing, system shall explicitly display `UNAVAILABLE` or `NA`. Never substitute 0 or ambient temperature. | When DS18B20 payload is null, UI renders grey unavailable card with badge and descriptive reason. |
| **FR-03** | Moisture Integrity | Moisture percentage shall display `UNCALIBRATED` until two-point calibration parameters are verified. Raw ADC count displayed in diagnostics. | UI shows `Uncalibrated` banner; ADC counts visible in detail view with no manufactured % value. |
| **FR-04** | Operating Modes | System shall feature an unmistakable mode switch between `DEMO MODE` and `LIVE HARDWARE MODE`. | Mode banner visible across all pages; Live mode displays connection attempt and rejects synthetic fallback. |
| **FR-05** | Actuator Audit | System shall display current pump commanded state (IDLE / ACTIVE), run duration, trigger timestamp, and controller decision reason. | Irrigation log displays start/stop timestamps, duration in seconds, and triggering logic string. |
| **FR-06** | Actuator Safety | Initial prototype shall be strictly READ-ONLY regarding pump actuation. No manual remote pump ON button. | Verification confirms zero remote actuation controls exist in the UI. |
| **FR-07** | Trend Analysis | Time-series charts shall plot temperature and humidity with range filters (1h, 6h, 24h, All) and tabular hover tooltips. | Charts render clean multi-trace curves with axis labels, units, and empty state support. |
| **FR-08** | Diagnostics | Diagnostics page shall list ESP32 link status, last heartbeat timestamp, per-sensor communication health, packet counters, and raw JSON payload preview. | Comprehensive hardware health table and audit log present in System Diagnostics. |
| **FR-09** | Curing Summary | System shall compute hydration gradient ($\Delta T = |T_{core} - T_{surface}|$) only when both probes are valid. | Displays thermal delta if both probes exist; displays "Gradient unavailable" if either is missing. |
| **FR-10** | Settings | System shall provide read-only hardware parameters and editable client UI display preferences (units, polling intervals). | Settings persist in client state without falsely claiming to reflash ESP32 firmware. |

---

### 7. Nonfunctional Requirements (NFR)

- **NFR-01 (Legibility & Contrast):** Strict compliance with WCAG AA. Text contrast $\ge 4.5:1$, large numbers $\ge 3:1$. Non-color state indicators (icons + text labels).
- **NFR-02 (Tabular Alignment):** All numerical readings, timestamps, and counters must use monospace tabular figures (`font-mono tabular-nums`).
- **NFR-03 (Performance & Latency):** UI interactions respond within 150ms. Telemetry polling/refresh overhead does not cause layout jitter or excessive CPU usage.
- **NFR-04 (Responsive Architecture):** Seamless layout scaling from 1440px industrial workstation displays down to 768px tablet and 375px mobile inspection screens.
- **NFR-05 (Zero AI Slop):** Strictly no arbitrary decorative orbs, no mechanical pseudo-code prefixes, no ungrounded scoring widgets, and no pill badge clutter.

---

### 8. Risks and Mitigations

| Risk | Impact | Mitigation Strategy |
|---|---|---|
| Floating ADC reads noise as dry concrete, triggering continuous pump run. | High (overwatering, pump burnout). | Embedded firmware enforces maximum continuous pump runtime (safety timeout); frontend displays ADC instability warning. |
| Operator confuses Demo Mode with Live Mode. | High (site decisions made on fake data). | Prominent visual header badge, distinct amber tone for Demo Mode, clear watermarks in charts. |
| 1-Wire bus lockup renders both DS18B20 probes unavailable. | Medium (blind to hydration heat). | System flags `UNAVAILABLE`, presents hardware troubleshooting checklist (pull-up resistor, pin wiring). |
| Ground loop or inductive spike from 12V pump resets ESP32. | High (controller reboot cycle). | ESP32 uptime monitor and reboot event detector in Diagnostics log. |

---

### 9. Deferred Features (Backlog)
- Nurse–Saul maturity index and ASTM C1074 equivalent age calculation (blocked on continuous verified data logging and mix-specific datum temperature).
- Bidirectional manual pump override with two-factor mechanical interlock confirmation.
- Direct hardware WebSerial / WebBluetooth transport adapter (pending physical ESP32 firmware inspection).
- Multi-slab / multi-node mesh networking.
