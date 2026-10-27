// "04 / Hardware" section: polling rate, sensor (CPI + spikes + peak speed), chatter, slow-mo latency, force log.
import { getLang } from './i18n.js';
import { computeWheel, computePolling, computeCpi, computeSensor, computeChatter, framesToMs, summarizeLatency, summarize, deviationPct, toCsv } from './hw-model.js';

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
  envH: ['测试环境（自动识别 + 手动填写）', 'Test environment (auto + manual)', 'テスト環境（自動 + 手入力）'],
  envBrowser: ['浏览器', 'Browser', 'ブラウザ'], envOs: ['系统', 'OS', 'OS'], envHz: ['屏幕刷新率', 'Display refresh', 'リフレッシュレート'], envDpr: ['缩放比例', 'Display scaling', '表示倍率'], envRaw: ['原始事件支持', 'Raw events', 'RAWイベント'],
  setRate: ['设定回报率', 'Set polling rate', '設定ポーリング'], setDpi: ['设定 DPI', 'Set DPI', '設定DPI'], conn: ['连接方式', 'Connection', '接続'], wired: ['有线', 'Wired', '有線'], bt: ['蓝牙', 'Bluetooth', 'Bluetooth'],
  envNote: ['设定值按当前鼠标分别保存，用来和实测对比。', 'Settings are saved per mouse and compared with what is measured.', '設定値はマウスごとに保存され、実測と比較されます。'],
  vsSet: ['与设定对比', 'vs setting', '設定との比較'], match: ['一致', 'matches', '一致'], mismatch: ['不一致，检查驱动设置或换 USB 口', 'does not match — check the driver or USB port', '不一致：ドライバやUSBポートを確認'],
  dev: ['与标称偏差', 'vs nominal', '公称との差'],
  repeat: ['多次测量', 'Repeat runs', '複数回測定'], runs: ['次', 'runs', '回'], spread: ['波动', 'spread', 'ばらつき'],
  needMore: ['建议至少测 3 次', 'run at least 3 times', '3回以上の測定を推奨'], unstable: ['波动偏大，建议重测', 'large spread — re-test', 'ばらつき大：再測定を'], stable: ['结果稳定', 'stable', '安定'],
  chartPoll: ['每次报告的间隔（毫秒）', 'Interval between reports (ms)', 'レポート間隔（ms）'], chartSensor: ['每次报告的移动量（红色 = 跳点）', 'Movement per report (red = spike)', 'レポートごとの移動量（赤＝飛び）'],
  csvAll: ['导出全部记录 CSV', 'Export all records CSV', '全記録をCSVで保存'], csvRaw: ['导出最近一次原始数据 CSV', 'Export last raw data CSV', '直近のRAWデータをCSVで保存'],
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
    <details class="hw-env" open><summary data-hw="envH"></summary>
      <div class="hw-env-auto" id="env-auto"></div>
      <div class="hw-row hw-env-set">
        <label class="hw-inline"><span data-hw="setRate"></span><select id="env-rate"><option value="">—</option>${[125, 250, 500, 1000, 2000, 4000, 8000].map((r) => `<option value="${r}">${r} Hz</option>`).join('')}</select></label>
        <label class="hw-inline"><span data-hw="setDpi"></span><input id="env-dpi" type="number" min="50" max="64000" step="50" placeholder="800"></label>
        <label class="hw-inline"><span data-hw="conn"></span><select id="env-conn"><option value="">—</option><option value="wired" data-hw="wired"></option><option value="2.4G">2.4G</option><option value="bt" data-hw="bt"></option></select></label>
      </div><p class="detail-copy" data-hw="envNote"></p></details>
    <div class="hw-top"><div class="hw-tabs" role="tablist"></div>
      <label class="hw-device"><span data-hw="device"></span><select id="hw-device"><option value="A">A</option><option value="B">B</option></select></label></div>
    <div class="hw-panels"></div>
    <div class="export-actions hw-export"><button type="button" class="button button-primary" id="hw-csv" data-hw="csvAll"></button><button type="button" class="button button-secondary" id="hw-raw" data-hw="csvRaw" disabled></button><button type="button" class="button button-secondary" id="hw-export" data-hw="exportAll"></button></div>
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
    <div class="hw-metrics" id="poll-metrics"></div><figure class="hw-fig" id="poll-fig" hidden><figcaption data-hw="chartPoll"></figcaption><canvas class="hw-chart" id="poll-chart"></canvas></figure><div class="hw-repeat" id="poll-repeat"></div><p class="hw-limit" data-hw="pollLimit"></p><div class="hw-table" id="poll-table"></div>`;
  P('sensor').innerHTML = `<p class="hw-how" data-hw="cpiHow"></p>
    <div class="hw-row"><label class="hw-inline"><span data-hw="dist"></span><input id="cpi-dist" type="number" min="1" max="50" step="0.5" value="10"></label><button type="button" class="button button-primary" id="cpi-start" data-hw="start"></button><span class="hw-live" id="cpi-live"></span></div>
    <div class="hw-metrics" id="cpi-metrics"></div><div class="hw-repeat" id="cpi-repeat"></div>
    <p class="hw-how" data-hw="swipeHow"></p>
    <div class="hw-row"><button type="button" class="button button-primary" id="sw-start" data-hw="start"></button><span class="hw-live" id="sw-live"></span></div>
    <div class="hw-pad hw-pad-lock" id="sensor-pad"><strong id="sw-count">LOCK</strong><span data-hw="swipeHow"></span></div>
    <div class="hw-metrics" id="sw-metrics"></div><figure class="hw-fig" id="sw-fig" hidden><figcaption data-hw="chartSensor"></figcaption><canvas class="hw-chart" id="sw-chart"></canvas></figure><div class="hw-repeat" id="sw-repeat"></div><p class="hw-limit" data-hw="sensorLimit"></p><div class="hw-table" id="sensor-table"></div>`;
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


// ---------- environment, charts, repeat stats ----------
const ENV = (() => {
  const ua = navigator.userAgent; let browser = 'Browser';
  const m = ua.match(/Edg\/([\d]+)/) || ua.match(/OPR\/([\d]+)/) || ua.match(/Chrome\/([\d]+)/) || ua.match(/Firefox\/([\d]+)/) || ua.match(/Version\/([\d]+).*Safari/);
  if (m) browser = (/Edg\//.test(m[0]) ? 'Edge ' : /OPR\//.test(m[0]) ? 'Opera ' : /Chrome\//.test(m[0]) ? 'Chrome ' : /Firefox\//.test(m[0]) ? 'Firefox ' : 'Safari ') + m[1];
  const os = /Windows NT 10/.test(ua) ? 'Windows 10/11' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /Linux/.test(ua) ? 'Linux' : /iPhone|iPad/.test(ua) ? 'iOS' : 'Unknown';
  return { browser, os, dpr: window.devicePixelRatio || 1, refresh: null, rawEvents: 'onpointerrawupdate' in window };
})();
function measureRefresh() {
  return new Promise((res) => { const t = []; const step = (now) => { t.push(now); if (t.length < 90) requestAnimationFrame(step); else { const d = t.slice(1).map((x, i) => x - t[i]).sort((a, b) => a - b); const med = d[Math.floor(d.length / 2)]; const hz = 1000 / med; const common = [60, 75, 90, 100, 120, 144, 165, 170, 180, 200, 240, 280, 360, 480, 540]; res(common.reduce((b, c) => (Math.abs(c - hz) < Math.abs(b - hz) ? c : b))); } }; requestAnimationFrame(step); });
}
const settings = () => store.settings || (store.settings = {});
const envSnapshot = (d) => ({ browser: ENV.browser, os: ENV.os, refresh: ENV.refresh, dpr: ENV.dpr, rawEvents: ENV.rawEvents, set: { ...(settings()[d] || {}) } });
const lastRaw = { poll: null, sensor: null };
function download(name, text, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

function drawChart(canvas, values, { median: medLine = null, spikes = false } = {}) {
  const dpr = window.devicePixelRatio || 1, W = canvas.clientWidth || 600, H = 170;
  canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = `${H}px`;
  const c = canvas.getContext('2d'); c.scale(dpr, dpr); c.clearRect(0, 0, W, H);
  if (!values.length) return;
  const pad = { l: 44, r: 10, t: 10, b: 22 }, w = W - pad.l - pad.r, h = H - pad.t - pad.b;
  const sorted = [...values].sort((a, b) => a - b); const top = Math.max(sorted[Math.floor(sorted.length * 0.995)] * 1.15, 1e-6);
  const X = (i) => pad.l + (i / Math.max(values.length - 1, 1)) * w, Y = (v) => pad.t + h - Math.min(v / top, 1) * h;
  c.strokeStyle = '#f6d3e5'; c.lineWidth = 1; c.fillStyle = '#9a6b8c'; c.font = '11px sans-serif'; c.textAlign = 'right';
  for (let k = 0; k <= 4; k++) { const v = (top * k) / 4, y = Y(v); c.beginPath(); c.moveTo(pad.l, y); c.lineTo(W - pad.r, y); c.stroke(); c.fillText(v < 10 ? v.toFixed(2) : v.toFixed(0), pad.l - 6, y + 4); }
  c.textAlign = 'left'; c.fillText(`n = ${values.length}`, pad.l, H - 6);
  if (medLine) { c.strokeStyle = '#c084fc'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(pad.l, Y(medLine)); c.lineTo(W - pad.r, Y(medLine)); c.stroke(); c.setLineDash([]); }
  const step = Math.max(1, Math.floor(values.length / (w * 2)));
  c.strokeStyle = '#ff4fa8'; c.lineWidth = 1.2; c.beginPath();
  for (let i = 0; i < values.length; i += step) { const x = X(i), y = Y(values[i]); i ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.stroke();
  if (spikes) { c.fillStyle = '#e0306f'; for (let i = 4; i < values.length - 4; i++) { const around = [...values.slice(i - 4, i), ...values.slice(i + 1, i + 5)].sort((a, b) => a - b); const m = (around[3] + around[4]) / 2; if (m >= 2 && values[i] > 5 * m && values[i] > 20) { c.beginPath(); c.arc(X(i), Y(values[i]), 3.5, 0, Math.PI * 2); c.fill(); } } }
}

function repeatLine(label, values, unit, digits, cvLimit) {
  const s = summarize(values); if (!s.n) return '';
  const verdict = s.n < 3 ? tr('needMore') : s.cv > cvLimit ? tr('unstable') : tr('stable');
  const cls = s.n < 3 ? 'warn' : s.cv > cvLimit ? 'bad' : 'ok';
  return `<span class="hw-rep ${cls}"><b>${esc(label)}</b> ${fmt(s.mean, digits)} ± ${fmt(s.sd, digits)} ${unit} · ${s.n} ${tr('runs')} · ${tr('spread')} ${fmt((s.cv || 0) * 100, 1)}% · ${verdict}</span>`;
}
function renderRepeats() {
  const by = (k, d, f) => store[k].filter((r) => r.device === d).map(f);
  const block = (id, k, f, unit, digits, cv) => { const el = document.getElementById(id); if (!el) return; const html = ['A', 'B'].map((d) => repeatLine(`${d} · ${deviceName(d)}`, by(k, d, f), unit, digits, cv)).join(''); el.innerHTML = html ? `<p class="hw-rep-h">${tr('repeat')}</p>${html}` : ''; };
  block('poll-repeat', 'poll', (r) => r.medianHz, 'Hz', 0, 0.05);
  block('cpi-repeat', 'cpi', (r) => r.cpi, 'CPI', 0, 0.03);
  block('sw-repeat', 'sensor', (r) => r.peakMetersPerSecond ?? r.peakCountsPerSecond, '', 2, 0.15);
}

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
  renderRepeats();
  q('force-metrics').innerHTML = ['A', 'B'].map((d) => { const v = store.force.filter((r) => r.device === d).map((r) => r.g); return v.length ? metric(`${tr('forceMed')} · ${esc(deviceName(d))}`, fmt(medianOf(v), 1), `g · n=${v.length}`) : ''; }).join('');
}

function applyText(sec) { sec.querySelectorAll('[data-hw]').forEach((n) => { n.textContent = tr(n.dataset.hw); }); document.getElementById('slowmo-tip').textContent = tr('exitSlow'); renderTables(); }

function init() {
  const sec = build(); const $ = (id) => document.getElementById(id);
  const dev = () => $('hw-device').value;
  const rec = (k, obj) => { store[k].push({ device: dev(), name: deviceName(dev()), at: new Date().toISOString(), env: envSnapshot(dev()), ...obj }); save(); renderTables(); };

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
      const setR = +(settings()[dev()]?.rate || 0);
      const cmp = setR ? metric(tr('vsSet'), setR === r.nearest ? '✓' : '✗', `${tr('setRate')} ${setR} Hz · ${setR === r.nearest ? tr('match') : tr('mismatch')}`) : '';
      $('poll-metrics').innerHTML = metric(tr('medianHz'), fmt(r.medianHz), 'Hz') + metric(tr('avgHz'), fmt(r.averageHz), 'Hz') + metric(tr('nearest'), r.nearest, 'Hz') + metric(tr('stab'), fmt(r.stability * 100), `% · ${type}`) + metric(tr('drops'), fmt(r.dropRate * 100, 2), '%') + cmp;
      const sorted = [...ts].sort((a, b) => a - b); const iv = sorted.slice(1).map((t, i) => t - sorted[i]).filter((d) => d > 0 && d <= 25);
      lastRaw.poll = { device: dev(), name: deviceName(dev()), rows: sorted.map((t, i) => ({ index: i, timestampMs: +t.toFixed(4), intervalMs: i ? +(t - sorted[i - 1]).toFixed(4) : '' })) }; $('hw-raw').disabled = false;
      $('poll-fig').hidden = false; drawChart($('poll-chart'), iv, { median: r.medianIntervalMs });
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
      const nom = +(settings()[dev()]?.dpi || 0); const dv = deviationPct(r.cpi, nom);
      if (dv !== null) $('cpi-metrics').innerHTML += metric(tr('dev'), `${dv > 0 ? '+' : ''}${fmt(dv, 1)}%`, `${nom} DPI`);
      rec('cpi', { cpi: r.cpi, cm, counts: r.counts, raw, nominalDpi: nom || null, deviationPct: dv }); };
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
      const mags = samples.map((p) => Math.hypot(p.dx, p.dy));
      lastRaw.sensor = { device: dev(), name: deviceName(dev()), rows: samples.map((p, i) => ({ index: i, timestampMs: +p.t.toFixed(4), dx: p.dx, dy: p.dy, magnitude: +mags[i].toFixed(3) })) }; $('hw-raw').disabled = false;
      $('sw-fig').hidden = false; drawChart($('sw-chart'), mags, { spikes: true });
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
  // environment: auto facts + per-mouse settings
  const paintEnv = () => { const e = ENV; $('env-auto').innerHTML = [[tr('envBrowser'), e.browser], [tr('envOs'), e.os], [tr('envHz'), e.refresh ? `${e.refresh} Hz` : '…'], [tr('envDpr'), `${Math.round(e.dpr * 100)}%`], [tr('envRaw'), e.rawEvents ? 'pointerrawupdate ✓' : 'pointermove']].map(([k, v]) => `<span><b>${k}</b>${esc(v)}</span>`).join(''); };
  const loadSet = () => { const st = settings()[dev()] || {}; $('env-rate').value = st.rate || ''; $('env-dpi').value = st.dpi || ''; $('env-conn').value = st.conn || ''; };
  const saveSet = () => { const all = settings(); all[dev()] = { rate: $('env-rate').value, dpi: $('env-dpi').value, conn: $('env-conn').value }; store.settings = all; save(); };
  ['env-rate', 'env-dpi', 'env-conn'].forEach((id) => $(id).addEventListener('change', saveSet));
  $('hw-device').addEventListener('change', loadSet);
  measureRefresh().then((hz) => { ENV.refresh = hz; paintEnv(); });
  $('hw-csv').addEventListener('click', () => {
    const rows = []; for (const k of ['poll', 'cpi', 'sensor', 'buttons', 'chatter', 'latency', 'force']) for (const r of store[k]) { const { env, ...rest } = r; rows.push({ test: k, ...rest, browser: env?.browser, os: env?.os, refreshHz: env?.refresh, scaling: env?.dpr, setRate: env?.set?.rate, setDpi: env?.set?.dpi, connection: env?.set?.conn }); }
    download(`mouse-hw-records-${Date.now()}.csv`, toCsv(rows), 'text/csv'); });
  $('hw-raw').addEventListener('click', () => { for (const k of ['poll', 'sensor']) { const r = lastRaw[k]; if (r) download(`mouse-raw-${k}-${r.device}-${Date.now()}.csv`, toCsv(r.rows), 'text/csv'); } });
  window.addEventListener('resize', () => { if (lastRaw.poll && !$('poll-fig').hidden) { const iv = lastRaw.poll.rows.map((r) => r.intervalMs).filter((d) => d > 0 && d <= 25); drawChart($('poll-chart'), iv, {}); } if (lastRaw.sensor && !$('sw-fig').hidden) drawChart($('sw-chart'), lastRaw.sensor.rows.map((r) => r.magnitude), { spikes: true }); });
  applyText(sec); syncDeviceLabels(); paintEnv(); loadSet();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
