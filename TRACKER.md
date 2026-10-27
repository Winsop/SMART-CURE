# Project Implementation Tracker
## Smart Concrete Curing Monitoring System

**Last Updated:** 2026-10-09  
**Current Milestone:** Milestone 1 & 2 (Frontend Foundation & Dashboard Implementation)  
**Overall Status:** Active Development  

---

### 1. Architectural Decisions Log

| Decision ID | Date | Summary | Status | Details |
|---|---|---|---|---|
| **DEC-001** | 2026-10-09 | Transport Protocol Deferred | Confirmed | Live transport implementation gated pending physical ESP32 firmware inspection. Web app decoupled via `ITelemetryDataSource`. |
| **DEC-002** | 2026-10-09 | Moisture Display Integrity | Confirmed | Capacitive moisture sensor marked `UNCALIBRATED`. Raw ADC counts displayed; percentage displays remain unavailable. |
| **DEC-003** | 2026-10-09 | Flexible Deployment Baseline | Confirmed | Built as local Vite SPA. Zero cloud lock-in. |
| **DEC-004** | 2026-10-09 | Demo / Live Telemetry Isolation | Confirmed | Demo mode and live mode maintain separate provider instances. No silent fallback to synthetic data. |
| **DEC-005** | 2026-10-09 | Read-Only Actuator Supervisory | Confirmed | Strictly no remote manual pump ON controls in initial prototype. Commanded state is audit-only. |
| **DEC-006** | 2026-10-09 | Embedded Safety Supremacy | Confirmed | ESP32 firmware retains sole time-critical authority over pump timeouts and physical relay cycles. |

---

### 2. Milestone Progress Overview

| Milestone | Title | Target Scope | Status | Verification Evidence |
|---|---|---|---|---|
| **M0** | Requirements & Architecture | PRD, Tech Spec, Flow, Design, Plan, Rules, Tracker | **DONE** | All 7 documents authored and verified. |
| **M1** | Frontend Foundation | Shell, Navigation, Design Tokens, Layout | **DONE** | Top Bar Contract 3 zones, Tailwind V4, mobile support. |
| **M2** | Demo Dashboard UI | 6 Core Views, Deterministic Demo Telemetry | **DONE** | Overview, Live, Trends, Irrigation, Diagnostics, Settings tested. |
| **M3** | Data Abstraction & Validation | Models, Quality Evaluator, Stale Detector | **DONE** | ITelemetryDataSource, DemoDataProvider, LiveTelemetryDataSource. |
| **M4** | Firmware Inspection Gate | ESP32 Code Review & Transport Selection | **BLOCKED** | Blocked on access to physical ESP32 firmware source code. |
| **M5** | Live Telemetry Integration | Live Adapter & Hardware Communication | **BLOCKED** | Blocked on M4 protocol selection. |
| **M6** | Calibration & Verification | Moisture Calibration, Field Testing, Final Audit | **BACKLOG** | Pending hardware integration. |

---

### 3. Detailed Task Checklist

| Task ID | Milestone | Description | Priority | Status | Verification Evidence / Blockers |
|---|---|---|---|---|---|
| T-001 | M0 | Author PRD.md | High | **DONE** | Created in `/docs/PRD.md` |
| T-002 | M0 | Author TECHNICAL_SPEC.md | High | **DONE** | Created in `/docs/TECHNICAL_SPEC.md` |
| T-003 | M0 | Author APP_FLOW.md | High | **DONE** | Created in `/docs/APP_FLOW.md` |
| T-004 | M0 | Author DESIGN_SCHEMA.md | High | **DONE** | Created in `/docs/DESIGN_SCHEMA.md` |
| T-005 | M0 | Author IMPLEMENTATION_PLAN.md | High | **DONE** | Created in `/docs/IMPLEMENTATION_PLAN.md` |
| T-006 | M0 | Author RULES.md | High | **DONE** | Created in `/RULES.md` |
| T-007 | M0 | Author TRACKER.md | High | **DONE** | Created in `/TRACKER.md` |
| T-008 | M1 | Configure metadata.json and HTML title | High | **DONE** | Synced with applet specifications. |
| T-009 | M1 | Implement App Navigation & Top Bar | High | **DONE** | Top bar with 3 zones and responsive mobile nav. |
| T-010 | M2 | Overview Dashboard: Sensor Metric Cards | High | **DONE** | Verified in OverviewView with units and status. |
| T-011 | M2 | Overview Dashboard: Thermal Gradient Widget | Medium | **DONE** | Verified: ΔT calculated, ACI 207 differential check. |
| T-012 | M2 | Overview Dashboard: Trend Mini-Chart | Medium | **DONE** | Verified: SVG multi-trace interactive chart. |
| T-013 | M2 | Live Monitoring View: Per-Channel Inspector | High | **DONE** | Verified in LiveMonitoringView: ROM IDs, GPIO, ADC. |
| T-014 | M2 | Trends & History View: Interactive Charting | High | **DONE** | Verified in TrendsView: 1h/6h/24h filters, CSV export. |
| T-015 | M2 | Irrigation Activity View: Audit Log | High | **DONE** | Verified in IrrigationView: DEC-005 read-only safety. |
| T-016 | M2 | System Diagnostics View: ESP32 Health | High | **DONE** | Verified in DiagnosticsView: JSON dump, troubleshooting. |
| T-017 | M2 | Settings View: Display Preferences | Medium | **DONE** | Verified in SettingsView: Units, sampling cadence. |
| T-018 | M3 | Implement Data Provider Abstraction | High | **DONE** | Verified in `src/services/telemetrySource.ts`. |
| T-019 | M4 | ESP32 Firmware Inspection | Critical | **BLOCKED** | Blocked awaiting ESP32 C++ source code. |
| T-020 | M4 | Communication Protocol Selection | Critical | **BLOCKED** | Depends on T-019. |
| T-021 | M5 | Implement Live Transport Adapter | High | **BLOCKED** | Depends on T-020. |
| T-022 | M6 | Two-Point Moisture Calibration Validation | High | **BLOCKED** | Requires physical concrete test slab data. |
| T-023 | DSA | Implement BaseSensor abstract class | High | **DONE** | Created in `src/domain/Sensor.ts`. |
| T-024 | DSA | Implement DS18B20, DHT22, Moisture concrete subclasses | High | **DONE** | Created in `src/domain/*.ts`; polymorphic validation verified. |
| T-025 | DSA | Implement SinglyLinkedList & ListNode generic classes | High | **DONE** | Created in `src/data-structures/LinkedList.ts`; O(1) operations. |
| T-026 | DSA | Implement recursive event history analysis algorithm | High | **DONE** | Created in `src/algorithms/analyzeSensorEvents.ts`. |
| T-027 | DSA | Implement SensorRegistry & EventHistoryService | High | **DONE** | Created in `src/services/`; linked list & OOP integration verified. |
| T-028 | DSA | Integrate DSA architecture into Diagnostics UI console | High | **DONE** | Integrated in `DiagnosticsView.tsx` with live pointer/OOP metrics. |
| T-029 | DSA | Integrate recursive failure metrics into Overview UI | Medium | **DONE** | Displayed in `OverviewView.tsx` decisions header. |
| T-030 | DSA | Author comprehensive automated unit test suite | High | **DONE** | `tests/dsa.test.ts` (70/70 tests passing, audited & verified). |
| T-031 | DSA | Author DSA midterm documentation & viva guide | High | **DONE** | Created in `/docs/DSA_IMPLEMENTATION.md`. |
| T-032 | DSA | Update project rules and verification checklists | High | **DONE** | Updated in `/RULES.md`. |

---

### 4. Known Issues and Impediments

| Issue ID | Subsystem | Description | Impact | Action Required / Owner |
|---|---|---|---|---|
| **ISSUE-01** | Hardware | DS18B20 probes previously observed returning `NA`. | Incomplete slab thermal profile. | Firmware engineer must verify 4.7kΩ pull-up resistor and 1-Wire ROM scanning. Frontend explicitly displays `UNAVAILABLE`. |
| **ISSUE-02** | Hardware | Disconnected moisture probe produces floating SAR ADC readings. | Erratic hydration triggers if unfiltered. | Frontend flags floating counts (<100 or >4000); firmware must implement median filter. |
| **ISSUE-03** | Interface | Live transport protocol currently undecided. | Live hardware communication paused. | Inspect ESP32 source code in Milestone 4. Demo provider active in interim. |

---

### 5. Next Three Recommended Tasks
1. Review physical ESP32 firmware source code (Milestone 4 Gate) once provided by the hardware team.
2. Formulate telemetry payload agreement matching the microcontroller's available transport (WebSerial / WebSocket / HTTP).
3. Validate two-point capacitive moisture calibration table on real concrete test cylinders (Milestone 6).
