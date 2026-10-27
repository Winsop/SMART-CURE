# Industrial Design System & Token Schema
## Smart Concrete Curing Monitoring System

**Document Version:** 1.0.0  
**Design Philosophy:** Industrial Instrument Rigor, High-Density Ergonomics, Zero-AI Slop  

---

### 1. Design Principles & Anti-Slop Discipline

1. **Information Density over Decorative Fluff:** No oversized hero banners, no purple/pink neon glows, no floating glassmorphism orbs, no low-opacity watermark text.
2. **Zero-Pill Metadata Rule:** Informational metadata (timestamps, channel IDs, hardware addresses, statuses) is presented as clean unboxed text separated by typographic middots (`·`) or slashes (`/`), never packaged inside candy-colored rounded capsule pills.
3. **Tabular Monospace Discipline:** All numerical readings, units, timestamps, hex addresses, and error codes must use `font-variant-numeric: tabular-nums` or `IBM Plex Mono` to eliminate UI jitter during live polling.
4. **Text-First Status Semantics:** Critical states are never conveyed by color alone. Every status pairs an explicit text label (e.g., `VALID`, `UNAVAILABLE`, `STALE`, `FAULT`) with appropriate iconography and high-contrast tokens.
5. **Single-Elevation Depth:** Cards utilize flat white or subtle cool slate surfaces bounded by crisp 1px hairline borders (`#DCE3E7`). No heavy drop-shadows or nested cards within cards.

---

### 2. Color Tokens

| Token Name | Hex Code | Tailwind Equivalent | Purpose / Application |
|---|---|---|---|
| `--color-navy-900` | `#172B3A` | Custom Primary | Top navigation header, primary structure, dark accents |
| `--color-teal-600` | `#167D83` | Custom Accent | Primary action points, active tab indicator, nominal telemetry accent |
| `--color-teal-700` | `#115E63` | Custom Hover | Hover states on primary buttons |
| `--color-bg-canvas` | `#F4F6F7` | Neutral Canvas | Main app background canvas |
| `--color-surface` | `#FFFFFF` | Surface | Content panels, card containers, table backgrounds |
| `--color-surface-subtle`| `#EDF2F4` | Muted Surface | Table headers, secondary toolbars |
| `--color-text-main` | `#202B33` | Text Primary | Metric numbers, section headers, primary labels |
| `--color-text-muted`| `#65727C` | Text Secondary | Units, hardware IDs, timestamps, secondary descriptions |
| `--color-border` | `#DCE3E7` | Border Hairline | Structural 1px borders, table dividers |
| `--color-amber-500` | `#D99A36` | Safety Amber | Demo Mode banners, uncalibrated warnings, stale indicators |
| `--color-red-600` | `#C54444` | Critical Red | Disconnected probes, CRC errors, hardware faults |
| `--color-green-600`| `#34775B` | Muted Green | Active irrigation cycle, confirmed nominal hydration |

---

### 3. Typography Scale

- **Display & Interface Headings:** `Plus Jakarta Sans`, sans-serif
- **Telemetry Figures & Diagnostics:** `IBM Plex Mono`, monospace with `tabular-nums`

| Level | Size / Line Height | Weight | Tracking | Usage |
|---|---|---|---|---|
| Metric Value (Large) | 32px (2rem) / 1.1 | Bold (700) | Normal | Primary sensor readings (e.g. `34.2 °C`) |
| Metric Value (Medium)| 24px (1.5rem) / 1.2 | SemiBold (600) | Normal | Secondary dashboard metrics, gradient |
| Section Title | 18px (1.125rem) / 1.4 | SemiBold (600) | `-0.01em` | Card titles, panel headers |
| Body Prose | 14px (0.875rem) / 1.5 | Regular (400) | Normal | Explanatory notes, diagnostics copy |
| Monospace Table Data | 13px (0.8125rem) / 1.4 | Regular (400) / 500 | Normal | Telemetry logs, timestamps, hex addresses |
| Micro-Label | 11px (0.6875rem) / 1.3 | SemiBold (600) | `+0.04em` | All-caps channel IDs (e.g. `PROBE 01 · DS18B20`) |

---

### 4. Component Anatomy Specifications

#### 4.1 Sensor Metric Card Anatomy
```
+---------------------------------------------------------------+
| PROBE 01 · DS18B20                      [● VALID]             | <- Header: Channel + Text Status
| Concrete Core Temperature                                     | <- Human Readable Title
+---------------------------------------------------------------+
|                                                               |
|   34.2  °C                                                    | <- Large Tabular Metric + Unit
|   Status: Core Hydration Peak                                 | <- Physical Context Note
|                                                               |
+---------------------------------------------------------------+
| 1-Wire ID: 28-00000712E3B1  ·  Updated 2s ago                 | <- Clean unboxed metadata footer
+---------------------------------------------------------------+
```

#### 4.2 Unavailable Sensor State Anatomy
```
+---------------------------------------------------------------+
| PROBE 02 · DS18B20                      [▲ UNAVAILABLE]       | <- Amber/Slate Alert State
| Concrete Surface Temperature                                  |
+---------------------------------------------------------------+
|                                                               |
|   —  °C                                                       | <- Em-dash, NEVER "0.0 °C"
|   Hardware Reason: 1-Wire CRC Error / No device detected       | <- Root Cause Transparency
|                                                               |
+---------------------------------------------------------------+
| Action: Check 4.7kΩ pull-up resistor on GPIO4                 | <- Actionable Engineering Advice
+---------------------------------------------------------------+
```

#### 4.3 Uncalibrated Moisture Card Anatomy
```
+---------------------------------------------------------------+
| CHANNEL A0 · CAPACITIVE PROBE           [⚠ UNCALIBRATED]      |
| Slab Surface Moisture                                         |
+---------------------------------------------------------------+
|                                                               |
|   2340  ADC COUNTS                                            | <- Raw ADC, NO manufactured %
|   Volumetric Moisture: Calibration Required                   | <- Explicit Scientific Truth
|                                                               |
+---------------------------------------------------------------+
| Vref: 3.3V · Range: 1050 (air) to 2900 (water) · Updated 1s ago |
+---------------------------------------------------------------+
```

---

### 5. Layout & Responsive Breakpoints

- **Desktop Baseline:** 1440px viewport. Top navigation bar with 3 zones (Brand Wordmark, Navigation Links, Mode & Status Indicators).
- **Grid Structure:** 12-column grid or flexible 4-column cards grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4`).
- **Tablet (768px - 1024px):** 2-column card grid, sidebar/tab bar collapse with scrollable horizontal navigation.
- **Mobile (< 768px):** 1-column card stack, full-width time series charts with touch tooltip scrubbers.
