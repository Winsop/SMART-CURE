#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>
#include <math.h>
#include "config.h"

// ============================================================
// SENSOR TEST SETTINGS
// ============================================================

// FALSE = read actual DS18B20 probes; do not mirror DHT22 values.
#define DEMO_MIRROR_DHT_TO_DS false

// Safety: keep the physical pump OFF while validating sensors.
#define FORCE_PUMP_OFF false 


// ============================================================
// SENSOR OBJECTS
// ============================================================

OneWire oneWire(PIN_DS18B20_BUS);
DallasTemperature dsSensors(&oneWire);

DHT dht(PIN_DHT22_DATA, DHT_TYPE);


// ============================================================
// CALIBRATION
// ============================================================

// Your calibrated capacitive moisture sensor values.
#define MOISTURE_DRY_ADC 3234
#define MOISTURE_WET_ADC 970

// Moisture hysteresis.
// Pump requests ON below ON threshold.
// Pump remains ON until moisture reaches OFF threshold.
#define MOISTURE_ON_THRESHOLD_PERCENT 30
#define MOISTURE_OFF_THRESHOLD_PERCENT 40


// ============================================================
// PUMP TIMING
// ============================================================

#define MIN_PUMP_ON_TIME_MS  5000UL
#define MIN_PUMP_OFF_TIME_MS 5000UL


// ============================================================
// SENSOR TIMING
// ============================================================

#define DHT_READ_INTERVAL_MS       2500UL
#define MOISTURE_READ_INTERVAL_MS 1000UL
#define DS_READ_INTERVAL_MS       3000UL
#define STATUS_REPORT_INTERVAL_MS 2000UL


// ============================================================
// MATURITY MODEL
// ============================================================

// Nurse–Saul datum temperature from the report.
#define DATUM_TEMPERATURE_C -10.0f

// DEMO / PLACEHOLDER target.
// The report does not specify a numerical target maturity.
// Replace this with the experimentally/literature calibrated
// project value later.
#define MATURITY_TARGET_C_HOURS 1000.0f


// ============================================================
// CIRCULAR BUFFER
// ============================================================

#define TEMP_BUFFER_SIZE 10

float tempBuffer[TEMP_BUFFER_SIZE];
int tempBufferIndex = 0;
int tempBufferCount = 0;

float maturityCHours = 0.0f;

unsigned long lastMaturityUpdate = 0;


// ============================================================
// SENSOR STATE
// ============================================================

float dhtTemperatureC = NAN;
float dhtHumidity = NAN;

float dsTempC[2] = {NAN, NAN};

int moistureRaw = 0;
int moisturePercent = 0;


// ============================================================
// PUMP STATE
// ============================================================

bool pumpState = false;

unsigned long pumpChangedAt = 0;


// ============================================================
// TIMERS
// ============================================================

unsigned long lastDHTRead = 0;
unsigned long lastMoistureRead = 0;
unsigned long lastDSRead = 0;
unsigned long lastStatusReport = 0;


// ============================================================
// HELPER: RELAY CONTROL
// ============================================================

void pumpOn()
{
  if (FORCE_PUMP_OFF)
  {
    pumpState = false;

    digitalWrite(
      PIN_RELAY,
      RELAY_ACTIVE_HIGH ? LOW : HIGH
    );

    return;
  }

  digitalWrite(
    PIN_RELAY,
    RELAY_ACTIVE_HIGH ? HIGH : LOW
  );

  pumpState = true;
  pumpChangedAt = millis();
}


void pumpOff()
{
  digitalWrite(
    PIN_RELAY,
    RELAY_ACTIVE_HIGH ? LOW : HIGH
  );

  pumpState = false;
  pumpChangedAt = millis();
}


// ============================================================
// MOISTURE RAW READING
// ============================================================

int readMoistureRaw()
{
  const int SAMPLES = 10;

  long total = 0;

  for (int i = 0; i < SAMPLES; i++)
  {
    total += analogRead(PIN_MOISTURE_AOUT);
    delay(5);
  }

  return total / SAMPLES;
}


// ============================================================
// MOISTURE ADC → PERCENT
// ============================================================

int moistureRawToPercent(int raw)
{
  float percent =
    100.0f *
    ((float)MOISTURE_DRY_ADC - raw) /
    ((float)MOISTURE_DRY_ADC - MOISTURE_WET_ADC);

  percent = constrain(percent, 0.0f, 100.0f);

  return (int)round(percent);
}


// ============================================================
// MOISTURE UPDATE
// ============================================================

void readMoistureIfDue()
{
  unsigned long now = millis();

  if (now - lastMoistureRead < MOISTURE_READ_INTERVAL_MS)
    return;

  lastMoistureRead = now;

  moistureRaw = readMoistureRaw();

  moisturePercent =
    moistureRawToPercent(moistureRaw);
}


// ============================================================
// DHT22 UPDATE
// ============================================================

void readDHTIfDue()
{
  unsigned long now = millis();

  if (now - lastDHTRead < DHT_READ_INTERVAL_MS)
    return;

  lastDHTRead = now;

  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (!isnan(t))
    dhtTemperatureC = t;

  if (!isnan(h))
    dhtHumidity = h;
}


// ============================================================
// DS18B20 UPDATE
// ============================================================

void readDS18B20IfDue()
{
  unsigned long now = millis();

  if (now - lastDSRead < DS_READ_INTERVAL_MS)
    return;

  lastDSRead = now;

#if DEMO_MIRROR_DHT_TO_DS

  // ----------------------------------------------------------
  // DEMO MODE
  // ----------------------------------------------------------
  // The DS18B20 probes are currently unavailable.
  // For the software demonstration, mirror the working DHT22
  // temperature into both display fields.
  //
  // These are explicitly marked DEMO(DHT) in the output.
  // ----------------------------------------------------------

  if (!isnan(dhtTemperatureC))
  {
    dsTempC[0] = dhtTemperatureC;
    dsTempC[1] = dhtTemperatureC;
  }

#else

  // ----------------------------------------------------------
  // NORMAL DS18B20 MODE
  // ----------------------------------------------------------

  dsSensors.requestTemperatures();

  int deviceCount = dsSensors.getDeviceCount();

  for (int i = 0; i < 2; i++)
  {
    if (i < deviceCount)
    {
      float t = dsSensors.getTempCByIndex(i);

      if (t != DEVICE_DISCONNECTED_C &&
          t > -100.0f &&
          t < 150.0f)
      {
        dsTempC[i] = t;
      }
      else
      {
        dsTempC[i] = NAN;
      }
    }
    else
    {
      dsTempC[i] = NAN;
    }
  }

#endif
}


// ============================================================
// CIRCULAR BUFFER
// ============================================================

void addTemperatureToBuffer(float temperature)
{
  if (isnan(temperature))
    return;

  tempBuffer[tempBufferIndex] = temperature;

  tempBufferIndex++;

  if (tempBufferIndex >= TEMP_BUFFER_SIZE)
    tempBufferIndex = 0;

  if (tempBufferCount < TEMP_BUFFER_SIZE)
    tempBufferCount++;
}


// ============================================================
// MOVING AVERAGE
// ============================================================

float getTemperatureMovingAverage()
{
  if (tempBufferCount == 0)
    return NAN;

  float total = 0.0f;

  for (int i = 0; i < tempBufferCount; i++)
  {
    total += tempBuffer[i];
  }

  return total / tempBufferCount;
}


// ============================================================
// MATURITY CALCULATION
// ============================================================
//
// M = Σ (T - T0) Δt
//
// Only temperature above datum contributes.
// ============================================================

void updateMaturity()
{
  unsigned long now = millis();

  if (lastMaturityUpdate == 0)
  {
    lastMaturityUpdate = now;
    return;
  }

  unsigned long elapsedMs =
    now - lastMaturityUpdate;

  lastMaturityUpdate = now;

  float dtHours =
    elapsedMs / 3600000.0f;

  float avgTemperature =
    getTemperatureMovingAverage();

  if (isnan(avgTemperature))
    return;

  float effectiveTemperature =
    avgTemperature - DATUM_TEMPERATURE_C;

  if (effectiveTemperature < 0.0f)
    effectiveTemperature = 0.0f;

  maturityCHours +=
    effectiveTemperature * dtHours;
}


// ============================================================
// READINESS DECISION
// ============================================================

bool concreteReady()
{
  return maturityCHours >=
         MATURITY_TARGET_C_HOURS;
}


// ============================================================
// IRRIGATION DECISION
// ============================================================

void updateIrrigationControl()
{
  unsigned long now = millis();

  bool curingStillRequired =
    !concreteReady();

  bool moistureLow =
    moisturePercent <
    MOISTURE_ON_THRESHOLD_PERCENT;

  bool moistureRestored =
    moisturePercent >=
    MOISTURE_OFF_THRESHOLD_PERCENT;


  // ----------------------------------------------------------
  // If concrete is ready, irrigation must be OFF.
  // ----------------------------------------------------------

  if (!curingStillRequired)
  {
    if (pumpState)
      pumpOff();

    return;
  }


  // ----------------------------------------------------------
  // DEMO safety override
  // ----------------------------------------------------------




  // ----------------------------------------------------------
  // Pump currently OFF
  // ----------------------------------------------------------

  if (!pumpState)
  {
    if (moistureLow &&
        (now - pumpChangedAt >= MIN_PUMP_OFF_TIME_MS))
    {
      pumpOn();
    }
  }


  // ----------------------------------------------------------
  // Pump currently ON
  // ----------------------------------------------------------

  else
  {
    bool minimumOnTimeReached =
      now - pumpChangedAt >=
      MIN_PUMP_ON_TIME_MS;

    if (minimumOnTimeReached &&
        moistureRestored)
    {
      pumpOff();
    }
  }
}


// ============================================================
// STATUS OUTPUT
// ============================================================

void printFloatOrNA(float value, int decimals = 1)
{
  if (isnan(value))
  {
    Serial.print("NA");
  }
  else
  {
    Serial.print(value, decimals);
  }
}


void printStatus()
{
  unsigned long now = millis();

  if (now - lastStatusReport < STATUS_REPORT_INTERVAL_MS)
    return;

  lastStatusReport = now;


  Serial.println();
  Serial.println("================================================");

  Serial.print("[STATUS] uptime=");
  Serial.print(now / 1000);
  Serial.println("s");


  // ----------------------------------------------------------
  // DHT22
  // ----------------------------------------------------------

  Serial.print("DHT22: T=");
  printFloatOrNA(dhtTemperatureC, 1);

  Serial.print(" C  RH=");
  printFloatOrNA(dhtHumidity, 1);

  Serial.println(" %");


  // ----------------------------------------------------------
  // DS18B20 / DEMO
  // ----------------------------------------------------------

  Serial.print("DS18B20 detected=");
  Serial.println(dsSensors.getDeviceCount());

#if DEMO_MIRROR_DHT_TO_DS

  Serial.print("DS1=DEMO(DHT) ");
  printFloatOrNA(dsTempC[0], 1);
  Serial.println(" C");

  Serial.print("DS2=DEMO(DHT) ");
  printFloatOrNA(dsTempC[1], 1);
  Serial.println(" C");

#else

  Serial.print("DS1=");
  printFloatOrNA(dsTempC[0], 1);
  Serial.println(" C");

  Serial.print("DS2=");
  printFloatOrNA(dsTempC[1], 1);
  Serial.println(" C");

#endif


  // ----------------------------------------------------------
  // MOISTURE
  // ----------------------------------------------------------

  Serial.print("Moisture RAW=");
  Serial.print(moistureRaw);

  Serial.print("  Moisture=");
  Serial.print(moisturePercent);

  Serial.println("%");


  // ----------------------------------------------------------
  // MATURITY
  // ----------------------------------------------------------

  Serial.print("Filtered Temp=");
  printFloatOrNA(getTemperatureMovingAverage(), 2);

  Serial.println(" C");

  Serial.print("Maturity=");
  Serial.print(maturityCHours, 3);

  Serial.println(" C-hours");


  // ----------------------------------------------------------
  // READINESS
  // ----------------------------------------------------------

  Serial.print("Readiness=");

  if (concreteReady())
    Serial.println("READY");
  else
    Serial.println("NOT READY");


  // ----------------------------------------------------------
  // IRRIGATION
  // ----------------------------------------------------------

  Serial.print("Pump=");

  if (pumpState)
    Serial.println("ON");
  else
    Serial.println("OFF");


  Serial.print("Relay GPIO=");
  Serial.println(PIN_RELAY);


#if FORCE_PUMP_OFF

  Serial.println("Pump safety override: FORCE_PUMP_OFF");

#endif


#if DEMO_MIRROR_DHT_TO_DS

  Serial.println(
    "DEMO MODE: DS18B20 display values are mirrored from DHT22."
  );

#endif

  Serial.println("================================================");
}


// ============================================================
// SETUP
// ============================================================

void setup()
{
  Serial.begin(115200);

  delay(1000);

  Serial.println();
  Serial.println("===============================================");
  Serial.println(" SMART CONCRETE CURING MONITOR");
  Serial.println(" AUTOMATED WATER IRRIGATION SYSTEM");
  Serial.println("===============================================");

#if DEMO_MIRROR_DHT_TO_DS

  Serial.println("DEMO MODE ENABLED");
  Serial.println("DS18B20 values -> mirrored from DHT22");
  Serial.println("Values are explicitly labelled DEMO(DHT)");

#else

  Serial.println("NORMAL DS18B20 MODE");

#endif


  // ----------------------------------------------------------
  // GPIO
  // ----------------------------------------------------------

  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);

  // Always begin with pump OFF.
  pumpOff();

  digitalWrite(
    PIN_STATUS_LED,
    LED_ACTIVE_HIGH ? LOW : HIGH
  );


  // ----------------------------------------------------------
  // Sensors
  // ----------------------------------------------------------

  dht.begin();

  dsSensors.begin();
  dsSensors.setWaitForConversion(true);

  Serial.print("DS18B20 devices detected at startup: ");
  Serial.println(dsSensors.getDeviceCount());

  if (dsSensors.getDeviceCount() < 2)
  {
    Serial.println("WARNING: Fewer than 2 DS18B20 probes detected.");
    Serial.println("Check the shared data wire, power, ground, and pull-up resistor.");
  }

  // ----------------------------------------------------------
  // ADC
  // ----------------------------------------------------------

  analogReadResolution(12);


  // ----------------------------------------------------------
  // Initialize timers
  // ----------------------------------------------------------

  lastDHTRead = millis() - DHT_READ_INTERVAL_MS;
  lastMoistureRead =
    millis() - MOISTURE_READ_INTERVAL_MS;
  lastDSRead =
    millis() - DS_READ_INTERVAL_MS;

  lastMaturityUpdate = millis();


  Serial.println("System initialized.");
  Serial.println("Pump starts OFF.");
  Serial.println();
}


// ============================================================
// MAIN LOOP
// ============================================================

void loop()
{
  // 1. Sense
  readDHTIfDue();
  readMoistureIfDue();
  readDS18B20IfDue();


  // 2. Process
  //
  // For maturity, use internal DS temperature normally.
  // In demo mode, DS temperature is the clearly labelled
  // DHT22 mirror.
  //
  // Add the temperature once per DS update cycle.
  static unsigned long lastBufferUpdate = 0;

  if (millis() - lastBufferUpdate >= DS_READ_INTERVAL_MS)
  {
    lastBufferUpdate = millis();

    if (!isnan(dsTempC[0]))
    {
      addTemperatureToBuffer(dsTempC[0]);
    }

    updateMaturity();
  }


  // 3. Decide + 4. Actuate
  updateIrrigationControl();


  // 5. Feedback / Status
  printStatus();


  delay(5);
}