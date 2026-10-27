// Pure maths for the hardware tabs. No DOM here, so every number can be unit-tested.

export const STANDARD_RATES = [125, 250, 500, 1000, 2000, 4000, 8000];

const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const percentile = (xs, p) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
};
export { median, percentile };

export function nearestStandardRate(hz) {
  if (!Number.isFinite(hz) || hz <= 0) return null;
  return STANDARD_RATES.reduce((best, r) => (Math.abs(Math.log(r / hz)) < Math.abs(Math.log(best / hz)) ? r : best));
}

// timestamps: ms, any order. Gaps longer than idleGapMs (mouse stopped) are ignored.
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
  const drops = intervals.filter((d) => d > med * 1.75).length;   // a report arrived late / was skipped
  return {
    samples: ts.length, intervals: intervals.length, enough: true,
    medianIntervalMs: med, medianHz, averageHz,
    p5Hz: 1000 / percentile(intervals, 0.95), p95Hz: 1000 / percentile(intervals, 0.05),
    nearest: nearestStandardRate(Math.max(medianHz, averageHz)),
    stability: within, movingMs, drops, dropRate: drops / intervals.length,
  };
}

// ruler test: summed raw counts over a measured physical distance
export function computeCpi(sumDx, sumDy, distanceCm) {
  if (!(distanceCm > 0)) return null;
  const counts = Math.hypot(sumDx, sumDy);
  const inches = distanceCm / 2.54;
  return { counts, cpi: counts / inches, straightness: counts ? Math.abs(sumDx) / counts : null };
}

// samples: [{t, dx, dy}] from a pointer-locked swipe test
export function computeSensor(samples, cpi = null, { windowMs = 10 } = {}) {
  const s = samples.filter((p) => Number.isFinite(p.t) && Number.isFinite(p.dx) && Number.isFinite(p.dy)).sort((a, b) => a.t - b.t);
  if (s.length < 50) return { samples: s.length, enough: false };
  const mag = s.map((p) => Math.hypot(p.dx, p.dy));
  // spikes: a report far larger than its neighbours (sensor jump)
  let spikes = 0, reversals = 0;
  for (let i = 4; i < s.length - 4; i++) {
    const around = [...mag.slice(i - 4, i), ...mag.slice(i + 1, i + 5)];
    const m = median(around);
    if (m >= 2 && mag[i] > 5 * m && mag[i] > 20) spikes++;
    // reversal: one report pointing against a clearly moving, consistent stroke
    const prev = s[i - 1].dx, next = s[i + 1].dx, cur = s[i].dx;
    if (Math.sign(prev) === Math.sign(next) && Math.sign(prev) !== 0 && Math.sign(cur) === -Math.sign(prev)
      && Math.abs(prev) >= 3 && Math.abs(next) >= 3 && Math.abs(cur) >= 3) reversals++;
  }
  // peak speed over sliding windows (counts per second)
  let peak = 0, j = 0, acc = 0;
  for (let i = 0; i < s.length; i++) {
    acc += mag[i];
    while (s[i].t - s[j].t > windowMs) { acc -= mag[j]; j++; }
    const span = Math.max(s[i].t - s[j].t, 1);
    if (i - j >= 3) peak = Math.max(peak, (acc - mag[j]) / span * 1000);
  }
  const perK = (n) => (n / s.length) * 1000;
  const metersPerSecond = cpi ? (peak / cpi) * 0.0254 : null;
  return {
    samples: s.length, enough: true, spikes, reversals,
    spikesPer1000: perK(spikes), reversalsPer1000: perK(reversals),
    peakCountsPerSecond: peak, peakMetersPerSecond: metersPerSecond,
    peakIps: cpi ? peak / cpi : null,
  };
}

// single-click chatter check on one button
export function computeChatter(downTimes, upTimes = [], thresholdMs = 40) {
  const d = downTimes.filter(Number.isFinite).sort((a, b) => a - b);
  const suspects = [];
  for (let i = 1; i < d.length; i++) {
    const gap = d[i] - d[i - 1];
    if (gap < thresholdMs) suspects.push({ at: d[i], gapMs: gap });
  }
  const gaps = d.slice(1).map((t, i) => t - d[i]);
  const u = upTimes.filter(Number.isFinite).sort((a, b) => a - b);
  let shortRelease = 0;          // released and pressed again almost instantly
  for (const t of d) { const prevUp = u.filter((x) => x < t).pop(); if (prevUp !== undefined && t - prevUp < 15) shortRelease++; }
  return { clicks: d.length, suspects, suspectCount: suspects.length, minGapMs: gaps.length ? Math.min(...gaps) : null, shortRelease };
}

export function framesToMs(frames, fps) {
  if (!(frames >= 0) || !(fps > 0)) return null;
  return (frames / fps) * 1000;
}

export function summarizeLatency(rows) {
  const by = {};
  for (const r of rows) { const ms = framesToMs(r.frames, r.fps); if (ms === null) continue; (by[r.device] ||= []).push(ms); }
  return Object.fromEntries(Object.entries(by).map(([k, v]) => [k, { n: v.length, medianMs: median(v), minMs: Math.min(...v), maxMs: Math.max(...v), frameMs: null }]));
}

// wheel: events [{t, dy}] -> notches and direction glitches inside a scroll burst
export function computeWheel(events, { burstGapMs = 160 } = {}) {
  const e = events.filter((x) => Number.isFinite(x.t) && Number.isFinite(x.dy) && x.dy !== 0).sort((a, b) => a.t - b.t);
  let up = 0, down = 0, reversals = 0;
  for (let i = 0; i < e.length; i++) {
    if (e[i].dy < 0) up++; else down++;
    if (i >= 2) {
      const a = e[i - 2], b = e[i - 1], c = e[i];
      // one tick against a burst going the other way: a likely encoder glitch
      if (c.t - a.t < burstGapMs * 2 && Math.sign(a.dy) === Math.sign(c.dy) && Math.sign(b.dy) === -Math.sign(a.dy)) reversals++;
    }
  }
  return { events: e.length, up, down, reversals };
}

// repeat-run summary: mean, sample sd, coefficient of variation
export function summarize(values) {
  const v = values.filter(Number.isFinite);
  if (!v.length) return { n: 0, mean: null, sd: null, cv: null, min: null, max: null };
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const sd = v.length > 1 ? Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (v.length - 1)) : 0;
  return { n: v.length, mean, sd, cv: mean ? sd / Math.abs(mean) : null, min: Math.min(...v), max: Math.max(...v) };
}

export function deviationPct(measured, nominal) {
  if (!Number.isFinite(measured) || !(nominal > 0)) return null;
  return ((measured - nominal) / nominal) * 100;
}

export function toCsv(rows) {
  if (!rows.length) return '';
  const cols = [...rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set())];
  const cell = (v) => { if (v === null || v === undefined) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n';
}
