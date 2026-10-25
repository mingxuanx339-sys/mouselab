function percentileNearestRank(sortedValues, percentile) {
  const rank = Math.ceil(percentile * sortedValues.length);
  return sortedValues[Math.max(0, rank - 1)];
}

export function computeIntervalStats(elapsedTimesMs) {
  if (!Array.isArray(elapsedTimesMs)) {
    throw new TypeError("elapsedTimesMs must be an array");
  }

  let sampleCount = 0;
  let invalidTimestampCount = 0;
  let invalidIntervalCount = 0;
  const intervals = [];

  for (let index = 0; index < elapsedTimesMs.length; index += 1) {
    const timestamp = elapsedTimesMs[index];
    if (!Number.isFinite(timestamp) || timestamp < 0) {
      invalidTimestampCount += 1;
      continue;
    }

    sampleCount += 1;
    if (index === 0) continue;

    const previousTimestamp = elapsedTimesMs[index - 1];
    if (!Number.isFinite(previousTimestamp) || previousTimestamp < 0) continue;

    const interval = timestamp - previousTimestamp;
    if (interval < 0) {
      invalidIntervalCount += 1;
      continue;
    }
    intervals.push(interval);
  }

  if (intervals.length === 0) {
    return {
      sampleCount,
      invalidTimestampCount,
      intervalCount: 0,
      invalidIntervalCount,
      minMs: null,
      meanMs: null,
      medianMs: null,
      p95Ms: null,
      maxMs: null
    };
  }

  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const middle = Math.floor(sortedIntervals.length / 2);
  const medianMs = sortedIntervals.length % 2 === 0
    ? (sortedIntervals[middle - 1] + sortedIntervals[middle]) / 2
    : sortedIntervals[middle];

  return {
    sampleCount,
    invalidTimestampCount,
    intervalCount: intervals.length,
    invalidIntervalCount,
    minMs: sortedIntervals[0],
    meanMs: intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length,
    medianMs,
    p95Ms: percentileNearestRank(sortedIntervals, 0.95),
    maxMs: sortedIntervals[sortedIntervals.length - 1]
  };
}

export function computeClickStats(clickDownTimesMs, holdTimesMs) {
  const rhythm = computeIntervalStats(clickDownTimesMs);
  if (!Array.isArray(holdTimesMs)) {
    throw new TypeError("holdTimesMs must be an array");
  }

  const validHolds = holdTimesMs.filter((value) => Number.isFinite(value) && value >= 0);
  const sortedHolds = [...validHolds].sort((a, b) => a - b);
  const middle = Math.floor(sortedHolds.length / 2);

  return {
    clickCount: rhythm.sampleCount,
    invalidClickTimestampCount: rhythm.invalidTimestampCount,
    clickIntervalCount: rhythm.intervalCount,
    invalidClickIntervalCount: rhythm.invalidIntervalCount,
    medianClickIntervalMs: rhythm.medianMs,
    p95ClickIntervalMs: rhythm.p95Ms,
    validHoldCount: sortedHolds.length,
    invalidHoldCount: holdTimesMs.length - sortedHolds.length,
    medianHoldMs: sortedHolds.length === 0
      ? null
      : (sortedHolds.length % 2 === 0
        ? (sortedHolds[middle - 1] + sortedHolds[middle]) / 2
        : sortedHolds[middle]),
  };
}
