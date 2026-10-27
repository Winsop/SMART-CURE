/**
 * Concrete Capacitive Moisture Sensor (DSA Requirement A & B: Polymorphic Behavior)
 * Extends BaseSensor to manage 12-bit SAR ADC signals, floating pin detection, and DEC-002 calibration policy.
 */

import { BaseSensor, ValidationResult } from './Sensor';

export class CapacitiveMoistureSensor extends BaseSensor {
  public isCalibrated: boolean = false;
  public airAdcReference: number = 1050;     // Baseline in dry air
  public waterAdcReference: number = 2850;   // Baseline in saturated specimen

  constructor(
    id: string = 'moisture',
    name: string = 'Slab Surface Moisture',
    channelLabel: string = 'CHANNEL M · CAPACITIVE PROBE',
    gpioPin: number = 34
  ) {
    super(
      id,
      name,
      channelLabel,
      'Capacitive_ADC',
      'ADC',
      0,
      4095,
      gpioPin
    );
  }

  /**
   * Overridden validation:
   * 1. Determines raw ADC candidate.
   * 2. Checks missing/undefined -> UNAVAILABLE.
   * 3. Checks finite number -> INVALID (rejects NaN, +Infinity, -Infinity).
   * 4. Checks integer -> INVALID (rejects fractional values).
   * 5. Checks 12-bit range [0 to 4095] -> INVALID (rejects <0 or >4095).
   * 6. Checks extreme floating pin thresholds (<80 or >4080) -> INVALID.
   * 7. If plausible but uncalibrated -> UNCALIBRATED (value is held null per DEC-002).
   * 8. Only permits VALID percentage if verified calibration exists.
   */
  public override validateReading(
    val: number | null,
    rawAdc?: number,
    diagnosticReason?: string
  ): ValidationResult {
    const adc = rawAdc !== undefined ? rawAdc : val;

    // 1 & 2: Missing or undefined reading
    if (adc === null || adc === undefined) {
      return {
        isValid: false,
        quality: 'UNAVAILABLE',
        reason: diagnosticReason || 'Moisture sensor ADC reading is missing or unavailable.',
      };
    }

    // 3: Finite number check (rejects NaN, +Infinity, -Infinity)
    if (typeof adc !== 'number' || !Number.isFinite(adc)) {
      return {
        isValid: false,
        quality: 'INVALID',
        reason: 'Raw ADC reading is not a finite number.',
      };
    }

    // 4: Integer check (rejects fractional ADC values)
    if (!Number.isInteger(adc)) {
      return {
        isValid: false,
        quality: 'INVALID',
        reason: `Raw ADC reading ${adc} must be an integer count.`,
      };
    }

    // 5: 12-bit hardware range boundary check [0, 4095]
    if (adc < 0 || adc > 4095) {
      return {
        isValid: false,
        quality: 'INVALID',
        reason: `Raw ADC count ${adc} outside 12-bit range [0 to 4095].`,
      };
    }

    // 6: Extreme floating SAR ADC pin detection (< 80 or > 4080 counts)
    if (adc < 80 || adc > 4080) {
      return {
        isValid: false,
        quality: 'INVALID',
        reason: `Floating ADC pin detected (${adc} counts). Ensure sensor is grounded and connected to GPIO ${this.gpioPin}.`,
      };
    }

    // 7: Uncalibrated baseline check (DEC-002)
    if (!this.isCalibrated) {
      return {
        isValid: true, // ADC count itself is physically plausible
        quality: 'UNCALIBRATED',
        reason: 'Raw ADC active (DEC-002: Volumetric moisture percentage withheld until 2-point calibration is supplied).',
      };
    }

    // 8: Calibrated moisture reading
    return {
      isValid: true,
      quality: 'VALID',
      reason: 'Calibrated capacitive reading active.',
    };
  }

  /**
   * Overridden format method to explicitly distinguish raw ADC counts from percentage.
   */
  public override formatDisplay(): string {
    if (this._quality === 'INVALID') {
      return `— ADC (INVALID)`;
    }
    if (this._quality === 'UNAVAILABLE') {
      return `— ADC (UNAVAILABLE)`;
    }
    if (this._quality === 'UNCALIBRATED' && this._rawAdc !== undefined) {
      return `${this._rawAdc} ADC (Uncalibrated)`;
    }
    if (this._quality === 'VALID' && this._value !== null) {
      return `${this._value.toFixed(1)} % (${this._rawAdc} ADC)`;
    }
    return `— ADC`;
  }
}
