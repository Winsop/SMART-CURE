/**
 * Abstract Base Class for Sensors (DSA Requirement A & B: Classes & Inheritance)
 * Encapsulates common telemetry properties, validation lifecycle, and polymorphic interfaces.
 */

import { SensorQualityState, SensorReading } from '../types/telemetry';

export interface ValidationResult {
  isValid: boolean;
  quality: SensorQualityState;
  reason?: string;
}

export abstract class BaseSensor {
  public readonly id: string;
  public readonly name: string;
  public readonly channelLabel: string;
  public readonly hardwareType: 'DS18B20' | 'DHT22' | 'Capacitive_ADC' | 'Relay_Feedback';
  public readonly unit: string;
  public readonly minRange: number;
  public readonly maxRange: number;
  public readonly gpioPin?: number;
  public readonly hardwareAddress?: string;

  protected _value: number | null = null;
  protected _rawAdc?: number;
  protected _quality: SensorQualityState = 'UNAVAILABLE';
  protected _qualityReason: string = 'Sensor initialized; awaiting first telemetry frame';
  protected _updatedAt: string;

  constructor(
    id: string,
    name: string,
    channelLabel: string,
    hardwareType: 'DS18B20' | 'DHT22' | 'Capacitive_ADC' | 'Relay_Feedback',
    unit: string,
    minRange: number,
    maxRange: number,
    gpioPin?: number,
    hardwareAddress?: string
  ) {
    this.id = id;
    this.name = name;
    this.channelLabel = channelLabel;
    this.hardwareType = hardwareType;
    this.unit = unit;
    this.minRange = minRange;
    this.maxRange = maxRange;
    this.gpioPin = gpioPin;
    this.hardwareAddress = hardwareAddress;
    this._updatedAt = new Date().toISOString();
  }

  // Getters for encapsulated state
  public get value(): number | null {
    return this._value;
  }

  public get rawAdc(): number | undefined {
    return this._rawAdc;
  }

  public get quality(): SensorQualityState {
    return this._quality;
  }

  public get qualityReason(): string {
    return this._qualityReason;
  }

  public get updatedAt(): string {
    return this._updatedAt;
  }

  /**
   * Abstract validation method: Subclasses must override this to enforce
   * sensor-specific physical constraints, checksum verification, and quality rules.
   * May receive an optional firmware-reported diagnosticReason or error code.
   */
  public abstract validateReading(
    val: number | null,
    rawAdc?: number,
    diagnosticReason?: string
  ): ValidationResult;

  /**
   * Polymorphic update method: Validates and commits an ingested reading.
   * Enforces consistent quality states:
   *   - VALID: commits numeric reading to _value.
   *   - UNAVAILABLE / INVALID / UNCALIBRATED: sets _value to null (prevents stale values or false percentages).
   */
  public updateReading(
    val: number | null,
    rawAdc?: number,
    timestamp?: string,
    diagnosticReason?: string
  ): void {
    // Timestamp policy: accept valid parseable timestamp strings; otherwise fall back to current UTC ISO time
    if (timestamp && typeof timestamp === 'string' && !isNaN(Date.parse(timestamp))) {
      this._updatedAt = timestamp;
    } else {
      this._updatedAt = new Date().toISOString();
    }

    this._rawAdc = rawAdc;

    const validation = this.validateReading(val, rawAdc, diagnosticReason);
    this._quality = validation.quality;
    this._qualityReason = validation.reason || '';

    // Only commit numeric value when quality is strictly VALID and reading is non-null
    if (validation.isValid && validation.quality === 'VALID' && val !== null) {
      this._value = val;
    } else {
      this._value = null; // Explicit null representation; NEVER retain stale or uncalibrated values as reading
    }
  }

  /**
   * Formats current reading for display with units or explicit unavailable glyph.
   */
  public formatDisplay(): string {
    if (this._value !== null) {
      return `${this._value.toFixed(1)} ${this.unit}`;
    }
    return `— ${this.unit}`;
  }

  /**
   * Returns diagnostic summary for health matrices and status badges.
   */
  public getStatusSummary(): { status: SensorQualityState; isNominal: boolean; detail: string } {
    return {
      status: this._quality,
      isNominal: this._quality === 'VALID',
      detail: this._qualityReason,
    };
  }

  /**
   * Converts the class instance to the standardized UI Telemetry Reading object.
   */
  public toTelemetryReading(): SensorReading<number | null> {
    return {
      id: this.id,
      name: this.name,
      channelLabel: this.channelLabel,
      hardwareType: this.hardwareType,
      value: this._value,
      unit: this.unit,
      quality: this._quality,
      qualityReason: this._qualityReason,
      updatedAt: this._updatedAt,
      hardwareAddress: this.hardwareAddress,
      gpioPin: this.gpioPin,
      rawAdc: this._rawAdc,
      minRange: this.minRange,
      maxRange: this.maxRange,
    };
  }
}
