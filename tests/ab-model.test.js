import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrial, recordEvent, finishTrial, nextDevice, summarize, planFor, csvCell } from '../src/ab-model.js';

const fresh = (device = 'A') => createTrial(device, 10000, 100, '2026-10-22T00:00:00Z');
const click = (trial, t, hold = 25) => {
  recordEvent(trial, 'down', trial.startClockMs + t);
  recordEvent(trial, 'up', trial.startClockMs + t + hold);
};
const complete = (device, clicks) => {
  const trial = fresh(device);
  for (let i = 0; i < clicks; i++) click(trial, i * 50);
  return finishTrial(trial, trial.startClockMs + trial.durationMs);
};

test('countdown and exact end boundary clicks are excluded even if timer has not fired', () => {
  const trial = fresh();
  assert.equal(recordEvent(trial, 'down', trial.startClockMs - 1), false);
  assert.equal(recordEvent(trial, 'down', trial.startClockMs), true);
  assert.equal(recordEvent(trial, 'up', trial.startClockMs + 10), true);
  assert.equal(recordEvent(trial, 'down', trial.startClockMs + 10000), false);
  assert.equal(recordEvent(trial, 'down', trial.startClockMs + 11000), false);
  assert.equal(trial.downTimes.length, 1);
});

test('late stop callback uses the scheduled duration, not inflated elapsed time', () => {
  const trial = fresh(); click(trial, 0); click(trial, 500);
  const result = finishTrial(trial, trial.startClockMs + 11500);
  assert.equal(result.completed, true);
  assert.equal(result.observedDurationMs, 10000);
  assert.equal(result.cps, 0.2);
});

test('unreleased end-of-window down counts once without fabricating a hold duration', () => {
  const trial = fresh(); click(trial, 100);
  recordEvent(trial, 'down', trial.startClockMs + 9999);
  recordEvent(trial, 'up', trial.startClockMs + 10001);
  const result = finishTrial(trial, trial.startClockMs + 10001);
  assert.equal(result.stats.clickCount, 2);
  assert.equal(result.stats.validHoldCount, 1);
  assert.equal(result.stats.medianHoldMs, 25);
  assert.equal(result.unmatchedDown, true);
});

test('unpaired release and repeated down do not generate extra clicks or holds', () => {
  const trial = fresh();
  assert.equal(recordEvent(trial, 'up', trial.startClockMs), false);
  assert.equal(recordEvent(trial, 'down', trial.startClockMs + 1), true);
  assert.equal(recordEvent(trial, 'down', trial.startClockMs + 2), false);
  assert.equal(recordEvent(trial, 'up', trial.startClockMs + 5), true);
  assert.deepEqual(trial.holdTimes, [4]);
});

test('blur, manual stop and reload records are retained but excluded from summary and schedule', () => {
  for (const reason of ['blur', 'hidden', 'stopped', 'reload', 'cancel']) {
    const trial = fresh(); click(trial, 100);
    const result = finishTrial(trial, trial.startClockMs + 1000, reason);
    assert.equal(result.completed, false);
    assert.equal(result.cps, null);
    assert.equal(summarize([result], 'A').roundCount, 0);
    assert.equal(nextDevice([result], 3), 'A');
  }
});

test('complete zero-click trials remain in the median and advance the plan', () => {
  const result = complete('A', 0);
  assert.equal(result.cps, 0);
  assert.equal(summarize([result], 'A').medianCps, 0);
  assert.equal(nextDevice([result], 3), 'B');
});

test('paired order alternates AB then BA and stops at the configured count', () => {
  assert.deepEqual(planFor(3), ['A', 'B', 'B', 'A', 'A', 'B']);
  const trials = planFor(3).map((device) => complete(device, 10));
  assert.equal(nextDevice(trials, 3), null);
});

test('summary uses all included trials, separates devices, and supports reversible exclusion', () => {
  const trials = [complete('A', 10), complete('A', 30), complete('A', 100), complete('B', 80)];
  assert.equal(summarize(trials, 'A').medianCps, 3);
  trials[2].excluded = true;
  assert.equal(summarize(trials, 'A').medianCps, 2);
  assert.equal(summarize(trials, 'A').roundCount, 2);
  assert.equal(summarize(trials, 'B').medianCps, 8);
  trials[2].excluded = false;
  assert.equal(summarize(trials, 'A').roundCount, 3);
});

test('CSV safely escapes formulas, embedded quotes and line breaks', () => {
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  assert.equal(csvCell(' name,"x"\nnext'), '" name,""x""\nnext"');
  assert.equal(csvCell(null), '""');
});
