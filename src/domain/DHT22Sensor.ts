/**
 * Concrete DHT22 (AM2302) Ambient Temperature & Humidity Sensor (DSA Requirement A & B)
 * Extends BaseSensor to validate single-bus digital timing and atmospheric bounds.
 */

import { BaseSensor, ValidationResult } from './Sensor';

export type DHT22ChannelType = 'TEMPERATURE' | 'HUMIDITY';

export class DHT22Sensor extends BaseSensor {
  public readonly channelType: DHT22ChannelType;

  constructor(
    id: string,
    name: string,
    channelLabel: string,
    channelType: DHT22ChannelType,
    gpioPin: number = 16
  ) {
    super(
      id,
      name,
      channelLabel,
      'DHT22',
      channelType === 'TEMPERATURE' ? '°C' : '%',
      channelType === 'TEMPERATURE' ? -20 : 5,
      channelType === 'TEMPERATURE' ? 60 : 100,
      gpioPin
    );
    this.channelType = channelType;
  }

  /**
   * Overridden validation: Validates numerical values against configured physical ranges.
   * Does not claim unperformed hardware checksum verification; preserves diagnosticReason if supplied.
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
        reason: diagnosticReason || 'DHT22 reading unavailable.',
      };
    }

    if (typeof val !== 'number' || !Number.isFinite(val)) {
      return {
        isValid: false,
        quality: 'INVALID',
        reason: `${this.channelType} reading is not a finite number.`,
      };
    }

    if (val < this.minRange || val > this.maxRange) {
      return {
        isValid: false,
        quality: 'INVALID',
        reason: `${this.channelType} reading ${val}${this.unit} outside operational limits [${this.minRange}${this.unit} to ${this.maxRange}${this.unit}].`,
      };
    }

    return {
      isValid: true,
      quality: 'VALID',
      reason: 'Reading passed configured range validation.',
    };
  }
}
