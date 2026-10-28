// Pure maths for the hardware lab. No DOM here, so every number is unit-tested.
// Everything works off the raw report stream (pointerrawupdate + getCoalescedEvents under pointer lock),
// which is the closest a browser gets to the USB report stream.

export const STANDARD_RATES = [125, 250, 500, 1000, 2000, 4000, 8000];

export const median = (xs) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const percentile = (xs, p) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
};

export function summarize(values) {
  const v = values.filter(Number.isFinite);
  if (!v.length) return { n: 0, mean: null, sd: null, cv: null, min: null, max: null, median: null };
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = v.length > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (v.length - 1)) : 0;
  return { n: v.length, mean, sd, cv: mean ? sd / Math.abs(mean) : null, min: Math.min(...v), max: Math.max(...v), median: median(v) };
}

export function deviationPct(measured, nominal) {
  if (!Number.isFinite(measured) || !(nominal > 0)) return null;
  return ((measured - nominal) / nominal) * 100;
}

export function nearestStandardRate(hz) {
  if (!Number.isFinite(hz) || hz <= 0) return null;
  return STANDARD_RATES.reduce((best, r) => (Math.abs(Math.log(r / hz)) < Math.abs(Math.log(best / hz)) ? r : best));
}

// ---------------------------------------------------------------- polling

// timestamps in ms. Gaps longer than idleGapMs mean the mouse was not moving, so they are not polling gaps.
export function computePolling(timestamps, { idleGapMs = 25 } = {}) {
  const ts = timestamps.filter(Number.isFinite).sort((a, b) => a - b);
  const intervals = [];
  for (let i = 1; i < ts.length; i++) {
    const d = ts[i] - ts[i - 1];
    if (d > 0 && d <= idleGapMs) intervals.push(d);
  }
  if (intervals.length < 20) return { samples: ts.length, intervals: intervals.length, enough: false };
  const med = median(intervals);
  const movingMs = intervals.reduce((a, b) => a + b, 0);
  const medianHz = 1000 / med;
  const averageHz = intervals.length / (movingMs / 1000);
  const within = intervals.filter((d) => d >= med * 0.5 && d <= med * 1.5).length / intervals.length;
  // a report that arrived a whole slot (or more) late: the previous one was dropped
  const drops = intervals.reduce((n, d) => n + Math.max(0, Math.round(d / med) - 1), 0);
  return {
    samples: ts.length, intervals: intervals.length, enough: true,
    medianIntervalMs: med, medianHz, averageHz,
    p5Hz: 1000 / percentile(intervals, 0.95), p95Hz: 1000 / percentile(intervals, 0.05),
    nearest: nearestStandardRate(Math.max(medianHz, averageHz)),
    stability: within, movingMs, drops, dropRate: drops / (intervals.length + drops),
    worstGapMs: Math.max(...intervals),
    // A trustworthy run has a median and an average that agree. When they do not, reports are
    // arriving in bursts (coalesced delivery, a stalled page, a flaky link) and no single number
    // describes the rate honestly.
    consistent: medianHz > 0 && averageHz > 0 && Math.max(medianHz / averageHz, averageHz / medianHz) <= 1.5,
    agreement: medianHz > 0 && averageHz > 0 ? Math.min(medianHz, averageHz) / Math.max(medianHz, averageHz) : null,
  };
}

// connection health over a long run: rate per window + gaps where reports stopped while the hand kept moving
export function computeStability(timestamps, { windowMs = 250, gapFactor = 4, idleGapMs = 25, dropoutMs = 20 } = {}) {
  const ts = timestamps.filter(Number.isFinite).sort((a, b) => a - b);
  if (ts.length < 50) return { enough: false, samples: ts.length };
  const base = computePolling(ts, { idleGapMs });
  if (!base.enough) return { enough: false, samples: ts.length };
  const slot = base.medianIntervalMs;
  // Two tiers, because a browser cannot tell "the mouse went quiet" from "the page was busy".
  // Short stalls are mostly the machine (GC, compositing, another app) and would wrongly blame
  // the mouse if counted as dropouts. Only gaps long enough to feel are reported as dropouts.
  const dropouts = [], microStalls = [];
  for (let i = 1; i < ts.length; i++) {
    const d = ts[i] - ts[i - 1];
    if (d <= Math.max(slot * gapFactor, 3) || d > idleGapMs * 40) continue;
    const entry = { atMs: ts[i - 1] - ts[0], gapMs: d, lostReports: Math.max(1, Math.round(d / slot) - 1) };
    if (d >= Math.max(dropoutMs, slot * 20)) dropouts.push(entry); else microStalls.push(entry);
  }
  const t0 = ts[0], span = ts[ts.length - 1] - t0;
  const buckets = [];
  for (let start = 0; start < span; start += windowMs) {
    const n = ts.filter((t) => t - t0 >= start && t - t0 < start + windowMs).length;
    buckets.push({ atMs: start, hz: (n / windowMs) * 1000 });
  }
  const active = buckets.filter((b) => b.hz > base.medianHz * 0.2);
  const all = [...dropouts, ...microStalls];
  return {
    enough: true, samples: ts.length, spanMs: span, medianHz: base.medianHz, nearest: base.nearest,
    buckets, dropouts, dropoutCount: dropouts.length,
    microStalls, microStallCount: microStalls.length,
    worstGapMs: all.length ? Math.max(...all.map((d) => d.gapMs)) : (base.worstGapMs ?? null),
    lostReports: dropouts.reduce((a, d) => a + d.lostReports, 0),
    activeMedianHz: median(active.map((b) => b.hz)),
    dropoutsPerMinute: span > 0 ? (dropouts.length / span) * 60000 : null,
  };
}

// ---------------------------------------------------------------- sensor

// ruler test: summed raw counts over a measured physical distance
export function computeCpi(sumDx, sumDy, distanceCm) {
  if (!(distanceCm > 0)) return null;
  const counts = Math.hypot(sumDx, sumDy);
  const inches = distanceCm / 2.54;
  return { counts, cpi: counts / inches, straightness: counts ? Math.abs(sumDx) / counts : null };
}

// built-in acceleration / prediction: same physical distance, slow vs fast
export function computeAcceleration(slowCpi, fastCpi) {
  if (!(slowCpi > 0) || !(fastCpi > 0)) return null;
  const ratio = fastCpi / slowCpi;
  const pct = (ratio - 1) * 100;
  return { ratio, deviationPct: pct, verdict: Math.abs(pct) < 5 ? 'none' : pct > 0 ? 'positive' : 'negative' };
}

// angle snapping / prediction: a hand-drawn horizontal line is never perfectly straight.
// Snapping forces dy to exactly 0 for long runs.
export function computeAngleSnap(samples) {
  const s = samples.filter((p) => Number.isFinite(p.dx) && Number.isFinite(p.dy));
  const moving = s.filter((p) => Math.abs(p.dx) >= 2);
  if (moving.length < 60) return { enough: false, samples: moving.length };
  const zeroY = moving.filter((p) => p.dy === 0).length;
  const sumX = Math.abs(moving.reduce((a, p) => a + p.dx, 0));
  const sumAbsY = moving.reduce((a, p) => a + Math.abs(p.dy), 0);
  let longestZeroRun = 0, run = 0;
  for (const p of moving) { if (p.dy === 0) { run++; longestZeroRun = Math.max(longestZeroRun, run); } else run = 0; }
  const zeroRatio = zeroY / moving.length;
  return {
    enough: true, samples: moving.length, zeroYRatio: zeroRatio, longestZeroRun,
    yPerX: sumX ? sumAbsY / sumX : null,
    verdict: zeroRatio > 0.9 && longestZeroRun > 40 ? 'snapping' : zeroRatio > 0.75 ? 'suspect' : 'none',
  };
}

// sensor behaviour from one swipe: spikes, reversals, peak speed, smoothing indicator, stop tail
export function computeSensor(samples, cpi = null, { windowMs = 10 } = {}) {
  const s = samples.filter((p) => Number.isFinite(p.t) && Number.isFinite(p.dx) && Number.isFinite(p.dy)).sort((a, b) => a.t - b.t);
  if (s.length < 50) return { samples: s.length, enough: false };
  const mag = s.map((p) => Math.hypot(p.dx, p.dy));

  let spikes = 0, reversals = 0;
  for (let i = 4; i < s.length - 4; i++) {
    const around = [...mag.slice(i - 4, i), ...mag.slice(i + 1, i + 5)];
    const m = median(around);
    if (m >= 2 && mag[i] > 5 * m && mag[i] > 20) spikes++;
    const prev = s[i - 1].dx, next = s[i + 1].dx, cur = s[i].dx;
    if (Math.sign(prev) === Math.sign(next) && Math.sign(prev) !== 0 && Math.sign(cur) === -Math.sign(prev)
      && Math.abs(prev) >= 3 && Math.abs(next) >= 3 && Math.abs(cur) >= 3) reversals++;
  }

  // Peak speed over sliding windows (counts per second).
  // Spikes are sensor errors, not motion, so they are replaced by the local median first —
  // otherwise one bad report would fake a top speed the mouse never reached.
  const clean = mag.slice();
  for (let i = 4; i < s.length - 4; i++) {
    const m = median([...mag.slice(i - 4, i), ...mag.slice(i + 1, i + 5)]);
    if (m >= 2 && mag[i] > 5 * m && mag[i] > 20) clean[i] = m;
  }
  // A window is only usable if it really spans time. Browsers deliver coalesced reports that can
  // share a timestamp, and dividing by a near-zero span would invent a speed the mouse never reached.
  let peak = null, j = 0, acc = 0;
  const minSpan = windowMs * 0.6;
  for (let i = 0; i < s.length; i++) {
    acc += clean[i];
    while (s[i].t - s[j].t > windowMs) { acc -= clean[j]; j++; }
    const span = s[i].t - s[j].t;
    if (i - j >= 3 && span >= minSpan) peak = Math.max(peak ?? 0, ((acc - clean[j]) / span) * 1000);
  }

  const perK = (n) => (n / s.length) * 1000;
  return {
    samples: s.length, enough: true, spikes, reversals,
    spikesPer1000: perK(spikes), reversalsPer1000: perK(reversals),
    peakCountsPerSecond: peak,
    peakMetersPerSecond: peak !== null && cpi ? (peak / cpi) * 0.0254 : null,
    peakIps: peak !== null && cpi ? peak / cpi : null,
    smoothing: computeSmoothing(s), tail: computeStopTail(s),
  };
}

// Smoothing / filtering indicator.
// A raw optical sensor produces a jagged velocity curve: each report differs from the last.
// A sensor that averages reports produces a visibly smoother curve.
// roughness = mean |second difference| / mean |speed|, measured only while clearly moving.
export function computeSmoothing(samples, { minMag = 4 } = {}) {
  const s = samples.filter((p) => Number.isFinite(p.dx)).sort((a, b) => a.t - b.t);
  const mag = s.map((p) => Math.hypot(p.dx, p.dy));
  const idx = [];
  for (let i = 2; i < s.length; i++) if (mag[i] >= minMag && mag[i - 1] >= minMag && mag[i - 2] >= minMag) idx.push(i);
  if (idx.length < 60) return { enough: false, samples: idx.length };
  const mean = idx.reduce((a, i) => a + mag[i], 0) / idx.length;
  const secondDiff = idx.reduce((a, i) => a + Math.abs(mag[i] - 2 * mag[i - 1] + mag[i - 2]), 0) / idx.length;
  const roughness = mean ? secondDiff / mean : null;
  // long runs of an identical value are a strong sign of an averaging filter
  let repeats = 0, run = 1;
  for (let k = 1; k < idx.length; k++) {
    if (mag[idx[k]] === mag[idx[k] - 1]) run++; else { if (run >= 3) repeats += run; run = 1; }
  }
  return {
    enough: true, samples: idx.length, meanMagnitude: mean, roughness,
    repeatRatio: repeats / idx.length,
    verdict: roughness === null ? 'unknown' : roughness < 0.18 ? 'smoothed' : roughness < 0.35 ? 'mild' : 'raw',
  };
}

// Motion tail: after the hand stops, a filtered sensor keeps emitting decaying movement.
// Returns how long reports kept coming after the last fast report.
export function computeStopTail(samples, { fastMag = 6, quietMs = 60 } = {}) {
  const s = samples.filter((p) => Number.isFinite(p.t)).sort((a, b) => a.t - b.t);
  let lastFast = -1;
  for (let i = s.length - 1; i >= 0; i--) { if (Math.hypot(s[i].dx, s[i].dy) >= fastMag) { lastFast = i; break; } }
  if (lastFast < 0 || lastFast === s.length - 1) return { enough: lastFast >= 0, tailMs: 0, tailReports: 0, tailCounts: 0 };
  const t0 = s[lastFast].t;
  const after = s.slice(lastFast + 1).filter((p) => p.t - t0 <= quietMs && Math.hypot(p.dx, p.dy) > 0);
  return {
    enough: true,
    tailReports: after.length,
    tailMs: after.length ? after[after.length - 1].t - t0 : 0,
    tailCounts: after.reduce((a, p) => a + Math.hypot(p.dx, p.dy), 0),
  };
}

// Malfunction speed: same physical distance swiped at rising speeds.
// When the sensor loses tracking the counts collapse below the slow baseline.
export function computeMalfunction(runs, { tolerance = 0.1 } = {}) {
  const r = runs.filter((x) => Number.isFinite(x.counts) && Number.isFinite(x.peakIps) && x.counts > 0)
    .map((x) => ({ ...x }))
    .sort((a, b) => a.peakIps - b.peakIps);
  if (r.length < 2) return { enough: false, runs: r.length };
  const baseline = median(r.slice(0, Math.max(1, Math.ceil(r.length / 3))).map((x) => x.counts));
  // Three outcomes per run. "short" is the real finding: the hand covered the same distance but
  // the sensor reported less, so it lost tracking. "long" means the hand simply travelled further,
  // which says nothing about the sensor and must not be read as a pass.
  const scored = r.map((x) => {
    const ratio = x.counts / baseline;
    const state = ratio < 1 - tolerance ? 'short' : ratio > 1 + tolerance ? 'long' : 'ok';
    return { ...x, ratio, state, ok: state === 'ok' };
  });
  const firstBad = scored.find((x) => x.state === 'short') || null;
  const lastGood = [...scored].filter((x) => x.state === 'ok').pop() || null;
  const inconsistent = scored.filter((x) => x.state === 'long').length;
  return {
    enough: true, runs: scored.length, baselineCounts: baseline, scored,
    malfunctionIps: firstBad ? firstBad.peakIps : null,
    verifiedUpToIps: lastGood ? lastGood.peakIps : null,
    reached: Boolean(firstBad),
    inconsistentRuns: inconsistent,
    usable: scored.length - inconsistent >= 2,
  };
}

// Static drift: the mouse is not touched. Any report at all is sensor noise.
export function computeDrift(samples, durationMs) {
  const s = samples.filter((p) => Number.isFinite(p.dx) && Number.isFinite(p.dy));
  const moved = s.filter((p) => p.dx !== 0 || p.dy !== 0);
  const counts = moved.reduce((a, p) => a + Math.hypot(p.dx, p.dy), 0);
  const net = Math.hypot(s.reduce((a, p) => a + p.dx, 0), s.reduce((a, p) => a + p.dy, 0));
  const perMinute = durationMs > 0 ? (counts / durationMs) * 60000 : null;
  return {
    reports: s.length, movingReports: moved.length, counts, netCounts: net, durationMs, countsPerMinute: perMinute,
    verdict: counts === 0 ? 'clean' : counts <= 10 ? 'minor' : 'noisy',
  };
}

// ---------------------------------------------------------------- switch

export function computeChatter(downTimes, upTimes = [], thresholdMs = 40) {
  const d = downTimes.filter(Number.isFinite).sort((a, b) => a - b);
  const suspects = [];
  for (let i = 1; i < d.length; i++) {
    const gap = d[i] - d[i - 1];
    if (gap < thresholdMs) suspects.push({ at: d[i], gapMs: gap });
  }
  const gaps = d.slice(1).map((t, i) => t - d[i]);
  const u = upTimes.filter(Number.isFinite).sort((a, b) => a - b);
  let shortRelease = 0;
  for (const t of d) { const prevUp = u.filter((x) => x < t).pop(); if (prevUp !== undefined && t - prevUp < 15) shortRelease++; }
  return { clicks: d.length, suspects, suspectCount: suspects.length, minGapMs: gaps.length ? Math.min(...gaps) : null, shortRelease };
}

// Debounce window: click as fast as possible. The shortest release→press gap the mouse ever reports
// is an upper bound for its debounce timer, and the press→release times show how the switch is read.
export function computeDebounce(downTimes, upTimes) {
  const d = downTimes.filter(Number.isFinite).sort((a, b) => a - b);
  const u = upTimes.filter(Number.isFinite).sort((a, b) => a - b);
  const holds = [], gaps = [];
  for (const t of d) { const nextUp = u.find((x) => x > t); if (nextUp !== undefined) holds.push(nextUp - t); }
  for (const t of u) { const nextDown = d.find((x) => x > t); if (nextDown !== undefined) gaps.push(nextDown - t); }
  if (d.length < 8) return { enough: false, clicks: d.length };
  const dd = d.slice(1).map((t, i) => t - d[i]);
  return {
    enough: true, clicks: d.length,
    minReleaseToPressMs: gaps.length ? Math.min(...gaps) : null,
    p1ReleaseToPressMs: percentile(gaps, 0.05),
    medianHoldMs: median(holds), minHoldMs: holds.length ? Math.min(...holds) : null,
    minPressToPressMs: dd.length ? Math.min(...dd) : null,
    maxCps: dd.length ? 1000 / median(dd) : null,
  };
}

export function framesToMs(frames, fps) {
  if (!(frames >= 0) || !(fps > 0)) return null;
  return (frames / fps) * 1000;
}

export function summarizeLatency(rows) {
  const by = {};
  for (const r of rows) { const ms = framesToMs(r.frames, r.fps); if (ms === null) continue; (by[r.device] ||= []).push(ms); }
  return Object.fromEntries(Object.entries(by).map(([k, v]) => {
    const s = summarize(v);
    return [k, { n: s.n, medianMs: s.median, meanMs: s.mean, sdMs: s.sd, minMs: s.min, maxMs: s.max }];
  }));
}

// Lift-off distance, measured with shims of known thickness.
// rows: [{ thicknessMm, tracked }]
export function computeLod(rows) {
  const r = rows.filter((x) => Number.isFinite(x.thicknessMm)).sort((a, b) => a.thicknessMm - b.thicknessMm);
  if (!r.length) return { enough: false };
  const lastTracked = [...r].reverse().find((x) => x.tracked) || null;
  const firstStopped = r.find((x) => !x.tracked) || null;
  return {
    enough: true, rows: r,
    trackedUpToMm: lastTracked ? lastTracked.thicknessMm : null,
    stoppedAtMm: firstStopped ? firstStopped.thicknessMm : null,
    bracketed: Boolean(lastTracked && firstStopped && firstStopped.thicknessMm > lastTracked.thicknessMm),
  };
}

// ---------------------------------------------------------------- export

export function toCsv(rows) {
  if (!rows.length) return '';
  const cols = [...rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set())];
  const cell = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n';
}
