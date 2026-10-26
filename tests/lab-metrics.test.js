import test from 'node:test';
import assert from 'node:assert/strict';
import { pollingStats, nearestRate, cpiFromCounts, deviationPct, segmentStrokes, accelerationStats,
  jitterStats, fitLine, buttonStats, wheelStats, frameLatencyMs, latencySummary } from '../src/lab-metrics.js';

const near = (actual, expected, tol, msg) => assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} ${actual} vs ${expected}`);

test('pollingStats recovers a steady 1000 Hz stream and ignores pauses', () => {
  const ts = [];
  for (let i = 0; i < 2000; i += 1) ts.push(i);           // 2 s of 1 ms reports
  for (let i = 0; i < 1000; i += 1) ts.push(2500 + i);    // 0.5 s pause, then 1 s more
  const s = pollingStats(ts);
  near(s.avgHz, 1000, 1, 'avg');
  assert.equal(s.nominalHz, 1000);
  assert.equal(s.medianIntervalMs, 1);
  near(s.windowMedianHz, 1000, 15, 'window');
  assert.ok(s.stabilityPct > 95);
  assert.equal(s.longGaps, 0);
});

test('pollingStats keeps the rate correct when timestamps are coarsened at 8 kHz', () => {
  const ts = [];
  for (let i = 0; i < 16000; i += 1) ts.push(Math.floor(i * 0.125)); // 8 kHz seen through a 1 ms clock
  const s = pollingStats(ts);
  near(s.avgHz, 8000, 40, 'avg');
  assert.equal(s.nominalHz, 8000);
  assert.ok(s.zeroIntervals > 0);
  assert.equal(s.longGaps, null);
});

test('pollingStats flags dropped reports and invalid timestamps', () => {
  const ts = [];
  for (let i = 0; i < 500; i += 1) ts.push(i * 2);        // 500 Hz
  ts.push(ts.at(-1) + 9);                                 // a 9 ms hole
  ts.push(ts.at(-1) - 1);                                 // a clock step backwards
  const s = pollingStats(ts);
  assert.equal(s.nominalHz, 500);
  assert.equal(s.longGaps, 1);
  assert.equal(s.invalid, 1);
});

test('nearestRate and CPI helpers', () => {
  assert.equal(nearestRate(930), 1000);
  assert.equal(nearestRate(3700), 4000);
  assert.equal(nearestRate(null), null);
  near(cpiFromCounts(-3149.6, 10), 800, 0.01, 'cpi');
  near(deviationPct(816, 800), 2, 1e-9, 'dev');
  assert.equal(cpiFromCounts(100, 0), null);
});

test('segmentStrokes splits back-and-forth movement and drops short wiggles', () => {
  const deltas = [];
  let t = 0;
  const stroke = (counts, steps, dir) => { for (let i = 0; i < steps; i += 1) deltas.push({ dx: dir * counts / steps, dy: 0, t: (t += 1) }); };
  stroke(1000, 100, 1); stroke(1000, 50, -1); stroke(40, 4, 1); stroke(1000, 20, 1);
  const strokes = segmentStrokes(deltas);
  assert.equal(strokes.length, 3);
  assert.deepEqual(strokes.map((s) => s.dir), [1, -1, 1]);
  assert.ok(strokes[2].speed > strokes[0].speed);
});

test('accelerationStats detects positive acceleration', () => {
  const strokes = [];
  for (let i = 0; i < 9; i += 1) strokes.push({ counts: 1000 + i * 20, speed: 1 + i });
  const a = accelerationStats(strokes);
  assert.ok(a.enough);
  assert.ok(a.diffPct > 9 && a.diffPct < 13);
  assert.equal(accelerationStats(strokes.slice(0, 4)).enough, false);
});

test('jitterStats reports a still sensor as clean', () => {
  assert.equal(jitterStats([], 10000).clean, true);
  const j = jitterStats([{ dx: 1, dy: 0 }, { dx: 0, dy: -2 }, { dx: 0, dy: 0 }], 10000);
  assert.equal(j.events, 2);
  assert.equal(j.totalCounts, 3);
  assert.equal(j.maxStep, 2);
});

test('fitLine gives angle and deviation', () => {
  const flat = Array.from({ length: 50 }, (_, i) => ({ x: i * 10, y: 100 + (i % 2 ? 1 : -1) }));
  const f = fitLine(flat);
  near(f.angleDeg, 0, 0.5, 'angle');
  near(f.rmsPx, 1, 0.05, 'rms');
  const diag = Array.from({ length: 50 }, (_, i) => ({ x: i, y: -i })); // up-right on screen
  near(fitLine(diag).angleDeg, 45, 1e-6, 'diag');
  assert.equal(fitLine([{ x: 0, y: 0 }]), null);
});

test('buttonStats counts presses, holds and suspected chatter', () => {
  const ev = [
    { button: 0, type: 'down', t: 0 }, { button: 0, type: 'up', t: 60 },
    { button: 0, type: 'down', t: 200 }, { button: 0, type: 'up', t: 205 },
    { button: 0, type: 'down', t: 212 }, { button: 0, type: 'up', t: 270 },
    { button: 3, type: 'down', t: 400 }, { button: 3, type: 'up', t: 480 },
  ];
  const s = buttonStats(ev);
  assert.equal(s[0].downs, 3);
  assert.equal(s[0].suspected, 1);
  assert.equal(s[0].suspectedEvents[0].releaseGapMs, 7);
  assert.equal(s[0].holdMedianMs, 58);
  assert.equal(s[3].downs, 1);
});

test('wheelStats finds reversed notches', () => {
  const ev = [100, 100, 100, -100, 100, 100].map((deltaY) => ({ deltaY }));
  const w = wheelStats(ev);
  assert.equal(w.dominant, 'down');
  assert.equal(w.reversed, 1);
  near(w.reversedPct, 16.67, 0.01, 'pct');
});

test('frame latency from slow-motion video', () => {
  near(frameLatencyMs(6, 240), 25, 1e-9, 'ms');
  assert.equal(frameLatencyMs(3, 0), null);
  const s = latencySummary([{ ms: 25, fps: 240 }, { ms: 20.8, fps: 240 }, { ms: 29.2, fps: 240 }]);
  assert.equal(s.medianMs, 25);
  near(s.resolutionMs, 4.17, 0.01, 'res');
});

import { rawAnalysis, toMouseTesterCsv, timestampQuantumMs } from '../src/lab-metrics.js';

test('rawAnalysis measures peak speed in m/s from DPI', () => {
  // 1000 Hz, 1600 DPI, 63 counts per ms = 63000 counts/s = 1 m/s
  const samples = Array.from({ length: 200 }, (_, i) => ({ t: i, dx: 63, dy: 0 }));
  const r = rawAnalysis(samples, 1600);
  assert.ok(Math.abs(r.peakSpeedMs - 63 * 1000 / (1600 / 0.0254)) < 0.02, String(r.peakSpeedMs));
  assert.equal(r.maxAbsCount, 63);
  assert.equal(r.spinouts, 0);
  assert.equal(r.dropouts, 0);
});

test('rawAnalysis flags spin-outs, dropouts and the 8-bit cap', () => {
  const samples = Array.from({ length: 200 }, (_, i) => ({ t: i, dx: 127, dy: 0 }));
  samples[100].dx = -40;   // reversal mid-swipe
  samples[120].dx = 0;     // empty report mid-swipe
  const r = rawAnalysis(samples, 800);
  assert.equal(r.spinouts, 1);
  assert.equal(r.dropouts, 1);
  assert.ok(r.capHits > 150);
  assert.equal(rawAnalysis(samples.slice(0, 1), 800).enough, false);
});

test('MouseTester CSV layout and timestamp quantum', () => {
  const csv = toMouseTesterCsv([{ t: 10, dx: 1, dy: -2 }, { t: 11.125, dx: 0, dy: 3 }], 800, 'G PRO, test');
  assert.deepEqual(csv.split('\n'), ['G PRO test', '800', 'xCount,yCount,Time (ms)', '1,-2,0.000000', '0,3,1.125000']);
  assert.equal(timestampQuantumMs([0, 0.1, 0.1, 0.3]), 0.1);
});

test('rawAnalysis works at 125 Hz and ignores turnarounds', () => {
  // back-and-forth at 125 Hz: 8 ms reports, sine velocity, direction flips at low speed
  const samples = Array.from({ length: 500 }, (_, i) => ({ t: i * 8, dx: Math.round(400 * Math.sin(i / 10)), dy: 0 }));
  const r = rawAnalysis(samples, 800);
  assert.ok(r.peakSpeedMs > 1, String(r.peakSpeedMs));
  assert.equal(r.spinouts, 0);
  assert.equal(r.dropouts, 0);
});

import { COIN_GRAMS, coinGrams, forceSummary, forceDiffPct } from '../src/lab-metrics.js';

test('coin weights and click force summary', () => {
  assert.equal(COIN_GRAMS[1], 1);
  assert.equal(coinGrams({ 1: 42, 10: 2 }, 3.5), 54.5);
  assert.equal(coinGrams({ 3: 1 }), null);
  const runs = [
    { mouse: 'Viper', button: 'left', grams: 60 }, { mouse: 'Viper', button: 'left', grams: 62 }, { mouse: 'Viper', button: 'left', grams: 58 },
    { mouse: 'X3', button: 'left', grams: 40 }, { mouse: 'X3', button: 'left', grams: 44 }, { mouse: 'X3', button: 'left', grams: 0 },
  ];
  const s = forceSummary(runs);
  assert.equal(s.length, 2);
  assert.equal(s[0].medianG, 60);
  assert.equal(s[1].n, 2);
  assert.equal(s[1].medianG, 40);
  near(forceDiffPct(s[0], s[1]), -33.33, 0.01, 'diff');
});
