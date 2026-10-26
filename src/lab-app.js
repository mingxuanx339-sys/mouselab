import { t, getLang, setLang, applyStatic } from './i18n.js';
import './lab-i18n.js';
import { pollingStats, cpiFromCounts, deviationPct, segmentStrokes, accelerationStats, jitterStats,
  fitLine, buttonStats, wheelStats, frameLatencyMs, latencySummary, median, rawAnalysis, toMouseTesterCsv, timestampQuantumMs, coinGrams, forceSummary, forceDiffPct } from './lab-metrics.js';

const $ = (id) => document.getElementById(id);
const fmt = (v, d = 0) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d).replace(/^-(0(?:\.0+)?)$/, '$1'));
const signed = (v, d = 1) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(d)}`);
const results = {};
const setStatus = (n, key) => {
  const el = $(`t${n}-status`);
  if (!el) return;
  el.dataset.i18n = key;
  el.textContent = t(key);
  el.classList.toggle('is-active', key === 'stRun' || key === 'stWait');
};
const setMsg = (n, key, params) => { const el = $(`t${n}-msg`); if (el) { el.textContent = t(key, params); el.dataset.key = key; el.dataset.params = JSON.stringify(params ?? {}); } };
const isFirefox = /firefox/i.test(navigator.userAgent);
const rawSupported = 'onpointerrawupdate' in window;
// Firefox keeps PointerEvent.timeStamp frozen, so fall back to the page clock there.
const stamp = (e) => (isFirefox ? performance.now() : e.timeStamp);
const subEvents = (e) => (!isFirefox && typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : []);
function clockQuantumMs() {
  let prev = performance.now(); let min = Infinity;
  for (let i = 0; i < 20000; i += 1) { const now = performance.now(); const d = now - prev; if (d > 0 && d < min) min = d; prev = now; }
  return Number.isFinite(min) ? min : null;
}
const clock = { quantumMs: clockQuantumMs(), isolated: Boolean(window.crossOriginIsolated) };
function renderClock() {
  const el = $('clock-info');
  const q = clock.quantumMs === null ? '—' : Math.max(1, Math.round(clock.quantumMs * 1000));
  el.textContent = `${t(clock.isolated ? 'clockHi' : 'clockLo', { q })}${isFirefox ? ` ${t('clockFx')}` : ''}`;
  el.classList.toggle('is-warn', isFirefox || !clock.isolated);
}
const settings = () => ({ mouse: $('mouse-name').value.trim(), dpi: Number($('set-dpi').value) || null, hz: Number($('set-hz').value) || null });

// ---------- Pointer lock shared by tests 2, 3, 4 ----------
let lock = null; // { mode, el, deltas: [], raw: bool, onMove, onFinish }
async function startLock(el, mode, handlers) {
  if (lock) return;
  lock = { mode, el, deltas: [], raw: false, ...handlers };
  try {
    const pending = el.requestPointerLock({ unadjustedMovement: true });
    if (pending && typeof pending.then === 'function') { await pending; lock.raw = true; }
  } catch {
    try { await el.requestPointerLock(); } catch { /* handled below */ }
  }
  setTimeout(() => {
    if (lock && document.pointerLockElement !== el) { const n = mode; lock = null; alertLock(n); }
  }, 400);
}
function alertLock(mode) { const map = { dpi: 2, accel: 3, jitter: 4, raw: 8 }; const n = map[mode]; setStatus(n, 'stIdle'); $(`t${n}-msg`).textContent = t('lockErr'); }
function endLock(cancelled) {
  if (!lock) return;
  const current = lock;
  lock = null;
  if (document.pointerLockElement) document.exitPointerLock();
  current.onFinish?.(current, cancelled);
}
document.addEventListener('mousemove', (e) => {
  if (!lock || document.pointerLockElement !== lock.el) return;
  const d = { dx: e.movementX, dy: e.movementY, t: stamp(e) };
  lock.deltas.push(d);
  lock.onMove?.(lock, d);
});
// Recorder: every raw report (pointerrawupdate + coalesced sub-events) while locked.
if (rawSupported) {
  document.addEventListener('pointerrawupdate', (e) => {
    if (!lock || lock.mode !== 'raw' || document.pointerLockElement !== lock.el) return;
    const list = subEvents(e);
    for (const c of (list.length ? list : [e])) if (c.movementX || c.movementY) lock.samples.push({ dx: c.movementX, dy: c.movementY, t: isFirefox ? performance.now() : c.timeStamp });
  });
}
document.addEventListener('mousedown', (e) => {
  if (!lock || document.pointerLockElement !== lock.el || lock.mode === 'jitter') return;
  if (e.button === 0) { e.preventDefault(); endLock(false); }
});
document.addEventListener('pointerlockchange', () => { if (lock && !document.pointerLockElement && lock.started) endLock(true); if (lock && document.pointerLockElement === lock.el) lock.started = true; });

// ---------- 1. Polling rate ----------
const poll = { running: false, ts: [], method: null, startAt: null, timer: null, last: -1 };
const POLL_MS = 5000;
function pollPush(time) { if (time > poll.last) { poll.ts.push(time); poll.last = time; } else if (time === poll.last) poll.ts.push(time); }
function onPollEvent(e) {
  if (!poll.running) return;
  const list = subEvents(e);
  if (list.length > 1) { if (poll.method === 'methodMove') poll.method = 'methodCoal'; list.forEach((c) => pollPush(c.timeStamp)); } else pollPush(stamp(e));
  if (poll.startAt === null) {
    poll.startAt = performance.now();
    poll.timer = setInterval(() => {
      const left = Math.max(0, POLL_MS - (performance.now() - poll.startAt));
      setMsg(1, 'p1Go', { s: (left / 1000).toFixed(1) });
      if (left <= 0) stopPoll();
    }, 100);
  }
}
let lastPollPaint = 0;
function pollLive() {
  if (!poll.running) return;
  const now = performance.now();
  if (now - lastPollPaint > 200 && poll.ts.length > 50) {
    const recent = poll.ts.slice(-2000);
    const s = pollingStats(recent);
    $('t1-live').textContent = fmt(s.avgHz);
    lastPollPaint = now;
  }
  requestAnimationFrame(pollLive);
}
const area1 = $('t1-area');
area1.addEventListener(rawSupported ? 'pointerrawupdate' : 'pointermove', onPollEvent);
$('t1-start').addEventListener('click', () => {
  Object.assign(poll, { running: true, ts: [], method: isFirefox ? 'methodFx' : rawSupported ? 'methodRaw' : 'methodMove', startAt: null, last: -1 });
  clearInterval(poll.timer);
  setStatus(1, 'stRun'); setMsg(1, 'p1Wait');
  $('t1-start').disabled = true; $('t1-stop').disabled = false;
  area1.classList.add('is-active');
  $('t1-live').textContent = '0';
  requestAnimationFrame(pollLive);
});
$('t1-stop').addEventListener('click', stopPoll);
function stopPoll() {
  if (!poll.running) return;
  poll.running = false; clearInterval(poll.timer);
  $('t1-start').disabled = false; $('t1-stop').disabled = true; area1.classList.remove('is-active');
  const s = pollingStats(poll.ts);
  results.polling = { ...s, method: poll.method, setHz: settings().hz, clockQuantumMs: clock.quantumMs, crossOriginIsolated: clock.isolated };
  setStatus(1, 'stDone'); setMsg(1, 'p1Area');
  $('t1-live').textContent = fmt(s.avgHz);
  renderPoll();
  drawPollChart(poll.ts);
  renderSummary();
}
function renderPoll() {
  const s = results.polling;
  if (!s) return;
  $('t1-avg').textContent = fmt(s.avgHz);
  $('t1-nom').textContent = s.nominalHz ?? '—';
  $('t1-stab').textContent = fmt(s.stabilityPct);
  $('t1-method').textContent = t(s.method);
  $('t1-events').textContent = `${s.events} · ${fmt(s.activeMs / 1000, 1)} s`;
  let verdict = '';
  if (s.activeMs < 3000 || s.windowCount < 10) verdict = t('p1Few');
  else if (s.setHz && s.avgHz < s.setHz * 0.9) verdict = t('p1Low', { p: fmt((1 - s.avgHz / s.setHz) * 100) });
  $('t1-verdict').textContent = verdict;
}
function drawPollChart(ts) {
  const canvas = $('t1-chart'); const ctx = canvas.getContext('2d');
  const W = canvas.width; const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (ts.length < 3) return;
  const bins = []; const binMs = 50;
  const t0 = ts[0];
  for (const time of ts) { const i = Math.floor((time - t0) / binMs); bins[i] = (bins[i] ?? 0) + 1; }
  const rates = Array.from(bins, (c) => ((c ?? 0) / binMs) * 1000);
  const max = Math.max(...rates, 1);
  const bw = W / rates.length;
  ctx.fillStyle = '#bcf279';
  rates.forEach((r, i) => { const h = (r / max) * (H - 24); ctx.fillRect(i * bw, H - h, Math.max(1, bw - 1), h); });
  ctx.fillStyle = '#99a8a0'; ctx.font = '20px monospace';
  ctx.fillText(`${fmt(max)} Hz`, 6, 20);
}

// ---------- 2. DPI accuracy ----------
const dpiRuns = [];
$('t2-start').addEventListener('click', () => {
  setStatus(2, 'stRun');
  $('t2-live').textContent = '0';
  startLock($('t2-area'), 'dpi', {
    onMove: (l) => {
      if (l.deltas.length % 4) return;
      const x = l.deltas.reduce((s, d) => s + d.dx, 0); const y = l.deltas.reduce((s, d) => s + d.dy, 0);
      $('t2-live').textContent = Math.abs(x);
      setMsg(2, 'p2Live', { x: Math.abs(x), y: Math.abs(y) });
    },
    onFinish: (l, cancelled) => {
      setMsg(2, 'p2Area');
      if (cancelled) { setStatus(2, dpiRuns.length ? 'stDone' : 'stIdle'); return; }
      const counts = Math.abs(l.deltas.reduce((s, d) => s + d.dx, 0));
      const dist = Number($('t2-dist').value);
      const cpi = cpiFromCounts(counts, dist);
      if (cpi && counts > 50) dpiRuns.push({ counts, distanceCm: dist, cpi, raw: l.raw });
      $('t2-live').textContent = counts;
      setStatus(2, 'stDone');
      renderDpi();
    },
  });
});
$('t2-reset').addEventListener('click', () => { dpiRuns.length = 0; delete results.dpi; setStatus(2, 'stIdle'); $('t2-live').textContent = '0'; renderDpi(); });
function renderDpi() {
  const set = settings().dpi;
  const med = median(dpiRuns.map((r) => r.cpi));
  $('t2-cpi').textContent = fmt(med);
  $('t2-dev').textContent = set ? `${signed(deviationPct(med, set))}%` : '—';
  $('t2-n').textContent = dpiRuns.length;
  $('t2-raw').textContent = dpiRuns.length ? t(dpiRuns.every((r) => r.raw) ? 'rawYes' : 'rawNo') : '—';
  $('t2-rows').innerHTML = '';
  dpiRuns.forEach((r, i) => {
    const tr = document.createElement('tr');
    [i + 1, r.counts, fmt(r.cpi), set ? `${signed(deviationPct(r.cpi, set))}%` : '—'].forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.append(td); });
    $('t2-rows').append(tr);
  });
  if (dpiRuns.length) results.dpi = { setDpi: set, medianCpi: med, deviationPct: set ? deviationPct(med, set) : null, runs: [...dpiRuns] };
  renderSummary();
}

// ---------- 3. Acceleration ----------
$('t3-start').addEventListener('click', () => {
  setStatus(3, 'stRun');
  $('t3-live').textContent = '0';
  startLock($('t3-area'), 'accel', {
    onMove: (l) => { if (l.deltas.length % 16 === 0) { const n = segmentStrokes(l.deltas).length; $('t3-live').textContent = n; setMsg(3, 'p3Live', { n }); } },
    onFinish: (l, cancelled) => {
      setMsg(3, 'p3Area');
      if (cancelled && l.deltas.length < 50) { setStatus(3, 'stIdle'); return; }
      const strokes = segmentStrokes(l.deltas);
      const a = accelerationStats(strokes);
      results.acceleration = { ...a, raw: l.raw, strokeList: strokes };
      $('t3-live').textContent = strokes.length;
      setStatus(3, 'stDone');
      renderAccel();
    },
  });
});
function renderAccel() {
  const a = results.acceleration;
  if (!a) return;
  $('t3-slow').textContent = fmt(a.slowCounts); $('t3-fast').textContent = fmt(a.fastCounts);
  $('t3-slow-u').textContent = a.enough ? `${fmt(a.slowSpeed, 1)} counts/ms` : '';
  $('t3-fast-u').textContent = a.enough ? `${fmt(a.fastSpeed, 1)} counts/ms` : '';
  $('t3-diff').textContent = a.enough ? `${signed(a.diffPct)}%` : '—';
  $('t3-cv').textContent = a.enough ? fmt(a.cvPct, 1) : '—';
  $('t3-verdict').textContent = a.enough ? '' : t('p3Few');
  renderSummary();
}

// ---------- 4. Idle jitter ----------
let jitterTimer = null;
$('t4-start').addEventListener('click', () => {
  if (lock) return;
  const area = $('t4-area');
  setStatus(4, 'stWait');
  let phase = 'arm'; let t0 = performance.now(); const start = { at: null };
  startLock(area, 'jitter', {
    onMove: (l) => { if (phase === 'arm') l.deltas.length = 0; },
    onFinish: (l, cancelled) => {
      clearInterval(jitterTimer);
      if (cancelled || phase !== 'done') { setStatus(4, 'stIdle'); setMsg(4, 'p4Area'); $('t4-live').textContent = '—'; return; }
      const j = jitterStats(l.deltas.filter((d) => d.t >= start.at), 10000);
      results.jitter = { ...j, raw: l.raw };
      setStatus(4, 'stDone'); setMsg(4, 'p4Area');
      renderJitter();
    },
  });
  clearInterval(jitterTimer);
  jitterTimer = setInterval(() => {
    const el = (performance.now() - t0) / 1000;
    if (phase === 'arm') {
      const s = Math.ceil(3 - el);
      $('t4-live').textContent = s; setMsg(4, 'p4Count', { s });
      if (el >= 3) { phase = 'rec'; t0 = performance.now(); start.at = t0; if (lock) lock.deltas.length = 0; setStatus(4, 'stRun'); }
    } else if (phase === 'rec') {
      const s = Math.max(0, Math.ceil(10 - el));
      $('t4-live').textContent = lock ? lock.deltas.filter((d) => d.dx || d.dy).length : 0; setMsg(4, 'p4Rec', { s });
      if (el >= 10) { phase = 'done'; endLock(false); }
    }
  }, 100);
});
function renderJitter() {
  const j = results.jitter;
  if (!j) return;
  $('t4-live').textContent = j.events;
  $('t4-events').textContent = j.events; $('t4-total').textContent = j.totalCounts; $('t4-max').textContent = j.maxStep;
  $('t4-verdict').textContent = j.clean ? t('p4Clean') : t('p4Dirty', { n: j.events });
  $('t4-verdict').classList.toggle('is-bad', !j.clean && j.maxStep > 5);
  renderSummary();
}

// ---------- 5. Line drawing ----------
const canvas5 = $('t5-canvas'); const ctx5 = canvas5.getContext('2d');
const lines = []; let drawing = null;
const toCanvas = (e) => { const r = canvas5.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * canvas5.width, y: ((e.clientY - r.top) / r.height) * canvas5.height }; };
function paint5() {
  ctx5.clearRect(0, 0, canvas5.width, canvas5.height);
  ctx5.lineWidth = 2; ctx5.lineCap = 'round';
  const all = drawing ? [...lines, { pts: drawing, fit: null }] : lines;
  for (const line of all) {
    ctx5.strokeStyle = '#94c9ff'; ctx5.beginPath();
    line.pts.forEach((p, i) => (i ? ctx5.lineTo(p.x, p.y) : ctx5.moveTo(p.x, p.y)));
    ctx5.stroke();
    if (line.fit) {
      const p0 = line.pts[0]; const p1 = line.pts.at(-1);
      ctx5.strokeStyle = 'rgba(188,242,121,.6)'; ctx5.setLineDash([6, 6]); ctx5.beginPath(); ctx5.moveTo(p0.x, p0.y); ctx5.lineTo(p1.x, p1.y); ctx5.stroke(); ctx5.setLineDash([]);
      ctx5.fillStyle = '#bcf279'; ctx5.font = '18px monospace'; ctx5.fillText(String(line.n), p0.x + 6, p0.y - 6);
    }
  }
}
canvas5.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; canvas5.setPointerCapture(e.pointerId); drawing = [toCanvas(e)]; });
canvas5.addEventListener('pointermove', (e) => {
  if (!drawing) return;
  const list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
  (list.length ? list : [e]).forEach((c) => drawing.push(toCanvas(c)));
  paint5();
});
canvas5.addEventListener('pointerup', () => {
  if (!drawing) return;
  const fit = fitLine(drawing);
  if (fit && fit.lengthPx > 60) lines.push({ pts: drawing, fit, n: lines.length + 1 });
  drawing = null; paint5(); renderLines();
});
$('t5-reset').addEventListener('click', () => { lines.length = 0; delete results.lines; paint5(); renderLines(); });
function renderLines() {
  $('t5-rows').innerHTML = '';
  for (const l of [...lines].reverse().slice(0, 12)) {
    const tr = document.createElement('tr');
    [l.n, `${fmt(l.fit.angleDeg, 1)}°`, fmt(l.fit.rmsPx, 2), fmt(l.fit.lengthPx), `${fmt(l.fit.straightnessPct, 2)}%`].forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.append(td); });
    $('t5-rows').append(tr);
  }
  if (lines.length) results.lines = { count: lines.length, medianRmsPx: median(lines.map((l) => l.fit.rmsPx)), lines: lines.map((l) => ({ ...l.fit })) };
  renderSummary();
}

// ---------- 6. Buttons and wheel ----------
const area6 = $('t6-area');
const btnEvents = []; const wheelEvents = [];
area6.addEventListener('contextmenu', (e) => e.preventDefault());
area6.addEventListener('mousedown', (e) => { e.preventDefault(); btnEvents.push({ button: e.button, type: 'down', t: e.timeStamp }); area6.classList.add('is-active'); renderButtons(); });
area6.addEventListener('mouseup', (e) => { e.preventDefault(); btnEvents.push({ button: e.button, type: 'up', t: e.timeStamp }); area6.classList.remove('is-active'); renderButtons(); });
area6.addEventListener('auxclick', (e) => e.preventDefault());
area6.addEventListener('wheel', (e) => { e.preventDefault(); wheelEvents.push({ deltaY: e.deltaY, deltaMode: e.deltaMode, t: e.timeStamp }); renderButtons(); }, { passive: false });
$('t6-threshold').addEventListener('change', renderButtons);
$('t6-reset').addEventListener('click', () => { btnEvents.length = 0; wheelEvents.length = 0; delete results.buttons; renderButtons(); });
function renderButtons() {
  const threshold = Number($('t6-threshold').value);
  const s = buttonStats(btnEvents, { chatterMs: threshold });
  let chatter = 0;
  document.querySelectorAll('[data-button]').forEach((card) => {
    const b = s[card.dataset.button];
    card.querySelector('.metric-value').textContent = b ? b.downs : 0;
    card.querySelector('.metric-unit').textContent = b ? t('uButton', { h: fmt(b.holdMedianMs), c: b.suspected }) : '';
    card.classList.toggle('is-seen', Boolean(b));
    card.classList.toggle('is-bad', Boolean(b?.suspected));
    chatter += b?.suspected ?? 0;
  });
  const w = wheelStats(wheelEvents);
  $('t6-wheel').textContent = w.events;
  $('t6-dir').textContent = w.dominant ? t(w.dominant === 'down' ? 'dirDown' : 'dirUp') : '—';
  $('t6-rev').textContent = w.reversed;
  $('t6-rev-u').textContent = w.events ? `${fmt(w.reversedPct, 1)}%` : '';
  $('t6-verdict').textContent = btnEvents.length ? (chatter ? t('p6Bad', { n: chatter }) : t('p6Clean')) : '';
  $('t6-verdict').classList.toggle('is-bad', chatter > 0);
  if (btnEvents.length || wheelEvents.length) results.buttons = { chatterThresholdMs: threshold, buttons: s, wheel: w };
  renderSummary();
}

// ---------- 7. Slow-motion latency ----------
const area7 = $('t7-area'); const latRuns = [];
area7.addEventListener('pointerdown', () => area7.classList.add('is-down'));
['pointerup', 'pointerleave', 'pointercancel'].forEach((type) => area7.addEventListener(type, () => area7.classList.remove('is-down')));
area7.addEventListener('contextmenu', (e) => e.preventDefault());
$('t7-add').addEventListener('click', () => {
  const frames = Number($('t7-frames').value); const fps = Number($('t7-fps').value);
  const ms = frameLatencyMs(frames, fps);
  if (ms === null || $('t7-frames').value === '') return;
  latRuns.push({ frames, fps, ms });
  $('t7-frames').value = '';
  renderLatency();
});
$('t7-reset').addEventListener('click', () => { latRuns.length = 0; delete results.latency; renderLatency(); });
function renderLatency() {
  const s = latencySummary(latRuns);
  $('t7-med').textContent = fmt(s.medianMs, 1);
  $('t7-range').textContent = s.trials ? `${fmt(s.minMs, 1)}–${fmt(s.maxMs, 1)}` : '—';
  $('t7-n').textContent = s.trials ? `ms · n = ${s.trials}` : '';
  $('t7-res').textContent = fmt(s.resolutionMs, 1);
  $('t7-rows').innerHTML = '';
  latRuns.forEach((r, i) => { const tr = document.createElement('tr'); [i + 1, r.frames, r.fps, fmt(r.ms, 1)].forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.append(td); }); $('t7-rows').append(tr); });
  if (latRuns.length) results.latency = { ...s, runs: [...latRuns] };
  renderSummary();
}


// ---------- 8. Raw recorder ----------
const REC_MS = 10000;
let recSamples = []; let recTimer = null;
$('t8-start').addEventListener('click', () => {
  if (lock) return;
  recSamples = [];
  setStatus(8, 'stRun'); $('t8-live').textContent = '0';
  const t0 = performance.now();
  startLock($('t8-area'), 'raw', {
    samples: [],
    onFinish: (l, cancelled) => {
      clearInterval(recTimer);
      const fromMoves = l.deltas.filter((d) => d.dx || d.dy);
      recSamples = rawSupported && l.samples.length ? l.samples : fromMoves;
      setMsg(8, 'p8Area');
      if (recSamples.length < 20) { setStatus(8, 'stIdle'); return; }
      const a = rawAnalysis(recSamples, settings().dpi ?? 800);
      const p = pollingStats(recSamples.map((x) => x.t));
      const { speedSeries, ...summary } = a;
      results.raw = { ...summary, avgHz: p.avgHz, source: rawSupported && l.samples.length ? 'pointerrawupdate' : 'mousemove', rawInput: l.raw, timestampQuantumMs: timestampQuantumMs(recSamples.map((x) => x.t)) };
      recAnalysis = a;
      setStatus(8, 'stDone');
      $('t8-csv').disabled = false;
      renderRaw();
    },
  });
  clearInterval(recTimer);
  recTimer = setInterval(() => {
    if (!lock || lock.mode !== 'raw') return;
    const n = rawSupported && lock.samples.length ? lock.samples.length : lock.deltas.length;
    const left = Math.max(0, (REC_MS - (performance.now() - t0)) / 1000);
    $('t8-live').textContent = n; setMsg(8, 'p8Live', { n, s: left.toFixed(1) });
    if (left <= 0) endLock(false);
  }, 100);
});
let recAnalysis = null;
$('t8-plot').addEventListener('change', () => drawRawPlot());
$('t8-csv').addEventListener('click', () => {
  if (!recSamples.length) return;
  const text = toMouseTesterCsv(recSamples, settings().dpi ?? 800, settings().mouse || 'MouseLab');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = `mouselab-raw-${(settings().mouse || 'mouse').replace(/[^\w.-]+/g, '-')}.csv`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
function renderRaw() {
  const r = results.raw;
  if (!r) return;
  $('t8-reports').textContent = r.reports;
  $('t8-reports-u').textContent = `${fmt(r.avgHz)} Hz · ${fmt(r.durationMs / 1000, 1)} s`;
  $('t8-peak').textContent = fmt(r.peakSpeedMs, 2);
  $('t8-peak-u').textContent = t('uPeak', { ips: fmt(r.peakSpeedIps) });
  $('t8-max').textContent = r.maxAbsCount;
  $('t8-max-u').textContent = t('uMaxCount', { n: r.capHits });
  $('t8-glitch').textContent = `${r.spinouts} / ${r.dropouts}`;
  const parts = [r.spinouts || r.dropouts ? t('p8Bad', { a: r.spinouts, b: r.dropouts }) : t('p8Clean')];
  if (r.capHits) parts.push(t('p8Cap'));
  $('t8-verdict').textContent = parts.join(' ');
  $('t8-verdict').classList.toggle('is-bad', Boolean(r.spinouts || r.dropouts || r.capHits));
  drawRawPlot();
  renderSummary();
}
function niceStep(range, target) {
  const raw = range / target; const p = 10 ** Math.floor(Math.log10(raw || 1)); const m = raw / p;
  return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
}
function drawRawPlot() {
  const cv = $('t8-plot-canvas'); const ctx = cv.getContext('2d');
  const W = cv.width; const H = cv.height; const L = 110; const R = 30; const T = 30; const B = 70;
  ctx.clearRect(0, 0, W, H);
  if (!recSamples.length || !recAnalysis) return;
  const kind = $('t8-plot').value;
  const t0 = recSamples[0].t;
  let series = []; let xlab = 'Time (ms)'; let ylab = ''; let equal = false; let lines = false;
  if (kind === 'counts') {
    series = [{ c: '#bcf279', pts: recSamples.map((s) => [s.t - t0, s.dx]) }, { c: '#94c9ff', pts: recSamples.map((s) => [s.t - t0, s.dy]) }]; ylab = 'Counts (x green, y blue)'; lines = true;
  } else if (kind === 'interval') {
    series = [{ c: '#bcf279', pts: recSamples.slice(1).map((s, i) => [s.t - t0, s.t - recSamples[i].t]) }]; ylab = 'Interval (ms)';
  } else if (kind === 'velocity') {
    series = [{ c: '#bcf279', pts: recSamples.map((s, i) => [s.t - t0, recAnalysis.speedSeries[i]]) }]; ylab = 'Speed (m/s)'; lines = true;
  } else {
    let x = 0; let y = 0; const pts = [[0, 0]];
    for (const s of recSamples) { x += s.dx; y += s.dy; pts.push([x, y]); }
    series = [{ c: '#94c9ff', pts }]; xlab = 'x (counts)'; ylab = 'y (counts)'; equal = true; lines = true;
  }
  const all = series.flatMap((s) => s.pts);
  let [x0, x1] = [Math.min(...all.map((p) => p[0])), Math.max(...all.map((p) => p[0]))];
  let [y0, y1] = [Math.min(...all.map((p) => p[1])), Math.max(...all.map((p) => p[1]))];
  if (kind === 'interval') y0 = 0;
  if (x1 === x0) x1 = x0 + 1; if (y1 === y0) { y1 += 1; y0 -= 1; }
  const pw = W - L - R; const ph = H - T - B;
  if (equal) {
    const sx = pw / (x1 - x0); const sy = ph / (y1 - y0); const s = Math.min(sx, sy);
    const cx = (x0 + x1) / 2; const cy = (y0 + y1) / 2; x0 = cx - pw / s / 2; x1 = cx + pw / s / 2; y0 = cy - ph / s / 2; y1 = cy + ph / s / 2;
  }
  const X = (v) => L + ((v - x0) / (x1 - x0)) * pw;
  const Y = equal ? (v) => T + ((v - y0) / (y1 - y0)) * ph : (v) => T + ph - ((v - y0) / (y1 - y0)) * ph;
  ctx.font = '22px monospace'; ctx.fillStyle = '#99a8a0'; ctx.strokeStyle = '#2b3933'; ctx.lineWidth = 1;
  const xs = niceStep(x1 - x0, 8); const ys = niceStep(y1 - y0, 6);
  for (let v = Math.ceil(x0 / xs) * xs; v <= x1; v += xs) { ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + ph); ctx.stroke(); ctx.fillText(String(+v.toFixed(3)), X(v) - 18, H - B + 30); }
  for (let v = Math.ceil(y0 / ys) * ys; v <= y1; v += ys) { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.stroke(); ctx.fillText(String(+v.toFixed(3)), 8, Y(v) + 7); }
  ctx.fillText(xlab, L + pw / 2 - 60, H - 14); ctx.fillText(ylab, L + 8, T + 22);
  for (const s of series) {
    ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = 1.5;
    if (lines) { ctx.beginPath(); s.pts.forEach(([a, b], i) => (i ? ctx.lineTo(X(a), Y(b)) : ctx.moveTo(X(a), Y(b)))); ctx.stroke(); }
    if (!lines || s.pts.length < 3000) for (const [a, b] of s.pts) ctx.fillRect(X(a) - 2, Y(b) - 2, 4, 4);
  }
}


// ---------- 9. Click force ----------
const forceRuns = [];
const overlay = $('arm-overlay');
let armed = false; let audioCtx = null;
const buttonName = (b) => t(String(b) === '2' ? 'bRight' : 'bLeft');
function beep() {
  try {
    audioCtx ??= new AudioContext();
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.frequency.value = 1320; gain.gain.value = 0.15; osc.connect(gain).connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.18);
  } catch { /* audio unavailable */ }
}
function setForceMsg(key, params) { const el = $('t9-msg'); el.textContent = key ? t(key, params) : ''; el.dataset.key = key ?? ''; el.dataset.params = JSON.stringify(params ?? {}); }
function disarm() { armed = false; overlay.hidden = true; overlay.classList.remove('is-hit'); }
$('t9-method').addEventListener('change', () => { const coins = $('t9-method').value === 'coins'; $('t9-coins').hidden = !coins; $('t9-scale').hidden = coins; });
$('t9-arm').addEventListener('click', () => {
  if (!settings().mouse) { setForceMsg('p9NeedName'); $('mouse-name').focus(); return; }
  try { audioCtx ??= new AudioContext(); audioCtx.resume(); } catch { /* audio unavailable */ }
  $('arm-hint').textContent = t('armHint', { b: buttonName($('t9-button').value) });
  overlay.hidden = false; overlay.classList.remove('is-hit');
  setTimeout(() => { armed = true; }, 300); // ignore the click that armed it
});
window.addEventListener('mousedown', (e) => {
  if (!armed) return;
  e.preventDefault(); e.stopPropagation();
  if (String(e.button) !== $('t9-button').value) return;
  armed = false;
  overlay.classList.add('is-hit'); beep();
  setTimeout(() => { disarm(); setForceMsg('armHit'); ($('t9-method').value === 'coins' ? $('t9-y1') : $('t9-grams')).focus(); }, 700);
}, true);
overlay.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) { disarm(); setForceMsg(''); } });
$('t9-add').addEventListener('click', () => {
  const coins = $('t9-method').value === 'coins';
  const grams = coins
    ? ($('t9-y1').value === '' ? null : coinGrams({ 1: Number($('t9-y1').value), 10: Number($('t9-y10').value || 0) }, Number($('t9-cap').value || 0)))
    : ($('t9-grams').value === '' ? null : Number($('t9-grams').value));
  if (!grams || grams <= 0) return;
  if (!settings().mouse) { setForceMsg('p9NeedName'); return; }
  forceRuns.push({ mouse: settings().mouse, button: $('t9-button').value === '2' ? 'right' : 'left', grams, method: coins ? 'coins' : 'scale' });
  $('t9-y1').value = ''; $('t9-grams').value = '';
  setForceMsg('');
  renderForce();
});
$('t9-reset').addEventListener('click', () => { forceRuns.length = 0; delete results.force; renderForce(); });
function renderForce() {
  const groups = forceSummary(forceRuns);
  const btn = $('t9-button').value === '2' ? 'right' : 'left';
  const cur = groups.find((g) => g.mouse === settings().mouse && g.button === btn);
  $('t9-cur').textContent = cur ? fmt(cur.medianG, 1) : '—';
  $('t9-cur-u').textContent = cur ? t('uForce', { n: cur.n }) : '';
  const other = groups.find((g) => g.button === btn && g.mouse !== settings().mouse);
  const diff = cur && other ? forceDiffPct(other, cur) : null;
  $('t9-cmp').textContent = diff === null ? '—' : t('forceCmp', { a: other.mouse, b: cur.mouse, p: fmt(Math.abs(diff)), dir: t(diff < 0 ? 'lighter' : 'heavier') });
  $('t9-rows').innerHTML = '';
  for (const g of groups) {
    const tr = document.createElement('tr');
    [g.mouse, t(g.button === 'right' ? 'bRight' : 'bLeft'), g.n, fmt(g.medianG, 1), `${fmt(g.minG, 1)}–${fmt(g.maxG, 1)}`].forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.append(td); });
    $('t9-rows').append(tr);
  }
  if (forceRuns.length) results.force = { groups, runs: [...forceRuns] };
  renderSummary();
}
$('t9-button').addEventListener('change', renderForce);
$('mouse-name').addEventListener('change', renderForce);

// ---------- Summary and export ----------
function renderSummary() {
  const list = $('sum-list'); list.innerHTML = '';
  const add = (key, text) => { const li = document.createElement('li'); const b = document.createElement('strong'); b.textContent = t(key); li.append(b, document.createTextNode(` ${text}`)); list.append(li); };
  if (results.polling) add('nav1', `${fmt(results.polling.avgHz)} Hz · ${fmt(results.polling.stabilityPct)}%`);
  if (results.dpi) add('nav2', `${fmt(results.dpi.medianCpi)} DPI${results.dpi.deviationPct !== null ? ` · ${signed(results.dpi.deviationPct)}%` : ''}`);
  if (results.acceleration?.enough) add('nav3', `${signed(results.acceleration.diffPct)}%`);
  if (results.jitter) add('nav4', `${results.jitter.events} · max ${results.jitter.maxStep}`);
  if (results.lines) add('nav5', `n = ${results.lines.count} · ${fmt(results.lines.medianRmsPx, 2)} px`);
  if (results.buttons) add('nav6', `${Object.values(results.buttons.buttons).reduce((s, b) => s + b.suspected, 0)} · ${results.buttons.wheel.reversed}`);
  if (results.latency) add('nav7', `${fmt(results.latency.medianMs, 1)} ms · n = ${results.latency.trials}`);
  if (results.raw) add('nav8', `${fmt(results.raw.peakSpeedMs, 2)} m/s · ${results.raw.spinouts}/${results.raw.dropouts}`);
  if (results.force) add('nav9', results.force.groups.map((g) => `${g.mouse} ${fmt(g.medianG, 1)} g`).join(' · '));
  if (!list.children.length) { const li = document.createElement('li'); li.className = 'muted'; li.textContent = t('sumEmpty'); list.append(li); }
}
$('export-lab').addEventListener('click', () => {
  const data = { schema: 'mouselab-sensor-lab/1', exportedAt: new Date().toISOString(), userAgent: navigator.userAgent,
    devicePixelRatio: window.devicePixelRatio, clock, settings: settings(), results };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  const name = (settings().mouse || 'mouse').replace(/[^\w.-]+/g, '-');
  a.href = URL.createObjectURL(blob); a.download = `mouselab-sensor-${name}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$('set-dpi').addEventListener('change', renderDpi);
$('set-hz').addEventListener('change', () => { if (results.polling) { results.polling.setHz = settings().hz; renderPoll(); } });

// ---------- Language ----------
function refreshLanguage() {
  applyStatic();
  document.querySelectorAll('[id$="-msg"][data-key]').forEach((el) => { el.textContent = t(el.dataset.key, JSON.parse(el.dataset.params || '{}')); });
  renderClock(); renderPoll(); renderDpi(); renderAccel(); renderJitter(); renderButtons(); renderLatency(); renderRaw(); renderForce(); renderSummary();
  if ($('t9-msg').dataset.key) $('t9-msg').textContent = t($('t9-msg').dataset.key, JSON.parse($('t9-msg').dataset.params || '{}'));
}
$('lang-select').value = getLang();
$('lang-select').addEventListener('change', () => { setLang($('lang-select').value); refreshLanguage(); });
refreshLanguage();
