/**
 * Concrete DS18B20 1-Wire Digital Temperature Sensor (DSA Requirement A & B: Subclassing)
 * Extends BaseSensor to enforce 1-Wire bus validation and concrete thermal boundaries.
 */

import { BaseSensor, ValidationResult } from './Sensor';

export class DS18B20Sensor extends BaseSensor {
  public readonly probeLocation: 'CORE' | 'SURFACE';

  constructor(
    id: string,
    name: string,
    channelLabel: string,
    probeLocation: 'CORE' | 'SURFACE',
    hardwareAddress: string,
    gpioPin: number = 4
  ) {
    super(
      id,
      name,
      channelLabel,
      'DS18B20',
      '°C',
      -10, // Minimum valid concrete temperature
      85,  // Maximum valid hydration peak temperature
      gpioPin,
      hardwareAddress
    );
    this.probeLocation = probeLocation;
  }

  /**
   * Overridden validation: Handles numerical temperature range and DS18B20 85°C reset default.
   * Reports only what the class can establish; preserves diagnosticReason if supplied by firmware.
   */
  public override validateReading(
    val: number | null,
    _rawAdc?: number,
    diagnosticReason?: string
  ): ValidationResult {
    if (val === null) {
      return {
        isValid: false,
        quality: 'UNAVAILABLE',
        reason: diagnosticReason || 'DS18B20 reading unavailable.',
      };
    }

    if (typeof val !== 'number' || !Number.isFinite(val)) {
      return {
        isValid: false,
        quality: 'INVALID',
        reason: 'Temperature reading is not a finite number.',
      };
    }

    // 85°C is the power-on reset default for DS18B20 scratchpad
    if (val === 85.0) {
      return {
        isValid: false,
        quality: 'INVALID',
        reason: 'DS18B20 returned 85.0°C power-on reset state without performing conversion.',
      };
    }

    if (val < this.minRange || val > this.maxRange) {
      return {
        isValid: false,
        quality: 'INVALID',
        reason: `Temperature ${val}°C out of plausible physical curing bounds [${this.minRange}°C to ${this.maxRange}°C].`,
      };
    }

    return {
      isValid: true,
      quality: 'VALID',
      reason: 'Reading passed configured temperature range validation.',
    };
  }

  /**
   * Overridden format method with probe location context.
   */
  public override formatDisplay(): string {
    if (this._value !== null) {
      return `${this._value.toFixed(1)} °C (${this.probeLocation})`;
    }
    return `— °C (UNAVAILABLE)`;
  }
}
