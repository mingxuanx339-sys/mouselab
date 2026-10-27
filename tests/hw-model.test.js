import test from 'node:test';
import assert from 'node:assert/strict';
import { computeWheel, computePolling, nearestStandardRate, computeCpi, computeSensor, computeChatter, framesToMs, summarizeLatency } from '../src/hw-model.js';

const steady = (hz, n, start = 0) => Array.from({ length: n }, (_, i) => start + (i * 1000) / hz);

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
});

test('polling: idle gaps are ignored', () => {
  const ts = [...steady(4000, 800, 0), ...steady(4000, 800, 1000)];
  const r = computePolling(ts);
  assert.equal(r.nearest, 4000);
  assert.ok(Math.abs(r.averageHz - 4000) < 20);
});

test('polling: too few samples', () => {
  assert.equal(computePolling([1, 2, 3]).enough, false);
});

test('cpi from ruler', () => {
  const r = computeCpi(1574.8, 0, 5);   // 5 cm at 800 cpi
  assert.ok(Math.abs(r.cpi - 800) < 0.5);
  assert.equal(r.straightness, 1);
  assert.equal(computeCpi(100, 0, 0), null);
});

test('sensor: clean swipe has no spikes; injected jump is caught', () => {
  const s = Array.from({ length: 400 }, (_, i) => ({ t: i, dx: 10, dy: 0 }));
  assert.equal(computeSensor(s).spikes, 0);
  s[200] = { t: 200, dx: 120, dy: 0 };
  s[300] = { t: 300, dx: -10, dy: 0 };
  const r = computeSensor(s, 1600);
  assert.equal(r.spikes, 1);
  assert.equal(r.reversals, 1);
  assert.ok(r.peakMetersPerSecond > 0);
});

test('chatter: flags presses closer than threshold', () => {
  const r = computeChatter([0, 300, 320, 700, 1100], [], 40);
  assert.equal(r.clicks, 5);
  assert.equal(r.suspectCount, 1);
  assert.equal(r.minGapMs, 20);
});

test('latency frames to ms and summary', () => {
  assert.equal(framesToMs(6, 240), 25);
  assert.equal(framesToMs(-1, 240), null);
  const s = summarizeLatency([{ device: 'A', frames: 6, fps: 240 }, { device: 'A', frames: 8, fps: 240 }, { device: 'B', frames: 5, fps: 240 }]);
  assert.equal(s.A.n, 2);
  assert.ok(Math.abs(s.A.medianMs - 29.1667) < 0.01);
  assert.ok(Math.abs(s.B.medianMs - 20.8333) < 0.01);
});

test('polling: skipped reports counted as drops', () => {
  const ts = steady(1000, 1000); const gappy = ts.filter((_, i) => i % 50 !== 25);
  const r = computePolling(gappy);
  assert.equal(r.drops, 20);
});

test('wheel: counts and glitch reversal', () => {
  const ev = [{ t: 0, dy: 100 }, { t: 30, dy: 100 }, { t: 60, dy: -100 }, { t: 90, dy: 100 }, { t: 1000, dy: -100 }];
  const r = computeWheel(ev);
  assert.equal(r.down, 3); assert.equal(r.up, 2); assert.equal(r.reversals, 1);
});

import { summarize, deviationPct, toCsv } from '../src/hw-model.js';
test('summarize repeat runs', () => {
  const s = summarize([1000, 990, 1010]);
  assert.equal(s.n, 3); assert.equal(s.mean, 1000); assert.equal(s.sd, 10); assert.ok(Math.abs(s.cv - 0.01) < 1e-9);
  assert.equal(summarize([]).n, 0); assert.equal(summarize([5]).sd, 0);
});
test('deviation vs nominal', () => {
  assert.equal(deviationPct(816, 800), 2);
  assert.equal(deviationPct(800, 0), null);
});
test('csv quoting', () => {
  assert.equal(toCsv([{ a: 1, b: 'x,y' }, { a: 2, c: 'he said "hi"' }]), 'a,b,c\n1,"x,y",\n2,,"he said ""hi"""\n');
});
