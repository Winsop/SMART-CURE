# Engineering Rules & Implementation Contract
## Smart Concrete Curing Monitoring System

This document defines non-negotiable architectural constraints, coding standards, and verification requirements for this codebase. Every engineer and AI model working on this project must strictly comply with these rules.

---

### 1. Mandatory Data Integrity Rules

1. **NEVER Fabricate Live Telemetry:** Synthetic or simulated values must NEVER be presented as live hardware measurements under any circumstances.
2. **NEVER Silently Substitute Missing Readings:** If a sensor is disconnected or returns an error (such as DS18B20 `NA`), it must be explicitly represented as `UNAVAILABLE` or `NA`. Never substitute `0.0°C`, an average, or ambient temperature.
3. **NEVER Show Calibrated Moisture Percentage Before Calibration:** The capacitive moisture sensor outputs raw ADC values. Until a validated two-point calibration curve (air vs. saturated concrete) is completed, moisture percentage must be rendered as `UNCALIBRATED` or `Unavailable`. Raw ADC counts may be displayed for diagnostic purposes.
4. **NEVER Assume Zero Means Disconnected:** An actual 0.0°C reading is physically possible in sub-zero curing conditions. Use explicit nullable types (`number | null`) and distinct `SensorQualityState` enums.
5. **NEVER Fabricate Actuator Metrics:** Do not display water consumption (liters/gallons) or reservoir levels when no flow sensor or level probe is physically installed.

---

### 2. Mandatory Architectural Rules

6. **Transport-Independent UI:** UI components must consume data exclusively through the normalized `ITelemetryDataSource` domain interface. UI code must never import serial port libraries, WebSockets, or low-level transport sockets directly.
7. **Strict Operating Mode Isolation:** Demo Mode and Live Mode must run on separate provider instances. Switching to Live Mode must never fall back silently to synthetic demo values if hardware fails to connect.
8. **Firmware Inspection Gate:** Never implement a live transport protocol without inspecting the actual ESP32 firmware code and agreeing on the telemetry payload schema (Milestone 4 Gate).
9. **No Remote Pump Actuation in Initial Prototype:** Remote pump activation is strictly prohibited in the prototype interface. The interface is strictly supervisory (read-only audit).
10. **Embedded System Safety Supremacy:** Autonomous hardware safety interlocks (maximum continuous pump runtime, low-voltage cutoff, thermal boundaries) belong on the ESP32 microcontroller, not solely in browser JavaScript.

---

### 3. Frontend & Visual Design Rules

11. **Anti-AI Slop Enforcement:**
    - No purple/pink gradients, glowing orbs, or glassmorphic blur filters.
    - No static pill capsules for metadata. Metadata uses clean unboxed text separated by typographic middots (`·`).
    - No mechanical code comment headers (`// 01_SECTION`). Use clean title-case headers.
    - No decorative status dots or pulsing animations on static elements.
12. **Top Bar Contract:** The top navigation bar contains exactly three zones:
    `[Brand Wordmark, 1 line]` — `[Navigation Links, whitespace-nowrap]` — `[Mode Toggle & Link Status]`.
13. **Tabular Numerals Everywhere:** All fluctuating numbers, timestamps, hex identifiers, and measurements must use `font-mono tabular-nums`.
14. **Dual State Signaling:** State colors (green, amber, red) must ALWAYS be accompanied by textual labels or distinct glyphs for color-blind accessibility.

---

### 4. Verification & Process Rules

15. **Mandatory Pre-Implementation Checklist:**
    - [ ] Have confirmed requirements been checked?
    - [ ] Are all types and interfaces defined in TypeScript?
    - [ ] Does this feature introduce any remote actuator danger?
16. **Mandatory Pre-Completion Verification Checklist:**
    - [ ] Run `compile_applet` or `npm run build` to verify zero compile errors.
    - [ ] Run `lint_applet` or `npm run lint` to confirm type safety.
    - [ ] Run `npm test` to verify all 65 DSA unit tests pass.
    - [ ] Verify both Desktop (1440px) and Mobile viewports render without horizontal overflow.
    - [ ] Confirm no synthetic values leak into live mode.
    - [ ] Update `TRACKER.md` with verification evidence.

---

### 5. Mandatory DSA Midterm Compliance Rules

17. **Functional Integration of DSA:** All four DSA concepts (Classes, Inheritance, Recursion, Linked Lists) must be actively integrated into domain and service workflows. No unused demonstration-only scripts, dead code, or commentary-only implementations.
18. **Empirical Verification & Truthfulness:** Test results must be run against physical or mock executions and reported truthfully. Never forge test results or report passing statuses without running verification scripts.
19. **Preservation of Existing Functionality:** Upgrades to support DSA must not regress existing features, remove telemetry channels, degrade responsive layouts, or introduce unverified cloud dependencies.
20. **Defensive Recursion Bounds:** All recursive functions operating on event or telemetry collections must incorporate explicit depth limits (`maxDepth`) to guard against runtime call stack overflow.
21. **Pointer Discipline in Linked Lists:** The `SinglyLinkedList` implementation must handle empty, single-node, and bounded capacity boundary transitions with correct `head` and `tail` pointer updates. React state updates must consume immutable snapshots (`toArray()`).
