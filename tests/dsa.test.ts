/**
 * DSA Midterm Compliance Unit Tests
 * Verifies Classes, Inheritance, Recursion, and Linked Lists.
 * Can be run via tsx: npx tsx tests/dsa.test.ts
 */

import { BaseSensor } from '../src/domain/Sensor';
import { DS18B20Sensor } from '../src/domain/DS18B20Sensor';
import { DHT22Sensor } from '../src/domain/DHT22Sensor';
import { CapacitiveMoistureSensor } from '../src/domain/CapacitiveMoistureSensor';
import { SinglyLinkedList } from '../src/data-structures/LinkedList';
import { analyzeEventsRecursively } from '../src/algorithms/analyzeSensorEvents';
import { SensorRegistry } from '../src/services/SensorRegistry';
import { EventHistoryService } from '../src/services/EventHistoryService';
import { ControllerEvent } from '../src/types/telemetry';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    throw new Error(`Test assertion failed: ${testName}`);
  }
}

console.log('\n======================================================');
console.log('   DSA MIDTERM COMPLIANCE VERIFICATION TEST SUITE');
console.log('======================================================\n');

// ------------------------------------------------------------------
// 1. REQUIREMENT A & B: CLASSES AND INHERITANCE
// ------------------------------------------------------------------
console.log('[SECTION 1: CLASSES & INHERITANCE]');

// Test DS18B20 concrete sensor
const dsCore = new DS18B20Sensor('ds_core', 'Concrete Core', 'T1', 'CORE', '28-01', 4);
assert(dsCore instanceof BaseSensor, 'DS18B20Sensor inherits from BaseSensor');
assert(dsCore.hardwareType === 'DS18B20', 'Hardware type correctly initialized in base class');

// Valid reading
dsCore.updateReading(34.2);
assert(dsCore.value === 34.2, 'Valid temperature stored correctly');
assert(dsCore.quality === 'VALID', 'Quality state is VALID for 34.2°C');
assert(dsCore.formatDisplay().includes('34.2 °C (CORE)'), 'Polymorphic formatDisplay produces location context');

// Out of bounds reading (> 85°C)
dsCore.updateReading(98.5);
assert(dsCore.value === null, 'Out of bounds reading sets value to explicit null');
assert(dsCore.quality === 'INVALID', 'Quality marked as INVALID for 98.5°C');

// Power-on reset state (85.0°C scratchpad default before conversion)
dsCore.updateReading(85.0);
assert(dsCore.value === null, '85.0°C power-on reset sets value to null');
assert(dsCore.quality === 'INVALID', 'Quality marked as INVALID for 85.0°C reset default');

// Non-finite temperature (NaN) rejection
dsCore.updateReading(Number.NaN);
assert(dsCore.value === null, 'NaN reading sets value to null');
assert(dsCore.quality === 'INVALID', 'Non-finite NaN reading marked as INVALID');

// Missing / NA reading
dsCore.updateReading(null);
assert(dsCore.value === null, 'Null reading handled without crashing');
assert(dsCore.quality === 'UNAVAILABLE', 'Quality marked as UNAVAILABLE for null (1-Wire NA bench condition)');
assert(dsCore.formatDisplay().includes('UNAVAILABLE'), 'Unavailable formatted string does not show 0.0°C');

// Test DHT22 concrete sensor
const dhtTemp = new DHT22Sensor('dht_temp', 'Ambient Air', 'AMB', 'TEMPERATURE', 16);
assert(dhtTemp instanceof BaseSensor, 'DHT22Sensor inherits from BaseSensor');
dhtTemp.updateReading(31.3);
assert(dhtTemp.value === 31.3 && dhtTemp.quality === 'VALID', 'DHT22 validates nominal ambient reading');
dhtTemp.updateReading(75.0); // Above 60°C maximum
assert(dhtTemp.quality === 'INVALID', 'DHT22 invalidates out of physical bounds atmospheric temperature');
dhtTemp.updateReading(Number.NaN);
assert(dhtTemp.quality === 'INVALID', 'DHT22 invalidates non-finite NaN temperature');

// Test Capacitive Moisture Sensor (DEC-002 integrity)
const moistureSensor = new CapacitiveMoistureSensor('moist_01', 'Slab Moisture', 'CH-M', 34);
assert(moistureSensor instanceof BaseSensor, 'CapacitiveMoistureSensor inherits from BaseSensor');
moistureSensor.updateReading(null, 2340);
assert(moistureSensor.rawAdc === 2340, 'Raw ADC count stored accurately');
assert(moistureSensor.quality === 'UNCALIBRATED', 'DEC-002: Moisture remains UNCALIBRATED');
assert(moistureSensor.value === null, 'DEC-002: Volumetric percentage is strictly null');
assert(moistureSensor.formatDisplay().includes('Uncalibrated'), 'Format display identifies uncalibrated state');

// Floating ADC pin detection
moistureSensor.updateReading(null, 45); // < 80 counts
assert(moistureSensor.quality === 'INVALID', 'Floating ADC counts (<80) flagged as INVALID noise');

// Polymorphic Sensor Registry test
const registry = new SensorRegistry();
const allSensors = registry.getAllSensors();
assert(allSensors.length === 5, 'SensorRegistry registers all 5 sensor channels');
const summaryTable = registry.getPolymorphicSummary();
assert(summaryTable.some((s) => s.classType === 'DS18B20Sensor'), 'Registry reports DS18B20Sensor class instances');
assert(summaryTable.some((s) => s.classType === 'DHT22Sensor'), 'Registry reports DHT22Sensor class instances');
assert(summaryTable.some((s) => s.classType === 'CapacitiveMoistureSensor'), 'Registry reports CapacitiveMoistureSensor class instances');

// ------------------------------------------------------------------
// 2. REQUIREMENT D: LINKED LISTS
// ------------------------------------------------------------------
console.log('\n[SECTION 2: SINGLY LINKED LIST]');

const list = new SinglyLinkedList<string>();

// Empty list boundary cases
assert(list.size() === 0, 'Initial list size is 0');
assert(list.isEmpty() === true, 'isEmpty returns true for new list');
assert(list.head === null && list.tail === null, 'Head and tail pointers are null initially');
assert(list.removeOldest() === null, 'removeOldest on empty list returns null safely');
assert(list.toArray().length === 0, 'toArray on empty list returns empty array');

// Appending single element
list.append('NODE_1');
assert(list.size() === 1, 'Size is 1 after first append');
assert(list.head !== null && list.head.value === 'NODE_1', 'Head points to NODE_1');
assert(list.tail !== null && list.tail.value === 'NODE_1', 'Tail points to NODE_1 (head === tail for single node)');
assert(list.head === list.tail, 'Head and tail reference identical node in 1-element list');

// Appending multiple elements
list.append('NODE_2');
list.append('NODE_3');
assert(list.size() === 3, 'Size is 3 after three appends');
assert(list.head?.value === 'NODE_1', 'Head remains NODE_1');
assert(list.tail?.value === 'NODE_3', 'Tail is updated to NODE_3');
const arraySnapshot = list.toArray();
assert(
  arraySnapshot[0] === 'NODE_1' && arraySnapshot[1] === 'NODE_2' && arraySnapshot[2] === 'NODE_3',
  'toArray preserves exact sequential insertion order'
);

// FIFO Dequeue (removeOldest)
const removed = list.removeOldest();
assert(removed === 'NODE_1', 'removeOldest dequeues oldest element (NODE_1)');
assert(list.size() === 2, 'Size decremented to 2');
assert(list.head?.value === 'NODE_2', 'Head advances to NODE_2');

// Bounded Capacity Eviction Test
const boundedList = new SinglyLinkedList<number>(3); // Max capacity 3
boundedList.append(10);
boundedList.append(20);
boundedList.append(30);
assert(boundedList.size() === 3, 'Bounded list filled to capacity 3');
boundedList.append(40); // Exceeds capacity; 10 should be evicted automatically
assert(boundedList.size() === 3, 'Bounded list size remains 3 after eviction');
assert(boundedList.head?.value === 20, 'Oldest item (10) was evicted; new head is 20');
assert(boundedList.tail?.value === 40, 'Newest item (40) is tail');

// Find predicate
const found = boundedList.find((v) => v === 30);
assert(found === 30, 'find() locates node by predicate');
assert(boundedList.find((v) => v === 999) === null, 'find() returns null when not found');

// ------------------------------------------------------------------
// 3. REQUIREMENT C: RECURSION
// ------------------------------------------------------------------
console.log('\n[SECTION 3: RECURSIVE ALGORITHM]');

// Empty input base case
const emptyResult = analyzeEventsRecursively([]);
assert(emptyResult.totalAnalyzed === 0, 'Base case handles empty array without error');
assert(emptyResult.recursionDepthReached === 0, 'Recursion depth is 0 for empty array');
assert(emptyResult.isStable === true, 'Empty stream is classified as stable');

// Single event
const singleEvent: ControllerEvent[] = [
  { id: '1', timestamp: new Date().toISOString(), severity: 'INFO', category: 'COMMUNICATION', message: 'Nominal frame' },
];
const singleResult = analyzeEventsRecursively(singleEvent);
assert(singleResult.totalAnalyzed === 1, 'Single event processed correctly');
assert(singleResult.infoCount === 1, 'Info counter incremented');
assert(singleResult.maxConsecutiveFailures === 0, 'Zero failures recorded');

// Consecutive failure sequence test
const testSequence: ControllerEvent[] = [
  { id: 'e1', timestamp: new Date().toISOString(), severity: 'INFO', category: 'COMMUNICATION', message: 'OK' },
  { id: 'e2', timestamp: new Date().toISOString(), severity: 'WARNING', category: 'SENSOR', message: 'CRC timeout' },
  { id: 'e3', timestamp: new Date().toISOString(), severity: 'CRITICAL', category: 'SAFETY', message: 'Relay mismatch' },
  { id: 'e4', timestamp: new Date().toISOString(), severity: 'WARNING', category: 'SENSOR', message: 'Bus error' },
  { id: 'e5', timestamp: new Date().toISOString(), severity: 'INFO', category: 'IRRIGATION', message: 'Pump idle' },
  { id: 'e6', timestamp: new Date().toISOString(), severity: 'WARNING', category: 'SENSOR', message: 'Single warning' },
];

const seqResult = analyzeEventsRecursively(testSequence);
assert(seqResult.totalAnalyzed === 6, 'All 6 events scanned recursively');
assert(seqResult.infoCount === 2, '2 INFO events counted');
assert(seqResult.warningCount === 3, '3 WARNING events counted');
assert(seqResult.criticalCount === 1, '1 CRITICAL event counted');
assert(seqResult.maxConsecutiveFailures === 3, 'Calculated max consecutive failure sequence is 3 (e2 -> e3 -> e4)');
assert(seqResult.currentStreak === 1, 'Current active streak is 1 (e6)');
assert(seqResult.isStable === false, 'Stream marked unstable due to 3 consecutive failures and critical fault');

// Max recursion depth guard test
const largeArray: ControllerEvent[] = Array.from({ length: 150 }, (_, i) => ({
  id: `gen-${i}`,
  timestamp: new Date().toISOString(),
  severity: 'INFO',
  category: 'COMMUNICATION',
  message: `Frame ${i}`,
}));
const guardedResult = analyzeEventsRecursively(largeArray, 0, 1, 50); // Guard at depth 50
assert(guardedResult.recursionDepthReached === 50, 'Recursion guard successfully caps execution at maxDepth 50');
assert(guardedResult.diagnosticSummary.includes('halted at max recursion'), 'Diagnostic summary alerts on guard activation');

// ------------------------------------------------------------------
// 4. INTEGRATION SERVICE TESTS
// ------------------------------------------------------------------
console.log('\n[SECTION 4: SERVICE INTEGRATION]');

const historyService = new EventHistoryService(20);
historyService.addEvents(testSequence);
assert(historyService.getEvents().length === 6, 'EventHistoryService correctly holds events in SinglyLinkedList');
const serviceAnalysis = historyService.getRecursiveAnalysis();
assert(serviceAnalysis.maxConsecutiveFailures === 3, 'History service runs recursive analysis on linked-list contents');
const metrics = historyService.getLinkedListMetrics();
assert(metrics.size === 6, 'Linked list size metric reported accurately');
assert(metrics.headEventId === 'e1', 'Head node matches first event');
assert(metrics.tailEventId === 'e6', 'Tail node matches last event');

console.log('\n======================================================');
console.log(`   ALL TESTS PASSED! (${passedTests}/${totalTests} Passed)`);
console.log('======================================================\n');
