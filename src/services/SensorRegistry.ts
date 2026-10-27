/**
 * Sensor Registry Service (DSA Requirement A & B: Polymorphic Sensor Management)
 * 
 * Manages instantiated concrete sensor objects (DS18B20Sensor, DHT22Sensor, CapacitiveMoistureSensor)
 * and processes incoming telemetry through the common BaseSensor interface.
 */

import { BaseSensor } from '../domain/Sensor';
import { DS18B20Sensor } from '../domain/DS18B20Sensor';
import { DHT22Sensor } from '../domain/DHT22Sensor';
import { CapacitiveMoistureSensor } from '../domain/CapacitiveMoistureSensor';
import { TelemetryFrame } from '../types/telemetry';

export class SensorRegistry {
  private sensors: Map<string, BaseSensor> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    // 1. Concrete Core Temperature DS18B20 Sensor
    const tempCore = new DS18B20Sensor(
      'temp_core',
      'Concrete Core Temperature',
      'PROBE 01 · CORE (T1)',
      'CORE',
      '28-00000712E3B1',
      4
    );

    // 2. Concrete Surface Temperature DS18B20 Sensor
    const tempSurface = new DS18B20Sensor(
      'temp_surface',
      'Concrete Surface Temperature',
      'PROBE 02 · SURFACE (T2)',
      'SURFACE',
      '28-00000712E3F8',
      4
    );

    // 3. Ambient Temperature DHT22 Sensor
    const ambientTemp = new DHT22Sensor(
      'ambient_temp',
      'Ambient Air Temperature',
      'CHANNEL A · AMBIENT TEMP',
      'TEMPERATURE',
      16
    );

    // 4. Ambient Relative Humidity DHT22 Sensor
    const ambientRh = new DHT22Sensor(
      'ambient_rh',
      'Ambient Relative Humidity',
      'CHANNEL B · AMBIENT RH',
      'HUMIDITY',
      16
    );

    // 5. Capacitive Moisture ADC Sensor
    const moisture = new CapacitiveMoistureSensor(
      'moisture',
      'Slab Surface Moisture',
      'CHANNEL M · CAPACITIVE PROBE',
      34
    );

    this.sensors.set(tempCore.id, tempCore);
    this.sensors.set(tempSurface.id, tempSurface);
    this.sensors.set(ambientTemp.id, ambientTemp);
    this.sensors.set(ambientRh.id, ambientRh);
    this.sensors.set(moisture.id, moisture);
  }

  /**
   * Ingests a raw telemetry frame and updates all concrete sensors polymorphically.
   */
  public updateFromFrame(frame: TelemetryFrame): void {
    const { sensors } = frame;

    const core = this.sensors.get('temp_core');
    if (core) core.updateReading(sensors.tempCore.value, undefined, sensors.tempCore.updatedAt, sensors.tempCore.qualityReason);

    const surface = this.sensors.get('temp_surface');
    if (surface) surface.updateReading(sensors.tempSurface.value, undefined, sensors.tempSurface.updatedAt, sensors.tempSurface.qualityReason);

    const ambT = this.sensors.get('ambient_temp');
    if (ambT) ambT.updateReading(sensors.ambientTemp.value, undefined, sensors.ambientTemp.updatedAt, sensors.ambientTemp.qualityReason);

    const ambRh = this.sensors.get('ambient_rh');
    if (ambRh) ambRh.updateReading(sensors.ambientRh.value, undefined, sensors.ambientRh.updatedAt, sensors.ambientRh.qualityReason);

    const moist = this.sensors.get('moisture');
    if (moist) moist.updateReading(sensors.moisture.value, sensors.moisture.rawAdc, sensors.moisture.updatedAt, sensors.moisture.qualityReason);
  }

  /**
   * Retrieves all registered sensor instances.
   */
  public getAllSensors(): BaseSensor[] {
    return Array.from(this.sensors.values());
  }

  /**
   * Retrieves a specific sensor by ID.
   */
  public getSensor(id: string): BaseSensor | undefined {
    return this.sensors.get(id);
  }

  /**
   * Generates a polymorphic summary matrix for diagnostics and viva demonstration.
   */
  public getPolymorphicSummary(): Array<{
    id: string;
    name: string;
    classType: string;
    status: string;
    displayValue: string;
    qualityDetail: string;
  }> {
    return this.getAllSensors().map((sensor) => {
      const summary = sensor.getStatusSummary();
      return {
        id: sensor.id,
        name: sensor.name,
        classType: sensor.constructor.name,
        status: summary.status,
        displayValue: sensor.formatDisplay(),
        qualityDetail: summary.detail,
      };
    });
  }
}
