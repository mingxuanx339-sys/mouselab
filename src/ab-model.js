import { computeClickStats } from './metrics.js';

export const SCHEMA_VERSION = 2;
export const PREPARE_MS = 3000;

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
}

// Balance the order within successive pairs: AB, BA, AB, BA...
export function planFor(pairCount) {
  return Array.from({ length: pairCount }, (_, i) => i % 2 ? ['B', 'A'] : ['A', 'B']).flat();
}

export function nextDevice(trials, pairCount) {
  const completed = trials.filter((trial) => trial.completed).length;
  return planFor(pairCount)[completed] ?? null;
}

export function createTrial(device, durationMs, now, startedAt) {
  return {
    device, durationMs, startClockMs: now + PREPARE_MS,
    startedAt, events: [], downTimes: [], holdTimes: [], pendingDown: null,
    completed: false, reason: null, excluded: false,
  };
}

// The half-open window is enforced on EVERY callback, even when the stop timer is late.
export function recordEvent(trial, kind, now, x = null, y = null) {
  const elapsedMs = now - trial.startClockMs;
  if (trial.reason !== null || elapsedMs < 0 || elapsedMs >= trial.durationMs) return false;
  if (kind === 'down') {
    if (trial.pendingDown !== null) return false;
    trial.pendingDown = elapsedMs;
    trial.downTimes.push(elapsedMs);
  } else if (kind === 'up') {
    if (trial.pendingDown === null) return false;
    trial.holdTimes.push(elapsedMs - trial.pendingDown);
    trial.pendingDown = null;
  } else {
    return false;
  }
  trial.events.push({ sequence: trial.events.length + 1, kind, elapsedMs, x, y });
  return true;
}

export function finishTrial(trial, now, interruptedReason = null) {
  const elapsed = Math.max(0, now - trial.startClockMs);
  const completed = interruptedReason === null && elapsed >= trial.durationMs;
  return {
    ...trial,
    completed,
    reason: completed ? 'completed' : (interruptedReason ?? 'stopped'),
    observedDurationMs: Math.min(elapsed, trial.durationMs),
    stoppedAt: new Date().toISOString(),
    unmatchedDown: trial.pendingDown !== null,
    stats: computeClickStats(trial.downTimes, trial.holdTimes),
    cps: completed ? trial.downTimes.length / (trial.durationMs / 1000) : null,
  };
}

export function summarize(trials, device) {
  const included = trials.filter((trial) => trial.device === device && trial.completed && !trial.excluded);
  const values = included.map((trial) => trial.cps);
  return {
    roundCount: included.length,
    totalClicks: included.reduce((sum, trial) => sum + trial.stats.clickCount, 0),
    medianCps: median(values),
    minCps: values.length ? Math.min(...values) : null,
    maxCps: values.length ? Math.max(...values) : null,
    medianClickIntervalMs: median(included.map((trial) => trial.stats.medianClickIntervalMs).filter(Number.isFinite)),
    medianHoldMs: median(included.map((trial) => trial.stats.medianHoldMs).filter(Number.isFinite)),
  };
}

// Neutralize spreadsheet formulas in user-supplied names/notes before CSV quoting.
export function csvCell(value) {
  let result = String(value ?? '');
  if (/^[\s]*[=+@-]/u.test(result)) result = `'${result}`;
  return `"${result.replaceAll('"', '""')}"`;
}
