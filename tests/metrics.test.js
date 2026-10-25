import test from "node:test";
import assert from "node:assert/strict";
import { computeClickStats, computeIntervalStats } from "../src/metrics.js";

test("computes interval statistics in milliseconds", () => {
  const stats = computeIntervalStats([0, 10, 20, 40]);

  assert.deepEqual(stats, {
    sampleCount: 4,
    invalidTimestampCount: 0,
    intervalCount: 3,
    invalidIntervalCount: 0,
    minMs: 10,
    meanMs: 40 / 3,
    medianMs: 10,
    p95Ms: 20,
    maxMs: 20
  });
});

test("uses the arithmetic mean for an even number of intervals", () => {
  const stats = computeIntervalStats([0, 10, 30]);
  assert.equal(stats.medianMs, 15);
});

test("uses nearest-rank percentile calculation", () => {
  const elapsedTimes = Array.from({ length: 21 }, (_, index) => index * (index + 1) / 2);
  const stats = computeIntervalStats(elapsedTimes);
  assert.equal(stats.p95Ms, 19);
});

test("keeps zero-length intervals", () => {
  const stats = computeIntervalStats([0, 0, 5]);
  assert.equal(stats.intervalCount, 2);
  assert.equal(stats.minMs, 0);
  assert.equal(stats.medianMs, 2.5);
});

test("excludes decreasing timestamps without sorting away event order", () => {
  const stats = computeIntervalStats([0, 10, 8, 20]);
  assert.equal(stats.intervalCount, 2);
  assert.equal(stats.invalidIntervalCount, 1);
  assert.equal(stats.meanMs, 11);
});

test("does not bridge invalid timestamps when building adjacent intervals", () => {
  const stats = computeIntervalStats([0, Number.NaN, 20]);
  assert.equal(stats.sampleCount, 2);
  assert.equal(stats.invalidTimestampCount, 1);
  assert.equal(stats.intervalCount, 0);
  assert.equal(stats.medianMs, null);
});

test("returns null statistics when there are no valid intervals", () => {
  const stats = computeIntervalStats([]);
  assert.equal(stats.sampleCount, 0);
  assert.equal(stats.intervalCount, 0);
  assert.equal(stats.minMs, null);
  assert.equal(stats.meanMs, null);
  assert.equal(stats.medianMs, null);
  assert.equal(stats.p95Ms, null);
  assert.equal(stats.maxMs, null);
});

test("rejects non-array input", () => {
  assert.throws(() => computeIntervalStats(null), TypeError);
});

test("computes click rhythm and hold-time summaries separately", () => {
  const stats = computeClickStats([0, 100, 240], [20, 30, 10]);
  assert.equal(stats.clickCount, 3);
  assert.equal(stats.medianClickIntervalMs, 120);
  assert.equal(stats.p95ClickIntervalMs, 140);
  assert.equal(stats.validHoldCount, 3);
  assert.equal(stats.medianHoldMs, 20);
});

test("rejects non-array click hold times", () => {
  assert.throws(() => computeClickStats([], null), TypeError);
});
