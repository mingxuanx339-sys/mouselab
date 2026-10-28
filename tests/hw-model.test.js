import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computePolling, computeStability, nearestStandardRate, computeCpi, computeAcceleration, computeAngleSnap,
  computeSensor, computeSmoothing, computeStopTail, computeMalfunction, computeDrift,
  computeChatter, computeDebounce, framesToMs, summarizeLatency, computeLod, summarize, deviationPct, toCsv,
} from '../src/hw-model.js';

const steady = (hz, n, start = 0) => Array.from({ length: n }, (_, i) => start + (i * 1000) / hz);
// a believable hand swipe: speed follows a half-sine, each report jitters like a real sensor
const swipe = (n, peak, { jitter = 0.25, seed = 1, hz = 1000, start = 0 } = {}) => {
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5);
  return Array.from({ length: n }, (_, i) => {
    const v = peak * Math.sin((Math.PI * i) / n);
    return { t: start + (i * 1000) / hz, dx: Math.round(v * (1 + jitter * rnd() * 2)), dy: Math.round(rnd() * 2) };
  });
};

test('nearest standard rate', () => {
  assert.equal(nearestStandardRate(990), 1000);
  assert.equal(nearestStandardRate(3700), 4000);
  assert.equal(nearestStandardRate(7600), 8000);
  assert.equal(nearestStandardRate(0), null);
});

test('polling: steady 1000 Hz', () => {
  const r = computePolling(steady(1000, 2000));
  assert.ok(r.enough);
  assert.ok(Math.abs(r.medianHz - 1000) < 1);
  assert.equal(r.nearest, 1000);
  assert.ok(r.stability > 0.99);
  assert.equal(r.drops, 0);
});

test('polling: idle gaps ignored, dropped reports counted', () => {
  const ts = [...steady(4000, 800, 0), ...steady(4000, 800, 1000)];
  assert.equal(computePolling(ts).nearest, 4000);
  const gappy = steady(1000, 1000).filter((_, i) => i % 50 !== 25);
  assert.equal(computePolling(gappy).drops, 20);
});

test('polling: bursty delivery is flagged as inconsistent', () => {
  const steadyRun = computePolling(steady(1000, 2000));
  assert.equal(steadyRun.consistent, true);
  // reports arriving in tight bursts every 10 ms: the median says 10000 Hz, the average says ~1000
  const bursty = [];
  for (let b = 0; b < 200; b++) for (let k = 0; k < 10; k++) bursty.push(b * 10 + k * 0.1);
  const r = computePolling(bursty);
  assert.equal(r.consistent, false);
  assert.ok(r.agreement < 0.7);
});

test('peak speed is null, not zero, when no window spans enough time', () => {
  const sameInstant = Array.from({ length: 200 }, (_, i) => ({ t: 0, dx: 15, dy: 0 }));
  const r = computeSensor(sameInstant, 800);
  assert.equal(r.peakCountsPerSecond, null);
  assert.equal(r.peakIps, null);
  assert.equal(r.peakMetersPerSecond, null);
});

test('polling: too few samples', () => {
  assert.equal(computePolling([1, 2, 3]).enough, false);
});

test('stability: separates real dropouts from machine stalls', () => {
  const ts = steady(1000, 6000);
  // one real link dropout (25 ms) plus shorter pauses a busy machine produces on its own
  const holes = ts.filter((t) => !(t > 3000 && t < 3025)
    && !(t > 1000 && t < 1012) && !(t > 500 && t < 506) && !(t > 4200 && t < 4207));
  const r = computeStability(holes);
  assert.ok(r.enough);
  assert.equal(r.dropoutCount, 1, 'only gaps long enough to feel count as dropouts');
  assert.equal(r.microStallCount, 3, 'shorter pauses are reported separately, not blamed on the mouse');
  assert.ok(Math.abs(r.worstGapMs - 25) < 1);
  assert.ok(r.lostReports >= 24);
  assert.ok(r.buckets.length > 10);
});

test('cpi from ruler', () => {
  const r = computeCpi(1574.8, 0, 5);
  assert.ok(Math.abs(r.cpi - 800) < 0.5);
  assert.equal(r.straightness, 1);
  assert.equal(computeCpi(100, 0, 0), null);
});

test('acceleration: slow vs fast cpi', () => {
  assert.equal(computeAcceleration(800, 800).verdict, 'none');
  assert.equal(computeAcceleration(800, 900).verdict, 'positive');
  assert.equal(computeAcceleration(800, 700).verdict, 'negative');
  assert.ok(Math.abs(computeAcceleration(800, 880).deviationPct - 10) < 1e-9);
  assert.equal(computeAcceleration(0, 800), null);
});

test('angle snapping: natural line vs forced straight line', () => {
  const natural = swipe(400, 20, { jitter: 0.2, seed: 5 });
  assert.equal(computeAngleSnap(natural).verdict, 'none');
  const snapped = natural.map((p) => ({ ...p, dy: 0 }));
  const r = computeAngleSnap(snapped);
  assert.equal(r.verdict, 'snapping');
  assert.equal(r.zeroYRatio, 1);
  assert.ok(r.longestZeroRun > 40);
  assert.equal(computeAngleSnap(natural.slice(0, 10)).enough, false);
});

test('sensor: clean swipe is clean; injected jump and reversal are caught', () => {
  const s = Array.from({ length: 400 }, (_, i) => ({ t: i, dx: 10, dy: 0 }));
  assert.equal(computeSensor(s).spikes, 0);
  s[200] = { t: 200, dx: 120, dy: 0 };
  s[300] = { t: 300, dx: -10, dy: 0 };
  const r = computeSensor(s, 1600);
  assert.equal(r.spikes, 1);
  assert.equal(r.reversals, 1);
  assert.ok(r.peakMetersPerSecond > 0);
  assert.ok(Math.abs(r.peakIps - 10000 / 1600) < 1);
});


test('peak speed ignores degenerate windows with no elapsed time', () => {
  // browsers can deliver coalesced reports sharing one timestamp: that must not invent a speed
  const burst = Array.from({ length: 300 }, (_, i) => ({ t: Math.floor(i / 50), dx: 20, dy: 0 }));
  const r = computeSensor(burst, 800);
  assert.ok(r.enough);
  assert.ok(r.peakCountsPerSecond < 1e5, `peak ${r.peakCountsPerSecond} should stay sane`);
  // a properly timed stream still reports its real speed
  const clean = Array.from({ length: 300 }, (_, i) => ({ t: i, dx: 20, dy: 0 }));
  assert.ok(Math.abs(computeSensor(clean, 800).peakCountsPerSecond - 20000) < 500);
});

test('smoothing: a filtered stream reads smoother than a raw one', () => {
  const raw = swipe(600, 25, { jitter: 0.5, seed: 11 });
  const filtered = raw.map((p, i, a) => {
    const w = a.slice(Math.max(0, i - 7), i + 1);
    return { ...p, dx: w.reduce((x, q) => x + q.dx, 0) / w.length, dy: 0 };
  });
  const rr = computeSmoothing(raw), rf = computeSmoothing(filtered);
  assert.ok(rr.enough && rf.enough);
  assert.ok(rf.roughness < rr.roughness, `${rf.roughness} < ${rr.roughness}`);
  assert.equal(rr.verdict, 'raw');
  assert.equal(rf.verdict, 'smoothed');
});

test('stop tail: filtered motion keeps reporting after the hand stops', () => {
  const base = Array.from({ length: 200 }, (_, i) => ({ t: i, dx: 12, dy: 0 }));
  assert.equal(computeStopTail(base).tailReports, 0);
  const withTail = [...base, ...[5, 3, 2, 1].map((v, k) => ({ t: 200 + k, dx: v, dy: 0 }))];
  const r = computeStopTail(withTail);
  assert.equal(r.tailReports, 4);
  assert.equal(r.tailMs, 4);
  assert.equal(r.tailCounts, 11);
});

test('malfunction speed: counts collapse marks the limit', () => {
  const runs = [
    { peakIps: 50, counts: 8000 }, { peakIps: 90, counts: 7950 }, { peakIps: 140, counts: 8010 },
    { peakIps: 200, counts: 6200 }, { peakIps: 260, counts: 4100 },
  ];
  const r = computeMalfunction(runs);
  assert.ok(r.enough);
  assert.equal(r.malfunctionIps, 200);
  assert.equal(r.verifiedUpToIps, 140);
  assert.equal(r.reached, true);
  const clean = computeMalfunction([{ peakIps: 50, counts: 8000 }, { peakIps: 300, counts: 7900 }]);
  assert.equal(clean.reached, false);
  assert.equal(clean.verifiedUpToIps, 300);
  assert.equal(clean.inconsistentRuns, 0);
});

test('malfunction: a longer swipe is not mistaken for a clean pass', () => {
  // the hand covered more ground on the fast runs, so those runs prove nothing about tracking
  const r = computeMalfunction([
    { peakIps: 40, counts: 8000 }, { peakIps: 90, counts: 8050 },
    { peakIps: 160, counts: 14000 }, { peakIps: 220, counts: 15000 },
  ]);
  assert.equal(r.inconsistentRuns, 2);
  assert.equal(r.verifiedUpToIps, 90);
  assert.equal(r.reached, false);
  assert.equal(r.usable, true);
});

test('static drift: a still mouse should report nothing', () => {
  assert.equal(computeDrift([], 10000).verdict, 'clean');
  const noisy = Array.from({ length: 40 }, (_, i) => ({ t: i * 100, dx: i % 2 ? 1 : -1, dy: 0 }));
  const r = computeDrift(noisy, 10000);
  assert.equal(r.counts, 40);
  assert.equal(r.verdict, 'noisy');
  assert.equal(r.netCounts, 0);
  assert.ok(Math.abs(r.countsPerMinute - 240) < 1e-9);
});

test('chatter: flags presses closer than threshold', () => {
  const r = computeChatter([0, 300, 320, 700, 1100], [], 40);
  assert.equal(r.clicks, 5);
  assert.equal(r.suspectCount, 1);
  assert.equal(r.minGapMs, 20);
});

test('debounce: shortest release-to-press bounds the debounce timer', () => {
  const down = [], up = [];
  for (let i = 0; i < 20; i++) { down.push(i * 100); up.push(i * 100 + 30); }
  down.push(2000); up.push(2030); down.push(2042); up.push(2060);  // one very fast re-press
  const r = computeDebounce(down, up);
  assert.ok(r.enough);
  assert.equal(r.minReleaseToPressMs, 12);
  assert.equal(r.medianHoldMs, 30);
  assert.equal(r.minPressToPressMs, 42);
  assert.equal(computeDebounce([1, 2], [1.5, 2.5]).enough, false);
});

test('latency frames to ms and summary', () => {
  assert.equal(framesToMs(6, 240), 25);
  assert.equal(framesToMs(-1, 240), null);
  const s = summarizeLatency([{ device: 'A', frames: 6, fps: 240 }, { device: 'A', frames: 8, fps: 240 }, { device: 'B', frames: 5, fps: 240 }]);
  assert.equal(s.A.n, 2);
  assert.ok(Math.abs(s.A.medianMs - 29.1667) < 0.01);
  assert.ok(Math.abs(s.B.medianMs - 20.8333) < 0.01);
});

test('lift-off distance brackets the real value', () => {
  const r = computeLod([{ thicknessMm: 1, tracked: true }, { thicknessMm: 2, tracked: false }]);
  assert.equal(r.trackedUpToMm, 1);
  assert.equal(r.stoppedAtMm, 2);
  assert.equal(r.bracketed, true);
  assert.equal(computeLod([]).enough, false);
});

test('summarize repeat runs', () => {
  const s = summarize([1000, 990, 1010]);
  assert.equal(s.n, 3); assert.equal(s.mean, 1000); assert.equal(s.sd, 10);
  assert.ok(Math.abs(s.cv - 0.01) < 1e-9);
  assert.equal(summarize([]).n, 0); assert.equal(summarize([5]).sd, 0);
});

test('deviation vs nominal', () => {
  assert.equal(deviationPct(816, 800), 2);
  assert.equal(deviationPct(800, 0), null);
});

test('csv quoting', () => {
  assert.equal(toCsv([{ a: 1, b: 'x,y' }, { a: 2, c: 'he said "hi"' }]), 'a,b,c\n1,"x,y",\n2,,"he said ""hi"""\n');
});
