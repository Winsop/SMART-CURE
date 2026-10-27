import express from 'express';
import { SerialPort, ReadlineParser } from 'serialport';

const app = express();
const PORT = Number(process.env.BRIDGE_PORT || 3001);
const SERIAL_PORT = process.env.ESP32_PORT || 'COM3';
const BAUD_RATE = 115200;

let serialConnected = false;
let lastLineAt = null;
let lastError = null;

const latest = {
  deviceId: 'ESP32-CURING-01',
  receivedAt: null,
  uptimeSeconds: null,
  ambientTempC: null,
  ambientRhPercent: null,
  ds1TempC: null,
  ds2TempC: null,
  ds1Status: 'UNAVAILABLE',
  ds2Status: 'UNAVAILABLE',
  moistureRawAdc: null,
  moisturePercent: null,
  moistureStatus: 'UNCALIBRATED',
  pumpState: null,
  relayGpio: null,
  filteredTempC: null,
  maturityCHours: null,
  readiness: null,
  lastRawLine: null,
};

function parseLine(line) {
  const text = line.trim();
  if (!text) return;

  lastLineAt = new Date().toISOString();
  latest.receivedAt = lastLineAt;
  latest.lastRawLine = text;

  let match;

  if ((match = text.match(/\[STATUS\]\s*uptime=(\d+)s/i))) {
    latest.uptimeSeconds = Number(match[1]);
  }

  if (
    (match = text.match(
      /DHT22:\s*T=(-?\d+(?:\.\d+)?)\s*C\s+RH=(\d+(?:\.\d+)?)\s*%/i,
    ))
  ) {
    latest.ambientTempC = Number(match[1]);
    latest.ambientRhPercent = Number(match[2]);
  }

  // Preserve demo labelling: these are mirrored DHT22 values,
  // not independent DS18B20 measurements.
  if (/DS1\s*=\s*DEMO\s*\(\s*DHT\s*\)/i.test(text)) {
    latest.ds1TempC = latest.ambientTempC;
    latest.ds1Status =
      latest.ambientTempC === null ? 'UNAVAILABLE' : 'DEMO_MIRRORED';
  } else if (
    (match = text.match(/DS1\s*=\s*(-?\d+(?:\.\d+)?)\s*C/i))
  ) {
    latest.ds1TempC = Number(match[1]);
    latest.ds1Status = 'VALID';
  } else if (/DS1\s*=\s*(?:NA|NOT_FOUND|UNAVAILABLE)/i.test(text)) {
    latest.ds1TempC = null;
    latest.ds1Status = 'UNAVAILABLE';
  }

  if (/DS2\s*=\s*DEMO\s*\(\s*DHT\s*\)/i.test(text)) {
    latest.ds2TempC = latest.ambientTempC;
    latest.ds2Status =
      latest.ambientTempC === null ? 'UNAVAILABLE' : 'DEMO_MIRRORED';
  } else if (
    (match = text.match(/DS2\s*=\s*(-?\d+(?:\.\d+)?)\s*C/i))
  ) {
    latest.ds2TempC = Number(match[1]);
    latest.ds2Status = 'VALID';
  } else if (/DS2\s*=\s*(?:NA|NOT_FOUND|UNAVAILABLE)/i.test(text)) {
    latest.ds2TempC = null;
    latest.ds2Status = 'UNAVAILABLE';
  }

  // Parse raw ADC and the percentage calculated by the ESP32.
  if ((match = text.match(/Moisture\s+RAW\s*=\s*(\d+)/i))) {
    latest.moistureRawAdc = Number(match[1]);
  }

  if (
    (match = text.match(/Moisture\s*=\s*(\d+(?:\.\d+)?)\s*%/i))
  ) {
    const percent = Number(match[1]);

    if (
      Number.isFinite(percent) &&
      percent >= 0 &&
      percent <= 100
    ) {
      latest.moisturePercent = percent;
      latest.moistureStatus = 'INDEX_AVAILABLE';
    } else {
      latest.moisturePercent = null;
      latest.moistureStatus = 'INVALID';
    }
  }

  if ((match = text.match(/Filtered Temp=\s*(-?\d+(?:\.\d+)?)\s*C/i))) {
    latest.filteredTempC = Number(match[1]);
  }

  if ((match = text.match(/Maturity=\s*(-?\d+(?:\.\d+)?)\s*C-hours/i))) {
    latest.maturityCHours = Number(match[1]);
  }

  if ((match = text.match(/Readiness=\s*(.+)$/i))) {
    latest.readiness = match[1].trim();
  }

  if ((match = text.match(/Pump=\s*(ON|OFF|IDLE|FAULT)/i))) {
    latest.pumpState = match[1].toUpperCase();
  }

  if ((match = text.match(/Relay GPIO=(\d+)/i))) {
    latest.relayGpio = Number(match[1]);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({
    bridge: 'running',
    serialConnected,
    serialPort: SERIAL_PORT,
    baudRate: BAUD_RATE,
    lastLineAt,
    lastError,
  });
});

app.get('/api/telemetry', (_req, res) => {
  res.json({
    connected: serialConnected,
    receivedAt: latest.receivedAt,
    telemetry: { ...latest },
  });
});

// Read-only server: no pump-control endpoints.
const server = app.listen(PORT, '127.0.0.1', () => {
  console.log(`ESP32 bridge listening at http://127.0.0.1:${PORT}`);
  console.log(`Opening ${SERIAL_PORT} at ${BAUD_RATE} baud...`);
});

let serial;
let parser;

try {
  serial = new SerialPort({
    path: SERIAL_PORT,
    baudRate: BAUD_RATE,
    autoOpen: false,
  });

  parser = serial.pipe(new ReadlineParser({ delimiter: '\n' }));
  parser.on('data', parseLine);

  serial.on('open', () => {
    serialConnected = true;
    lastError = null;
    console.log(`Serial connected: ${SERIAL_PORT}`);
  });

  serial.on('close', () => {
    serialConnected = false;
    console.log('Serial disconnected');
  });

  serial.on('error', (error) => {
    serialConnected = false;
    lastError = error.message;
    console.error(`Serial error: ${error.message}`);
  });

  serial.open((error) => {
    if (error) {
      serialConnected = false;
      lastError = error.message;
      console.error(`Could not open ${SERIAL_PORT}: ${error.message}`);
      console.error('Close Arduino Serial Monitor and check the COM port.');
    }
  });
} catch (error) {
  lastError = error instanceof Error ? error.message : String(error);
  console.error('Bridge startup error:', lastError);
}

function shutdown() {
  console.log('\nShutting down ESP32 bridge...');
  if (serial?.isOpen) {
    serial.close(() => server.close());
  } else {
    server.close();
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);