// "05 / 反应速度": Human-Benchmark-style reaction test, 5 trials per run, saved per mouse (A/B).
// Measures human + mouse + PC + display together; only same-setup comparisons are meaningful.
import { getLang } from './i18n.js';

const pick = (v) => (getLang() === 'zh' ? v[0] : v[1]);
const L = {
  eyebrow: ['05 / 反应速度', '05 / Reaction time'],
  h: ['反应速度测试', 'Reaction test'],
  lead: ['方框变绿的一瞬间，用左键点它。每轮 5 次，取中位数。两只鼠标轮流测，能看出谁在你手里更快——但要记住，这里测的是"你 + 鼠标 + 电脑 + 显示器"的总和。',
    'Click the moment the box turns green. Five tries per run; the median counts. Alternate two mice to see which is quicker in your hand — but this measures you, the mouse, the PC and the display together.'],
  device: ['当前鼠标', 'Mouse'],
  idle: ['点击这里开始', 'Click to start'], idleSub: ['变红后等它变绿，变绿立刻点', 'Wait for red to turn green, then click at once'],
  wait: ['等待变绿…', 'Wait for green…'], go: ['点！', 'Click!'],
  early: ['太早了！', 'Too soon!'], earlySub: ['这次不算，点击重来', 'Not counted — click to retry'],
  next: ['点击继续', 'Click to continue'], of: ['第 {n} / 5 次', 'Try {n} / 5'],
  done: ['本轮完成', 'Run complete'], doneSub: ['点击再测一轮，或切换鼠标', 'Click for another run, or switch mouse'],
  med: ['本轮中位数', 'Run median'], best: ['最快一次', 'Best'], spread: ['波动', 'Spread'],
  allMed: ['全部轮次中位数', 'Median of all runs'], runs: ['轮', 'runs'],
  cmpT: ['A / B 对比', 'A / B comparison'],
  cmpSame: ['差距小于你自己每轮之间的波动，这两只在你手里没有可感知的区别', 'Smaller than your own run-to-run variation — no perceptible difference in your hand'],
  cmpFast: ['{x} 更快 {d} 毫秒（每只至少 3 轮，结论才可靠）', '{x} is {d} ms quicker (needs ≥3 runs each to trust)'],
  need: ['每只鼠标至少测 3 轮再看对比', 'Run each mouse at least 3 times before comparing'],
  clear: ['清空反应记录', 'Clear reaction records'],
  hist: ['记录', 'Records'], none: ['还没有记录', 'No records yet'],
  learn: ['📖 看懂这些数（新手必看）', '📖 What these numbers mean (start here)'],
  notes: [
    ['反应时间 = 看到变绿 → 大脑反应 → 手指按下 → 鼠标上报 → 电脑处理 → 屏幕显示，全部加起来。人本身占了绝大部分（约 150–250 毫秒），鼠标只占几毫秒。',
      'Reaction time = seeing green → brain → finger → mouse report → PC → display, all added up. You are most of it (≈150–250 ms); the mouse is a few ms.'],
    ['参考值：Human Benchmark 网站统计的所有用户中位数约 273 毫秒。200 毫秒以下算很快。显示器刷新率也有影响：60 Hz 每帧约 16.7 毫秒，144 Hz 约 6.9 毫秒。',
      'For reference, Human Benchmark reports a median of about 273 ms across its users; under 200 ms is fast. Refresh rate matters too: a 60 Hz frame is ≈16.7 ms, 144 Hz ≈6.9 ms.'],
    ['看中位数不看最快一次：最快的那次往往带运气。波动小说明状态稳定。',
      'Trust the median, not the best: the best try is often luck. A small spread means you were consistent.'],
    ['比较鼠标：同一个人、同一台电脑、同一时段，A、B 轮流各测 3 轮以上。差距不到 10 毫秒基本就是人自身的波动，不能说明鼠标更好；要比鼠标本身的延迟，请用"硬件实验室"里的慢动作测试。',
      'Comparing mice: same person, PC and time of day, alternating A and B for 3+ runs each. Under 10 ms apart is just human noise; for the mouse\'s own latency use the slow-mo test in the hardware lab.'],
  ],
};
const KEY = 'mouse-lab-react-v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const save = (r) => { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* storage unavailable */ } };
const med = (a) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const sd = (a) => { if (a.length < 2) return 0; const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nameOf = (d) => (document.getElementById(d === 'A' ? 'mouse-a' : 'mouse-b')?.value || '').trim() || d;

function init() {
  const hw = document.getElementById('hw'); if (!hw) { setTimeout(init, 50); return; }
  const sec = document.createElement('section');
  sec.id = 'react'; sec.className = 'test-card hw-card react-card';
  sec.innerHTML = `<p class="eyebrow" data-r="eyebrow"></p><h2 data-r="h"></h2><p class="detail-copy hw-lead" data-r="lead"></p>
    <div class="hw-top"><span></span><label class="hw-device"><span data-r="device"></span><select id="react-device"><option value="A">A</option><option value="B">B</option></select></label></div>
    <details class="hw-learn"><summary data-r="learn"></summary><ul class="react-notes"></ul></details>
    <div class="hw-pad react-pad" id="react-pad" data-state="idle" role="button" tabindex="0"><strong id="react-big"></strong><span id="react-sub"></span><span id="react-trail" class="react-trail"></span></div>
    <div class="hw-metrics" id="react-metrics"></div>
    <div class="hw-metrics" id="react-cmp"></div>
    <div class="hw-table" id="react-table"></div>
    <div class="export-actions"><button type="button" class="button button-secondary" id="react-clear" data-r="clear"></button></div>`;
  hw.after(sec);
  const $ = (s) => sec.querySelector(s);
  const pad = $('#react-pad'), big = $('#react-big'), sub = $('#react-sub'), trail = $('#react-trail');
  let state = 'idle', times = [], timer = 0, greenAt = 0, last = null;

  const set = (s, b, t) => { state = s; pad.dataset.state = s; big.textContent = b; sub.textContent = t; };
  const showTrail = () => { trail.textContent = times.map((x) => `${Math.round(x)}`).join(' · '); };
  const arm = () => {
    set('wait', pick(L.wait), pick(L.of).replace('{n}', times.length + 1));
    clearTimeout(timer);
    timer = setTimeout(() => requestAnimationFrame(() => { set('go', pick(L.go), ''); greenAt = performance.now(); }), 1500 + Math.random() * 3000);
  };
  const metric = (label, value, unit, cls = '') => `<div class="metric ${cls}"><span>${esc(label)}</span><strong>${value}</strong><small>${esc(unit)}</small></div>`;

  const renderStats = () => {
    const recs = load();
    $('#react-metrics').innerHTML = last ? metric(pick(L.med), Math.round(last.median), 'ms', last.median < 200 ? 'ok' : last.median < 300 ? '' : 'warn')
      + metric(pick(L.best), Math.round(last.best), 'ms') + metric(pick(L.spread), `±${Math.round(last.sd)}`, 'ms', last.sd > 40 ? 'warn' : 'ok') : '';
    const by = (d) => recs.filter((r) => r.device === d).map((r) => r.median);
    const a = by('A'), b = by('B');
    let cmp = '';
    if (a.length || b.length) {
      cmp += metric(`${nameOf('A')} · ${pick(L.allMed)}`, a.length ? Math.round(med(a)) : '—', `ms · ${a.length} ${pick(L.runs)}`);
      cmp += metric(`${nameOf('B')} · ${pick(L.allMed)}`, b.length ? Math.round(med(b)) : '—', `ms · ${b.length} ${pick(L.runs)}`);
      if (a.length >= 3 && b.length >= 3) {
        const d = med(a) - med(b);
        const noise = Math.max(10, (sd(a) + sd(b)) / 2);
        const txt = Math.abs(d) < noise ? pick(L.cmpSame) : pick(L.cmpFast).replace('{x}', nameOf(d > 0 ? 'B' : 'A')).replace('{d}', Math.round(Math.abs(d)));
        cmp += `<p class="hw-limit react-verdict">${esc(pick(L.cmpT))}：${esc(txt)}</p>`;
      } else cmp += `<p class="hw-limit react-verdict">${esc(pick(L.need))}</p>`;
    }
    $('#react-cmp').innerHTML = cmp;
    $('#react-table').innerHTML = recs.length ? `<table><thead><tr><th>#</th><th>${pick(L.device)}</th><th>${pick(L.med)}</th><th>${pick(L.best)}</th><th>${pick(L.spread)}</th><th>ms</th></tr></thead><tbody>${
      recs.slice(-20).reverse().map((r, i) => `<tr><td>${recs.length - i}</td><td>${esc(r.name)}</td><td>${Math.round(r.median)}</td><td>${Math.round(r.best)}</td><td>±${Math.round(r.sd)}</td><td>${r.times.map(Math.round).join(' / ')}</td></tr>`).join('')}</tbody></table>`
      : `<p class="empty-state">${pick(L.none)}</p>`;
  };

  pad.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    if (state === 'go') {
      const rt = e.timeStamp - greenAt; times.push(rt); showTrail();
      if (times.length >= 5) {
        const dev = document.getElementById('react-device').value;
        last = { device: dev, name: nameOf(dev), at: new Date().toISOString(), times, median: med(times), best: Math.min(...times), sd: sd(times) };
        const recs = load(); recs.push(last); save(recs);
        set('done', `${Math.round(last.median)} ms`, `${pick(L.done)} · ${pick(L.doneSub)}`); times = []; renderStats();
      } else set('result', `${Math.round(rt)} ms`, pick(L.next));
    } else if (state === 'wait') { clearTimeout(timer); set('early', pick(L.early), pick(L.earlySub)); }
    else { if (state === 'done' || state === 'idle') { times = []; showTrail(); } arm(); }
  });
  $('#react-clear').addEventListener('click', () => { save([]); last = null; renderStats(); });

  const render = () => {
    sec.querySelectorAll('[data-r]').forEach((n) => { n.textContent = pick(L[n.dataset.r]); });
    sec.querySelector('.react-notes').innerHTML = L.notes.map((n) => `<li>${esc(pick(n))}</li>`).join('');
    if (state === 'idle') set('idle', pick(L.idle), pick(L.idleSub));
    renderStats();
  };
  document.getElementById('lang-select')?.addEventListener('change', () => setTimeout(render, 0));
  ['mouse-a', 'mouse-b'].forEach((id) => document.getElementById(id)?.addEventListener('input', renderStats));
  render();
  document.dispatchEvent(new CustomEvent('mouselab:pads', { detail: [pad] }));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
