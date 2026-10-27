// "04 / Hardware" section: polling rate, sensor (CPI + spikes + peak speed), chatter, slow-mo latency, force log.
import { getLang } from './i18n.js';
import { computeWheel, computePolling, computeCpi, computeSensor, computeChatter, framesToMs, summarizeLatency } from './hw-model.js';

const IDX = { zh: 0, en: 1, ja: 2 };
const T = {
  eyebrow: ['04 / 硬件参数', '04 / Hardware', '04 / ハードウェア'],
  h: ['回报率、传感器、连击、延迟、按压力度', 'Polling, sensor, chatter, latency, force', 'ポーリング・センサー・チャタリング・遅延・押下圧'],
  lead: ['这些测试测的是鼠标本身的参数。每项都写明了能测到什么、测不到什么。', 'These tabs look at the mouse itself. Each one says what it can and cannot measure.', 'マウス本体のパラメータを測るタブです。何が測れて何が測れないかを各タブに明記しています。'],
  device: ['当前鼠标', 'Mouse', 'マウス'],
  tabPoll: ['回报率', 'Polling rate', 'ポーリング'], tabSensor: ['传感器 / DPI', 'Sensor / DPI', 'センサー / DPI'], tabChat: ['连击检测', 'Chatter', 'チャタリング'],
  tabBtn: ['按键与滚轮', 'Buttons & wheel', 'ボタンとホイール'],
  btnHow: ['在下面的框里逐个按左键、右键、中键（按下滚轮）、侧键 4 和侧键 5，按到的键会亮起并计数。然后在框里先向下连续滚 20 格，再向上连续滚 20 格。', 'Inside the box, press left, right, middle (wheel click), side button 4 and side button 5 — each lights up and counts. Then scroll down 20 notches in a row, then up 20 notches in a row.', '枠内で左・右・中（ホイール押し）・サイド4・サイド5を順に押すと点灯してカウントします。続けてホイールを下に20段連続、次に上に20段連続で回してください。'],
  btnLimit: ['滚轮反转是指朝一个方向滚时突然冒出一格反方向，多半是编码器问题。被驱动改成其他功能的侧键，网页可能收不到。', 'A wheel reversal is one tick going the wrong way during a scroll — usually an encoder fault. Side buttons remapped in the driver may not reach the browser.', 'ホイール逆転は一方向に回している最中に1段だけ逆に入る現象で、多くはエンコーダー不良です。ドライバで割り当て変更したサイドボタンはブラウザに届かないことがあります。'],
  wUp: ['向上', 'Up', '上'], wDown: ['向下', 'Down', '下'], wRev: ['滚轮反转', 'Wheel reversals', 'ホイール逆転'], save: ['保存本次结果', 'Save result', '結果を保存'],
  drops: ['丢包率', 'Drop rate', 'ドロップ率'],
  tabLat: ['延迟（慢动作）', 'Latency (slow-mo)', '遅延（スロー撮影）'], tabForce: ['按压力度', 'Click force', '押下圧'],
  // polling
  pollHow: ['点"开始"后，在框里快速画圈或来回移动鼠标 5 秒。中途停下的时间不计入。', 'Press Start, then move the mouse in fast circles inside the box for 5 s. Pauses are ignored.', '「開始」を押して、枠内でマウスを5秒間すばやく円を描くように動かしてください。止まった時間は除外されます。'],
  pollLimit: ['测的是浏览器实际收到的报告频率。8K 等高回报率可能受浏览器、系统负载和 USB 接口影响；结果偏低时先换 USB 口、关掉其他软件再测。', 'This is the report rate the browser actually receives. 8K and other high rates can be limited by the browser, system load or USB port; if it reads low, try another port and close other apps.', 'ブラウザが実際に受け取ったレポート頻度です。8Kなどはブラウザ・負荷・USBポートの影響を受けます。低い場合はポート変更や他アプリ終了を試してください。'],
  start: ['开始', 'Start', '開始'], moving: ['移动中…', 'Move!', '動かして…'],
  medianHz: ['中位回报率', 'Median rate', '中央値レート'], avgHz: ['平均回报率', 'Average rate', '平均レート'], nearest: ['最接近档位', 'Closest setting', '最も近い設定'], stab: ['稳定度', 'Stability', '安定度'],
  source: ['事件来源', 'Event source', 'イベント元'], notEnough: ['样本太少，请移动得更快、更久一些。', 'Not enough samples — move faster and longer.', 'サンプル不足です。もっと速く長く動かしてください。'],
  // sensor
  cpiHow: ['DPI 核对：在桌上放一把尺子，填好距离，点"开始"（鼠标会被锁定），沿尺子把鼠标水平移动刚好这个距离，然后左键点一下结束。', 'CPI check: put a ruler on the desk, enter the distance, press Start (the pointer is locked), slide the mouse exactly that far along the ruler, then left-click to finish.', 'DPI確認：机に定規を置いて距離を入力し、「開始」（ポインタがロックされます）→ 定規に沿ってその距離だけ水平に動かし、左クリックで終了。'],
  dist: ['移动距离（厘米）', 'Distance (cm)', '移動距離（cm）'],
  cpiRes: ['实测 CPI', 'Measured CPI', '実測CPI'], straight: ['直线度', 'Straightness', '直線度'], raw: ['原始输入', 'Raw input', 'RAW入力'],
  rawYes: ['已启用（不受系统指针速度影响）', 'on (ignores OS pointer speed)', '有効（OSのポインタ速度の影響なし）'],
  rawNo: ['不可用：请把系统指针速度设为默认、关闭"提高指针精确度"，结果才准', 'unavailable: set OS pointer speed to default and turn off "Enhance pointer precision"', '利用不可：OSのポインタ速度を既定にし「ポインターの精度を高める」をオフに'],
  swipeHow: ['跳点 / 最高速度：点"开始"（鼠标会被锁定），用力快速左右甩动鼠标 5 秒，越快越好。', 'Spikes / top speed: press Start (pointer locked) and swipe the mouse hard left and right for 5 s, as fast as you can.', '飛び / 最高速度：「開始」（ポインタロック）後、5秒間できるだけ速く左右に振ってください。'],
  spikes: ['异常跳点', 'Spikes', '飛び'], rev: ['反向抖动', 'Reversals', '逆方向ブレ'], peak: ['最高速度', 'Peak speed', '最高速度'],
  per1000: ['每千次报告', 'per 1000 reports', '1000レポートあたり'], needCpi: ['先做 DPI 核对才能换算成 m/s', 'Run the CPI check first to convert to m/s', 'm/s換算にはDPI確認が必要'],
  sensorLimit: ['测不到：抬升高度（LOD）、传感器自身延迟。跳点和反向抖动多半是表面、脚贴或传感器问题，数量越少越好。', 'Not measurable here: lift-off distance and sensor latency. Spikes and reversals usually point to the surface, feet or sensor — fewer is better.', '測れないもの：リフトオフ距離、センサー自体の遅延。飛びや逆方向ブレは表面・ソール・センサー由来が多く、少ないほど良いです。'],
  // chatter
  chatHow: ['点"开始"后，在框里每次只点一下左键，慢慢点 30 次。如果网页记到"一次按下收到两次点击"，就会标红。', 'Press Start, then single-click the left button 30 times, slowly, inside the box. Any press that arrives twice is flagged.', '「開始」後、枠内で左クリックを1回ずつゆっくり30回押してください。1回の押下で2回届いたら赤く表示します。'],
  thresh: ['判定阈值', 'Threshold', '判定しきい値'], clicks: ['点击次数', 'Clicks', 'クリック数'], susp: ['疑似连击', 'Suspected chatter', 'チャタリング疑い'], minGap: ['最短间隔', 'Shortest gap', '最短間隔'],
  chatOk: ['没有发现连击', 'No chatter found', 'チャタリングなし'], chatBad: ['发现疑似连击，建议多测几次确认', 'Possible chatter — repeat a few times to confirm', 'チャタリングの疑いあり。何度か再テストを'],
  stop: ['结束', 'Finish', '終了'],
  // latency
  latHow: ['点"进入慢动作模式"，屏幕变黑。用手机 240fps 慢动作，把手指和屏幕一起拍进去，然后按一下左键，屏幕会立刻变白。回放时数"手指按到底"到"屏幕变白"隔了几帧，填进下面。', 'Press "Enter slow-mo mode" and the screen turns black. Film your finger and the screen together at 240 fps, then click — the screen flashes white. In playback, count frames from the full press to the flash and enter it below.', '「スロー撮影モード」を押すと画面が黒になります。スマホの240fpsスローで指と画面を一緒に撮り、クリックすると画面が白く光ります。再生して「押し切り」から「白」までのフレーム数を下に入力。'],
  latLimit: ['测的是"按下到屏幕亮"的总延迟（鼠标、电脑、显示器全算在内）。240fps 每帧约 4.2 毫秒，能看出大差距，分不出一两毫秒。两只鼠标要用同一台电脑、同一台显示器测。', 'This is total click-to-photon latency (mouse + PC + display). At 240 fps one frame is about 4.2 ms: big differences show, 1–2 ms do not. Test both mice on the same PC and display.', '「押下→画面発光」の総遅延（マウス・PC・モニター込み）です。240fpsで1フレーム約4.2ms。大きな差は分かりますが1〜2msは判別できません。同じPC・モニターで比較を。'],
  enterSlow: ['进入慢动作模式', 'Enter slow-mo mode', 'スロー撮影モード'], exitSlow: ['按 Esc 退出', 'Press Esc to exit', 'Escで終了'],
  frames: ['帧数', 'Frames', 'フレーム数'], fps: ['手机帧率', 'Phone fps', 'スマホfps'], add: ['记录', 'Add', '記録'], latMed: ['中位延迟', 'Median latency', '中央値遅延'],
  // force
  forceHow: ['把鼠标放在厨房秤上，秤清零，用一根手指慢慢往下按左键，记下"咔哒"触发瞬间的读数（克）。每只鼠标测 5 次。', 'Put the mouse on a kitchen scale, tare it, press the left button slowly with one finger and note the reading (g) the moment it actuates. 5 times per mouse.', 'マウスをキッチンスケールに載せて0にし、指1本で左ボタンをゆっくり押して「カチッ」と反応した瞬間の値（g）を記録。各マウス5回。'],
  grams: ['克', 'grams', 'g'], forceMed: ['中位按压力度', 'Median force', '中央値押下圧'],
  // shared
  table: ['记录', 'Records', '記録'], clear: ['清空本项', 'Clear this tab', 'このタブを消去'], exportAll: ['导出硬件测试 JSON', 'Export hardware JSON', 'ハードウェアJSONを保存'],
  none: ['还没有记录', 'No records yet', 'まだ記録がありません'],
};
const tr = (k) => T[k][IDX[getLang()] ?? 0];
const fmt = (v, d = 0) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d));
const KEY = 'mouse-lab-hw-v1';
let store = { poll: [], cpi: [], sensor: [], buttons: [], chatter: [], latency: [], force: [] };
try { store = { ...store, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* storage unavailable */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ } };

const deviceName = (d) => (document.getElementById(d === 'A' ? 'mouse-a' : 'mouse-b')?.value || '').trim() || `${d}`;

function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

function build() {
  const sec = el(`<section id="hw" class="test-card hw-card" aria-labelledby="hw-heading">
    <p class="eyebrow" data-hw="eyebrow"></p><h2 id="hw-heading" data-hw="h"></h2><p class="detail-copy hw-lead" data-hw="lead"></p>
    <div class="hw-top"><div class="hw-tabs" role="tablist"></div>
      <label class="hw-device"><span data-hw="device"></span><select id="hw-device"><option value="A">A</option><option value="B">B</option></select></label></div>
    <div class="hw-panels"></div>
    <div class="export-actions hw-export"><button type="button" class="button button-secondary" id="hw-export" data-hw="exportAll"></button></div>
  </section>`);
  document.querySelector('.notes')?.before(sec);
  const tabs = [['poll', 'tabPoll'], ['sensor', 'tabSensor'], ['buttons', 'tabBtn'], ['chatter', 'tabChat'], ['latency', 'tabLat'], ['force', 'tabForce']];
  const tl = sec.querySelector('.hw-tabs'), panels = sec.querySelector('.hw-panels');
  tabs.forEach(([id, k], i) => {
    tl.append(el(`<button type="button" role="tab" class="hw-tab" data-tab="${id}" aria-selected="${i === 0}" data-hw="${k}"></button>`));
    panels.append(el(`<div class="hw-panel" data-panel="${id}" role="tabpanel" ${i ? 'hidden' : ''}></div>`));
  });
  tl.addEventListener('click', (e) => { const b = e.target.closest('.hw-tab'); if (!b) return; tl.querySelectorAll('.hw-tab').forEach((x) => x.setAttribute('aria-selected', String(x === b))); panels.querySelectorAll('.hw-panel').forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.tab; }); });

  const P = (id) => panels.querySelector(`[data-panel="${id}"]`);
  P('poll').innerHTML = `<p class="hw-how" data-hw="pollHow"></p>
    <div class="hw-row"><button type="button" class="button button-primary" id="poll-start" data-hw="start"></button><span class="hw-live" id="poll-live"></span></div>
    <div class="hw-pad" id="poll-pad"><strong id="poll-count">0</strong><span id="poll-hint" data-hw="pollHow"></span></div>
    <div class="hw-metrics" id="poll-metrics"></div><p class="hw-limit" data-hw="pollLimit"></p><div class="hw-table" id="poll-table"></div>`;
  P('sensor').innerHTML = `<p class="hw-how" data-hw="cpiHow"></p>
    <div class="hw-row"><label class="hw-inline"><span data-hw="dist"></span><input id="cpi-dist" type="number" min="1" max="50" step="0.5" value="10"></label><button type="button" class="button button-primary" id="cpi-start" data-hw="start"></button><span class="hw-live" id="cpi-live"></span></div>
    <div class="hw-metrics" id="cpi-metrics"></div>
    <p class="hw-how" data-hw="swipeHow"></p>
    <div class="hw-row"><button type="button" class="button button-primary" id="sw-start" data-hw="start"></button><span class="hw-live" id="sw-live"></span></div>
    <div class="hw-pad hw-pad-lock" id="sensor-pad"><strong id="sw-count">LOCK</strong><span data-hw="swipeHow"></span></div>
    <div class="hw-metrics" id="sw-metrics"></div><p class="hw-limit" data-hw="sensorLimit"></p><div class="hw-table" id="sensor-table"></div>`;
  P('buttons').innerHTML = `<p class="hw-how" data-hw="btnHow"></p>
    <div class="hw-pad hw-btnpad" id="btn-pad"><div class="hw-keys">${['L', 'R', 'M', 'B4', 'B5'].map((k, i) => `<span class="hw-key" data-b="${i}"><b>${k}</b><i>0</i></span>`).join('')}</div>
      <div class="hw-wheel"><span><b data-hw="wUp"></b> <i id="w-up">0</i></span><span><b data-hw="wDown"></b> <i id="w-down">0</i></span><span><b data-hw="wRev"></b> <i id="w-rev">0</i></span></div></div>
    <div class="hw-row"><button type="button" class="button button-secondary" id="btn-save" data-hw="save"></button></div>
    <p class="hw-limit" data-hw="btnLimit"></p><div class="hw-table" id="buttons-table"></div>`;
  P('chatter').innerHTML = `<p class="hw-how" data-hw="chatHow"></p>
    <div class="hw-row"><label class="hw-inline"><span data-hw="thresh"></span><select id="chat-th"><option value="30">30 ms</option><option value="40" selected>40 ms</option><option value="60">60 ms</option></select></label>
      <button type="button" class="button button-primary" id="chat-start" data-hw="start"></button><button type="button" class="button button-secondary" id="chat-stop" data-hw="stop" disabled></button></div>
    <div class="hw-pad" id="chat-pad"><strong id="chat-count">0</strong><span id="chat-flag"></span></div>
    <div class="hw-metrics" id="chat-metrics"></div><div class="hw-table" id="chatter-table"></div>`;
  P('latency').innerHTML = `<p class="hw-how" data-hw="latHow"></p>
    <div class="hw-row"><button type="button" class="button button-primary" id="lat-enter" data-hw="enterSlow"></button></div>
    <div class="hw-row"><label class="hw-inline"><span data-hw="frames"></span><input id="lat-frames" type="number" min="0" max="200" step="1"></label>
      <label class="hw-inline"><span data-hw="fps"></span><select id="lat-fps"><option>120</option><option selected>240</option><option>480</option><option>960</option></select></label>
      <button type="button" class="button button-secondary" id="lat-add" data-hw="add"></button></div>
    <div class="hw-metrics" id="lat-metrics"></div><p class="hw-limit" data-hw="latLimit"></p><div class="hw-table" id="latency-table"></div>`;
  P('force').innerHTML = `<p class="hw-how" data-hw="forceHow"></p>
    <div class="hw-row"><label class="hw-inline"><span data-hw="grams"></span><input id="force-g" type="number" min="1" max="300" step="0.5"></label><button type="button" class="button button-secondary" id="force-add" data-hw="add"></button></div>
    <div class="hw-metrics" id="force-metrics"></div><div class="hw-table" id="force-table"></div>`;
  tabs.forEach(([id]) => P(id).append(el(`<div class="export-actions"><button type="button" class="button button-secondary hw-clear" data-clear="${id === 'sensor' ? 'sensor' : id}" data-hw="clear"></button></div>`)));
  document.body.append(el(`<div id="slowmo" hidden><span id="slowmo-tip"></span></div>`));
  return sec;
}

const metric = (label, value, unit = '') => `<article class="metric"><span class="metric-label">${label}</span><strong class="metric-value">${value}</strong><span class="metric-unit">${unit}</span></article>`;
const tableHtml = (head, rows) => rows.length ? `<div class="table-scroll"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<p class="empty-state">${tr('none')}</p>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const medianOf = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

function renderTables() {
  const q = (id) => document.getElementById(id);
  q('poll-table').innerHTML = tableHtml([tr('device'), tr('medianHz'), tr('avgHz'), tr('nearest'), tr('stab'), tr('drops'), tr('source')],
    store.poll.map((r) => [esc(r.name), `${fmt(r.medianHz)} Hz`, `${fmt(r.averageHz)} Hz`, `${r.nearest} Hz`, `${fmt(r.stability * 100)}%`, `${fmt((r.dropRate ?? 0) * 100, 2)}%`, r.source]));
  q('buttons-table').innerHTML = tableHtml([tr('device'), 'L / R / M / B4 / B5', tr('wUp'), tr('wDown'), tr('wRev')],
    store.buttons.map((r) => [esc(r.name), r.counts.join(' / '), r.up, r.down, r.reversals ? `<b class="hw-bad">${r.reversals}</b>` : '0']));
  q('sensor-table').innerHTML = tableHtml([tr('device'), tr('cpiRes'), tr('spikes'), tr('rev'), tr('peak')],
    [...store.cpi.map((r) => [esc(r.name), `${fmt(r.cpi)} (${r.cm} cm${r.raw ? ', raw' : ''})`, '', '', '']),
     ...store.sensor.map((r) => [esc(r.name), r.cpi ? fmt(r.cpi) : '—', `${r.spikes} (${fmt(r.spikesPer1000, 1)}‰)`, `${r.reversals} (${fmt(r.reversalsPer1000, 1)}‰)`, r.peakMetersPerSecond ? `${fmt(r.peakMetersPerSecond, 2)} m/s` : `${fmt(r.peakCountsPerSecond)} counts/s`])]);
  q('chatter-table').innerHTML = tableHtml([tr('device'), tr('clicks'), tr('susp'), tr('minGap'), tr('thresh')],
    store.chatter.map((r) => [esc(r.name), r.clicks, r.suspectCount ? `<b class="hw-bad">${r.suspectCount}</b>` : '0', `${fmt(r.minGapMs, 1)} ms`, `${r.threshold} ms`]));
  const ls = summarizeLatency(store.latency);
  q('latency-table').innerHTML = tableHtml([tr('device'), tr('frames'), tr('fps'), 'ms'],
    store.latency.map((r) => [esc(r.name), r.frames, r.fps, fmt(framesToMs(r.frames, r.fps), 1)]));
  q('lat-metrics').innerHTML = ['A', 'B'].map((d) => ls[d] ? metric(`${tr('latMed')} · ${esc(deviceName(d))}`, fmt(ls[d].medianMs, 1), `ms · n=${ls[d].n}`) : '').join('');
  q('force-table').innerHTML = tableHtml([tr('device'), tr('grams')], store.force.map((r) => [esc(r.name), fmt(r.g, 1)]));
  q('force-metrics').innerHTML = ['A', 'B'].map((d) => { const v = store.force.filter((r) => r.device === d).map((r) => r.g); return v.length ? metric(`${tr('forceMed')} · ${esc(deviceName(d))}`, fmt(medianOf(v), 1), `g · n=${v.length}`) : ''; }).join('');
}

function applyText(sec) { sec.querySelectorAll('[data-hw]').forEach((n) => { n.textContent = tr(n.dataset.hw); }); document.getElementById('slowmo-tip').textContent = tr('exitSlow'); renderTables(); }

function init() {
  const sec = build(); const $ = (id) => document.getElementById(id);
  const dev = () => $('hw-device').value;
  const rec = (k, obj) => { store[k].push({ device: dev(), name: deviceName(dev()), at: new Date().toISOString(), ...obj }); save(); renderTables(); };

  // ---------- polling ----------
  const hasRaw = 'onpointerrawupdate' in window;
  $('poll-start').addEventListener('click', () => {
    const ts = []; const type = hasRaw ? 'pointerrawupdate' : 'pointermove';
    const on = (e) => { const list = e.getCoalescedEvents ? e.getCoalescedEvents() : []; if (list.length) list.forEach((c) => ts.push(c.timeStamp)); else ts.push(e.timeStamp); $('poll-count').textContent = String(ts.length); };
    window.addEventListener(type, on, { passive: true });
    $('poll-start').disabled = true; $('poll-pad').classList.add('is-active');
    const t0 = performance.now();
    const tick = setInterval(() => { $('poll-live').textContent = `${tr('moving')} ${Math.max(0, 5 - (performance.now() - t0) / 1000).toFixed(1)} s`; }, 100);
    setTimeout(() => {
      clearInterval(tick); window.removeEventListener(type, on); $('poll-start').disabled = false; $('poll-pad').classList.remove('is-active'); $('poll-live').textContent = '';
      const r = computePolling(ts);
      if (!r.enough) { $('poll-metrics').innerHTML = `<p class="hw-limit">${tr('notEnough')}</p>`; return; }
      $('poll-metrics').innerHTML = metric(tr('medianHz'), fmt(r.medianHz), 'Hz') + metric(tr('avgHz'), fmt(r.averageHz), 'Hz') + metric(tr('nearest'), r.nearest, 'Hz') + metric(tr('stab'), fmt(r.stability * 100), `% · ${type}`) + metric(tr('drops'), fmt(r.dropRate * 100, 2), '%');
      rec('poll', { medianHz: r.medianHz, averageHz: r.averageHz, nearest: r.nearest, stability: r.stability, dropRate: r.dropRate, samples: r.samples, source: type });
    }, 5000);
  });

  // ---------- pointer lock helper ----------
  const lock = async (target) => {
    let raw = false;
    try { await target.requestPointerLock({ unadjustedMovement: true }); raw = true; }
    catch { try { await target.requestPointerLock(); } catch { /* denied */ } }
    return raw;
  };
  const lastCpi = () => { const v = store.cpi.filter((r) => r.device === dev()).pop(); return v ? v.cpi : null; };

  // ---------- CPI ----------
  $('cpi-start').addEventListener('click', async () => {
    const cm = parseFloat($('cpi-dist').value); if (!(cm > 0)) return;
    const pad = $('sensor-pad'); let sx = 0, sy = 0;
    const raw = await lock(pad);
    if (document.pointerLockElement !== pad) return;
    pad.classList.add('is-active'); $('cpi-live').textContent = '…';
    const move = (e) => { sx += e.movementX; sy += e.movementY; $('sw-count').textContent = `${Math.round(Math.hypot(sx, sy))}`; };
    const finish = (e) => { if (e && e.type === 'mousedown' && e.button !== 0) return; document.removeEventListener('mousemove', move); document.removeEventListener('mousedown', finish); document.exitPointerLock?.(); pad.classList.remove('is-active'); $('cpi-live').textContent = '';
      const r = computeCpi(sx, sy, cm); if (!r || r.counts < 20) return;
      $('cpi-metrics').innerHTML = metric(tr('cpiRes'), fmt(r.cpi), 'CPI') + metric(tr('straight'), fmt(r.straightness * 100), '%') + metric(tr('raw'), raw ? '✓' : '!', raw ? tr('rawYes') : tr('rawNo'));
      rec('cpi', { cpi: r.cpi, cm, counts: r.counts, raw }); };
    document.addEventListener('mousemove', move); setTimeout(() => document.addEventListener('mousedown', finish), 50);
  });

  // ---------- swipe (spikes / speed) ----------
  $('sw-start').addEventListener('click', async () => {
    const pad = $('sensor-pad'); const samples = [];
    const raw = await lock(pad); if (document.pointerLockElement !== pad) return;
    const type = hasRaw ? 'pointerrawupdate' : 'pointermove';
    const on = (e) => { const list = e.getCoalescedEvents ? e.getCoalescedEvents() : []; (list.length ? list : [e]).forEach((c) => samples.push({ t: c.timeStamp, dx: c.movementX, dy: c.movementY })); $('sw-count').textContent = String(samples.length); };
    document.addEventListener(type, on, { passive: true }); pad.classList.add('is-active');
    const t0 = performance.now(); const tick = setInterval(() => { $('sw-live').textContent = `${tr('moving')} ${Math.max(0, 5 - (performance.now() - t0) / 1000).toFixed(1)} s`; }, 100);
    setTimeout(() => {
      clearInterval(tick); document.removeEventListener(type, on); document.exitPointerLock?.(); pad.classList.remove('is-active'); $('sw-live').textContent = '';
      const cpi = lastCpi(); const r = computeSensor(samples, cpi);
      if (!r.enough) { $('sw-metrics').innerHTML = `<p class="hw-limit">${tr('notEnough')}</p>`; return; }
      $('sw-metrics').innerHTML = metric(tr('spikes'), r.spikes, `${fmt(r.spikesPer1000, 1)} ${tr('per1000')}`) + metric(tr('rev'), r.reversals, `${fmt(r.reversalsPer1000, 1)} ${tr('per1000')}`)
        + metric(tr('peak'), r.peakMetersPerSecond ? fmt(r.peakMetersPerSecond, 2) : fmt(r.peakCountsPerSecond), r.peakMetersPerSecond ? `m/s · ${fmt(r.peakIps)} IPS` : `counts/s · ${tr('needCpi')}`);
      rec('sensor', { ...r, cpi, raw });
    }, 5000);
  });

  // ---------- buttons & wheel ----------
  const bp = $('btn-pad'); let counts = [0, 0, 0, 0, 0], wheel = [];
  const paintW = () => { const w = computeWheel(wheel); $('w-up').textContent = w.up; $('w-down').textContent = w.down; $('w-rev').textContent = w.reversals; $('w-rev').classList.toggle('hw-bad', w.reversals > 0); };
  bp.addEventListener('pointerdown', (e) => { const i = e.button; if (i < 0 || i > 4) return; e.preventDefault(); counts[i]++; const k = bp.querySelector(`[data-b="${i}"]`); k.classList.add('on', 'hit'); k.querySelector('i').textContent = counts[i]; setTimeout(() => k.classList.remove('hit'), 160); });
  bp.addEventListener('auxclick', (e) => e.preventDefault());
  bp.addEventListener('mouseup', (e) => { if (e.button === 3 || e.button === 4) e.preventDefault(); });
  bp.addEventListener('contextmenu', (e) => e.preventDefault());
  bp.addEventListener('wheel', (e) => { e.preventDefault(); wheel.push({ t: e.timeStamp, dy: e.deltaY }); paintW(); }, { passive: false });
  $('btn-save').addEventListener('click', () => { const w = computeWheel(wheel); rec('buttons', { counts: [...counts], up: w.up, down: w.down, reversals: w.reversals });
    counts = [0, 0, 0, 0, 0]; wheel = []; bp.querySelectorAll('.hw-key').forEach((k) => { k.classList.remove('on'); k.querySelector('i').textContent = '0'; }); paintW(); });

  // ---------- chatter ----------
  let chat = null;
  const chatEnd = () => { if (!chat) return; const th = +$('chat-th').value; const r = computeChatter(chat.down, chat.up, th); chat = null;
    $('chat-start').disabled = false; $('chat-stop').disabled = true; $('chat-pad').classList.remove('is-active');
    $('chat-metrics').innerHTML = metric(tr('clicks'), r.clicks) + metric(tr('susp'), r.suspectCount, r.suspectCount ? tr('chatBad') : tr('chatOk')) + metric(tr('minGap'), fmt(r.minGapMs, 1), 'ms');
    if (r.clicks) rec('chatter', { clicks: r.clicks, suspectCount: r.suspectCount, minGapMs: r.minGapMs, threshold: th }); };
  $('chat-start').addEventListener('click', () => { chat = { down: [], up: [] }; $('chat-count').textContent = '0'; $('chat-flag').textContent = ''; $('chat-start').disabled = true; $('chat-stop').disabled = false; $('chat-pad').classList.add('is-active'); });
  $('chat-stop').addEventListener('click', chatEnd);
  $('chat-pad').addEventListener('pointerdown', (e) => { if (!chat || e.button !== 0) return; e.preventDefault(); const th = +$('chat-th').value; const prev = chat.down.at(-1); chat.down.push(e.timeStamp); $('chat-count').textContent = String(chat.down.length);
    if (prev !== undefined && e.timeStamp - prev < th) { $('chat-flag').textContent = `⚠ ${fmt(e.timeStamp - prev, 1)} ms`; $('chat-pad').classList.add('hw-flash'); setTimeout(() => $('chat-pad').classList.remove('hw-flash'), 400); }
    if (chat.down.length >= 30) chatEnd(); });
  $('chat-pad').addEventListener('pointerup', (e) => { if (chat && e.button === 0) chat.up.push(e.timeStamp); });
  $('chat-pad').addEventListener('contextmenu', (e) => e.preventDefault());

  // ---------- slow-mo latency ----------
  const slow = $('slowmo');
  const exitSlow = () => { slow.hidden = true; document.removeEventListener('keydown', key); if (document.fullscreenElement) document.exitFullscreen?.(); };
  const key = (e) => { if (e.key === 'Escape') exitSlow(); };
  $('lat-enter').addEventListener('click', async () => { slow.hidden = false; slow.classList.remove('flash'); try { await slow.requestFullscreen?.(); } catch { /* ok without fullscreen */ } document.addEventListener('keydown', key); });
  slow.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; slow.classList.add('flash'); setTimeout(() => slow.classList.remove('flash'), 350); });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && !slow.hidden) { slow.hidden = true; document.removeEventListener('keydown', key); } });
  $('lat-add').addEventListener('click', () => { const f = parseInt($('lat-frames').value, 10), fps = +$('lat-fps').value; if (!(f >= 0)) return; rec('latency', { frames: f, fps }); $('lat-frames').value = ''; });

  // ---------- force ----------
  $('force-add').addEventListener('click', () => { const g = parseFloat($('force-g').value); if (!(g > 0)) return; rec('force', { g }); $('force-g').value = ''; });

  // ---------- shared ----------
  sec.addEventListener('click', (e) => { const b = e.target.closest('.hw-clear'); if (!b) return; const k = b.dataset.clear; if (k === 'sensor') { store.sensor = []; store.cpi = []; } else store[k] = []; save(); renderTables(); });
  $('hw-export').addEventListener('click', () => { const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), userAgent: navigator.userAgent, ...store }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mouse-hw-${Date.now()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); });
  const syncDeviceLabels = () => { [...$('hw-device').options].forEach((o) => { o.textContent = `${o.value} · ${deviceName(o.value)}`; }); };
  ['mouse-a', 'mouse-b'].forEach((id) => $(id)?.addEventListener('input', syncDeviceLabels));
  document.getElementById('lang-select')?.addEventListener('change', () => setTimeout(() => { applyText(sec); syncDeviceLabels(); }, 0));
  applyText(sec); syncDeviceLabels();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
