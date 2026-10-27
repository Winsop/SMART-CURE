/**
 * Recursive Event History Analyzer (DSA Requirement C: Recursion)
 * 
 * Recursively scans chronological controller events to compute consecutive failure sequences,
 * diagnostic fault patterns, and severity ratios without iterative loops.
 * 
 * Complexity Contract:
 *   Let N be the number of events in the stream, and D be the configured maximum limit (maxDepth).
 *   - Time Complexity: O(min(N, D)) — each event up to min(N, D) is visited exactly once.
 *   - Space Complexity: O(min(N, D)) — recursive call-stack space bounded by min(N, D).
 *   - Auxiliary Space: O(1) — constant-space accumulator passing across frames.
 */

import { ControllerEvent } from '../types/telemetry';

export interface RecursiveDiagnosticMetrics {
  totalAnalyzed: number;
  infoCount: number;
  warningCount: number;
  criticalCount: number;
  sensorFaultCount: number;
  maxConsecutiveFailures: number;
  currentStreak: number;
  recursionDepthReached: number;
  isStable: boolean;
  isComplete: boolean;
  limitReached: boolean;
  diagnosticSummary: string;
}

export interface RecursiveEventAccumulator {
  infoCount: number;
  warningCount: number;
  criticalCount: number;
  sensorFaultCount: number;
  maxConsecutiveFailures: number;
  currentStreak: number;
}

/**
 * Recursive function to analyze a bounded stream of chronological events.
 * 
 * Contract:
 *   1. Empty input returns 0 analyzed events and 0 recursion depth.
 *   2. Each recursive call processes at most one event.
 *   3. At most maxDepth events are processed in a single execution.
 *   4. If input exceeds maxDepth, returns explicit limitReached=true, isComplete=false, isStable=false.
 *   5. Validates maxDepth to prevent invalid parameters or infinite recursion.
 */
export function analyzeEventsRecursively(
  events: ControllerEvent[],
  index: number = 0,
  arg3: number = 0,
  arg4?: number | RecursiveEventAccumulator,
  acc?: RecursiveEventAccumulator
): RecursiveDiagnosticMetrics {
  // Resolve polymorphic parameter signatures:
  // Signature 1 (Full): (events, index, currentDepth, maxDepth, acc)
  // Signature 2 (Standard): (events, index, maxDepth, acc)
  // Signature 3 (Default): (events)
  let currentDepth: number;
  let maxDepth: number;
  let currentAcc: RecursiveEventAccumulator | undefined;

  if (typeof arg4 === 'number') {
    // Called as: (events, index, currentDepth, maxDepth, acc)
    currentDepth = arg3 >= 1 ? arg3 : 1;
    maxDepth = arg4;
    currentAcc = acc;
  } else if (typeof arg4 === 'object' && arg4 !== null) {
    // Called as: (events, index, maxDepth, acc)
    currentDepth = index + 1;
    maxDepth = arg3 >= 1 ? arg3 : 100;
    currentAcc = arg4 as RecursiveEventAccumulator;
  } else {
    // Called as: (events, index?, maxDepth?) or (events)
    if (arg3 > 1) {
      // 3rd arg passed as maxDepth (e.g. maxDepth = 50)
      currentDepth = index + 1;
      maxDepth = arg3;
    } else {
      currentDepth = arg3 === 1 ? 1 : index + 1;
      maxDepth = 100;
    }
    currentAcc = undefined;
  }

  // Validate maxDepth argument (must be a finite positive integer >= 1)
  if (!Number.isFinite(maxDepth) || maxDepth < 1) {
    return {
      totalAnalyzed: 0,
      infoCount: 0,
      warningCount: 0,
      criticalCount: 0,
      sensorFaultCount: 0,
      maxConsecutiveFailures: 0,
      currentStreak: 0,
      recursionDepthReached: 0,
      isStable: false,
      isComplete: false,
      limitReached: true,
      diagnosticSummary: 'Invalid maxDepth parameter: must be a positive integer >= 1.',
    };
  }

  // Handle empty input stream immediately
  if (!events || events.length === 0) {
    return {
      totalAnalyzed: 0,
      infoCount: 0,
      warningCount: 0,
      criticalCount: 0,
      sensorFaultCount: 0,
      maxConsecutiveFailures: 0,
      currentStreak: 0,
      recursionDepthReached: 0,
      isStable: true,
      isComplete: true,
      limitReached: false,
      diagnosticSummary: 'Empty event stream: 0 events analyzed.',
    };
  }

  // Initialize accumulator on first call frame
  const accumulator: RecursiveEventAccumulator = currentAcc || {
    infoCount: 0,
    warningCount: 0,
    criticalCount: 0,
    sensorFaultCount: 0,
    maxConsecutiveFailures: 0,
    currentStreak: 0,
  };

  // --- BASE CASE 1: All events in input stream have been processed (N <= D) ---
  if (index >= events.length) {
    const isStable = accumulator.maxConsecutiveFailures < 3 && accumulator.criticalCount === 0;
    return {
      totalAnalyzed: index,
      infoCount: accumulator.infoCount,
      warningCount: accumulator.warningCount,
      criticalCount: accumulator.criticalCount,
      sensorFaultCount: accumulator.sensorFaultCount,
      maxConsecutiveFailures: accumulator.maxConsecutiveFailures,
      currentStreak: accumulator.currentStreak,
      recursionDepthReached: index,
      isStable,
      isComplete: true,
      limitReached: false,
      diagnosticSummary: isStable
        ? `Nominal telemetry stream (${accumulator.infoCount} normal events, 0 critical faults)`
        : `Fault alert: Peak streak of ${accumulator.maxConsecutiveFailures} consecutive failure events detected`,
    };
  }

  // --- BASE CASE 2: Configured processing limit reached (N > D) ---
  // Exactly maxDepth events (indices 0 to maxDepth - 1) have been processed
  if (index >= maxDepth || currentDepth > maxDepth) {
    return {
      totalAnalyzed: maxDepth,
      infoCount: accumulator.infoCount,
      warningCount: accumulator.warningCount,
      criticalCount: accumulator.criticalCount,
      sensorFaultCount: accumulator.sensorFaultCount,
      maxConsecutiveFailures: accumulator.maxConsecutiveFailures,
      currentStreak: accumulator.currentStreak,
      recursionDepthReached: maxDepth,
      isStable: false, // Incomplete analysis cannot certify stream health
      isComplete: false,
      limitReached: true,
      diagnosticSummary: `Analysis halted at max recursion depth limit: ${maxDepth} of ${events.length} events analyzed (incomplete scan).`,
    };
  }

  // --- RECURSIVE STEP: Process single event at current index ---
  const evt = events[index];
  const isFailure = evt.severity === 'WARNING' || evt.severity === 'CRITICAL';
  const isSensorFault = evt.category === 'SENSOR' || (evt.message && evt.message.toLowerCase().includes('crc'));

  const newCurrentStreak = isFailure ? accumulator.currentStreak + 1 : 0;
  const newMaxStreak = Math.max(accumulator.maxConsecutiveFailures, newCurrentStreak);

  const nextAcc: RecursiveEventAccumulator = {
    infoCount: accumulator.infoCount + (evt.severity === 'INFO' ? 1 : 0),
    warningCount: accumulator.warningCount + (evt.severity === 'WARNING' ? 1 : 0),
    criticalCount: accumulator.criticalCount + (evt.severity === 'CRITICAL' ? 1 : 0),
    sensorFaultCount: accumulator.sensorFaultCount + (isSensorFault ? 1 : 0),
    maxConsecutiveFailures: newMaxStreak,
    currentStreak: newCurrentStreak,
  };

  // Tail-recursive invocation to process next event (index + 1)
  return analyzeEventsRecursively(events, index + 1, currentDepth + 1, maxDepth, nextAcc);
}
