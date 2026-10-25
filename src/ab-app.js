import { t, getLang, setLang, applyStatic, LOCALES } from './i18n.js';
import { SCHEMA_VERSION, createTrial, finishTrial, recordEvent,
  nextDevice, summarize, planFor, csvCell } from './ab-model.js';

const $ = (id) => document.getElementById(id);
const storageKey = 'mouse-feel-score-ab-v2';
const defaults = () => ({ schemaVersion: SCHEMA_VERSION, createdAt: new Date().toISOString(),
  names: { A: '', B: '' },
  durationMs: 10000, pairCount: 5, restSeconds: 20, notes: '', trials: [], restUntil: 0 });
let experiment = defaults();
let trial = null;
let timer = null;
let storageWarning = '';
let liveSaved = false;
let recordingView = false;

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
  if (saved?.schemaVersion === SCHEMA_VERSION && Array.isArray(saved.trials)
      && typeof saved.names?.A === 'string' && typeof saved.names?.B === 'string'
      && [5000, 10000, 15000].includes(saved.durationMs)
      && [3, 5, 10].includes(saved.pairCount)
      && [10, 20, 30].includes(saved.restSeconds)) {
    experiment = saved;
    if (saved.inProgress) {
      const recovered = finishTrial(saved.inProgress, saved.inProgress.startClockMs, 'reload');
      experiment.trials.push(recovered);
      delete experiment.inProgress;
      liveSaved = true;
    }
  }
} catch { storageWarning = 'warnOff'; }

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ ...experiment, ...(trial ? { inProgress: trial } : {}) }));
  } catch { storageWarning = 'warnFail'; }
}

function fillSetup() {
  $('mouse-a').value = experiment.names.A;
  $('mouse-b').value = experiment.names.B;
  $('duration-setting').value = experiment.durationMs / 1000;
  $('round-setting').value = experiment.pairCount;
  $('rest-setting').value = experiment.restSeconds;
  $('setup-notes').value = experiment.notes;
}

function readSetup() {
  experiment.names = { A: $('mouse-a').value.trim(), B: $('mouse-b').value.trim() };
  experiment.durationMs = Number($('duration-setting').value) * 1000;
  experiment.pairCount = Number($('round-setting').value);
  experiment.restSeconds = Number($('rest-setting').value);
  experiment.notes = $('setup-notes').value.trim();
}

const number = (value, decimals = 2) => value === null || value === undefined ? '—' : value.toFixed(decimals);
const nameOf = (device, names = experiment.names) => names[device] || t(device === 'A' ? 'mouseA' : 'mouseB');
const restLeft = () => Math.max(0, Math.ceil((experiment.restUntil - Date.now()) / 1000));

function start() {
  if (trial || restLeft()) return;
  if (!experiment.trials.length) { readSetup(); fillSetup(); }
  const device = nextDevice(experiment.trials, experiment.pairCount);
  if (!device) return;
  trial = createTrial(device, experiment.durationMs, performance.now(), new Date().toISOString());
  liveSaved = false;
  $('test-area').focus({ preventScroll: true });
  save();
  render();
  renderResults();
  ensureTimer();
}

function finish(reason = null) {
  if (!trial) return;
  const result = finishTrial(trial, performance.now(), reason);
  result.id = `${Date.now()}-${experiment.trials.length}`;
  result.names = { ...experiment.names };
  experiment.trials.push(result);
  experiment.restUntil = Date.now() + experiment.restSeconds * 1000;
  trial = null;
  save();
  render();
  renderResults();
  ensureTimer();
}

function ensureTimer() {
  if (timer !== null) return;
  timer = window.setInterval(() => {
    if (trial && performance.now() >= trial.startClockMs + trial.durationMs) {
      finish();
    } else {
      // Checkpoint live data at most once per second; keep storage off the input callback.
      const checkpoint = trial ? Math.floor((performance.now() - trial.startClockMs) / 1000) : null;
      if (trial && checkpoint !== liveSaved) { liveSaved = checkpoint; save(); }
      render();
    }
    if (!trial && !restLeft()) { window.clearInterval(timer); timer = null; }
  }, 50);
}

function render() {
  const device = trial?.device ?? nextDevice(experiment.trials, experiment.pairCount);
  const now = performance.now();
  const preparing = trial && now < trial.startClockMs;
  const elapsedMs = trial ? Math.min(trial.durationMs, Math.max(0, now - trial.startClockMs)) : 0;
  const last = experiment.trials.at(-1);
  const completeCount = experiment.trials.filter((item) => item.completed).length;
  const locked = Boolean(trial || experiment.trials.length);
  document.querySelectorAll('#setup input, #setup select, #setup textarea').forEach((input) => { input.disabled = locked; });
  $('start-button').disabled = Boolean(trial || restLeft() || !device);
  $('stop-button').disabled = !trial;
  $('new-button').disabled = Boolean(trial);
  $('export-json').disabled = Boolean(trial || !experiment.trials.length);
  $('export-csv').disabled = Boolean(trial || !experiment.trials.length);
  $('export-image').disabled = Boolean(trial || !experiment.trials.some((item) => item.completed));
  $('next-device').textContent = device ? `${device} · ${nameOf(device)}` : t('allDone');
  $('round-progress').textContent = t('roundsDone', { c: completeCount, n: experiment.pairCount * 2 });
  $('start-button').textContent = restLeft() && !trial ? t('restBtn', { s: restLeft() }) :
    device ? t('prepBtn', { d: device }) : t('doneBtn');
  $('test-status').textContent = trial ? (preparing ? t('stPrep') : t('stClick')) : restLeft() ? t('stRest') : device ? t('statusReady') : t('stDone');
  $('test-status').classList.toggle('is-active', Boolean(trial));
  $('test-area').classList.toggle('is-active', Boolean(trial && !preparing));
  $('area-count').textContent = trial ? (preparing ? String(Math.ceil((trial.startClockMs - now) / 1000)) : String(trial.downTimes.length)) : last ? String(last.stats.clickCount) : 'GO';
  $('area-title').textContent = trial ? (preparing ? t('areaPrep') : t('areaGo')) :
    last ? (last.completed ? t('areaOk', { d: last.device, v: number(last.cps) }) : t('areaCut')) : t('areaIdle');
  $('area-hint').textContent = trial ? (preparing ? t('hintPrep') : t('hintGo')) : t('hintIdle');
  $('time-left').textContent = trial ? number((trial.durationMs - elapsedMs) / 1000, 1) : number(experiment.durationMs / 1000, 1);
  $('live-clicks').textContent = trial ? String(trial.downTimes.length) : String(last?.stats.clickCount ?? 0);
  $('live-cps').textContent = trial ? (elapsedMs > 0 ? number(trial.downTimes.length / (elapsedMs / 1000)) : '—') : number(last?.cps);
  $('time-progress').value = trial ? elapsedMs / trial.durationMs : 0;
  const instructions = (storageWarning ? t(storageWarning) : trial ? t('noteTrial') :
    !device ? t('noteDone') : t('noteNext', { d: device }));
  $('session-notice').textContent = instructions;
}

function appendCell(row, value) {
  const cell = document.createElement('td');
  cell.textContent = String(value);
  row.append(cell);
  return cell;
}

function renderResults() {
  const groups = Object.fromEntries(['A', 'B'].map((device) => [device, summarize(experiment.trials, device)]));
  for (const device of ['A', 'B']) {
    const summary = groups[device];
    $(`name-${device}`).textContent = nameOf(device);
    $(`score-${device}`).textContent = number(summary.medianCps);
    $(`rounds-${device}`).textContent = t('roundsIn', { n: summary.roundCount });
    $(`range-${device}`).textContent = summary.roundCount ? `${number(summary.minCps)}–${number(summary.maxCps)} CPS` : t('rangeWait');
    $(`hold-${device}`).textContent = `${number(summary.medianHoldMs)} ms`;
    $(`interval-${device}`).textContent = `${number(summary.medianClickIntervalMs)} ms`;
  }
  const ready = groups.A.roundCount >= 3 && groups.B.roundCount >= 3;
  $('comparison-note').textContent = ready ?
    t('cmpReady', { v: number(groups.A.medianCps - groups.B.medianCps) }) : t('cmpWait');
  const body = $('round-rows');
  body.replaceChildren();
  const maxCps = Math.max(1, ...experiment.trials.map((item) => item.cps ?? 0));
  experiment.trials.forEach((item, index) => {
    const row = document.createElement('tr');
    row.classList.toggle('excluded', !item.completed || item.excluded);
    appendCell(row, index + 1);
    appendCell(row, `${item.device} · ${nameOf(item.device, item.names ?? experiment.names)}`);
    appendCell(row, item.stats.clickCount);
    const score = appendCell(row, '');
    const bar = document.createElement('span');
    bar.className = `round-bar device-${item.device}`;
    bar.style.width = `${(item.cps ?? 0) / maxCps * 100}%`;
    const label = document.createElement('span');
    label.textContent = number(item.cps);
    score.className = 'bar-cell';
    score.append(bar, label);
    appendCell(row, number(item.stats.medianClickIntervalMs));
    appendCell(row, number(item.stats.medianHoldMs));
    const reasons = { stopped: t('rStopped'), blur: t('rBlur'), hidden: t('rHidden'), cancel: t('rCancel'), reload: t('rReload') };
    const status = appendCell(row, item.completed ? (item.excluded ? t('sExcluded') : t('sComplete')) : reasons[item.reason] ?? t('rOther'));
    if (item.completed) {
      const toggle = document.createElement('button');
      toggle.className = 'text-button';
      toggle.type = 'button';
      toggle.textContent = item.excluded ? t('restore') : t('exclude');
      toggle.disabled = Boolean(trial);
      toggle.setAttribute('aria-label', t(item.excluded ? 'restoreAria' : 'excludeAria', { i: index + 1 }));
      toggle.addEventListener('click', () => { if (trial) return; item.excluded = !item.excluded; save(); renderResults(); });
      status.append(' ', toggle);
    }
    body.append(row);
  });
  $('empty-results').hidden = experiment.trials.length > 0;
  $('order-plan').textContent = planFor(experiment.pairCount).join(' → ');
}

function capture(event) {
  if (!trial || !event.isTrusted || event.pointerType !== 'mouse' || event.button !== 0) return;
  const now = performance.now();
  if (now >= trial.startClockMs + trial.durationMs) { finish(); return; }
  const rect = $('test-area').getBoundingClientRect();
  const inside = event.clientX >= rect.left && event.clientX < rect.right && event.clientY >= rect.top && event.clientY < rect.bottom;
  if (event.type === 'pointerdown' && !inside) return;
  const accepted = recordEvent(trial, event.type === 'pointerdown' ? 'down' : 'up', now, event.clientX, event.clientY);
  if (!accepted) return;
  if (event.type === 'pointerdown') {
    $('test-area').classList.toggle('tap-alt', trial.downTimes.length % 2 === 1);
    $('test-area').setPointerCapture(event.pointerId);
  } else if ($('test-area').hasPointerCapture(event.pointerId)) {
    $('test-area').releasePointerCapture(event.pointerId);
  }
  event.preventDefault();
}

function data() {
  return { ...experiment, exportedAt: new Date().toISOString(),
    definitions: { cps: 'left-button downs / full scheduled seconds; incomplete trials excluded',
      clock: 'performance.now() at browser handler, unrounded milliseconds',
      hold: 'paired down-to-up inside recording window; unmatched final down excluded from hold statistics',
      scope: 'one person + mouse + browser; device label is manually selected, not hardware identification',
      limitations: 'Not physical switch latency, USB polling rate or click-to-photon latency; no statistical significance claim' },
    summary: { A: summarize(experiment.trials, 'A'), B: summarize(experiment.trials, 'B') } };
}

function download(filename, content, type) {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const stamp = () => new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');

function exportCsv() {
  const rows = [['trial', 'device', 'name', 'scheduledSeconds', 'observedSeconds', 'clicks', 'cps',
    'medianIntervalMs', 'p95IntervalMs', 'medianHoldMs', 'completed', 'excluded', 'reason', 'startedAt', 'notes']];
  experiment.trials.forEach((item, index) => rows.push([index + 1, item.device, nameOf(item.device, item.names ?? experiment.names),
    item.durationMs / 1000, item.observedDurationMs / 1000, item.stats.clickCount, item.cps,
    item.stats.medianClickIntervalMs, item.stats.p95ClickIntervalMs, item.stats.medianHoldMs,
    item.completed, item.excluded, item.reason, item.startedAt, experiment.notes]));
  download(`mouse-ab-${stamp()}.csv`, '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n', 'text/csv;charset=utf-8');
}

function exportImage() {
  const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1040;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#101715'; ctx.fillRect(0, 0, 1600, 1040);
  const write = (text, x, y, size, color = '#eff4ee', max = 1450) => {
    ctx.fillStyle = color; ctx.font = `${size}px "Microsoft YaHei", "Yu Gothic", "Hiragino Sans", sans-serif`; ctx.fillText(text, x, y, max);
  };
  write(t('imgTitle'), 70, 90, 40);
  write(t('imgSub', { d: experiment.durationMs / 1000, r: experiment.restSeconds, t: new Date().toLocaleString(LOCALES[getLang()]) }), 70, 140, 24, '#99a8a0');
  for (const [i, device] of ['A', 'B'].entries()) {
    const x = 70 + i * 760; const s = summarize(experiment.trials, device);
    ctx.fillStyle = '#18211e'; ctx.fillRect(x, 180, 700, 440);
    write(`${device} · ${nameOf(device)}`, x + 30, 240, 27, i ? '#94c9ff' : '#bcf279', 640);
    write(number(s.medianCps), x + 30, 365, 92, i ? '#94c9ff' : '#bcf279');
    write(t('imgMed', { n: s.roundCount }), x + 30, 415, 25);
    write(t('imgRange', { a: number(s.minCps), b: number(s.maxCps) }), x + 30, 480, 24);
    write(t('imgInt', { v: number(s.medianClickIntervalMs) }), x + 30, 530, 24);
    write(t('imgHold', { v: number(s.medianHoldMs) }), x + 30, 580, 24);
  }
  const a = summarize(experiment.trials, 'A'); const b = summarize(experiment.trials, 'B');
  write(a.roundCount >= 3 && b.roundCount >= 3 ? `A − B：${number(a.medianCps - b.medianCps)} CPS` : t('imgFew'), 70, 690, 30);
  write(t('imgN1'), 70, 750, 24, '#99a8a0');
  write(t('imgN2'), 70, 810, 25, '#bcf279');
  const note = experiment.notes || t('imgNoNotes');
  for (let i = 0; i < Math.min(4, Math.ceil(note.length / 52)); i++) write(note.slice(i * 52, (i + 1) * 52), 70, 870 + i * 32, 22, '#99a8a0');
  canvas.toBlob((blob) => { if (blob) download(`mouse-ab-${stamp()}.png`, blob, 'image/png'); }, 'image/png');
}

$('start-button').addEventListener('click', start);
$('stop-button').addEventListener('click', () => finish('stopped'));
$('test-area').addEventListener('pointerdown', capture);
$('test-area').addEventListener('pointerup', capture);
$('test-area').addEventListener('pointercancel', () => finish('cancel'));
$('test-area').addEventListener('contextmenu', (event) => event.preventDefault());
window.addEventListener('blur', () => finish('blur'));
document.addEventListener('visibilitychange', () => { if (document.hidden) finish('hidden'); });
window.addEventListener('pagehide', save);
$('setup').addEventListener('change', () => { if (!trial && !experiment.trials.length) { readSetup(); save(); render(); renderResults(); } });
$('export-json').addEventListener('click', () => download(`mouse-ab-${stamp()}.json`, JSON.stringify(data(), null, 2) + '\n', 'application/json'));
$('export-csv').addEventListener('click', exportCsv);
$('export-image').addEventListener('click', exportImage);
$('recording-mode').addEventListener('click', () => {
  const active = document.body.classList.toggle('recording-view');
  recordingView = active;
  $('recording-mode').setAttribute('aria-pressed', String(active));
  $('recording-mode').textContent = active ? t('recExit') : t('recMode');
});
$('new-button').addEventListener('click', () => {
  if (trial) return;
  if (experiment.trials.length && !window.confirm(t('confirmNew'))) return;
  const previous = experiment;
  experiment = { ...defaults(), names: { ...previous.names }, durationMs: previous.durationMs,
    pairCount: previous.pairCount, restSeconds: previous.restSeconds, notes: previous.notes };
  fillSetup(); save(); render(); renderResults();
});
function refreshLanguage() {
  applyStatic();
  $('recording-mode').textContent = recordingView ? t('recExit') : t('recMode');
  render(); renderResults();
}
$('lang-select').value = getLang();
$('lang-select').addEventListener('change', () => { setLang($('lang-select').value); refreshLanguage(); });
applyStatic();
fillSetup();
if (liveSaved) save();
render(); renderResults(); ensureTimer();
