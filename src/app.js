import { computeClickStats, computeIntervalStats } from "./metrics.js";

const elements = {
  start: document.querySelector("#start-button"),
  stop: document.querySelector("#stop-button"),
  exportJson: document.querySelector("#export-json"),
  exportCsv: document.querySelector("#export-csv"),
  status: document.querySelector("#test-status"),
  area: document.querySelector("#test-area"),
  sampleCount: document.querySelector("#sample-count"),
  duration: document.querySelector("#duration"),
  median: document.querySelector("#median-interval"),
  p95: document.querySelector("#p95-interval"),
  clickCount: document.querySelector("#click-count"),
  clickMedian: document.querySelector("#click-median"),
  clickP95: document.querySelector("#click-p95"),
  clickHold: document.querySelector("#click-hold"),
  details: document.querySelector("#interval-details"),
  quality: document.querySelector("#quality-list")
};

const state = {
  active: false,
  interrupted: false,
  startClockMs: null,
  stopClockMs: null,
  startedAt: null,
  stoppedAt: null,
  events: [],
  moveTimesMs: [],
  clickDownTimesMs: [],
  clickHoldTimesMs: [],
  activePrimaryDownAtMs: null,
};

let refreshTimer = null;

function currentDurationMs() {
  if (state.startClockMs === null) return null;
  const endClockMs = state.active ? performance.now() : state.stopClockMs;
  return Math.max(0, endClockMs - state.startClockMs);
}

function formatMs(value) {
  return value === null ? "—" : value.toFixed(2);
}

function updateQuality(stats, clickStats, durationMs) {
  const notices = [];

  if (state.active) {
    notices.push("测试仍在进行；结束测试后，样本统计才会固定。");
  }
  if (clickStats.clickCount === 0) {
    notices.push("至少完成一次左键点击，才能生成点击对比指标。");
  } else if (clickStats.clickCount < 20) {
    notices.push("主键点击少于 20 次；建议每只鼠标至少完成 3 轮、每轮 20 次以上的相同操作。");
  }
  if (stats.sampleCount > 0 && stats.sampleCount < 100) {
    notices.push("移动事件少于 100 个；移动事件统计的样本较少，但不影响点击指标的单独计算。");
  }
  if (durationMs !== null && durationMs < 10000) {
    notices.push("测试时长少于 10 秒；建议延长测试，再比较不同测试结果。");
  }
  if (state.interrupted) {
    notices.push("测试期间页面曾失焦或进入后台；后台调度可能影响事件间隔。");
  }
  if (stats.invalidTimestampCount > 0 || stats.invalidIntervalCount > 0) {
    notices.push("发现无效或非单调时间戳；相应间隔已从统计中排除。");
  }
  if (stats.intervalCount === 0) {
    notices.push("至少需要两个有效、相邻且按时间递增的移动事件，才能计算间隔。");
  }
  if (notices.length === 0) {
    notices.push("未发现上述常见数据质量问题；结果仍受浏览器与系统调度影响。");
  }

  elements.quality.replaceChildren(...notices.map((notice) => {
    const item = document.createElement("li");
    item.textContent = notice;
    return item;
  }));
}

function render() {
  const stats = computeIntervalStats(state.moveTimesMs);
  const clickStats = computeClickStats(state.clickDownTimesMs, state.clickHoldTimesMs);
  const durationMs = currentDurationMs();

  elements.sampleCount.textContent = String(stats.sampleCount);
  elements.duration.textContent = durationMs === null ? "—" : (durationMs / 1000).toFixed(1);
  elements.median.textContent = formatMs(stats.medianMs);
  elements.p95.textContent = formatMs(stats.p95Ms);
  elements.details.textContent = stats.intervalCount === 0
    ? "平均间隔、最小值和最大值会在至少采集两个有效移动事件后显示。"
    : `平均间隔 ${formatMs(stats.meanMs)} ms · 最小 ${formatMs(stats.minMs)} ms · 最大 ${formatMs(stats.maxMs)} ms · 有效间隔 ${stats.intervalCount} 个`;
  elements.clickCount.textContent = String(clickStats.clickCount);
  elements.clickMedian.textContent = formatMs(clickStats.medianClickIntervalMs);
  elements.clickP95.textContent = formatMs(clickStats.p95ClickIntervalMs);
  elements.clickHold.textContent = formatMs(clickStats.medianHoldMs);
  updateQuality(stats, clickStats, durationMs);
}

function startTest() {
  state.active = true;
  state.interrupted = false;
  state.startClockMs = performance.now();
  state.stopClockMs = null;
  state.startedAt = new Date().toISOString();
  state.stoppedAt = null;
  state.events = [];
  state.moveTimesMs = [];
  state.clickDownTimesMs = [];
  state.clickHoldTimesMs = [];
  state.activePrimaryDownAtMs = null;
  elements.start.disabled = true;
  elements.stop.disabled = false;
  elements.exportJson.disabled = true;
  elements.exportCsv.disabled = true;
  elements.status.textContent = "测试中";
  elements.status.classList.add("is-active");
  elements.area.classList.add("is-active");
  refreshTimer = window.setInterval(render, 250);
  render();
}

function stopTest() {
  if (!state.active) return;

  state.stopClockMs = performance.now();
  state.stoppedAt = new Date().toISOString();
  state.active = false;
  window.clearInterval(refreshTimer);
  refreshTimer = null;
  elements.start.disabled = false;
  elements.stop.disabled = true;
  elements.exportJson.disabled = false;
  elements.exportCsv.disabled = false;
  elements.status.textContent = "测试已结束";
  elements.status.classList.remove("is-active");
  elements.area.classList.remove("is-active");
  render();
}

function recordPointerEvent(event) {
  if (!state.active || event.pointerType !== "mouse") return;

  const elapsedMs = Number((performance.now() - state.startClockMs).toFixed(3));
  const sample = {
    sequence: state.events.length + 1,
    type: event.type,
    elapsedMs,
    clientX: event.clientX,
    clientY: event.clientY,
    buttons: event.buttons,
    button: event.button
  };

  state.events.push(sample);
  if (event.type === "pointermove") state.moveTimesMs.push(sample.elapsedMs);
  if (event.type === "pointerdown" && event.button === 0) {
    state.clickDownTimesMs.push(sample.elapsedMs);
    state.activePrimaryDownAtMs = sample.elapsedMs;
    elements.area.setPointerCapture(event.pointerId);
  }
  if (event.type === "pointerup" && event.button === 0 && state.activePrimaryDownAtMs !== null) {
    const holdMs = sample.elapsedMs - state.activePrimaryDownAtMs;
    if (Number.isFinite(holdMs) && holdMs >= 0) state.clickHoldTimesMs.push(holdMs);
    state.activePrimaryDownAtMs = null;
    if (elements.area.hasPointerCapture(event.pointerId)) elements.area.releasePointerCapture(event.pointerId);
  }
}

function getSessionData() {
  const durationMs = currentDurationMs();
  return {
    schemaVersion: 1,
    startedAt: state.startedAt,
    stoppedAt: state.stoppedAt,
    durationMs: Number((durationMs ?? 0).toFixed(3)),
    clock: "performance.now() elapsed time in milliseconds",
    coordinateUnit: "CSS pixels relative to the viewport",
    metrics: {
      intervalDefinition: "difference in elapsedMs between consecutive pointermove events, in event order",
      percentileMethod: "nearest rank",
      moveEvents: computeIntervalStats(state.moveTimesMs),
      primaryClicks: computeClickStats(state.clickDownTimesMs, state.clickHoldTimesMs)
    },
    limitations: [
      "Records only mouse pointer events delivered to the test area by the browser.",
      "Does not measure USB polling rate, physical click latency, or end-to-end input latency.",
      "Browser scheduling, operating-system load, event coalescing, and page visibility can affect results."
    ],
    events: state.events
  };
}

function downloadFile(filename, contents, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportJson() {
  downloadFile(
    "mouse-feel-score-session.json",
    `${JSON.stringify(getSessionData(), null, 2)}\n`,
    "application/json"
  );
}

function csvCell(value) {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function exportCsv() {
  const headers = ["sequence", "type", "elapsedMs", "clientX", "clientY", "buttons", "button"];
  const rows = state.events.map((event) =>
    headers.map((header) => csvCell(event[header])).join(",")
  );
  downloadFile(
    "mouse-feel-score-events.csv",
    [headers.join(","), ...rows].join("\r\n") + "\r\n",
    "text/csv;charset=utf-8"
  );
}

elements.start.addEventListener("click", startTest);
elements.stop.addEventListener("click", stopTest);
elements.exportJson.addEventListener("click", exportJson);
elements.exportCsv.addEventListener("click", exportCsv);
elements.area.addEventListener("pointermove", recordPointerEvent);
elements.area.addEventListener("pointerdown", recordPointerEvent);
elements.area.addEventListener("pointerup", recordPointerEvent);
window.addEventListener("blur", () => {
  if (state.active) state.interrupted = true;
});
document.addEventListener("visibilitychange", () => {
  if (state.active && document.hidden) state.interrupted = true;
});
