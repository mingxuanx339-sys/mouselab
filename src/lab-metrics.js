// Pure analysis helpers for the Sensor & Response Lab (lab.html).
// Every function takes plain numbers/objects so it can be unit-tested in Node.

export const COMMON_RATES = [125, 250, 500, 1000, 2000, 4000, 8000];

const finite = (value) => typeof value === 'number' && Number.isFinite(value);
const sortNum = (values) => values.filter(finite).sort((a, b) => a - b);

// Nearest-rank quantile on an already sorted array (same convention as metrics.js).
export function quantile(sorted, q) {
  if (!sorted.length) return null;
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil(q * sorted.length)));
  return sorted[rank - 1];
}
export const median = (values) => quantile(sortNum(values), 0.5);
export const mean = (values) => {
  const list = values.filter(finite);
  return list.length ? list.reduce((sum, v) => sum + v, 0) / list.length : null;
};

/**
 * Report-rate statistics from event timestamps (ms, arrival order).
 * Intervals longer than pauseMs are treated as the hand pausing and excluded.
 * The headline number is count / active time, which stays valid even when the
 * browser coarsens timestamps (e.g. 0.1 ms) at 4K–8K.
 */
export function pollingStats(timestamps, { pauseMs = 50, windowMs = 100 } = {}) {
  const intervals = [];
  let invalid = 0;
  for (let i = 1; i < timestamps.length; i += 1) {
    const gap = timestamps[i] - timestamps[i - 1];
    if (!finite(gap) || gap < 0) { invalid += 1; continue; }
    intervals.push(gap);
  }
  const active = intervals.filter((gap) => gap <= pauseMs);
  const activeMs = active.reduce((sum, gap) => sum + gap, 0);
  const sorted = sortNum(active);
  const medianInterval = quantile(sorted, 0.5);
  const avgHz = activeMs > 0 ? (active.length / activeMs) * 1000 : null;

  // Window rates: count reports in consecutive windowMs slices of uninterrupted movement.
  const windows = [];
  let windowStart = null;
  let windowCount = 0;
  for (let i = 1; i < timestamps.length; i += 1) {
    const gap = timestamps[i] - timestamps[i - 1];
    if (!finite(gap) || gap < 0 || gap > pauseMs) { windowStart = null; windowCount = 0; continue; }
    if (windowStart === null) { windowStart = timestamps[i - 1]; windowCount = 0; }
    windowCount += 1;
    if (timestamps[i] - windowStart >= windowMs) {
      windows.push((windowCount / (timestamps[i] - windowStart)) * 1000);
      windowStart = timestamps[i];
      windowCount = 0;
    }
  }
  const sortedWindows = sortNum(windows);
  const windowMedian = quantile(sortedWindows, 0.5);
  const windowP5 = quantile(sortedWindows, 0.05);
  const zeroIntervals = active.filter((gap) => gap === 0).length;
  // Long gaps only make sense when the timer resolution is well below the interval.
  const longGaps = medianInterval !== null && medianInterval >= 0.5
    ? active.filter((gap) => gap > medianInterval * 3).length : null;

  return {
    events: timestamps.length,
    activeIntervals: active.length,
    activeMs,
    invalid,
    avgHz,
    nominalHz: nearestRate(avgHz),
    medianIntervalMs: medianInterval,
    p1IntervalMs: quantile(sorted, 0.01),
    p99IntervalMs: quantile(sorted, 0.99),
    windowCount: windows.length,
    windowMedianHz: windowMedian,
    windowP5Hz: windowP5,
    stabilityPct: windowMedian ? (windowP5 / windowMedian) * 100 : null,
    zeroIntervals,
    longGaps,
  };
}

export function nearestRate(hz) {
  if (!finite(hz) || hz <= 0) return null;
  let best = COMMON_RATES[0];
  for (const rate of COMMON_RATES) if (Math.abs(Math.log(rate / hz)) < Math.abs(Math.log(best / hz))) best = rate;
  return best;
}

/** Counts per inch from raw counts over a known physical distance in cm. */
export function cpiFromCounts(counts, distanceCm) {
  if (!finite(counts) || !finite(distanceCm) || distanceCm <= 0) return null;
  return Math.abs(counts) / (distanceCm / 2.54);
}
export function deviationPct(measured, nominal) {
  if (!finite(measured) || !finite(nominal) || nominal <= 0) return null;
  return ((measured - nominal) / nominal) * 100;
}

/**
 * Split raw pointer-lock deltas [{dx, dy, t}] into horizontal strokes between two
 * physical stops. A stroke ends when the hand reverses (after at least minCounts)
 * or pauses longer than pauseMs.
 */
export function segmentStrokes(deltas, { minCounts = 200, pauseMs = 150 } = {}) {
  const strokes = [];
  let current = null;
  let lastT = null;
  const close = () => {
    if (current && Math.abs(current.counts) >= minCounts && current.endT > current.startT) {
      const durationMs = current.endT - current.startT;
      strokes.push({ counts: Math.abs(current.counts), dir: Math.sign(current.counts), durationMs,
        speed: Math.abs(current.counts) / durationMs, offAxis: current.offAxis });
    }
    current = null;
  };
  for (const { dx = 0, dy = 0, t } of deltas) {
    if (lastT !== null && t - lastT > pauseMs) close();
    lastT = t;
    if (!dx) { if (current) { current.offAxis += Math.abs(dy); current.endT = t; } continue; }
    const sign = Math.sign(dx);
    if (current && sign !== Math.sign(current.counts)) {
      if (Math.abs(current.counts) >= minCounts) close();
      else current = null;
    }
    if (!current) current = { counts: 0, offAxis: 0, startT: t, endT: t };
    current.counts += dx;
    current.offAxis += Math.abs(dy);
    current.endT = t;
  }
  close();
  return strokes;
}

/** Compare slow vs fast strokes over the same physical distance. */
export function accelerationStats(strokes) {
  const valid = strokes.filter((s) => finite(s.counts) && finite(s.speed) && s.counts > 0);
  if (valid.length < 6) return { strokes: valid.length, enough: false };
  const bySpeed = [...valid].sort((a, b) => a.speed - b.speed);
  const third = Math.floor(bySpeed.length / 3);
  const slow = bySpeed.slice(0, third);
  const fast = bySpeed.slice(-third);
  const slowCounts = mean(slow.map((s) => s.counts));
  const fastCounts = mean(fast.map((s) => s.counts));
  const all = valid.map((s) => s.counts);
  const avg = mean(all);
  const sd = Math.sqrt(mean(all.map((c) => (c - avg) ** 2)));
  return {
    strokes: valid.length,
    enough: true,
    slowCounts,
    fastCounts,
    slowSpeed: mean(slow.map((s) => s.speed)),
    fastSpeed: mean(fast.map((s) => s.speed)),
    diffPct: ((fastCounts - slowCounts) / slowCounts) * 100,
    cvPct: (sd / avg) * 100,
  };
}

/** Movement reported while the mouse should be perfectly still. */
export function jitterStats(deltas, durationMs) {
  const moving = deltas.filter((d) => d.dx || d.dy);
  const total = moving.reduce((sum, d) => sum + Math.abs(d.dx) + Math.abs(d.dy), 0);
  const maxStep = moving.reduce((max, d) => Math.max(max, Math.abs(d.dx), Math.abs(d.dy)), 0);
  return {
    events: moving.length,
    totalCounts: total,
    maxStep,
    eventsPerSecond: durationMs > 0 ? (moving.length / durationMs) * 1000 : null,
    clean: moving.length === 0,
  };
}

/** Principal-axis line fit: direction angle and RMS perpendicular deviation (px). */
export function fitLine(points) {
  const pts = points.filter((p) => finite(p.x) && finite(p.y));
  if (pts.length < 3) return null;
  const mx = mean(pts.map((p) => p.x));
  const my = mean(pts.map((p) => p.y));
  let sxx = 0; let syy = 0; let sxy = 0;
  for (const p of pts) { const x = p.x - mx; const y = p.y - my; sxx += x * x; syy += y * y; sxy += x * y; }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const ux = Math.cos(theta); const uy = Math.sin(theta);
  let ss = 0; let minT = Infinity; let maxT = -Infinity;
  for (const p of pts) {
    const x = p.x - mx; const y = p.y - my;
    const along = x * ux + y * uy;
    const perp = -x * uy + y * ux;
    ss += perp * perp; minT = Math.min(minT, along); maxT = Math.max(maxT, along);
  }
  let angle = (-theta * 180) / Math.PI; // screen y grows downward; report math-style angle
  if (angle > 90) angle -= 180;
  if (angle <= -90) angle += 180;
  const rms = Math.sqrt(ss / pts.length);
  const length = maxT - minT;
  return { points: pts.length, angleDeg: angle, rmsPx: rms, lengthPx: length, straightnessPct: length > 0 ? (rms / length) * 100 : null };
}

/**
 * Per-button press statistics and suspected chatter (a second press of the same
 * button arriving faster than any human double press, default < 30 ms).
 */
export function buttonStats(events, { chatterMs = 30 } = {}) {
  const buttons = {};
  const get = (b) => (buttons[b] ??= { downs: 0, ups: 0, holds: [], suspected: [], lastDown: null, lastUp: null, open: null });
  for (const { button, type, t } of events) {
    const s = get(button);
    if (type === 'down') {
      if (s.lastDown !== null && t - s.lastDown < chatterMs) s.suspected.push({ t, gapMs: t - s.lastDown, releaseGapMs: s.lastUp !== null && s.lastUp > s.lastDown ? t - s.lastUp : null });
      s.downs += 1; s.lastDown = t; s.open = t;
    } else if (type === 'up') {
      s.ups += 1; s.lastUp = t;
      if (s.open !== null) { s.holds.push(t - s.open); s.open = null; }
    }
  }
  return Object.fromEntries(Object.entries(buttons).map(([b, s]) => [b, {
    downs: s.downs, ups: s.ups, holdMedianMs: median(s.holds), suspected: s.suspected.length, suspectedEvents: s.suspected,
  }]));
}

/** Wheel test: the user scrolls one direction; reversed events indicate skipping. */
export function wheelStats(events) {
  const signs = events.map((e) => Math.sign(e.deltaY)).filter(Boolean);
  const down = signs.filter((s) => s > 0).length;
  const up = signs.filter((s) => s < 0).length;
  const dominant = down >= up ? 1 : -1;
  const reversed = signs.filter((s) => s !== dominant).length;
  const magnitudes = events.map((e) => Math.abs(e.deltaY)).filter((v) => v > 0);
  return {
    events: signs.length,
    down,
    up,
    dominant: signs.length ? (dominant > 0 ? 'down' : 'up') : null,
    reversed,
    reversedPct: signs.length ? (reversed / signs.length) * 100 : null,
    medianDelta: median(magnitudes),
  };
}

/** Click-to-photon latency from a slow-motion video: frames counted at a given fps. */
export function frameLatencyMs(frames, fps) {
  if (!finite(frames) || !finite(fps) || frames < 0 || fps <= 0) return null;
  return (frames * 1000) / fps;
}
export function latencySummary(trials) {
  const values = sortNum(trials.map((tr) => tr.ms));
  return { trials: values.length, medianMs: quantile(values, 0.5), minMs: values[0] ?? null, maxMs: values.at(-1) ?? null, resolutionMs: trials.length ? 1000 / trials[0].fps : null };
}
