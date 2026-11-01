// Beginner layer for the hardware lab: "看懂这些数" notes on every tab, a reference-spec tab,
// and a zoom toggle for every click / capture pad. Text and layout only — never touches capture or timing.
import { getLang } from './i18n.js';

const pick = (v) => (Array.isArray(v) ? (getLang() === 'zh' ? v[0] : v[1]) : v);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const UI = {
  learn: ['📖 看懂这些数（新手必看）', '📖 What these numbers mean (start here)'],
  cols: [['指标', '它是什么', '怎样算好', '说明鼠标的什么 · 优点还是缺点'], ['Metric', 'What it is', 'What is good', 'What it says about the mouse']],
  legend: ['颜色含义：<b class="lg ok">绿</b> 正常 / 优点 · <b class="lg warn">黄</b> 留意或样本不够 · <b class="lg bad">红</b> 有问题或读数不可信。所有"合格线"都是经验值，不是官方标准。',
    'Colours: <b class="lg ok">green</b> fine / a strength · <b class="lg warn">yellow</b> watch or not enough data · <b class="lg bad">red</b> a problem or an unreliable reading. Every pass line is a rule of thumb, not an official standard.'],
  zoom: ['⛶ 放大测试区', '⛶ Enlarge pad'], unzoom: ['✕ 退出放大（Esc）', '✕ Exit (Esc)'],
  tabRef: ['⑧ 参考标准', '⑧ Reference'],
};

// [name, what, good, reveals]
const LEARN = {
  cal: [
    [['实测 CPI / 与标称偏差', 'Measured CPI / vs nominal'], ['你设的 800 DPI，鼠标实际每英寸报多少点。', 'How many counts per inch the mouse really sends at the DPI you set.'], ['偏差在 ±5% 内', 'within ±5%'],
      ['不是质量好坏，而是"标得准不准"。偏差大时，两只鼠标同样的游戏灵敏度手感会不一样——换鼠标要按实测值重新算灵敏度。', 'Not quality as such, but labelling accuracy. A big offset means the same in-game sensitivity feels different between mice — rescale it from the measured value.']],
    [['内置加速', 'Built-in acceleration'], ['同样的距离，快甩和慢移算出来的 CPI 是否一样。', 'Whether a fast and a slow pass over the same distance give the same CPI.'], ['"无"，快慢差在 ±5% 内', '"none", within ±5%'],
      ['无加速 = 优点：肌肉记忆可靠，甩多远就转多远。有加速 = 缺点：同样的手部动作，速度不同准星落点就不同。', 'None is a strength: muscle memory holds. Any acceleration is a weakness: the same hand motion lands differently at different speeds.']],
    [['角度吸附', 'Angle snapping'], ['鼠标有没有偷偷把你画歪的线"修直"。', 'Whether the mouse secretly straightens your lines.'], ['"没有吸附"', '"none"'],
      ['没有 = 优点。有 = FPS 里的缺点：画图时线很直，但压枪、微调的细小纵向移动会被吃掉。', 'None is a strength. Snapping hurts in shooters: lines look straight, but small vertical corrections get swallowed.']],
  ],
  curve: [
    [['异常跳点', 'Spikes'], ['某一次报告突然比前后大很多倍。', 'A single report many times bigger than its neighbours.'], ['0', '0'],
      ['有跳点 = 缺陷：游戏里表现为准星瞬移。先擦传感器、换垫子再测，仍有就是传感器或固件问题。', 'A defect: the crosshair teleports. Clean the lens and change pad first; if it stays, it is the sensor or firmware.']],
    [['反向抖动', 'Reversals'], ['朝一个方向甩时冒出反方向的读数。', 'Readings in the opposite direction during a one-way swipe.'], ['越少越好，接近 0', 'as close to 0 as possible'],
      ['多 = 追踪不稳（传感器或垫面）。手感是"甩到头会抖一下"。', 'Many means unstable tracking (sensor or surface) — a wobble at the end of a flick.']],
    [['平滑处理 / 曲线粗糙度', 'Smoothing / roughness'], ['曲线是锯齿状（原始数据）还是被磨圆（厂商滤波）。< 0.18 平滑，> 0.35 原始。', 'Jagged curve (raw data) or rounded (vendor filtering). < 0.18 smoothed, > 0.35 raw.'], ['"未平滑"或"轻度平滑"', '"raw" or "mild"'],
      ['原始 = 优点：没有额外处理，延迟最低，高端传感器的常见做法。明显平滑 = 缺点：会多一点延迟、"跟手但发飘"；少数人喜欢它更稳。手抖也会让曲线变毛，所以要多测几次。', 'Raw is a strength: no extra processing, lowest delay. Heavy smoothing adds delay and a floaty feel, though some like its steadiness. A shaky hand also roughens the curve, so repeat.']],
    [['停手拖尾', 'Motion tail'], ['手停下以后鼠标还继续上报了多少毫秒。', 'How many ms the mouse keeps reporting after your hand stops.'], ['越短越好', 'shorter is better'],
      ['长 = 缺点：通常是平滑缓冲造成，停枪不干脆，"刹不住"。', 'Long is a weakness, usually smoothing buffers: stops feel mushy.']],
    [['本次峰值速度', 'Peak speed'], ['你这次甩得最快的速度。', 'How fast you swiped this run.'], ['—', '—'],
      ['这是你的手速，不是鼠标的分数；用来告诉你下一项"丢帧测试"要甩多快。', 'This is your hand, not a score for the mouse; it tells you how fast to go in the malfunction test.']],
  ],
  mal: [
    [['基准计数', 'Baseline counts'], ['慢速走完固定距离得到的点数，作为"正确答案"。', 'Counts for the fixed distance at a slow, safe speed — the reference answer.'], ['每次都接近', 'repeatable'],
      ['基准都不稳，说明每次走的距离不一样，后面的结论不可信。', 'If the baseline varies, your distance varies, and nothing after it can be trusted.']],
    [['已验证到 / 开始丢帧', 'Verified up to / loses tracking at'], ['速度越来越快时，计数从哪个速度开始明显变少。', 'The speed at which counts start dropping as you swipe faster.'], ['越高越好；比你最快的甩枪还快就算合格', 'higher is better; above your fastest flick is a pass'],
      ['丢帧 = 硬伤：大甩枪时准星转不到位。现代主流传感器标称几百 IPS，人手很难甩到，所以"没测到极限"是常态，是好事。', 'Losing tracking is a serious flaw: big flicks fall short. Modern sensors are rated at hundreds of IPS that hands rarely reach, so "limit not reached" is normal and good.']],
  ],
  poll: [
    [['中位 / 平均回报率', 'Median / average rate'], ['鼠标每秒向电脑报告几次位置。', 'How many times per second the mouse reports its position.'], ['接近你设的档位（±10%），两者一致', 'close to your setting (±10%), and both agree'],
      ['高回报率 = 位置更新更勤、延迟更低（1000 Hz 每 1 毫秒一次，8000 Hz 每 0.125 毫秒一次）。实测远低于设定，多半是浏览器、USB 口或驱动没开到位，不一定是鼠标差。', 'Higher rate means fresher position and lower delay (1 ms at 1000 Hz, 0.125 ms at 8000 Hz). Reading far below the setting is usually the browser, port or driver, not the mouse.']],
    [['丢包率 / 一致度', 'Drop rate / agreement'], ['报告有没有漏、是不是均匀到达。', 'Whether reports go missing or arrive unevenly.'], ['丢包接近 0，一致度高', 'drops near 0, high agreement'],
      ['成串到达 = 读数不可信，常见于后台卡顿或接收器离得远。', 'Bursty arrival means the reading is unreliable — background load or a distant receiver.']],
    [['断流次数 / 最长间断', 'Dropouts / longest gap'], ['30 秒长测里出现 ≥ 20 毫秒空白的次数。', 'Gaps of 20 ms or more during the 30 s run.'], ['0 次', '0'],
      ['有断流 = 无线连接的缺点：瞬间卡顿、准星顿一下。把接收器挪近、远离 USB3 / Wi-Fi 干扰再测。', 'A wireless weakness: a momentary hitch. Move the receiver closer and away from USB 3 / Wi-Fi noise, then retest.']],
    [['机器卡顿', 'Machine stalls'], ['更短的停顿，多半是电脑自己忙。', 'Shorter pauses, usually the computer being busy.'], ['越少越好', 'fewer is better'],
      ['不算鼠标的问题，用来区分"是鼠标还是电脑"。', 'Not the mouse — it separates mouse problems from PC problems.']],
  ],
  drift: [
    [['累计抖动 / 净位移', 'Total drift / net displacement'], ['手完全离开时，鼠标自己报了多少移动。', 'Movement the mouse reports while nobody touches it.'], ['0', '0'],
      ['不为 0 = 准星自己飘。大多是垫子（玻璃、反光、深色）惹的，换垫子还飘才是传感器缺点。', 'Not zero means a drifting crosshair — usually the surface; if another pad still drifts, it is the sensor.']],
  ],
  switch: [
    [['去抖上限', 'Debounce bound'], ['松开到下一次按下，鼠标最快能识别多短的间隔。', 'The shortest release-to-press gap the mouse ever reported.'], ['越低越好', 'lower is better'],
      ['低 = 优点：连点不丢、反应快。光学 / 磁感微动通常很低；机械微动要靠去抖防连击，会高一些。', 'Low is a strength: no dropped spam clicks. Optical and magnetic switches are usually low; mechanical ones need debounce and sit higher.']],
    [['中位按住时长 / 连点速度', 'Median hold / click rate'], ['你每次按下多久、每秒点多少下。', 'How long each press lasts and how many per second.'], ['—', '—'],
      ['主要反映你的手。两只鼠标同一个人测，哪只更快说明那只更好连点（微动行程、手感）。', 'Mostly your hand. Same person on two mice: the faster one is easier to spam (travel and feel).']],
    [['疑似连击', 'Suspected chatter'], ['按一次被记成两次。', 'One press registered as two.'], ['0', '0'],
      ['有 = 硬伤：微动老化或进灰的典型症状，游戏里会意外双击、松开拖拽。', 'A serious flaw: the classic sign of a worn or dirty switch — accidental double-clicks and dropped drags.']],
    [['中位延迟（慢动作）', 'Median latency (slow-mo)'], ['手指按到底到屏幕变白的总时间。', 'Time from full press to the screen flashing.'], ['越低越好；两只差不到 1 帧（240fps 约 4 毫秒）算一样', 'lower is better; under one frame apart (≈4 ms at 240 fps) counts as equal'],
      ['包含显示器和电脑，只能同一套设备 A / B 对比，不能和网上数字比。', 'Includes display and PC — compare A and B on the same setup only, never with numbers online.']],
  ],
  main: [
    [['CPS（每秒点击）', 'CPS (clicks per second)'], ['一轮里平均每秒点了几下。', 'Average clicks per second in a round.'], ['越高越快', 'higher is faster'],
      ['主要是你的手速。同一个人换两只鼠标，CPS 更高的那只更好连点（微动更轻、回弹更快）。', 'Mostly your hand. Same person, two mice: the higher one is easier to spam (lighter, snappier switch).']],
    [['点击间隔 / 波动', 'Click interval / spread'], ['相邻两次点击隔了多少毫秒、忽快忽慢的程度。', 'Milliseconds between clicks and how uneven they are.'], ['间隔短、波动小', 'short and even'],
      ['波动小说明这只鼠标让你点得更有节奏；一只鼠标波动明显更大，可能是按键手感或微动回弹不顺。', 'An even rhythm on one mouse and not the other points to button feel or switch return.']],
    [['按住时长', 'Hold time'], ['每次按下到松开的时间。', 'Time from press to release.'], ['仅作对比', 'compare only'],
      ['越短说明按键回弹越利落；但它同样受你点法影响。这一项不是硬件延迟测试，硬件请看下方"硬件实验室"。', 'Shorter means a crisper return, but your technique matters too. This is not a hardware latency test — see the hardware lab below.']],
  ],
  phys: [
    [['抬升高度（LOD）', 'Lift-off distance (LOD)'], ['鼠标抬多高就停止追踪。', 'How high you can lift before tracking stops.'], ['越低越好，常见 1–2 毫米', 'lower is better; 1–2 mm is common'],
      ['低 = 优点：经常提鼠标的低灵敏度玩家，放下时准星不乱动。高 = 缺点：提起和放下时会"划一下"。', 'Low is a strength for low-sens players who lift often. High is a weakness: the crosshair skids on lift and land.']],
    [['按压力度', 'Click force'], ['按下左键触发需要多少克。', 'Grams needed to actuate the left button.'], ['没有标准答案', 'no right answer'],
      ['是偏好不是好坏：轻 = 连点快、容易误触；重 = 稳、按久了累。两只鼠标对比看"哪只更轻"。', 'Preference, not quality: light is quick but easy to misfire; heavy is steady but tiring.']],
  ],
};

// Manufacturer specs only (标称). Checked 2026-11; no lab numbers are invented here.
const SPECS = [
  { name: 'Logitech G PRO X SUPERLIGHT 2', sensor: 'HERO 2', dpi: '44,000', ips: '888+', g: '—', hz: '8000', w: '≈60 g', sw: ['LIGHTFORCE 光学-机械混合，70M 次', 'LIGHTFORCE hybrid, 70M'], bat: ['最长 95 h', 'up to 95 h'], src: 'https://www.logitechg.com/en-gb/products/gaming-mice/pro-x2-superlight-wireless-mouse.html' },
  { name: 'Logitech G PRO X2 SUPERSTRIKE', sensor: 'HERO 2', dpi: '44,000', ips: '888+', g: '88', hz: '8000', w: '61 g', sw: ['HITS 感应触发：10 档触发点、5 档回弹点、6 档触感', 'HITS inductive: 10 actuation / 5 reset points, 6 haptic levels'], bat: '—', src: 'logitechg.com' },
  { name: 'Razer Viper V3 Pro', sensor: 'Focus Pro 35K Gen-2', dpi: '35,000', ips: '750', g: '70', hz: '8000', w: ['54 g（白色 55 g）', '54 g (white 55 g)'], sw: ['第三代光学微动，90M 次，标称 0.2 ms 触发、无去抖延迟', 'Optical Gen-3, 90M, 0.2 ms actuation, no debounce'], bat: '—', src: 'razer.com' },
  { name: 'Razer Viper V4 Pro', sensor: 'Focus Pro 50K Gen-3', dpi: '50,000', ips: '930', g: '90', hz: '8000', w: '49–50 g', sw: ['第四代光学微动，0.25 mm 触发；26 档非对称 LOD', 'Optical Gen-4, 0.25 mm actuation; 26-step asymmetric LOD'], bat: ['1 kHz 约 180 h / 8 kHz 约 45 h', '≈180 h at 1 kHz / ≈45 h at 8 kHz'], src: ['notebookcheck、igor’sLAB 报道（2026-03 发布）', 'notebookcheck, igor’sLAB (released 2026-03)'] },
];

// What a healthy result looks like in this lab — rules of thumb, not official standards.
const PASS = [
  [['回报率', 'Polling rate'], ['中位数在设定档位 ±10%，平均与中位一致', 'median within ±10% of setting, average agrees'], ['8K 在浏览器里常常跑不满，先排查电脑', '8K often reads low in browsers — check the PC first']],
  [['30 秒断流', '30 s dropouts'], ['0 次（≥ 20 ms 的空白）', '0 gaps of 20 ms or more'], ['无线鼠标 1–2 次可接受，要看接收器位置', 'wireless: 1–2 can be placement']],
  [['异常跳点 / 静态抖动', 'Spikes / drift'], ['都是 0', 'both 0'], ['任何一项长期不为 0 都算缺陷', 'persistently non-zero is a defect']],
  [['内置加速 / 角度吸附', 'Acceleration / snapping'], ['无（±5% 内）/ 无', 'none (±5%) / none'], ['主流电竞鼠标默认都应关闭', 'off by default on gaming mice']],
  [['CPI 偏差', 'CPI offset'], ['±5% 内', 'within ±5%'], ['手移动误差约几个百分点，测 3 次', 'hand error is a few %, run 3×']],
  [['丢帧速度', 'Malfunction speed'], ['你最快的甩枪都测不出丢帧', 'no collapse at your fastest flick'], ['标称几百 IPS，远超人手', 'ratings far exceed human hands']],
  [['疑似连击', 'Chatter'], ['0', '0'], ['出现就多测几次确认，确认即硬伤', 'confirm with repeats; confirmed = flaw']],
  [['抬升高度', 'Lift-off'], ['≤ 2 mm', '≤ 2 mm'], ['可在驱动里调低的鼠标先调到最低再测', 'set the driver LOD to minimum first']],
];

function learnBox(id) {
  const rows = LEARN[id]; if (!rows) return '';
  const [, c2, c3, c4] = pick(UI.cols);
  return `<details class="hw-learn"><summary>${pick(UI.learn)}</summary>
    <p class="hw-legend">${pick(UI.legend)}</p>
    <div class="hw-learn-list">${rows.map(([n, w, g, r]) => `<div class="hw-learn-item"><b>${esc(pick(n))}</b>
      <p><i>${c2}</i>${esc(pick(w))}</p><p><i>${c3}</i>${esc(pick(g))}</p><p><i>${c4.split(' · ')[0]}</i>${esc(pick(r))}</p></div>`).join('')}</div>
    </details>`;
}

function refPanel() {
  const zh = getLang() === 'zh';
  const head = zh ? ['型号', '传感器', '最高 DPI', '最高速度 IPS', '加速度 G', '回报率 Hz', '重量', '微动 / 特点', '续航', '来源']
    : ['Model', 'Sensor', 'Max DPI', 'Max IPS', 'Accel G', 'Polling Hz', 'Weight', 'Switch / notes', 'Battery', 'Source'];
  const src = (s) => { const v = pick(s); return v.startsWith('http') ? `<a href="${esc(v)}" target="_blank" rel="noopener">logitechg.com</a>` : esc(v); };
  const specRows = SPECS.map((m) => `<tr><th scope="row">${esc(m.name)}</th><td>${esc(m.sensor)}</td><td>${m.dpi}</td><td>${m.ips}</td><td>${m.g}</td><td>${m.hz}</td><td>${esc(pick(m.w))}</td><td>${esc(pick(m.sw))}</td><td>${esc(pick(m.bat))}</td><td>${src(m.src)}</td></tr>`).join('');
  const passHead = zh ? ['项目', '健康的结果', '备注'] : ['Item', 'Healthy result', 'Note'];
  return `<p class="hw-how">${zh ? '下面是目前主流旗舰电竞鼠标的<b>厂商标称参数</b>（2026 年 11 月核对）。它们告诉你"顶级鼠标的上限在哪"，再配合下面的"健康结果"表，就能判断你测出来的数是好是坏。'
      : 'Below are the <b>manufacturer-claimed specs</b> of current flagship gaming mice (checked November 2026). They show where the ceiling is; the healthy-result table below tells you whether your own numbers are good.'}</p>
    <div class="hw-table hw-ref"><table><thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${specRows}</tbody></table></div>
    <p class="hw-limit">${zh ? '注意：这些是厂商写在官网上的数字，不是第三方实验室实测（RTINGS 等机构的实测数据需付费，这里没有照抄也没有编造）。标称的 IPS、G 值是传感器在实验台上的上限，人手几乎碰不到，所以 750 和 930 IPS 在实战里很难感觉出区别。浏览器里测的结果包含你的电脑、垫子和手，不能直接拿来和这张表的数字一一对比——这张表用来看"档次"，下面那张用来判断"你这只合不合格"。'
      : 'These are figures from the makers’ own pages, not independent lab measurements (paid lab data such as RTINGS is neither copied nor invented here). Rated IPS and G are bench limits hands almost never reach, so 750 vs 930 IPS is hard to feel. Browser results include your PC, pad and hand, so they cannot be matched one-to-one with this table — use this for the class of mouse, and the table below for whether yours is healthy.'}</p>
    <h3 class="hw-subh">${zh ? '健康结果参考（经验值，非官方标准）' : 'Healthy results (rules of thumb, not official)'}</h3>
    <div class="hw-table hw-ref hw-pass"><table><thead><tr>${passHead.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>
      ${PASS.map(([a, b, c]) => `<tr><th scope="row">${esc(pick(a))}</th><td>${esc(pick(b))}</td><td>${esc(pick(c))}</td></tr>`).join('')}</tbody></table></div>
    <p class="hw-limit">${zh ? '怎么用：拿你的鼠标按 ①→⑦ 测一遍，对照这张表。全部达标 = 这只鼠标的传感器和微动没有明显短板，剩下的差别主要是重量、形状和手感偏好。'
      : 'How to use: run ① to ⑦ on your mouse and compare. All healthy = no obvious sensor or switch weakness; what remains is weight, shape and feel.'}</p>`;
}

// ---------------------------------------------------------------- zoom
let zoomed = null; let holder = null; let exitBtn = null;
function unzoom() {
  if (!zoomed) return;
  zoomed.classList.remove('pad-max'); holder.replaceWith(zoomed);
  document.body.classList.remove('has-pad-max'); exitBtn.hidden = true;
  zoomed.scrollIntoView({ block: 'center' }); zoomed = null;
}
function zoom(pad) {
  if (zoomed) { unzoom(); return; }
  holder = document.createElement('div'); holder.className = 'pad-holder'; holder.style.height = `${pad.offsetHeight}px`;
  pad.replaceWith(holder); document.body.append(pad); // moved out so no card transform/filter traps position:fixed
  pad.classList.add('pad-max'); document.body.classList.add('has-pad-max'); exitBtn.hidden = false; zoomed = pad;
}
function addZoom(pad) {
  if (!pad || pad.previousElementSibling?.classList.contains('pad-zoom')) return;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'button button-secondary pad-zoom';
  b.addEventListener('click', () => zoom(pad)); pad.before(b);
}

function render() {
  document.querySelectorAll('.hw-learn-wrap').forEach((d) => {
    const open = d.querySelector('details')?.open; d.innerHTML = learnBox(d.dataset.for);
    if (open) d.querySelector('details').open = true;
  });
  const ref = document.querySelector('.hw-panel[data-panel="ref"]'); if (ref) ref.innerHTML = refPanel();
  const tab = document.querySelector('.hw-tab[data-tab="ref"]'); if (tab) tab.textContent = pick(UI.tabRef);
  document.querySelectorAll('.pad-zoom').forEach((b) => { b.textContent = pick(UI.zoom); });
  if (exitBtn) exitBtn.textContent = pick(UI.unzoom);
}

function init() {
  const sec = document.getElementById('hw'); if (!sec) { setTimeout(init, 50); return; }
  Object.keys(LEARN).forEach((id) => {
    const p = sec.querySelector(`.hw-panel[data-panel="${id}"]`); if (!p) return;
    const w = document.createElement('div'); w.className = 'hw-learn-wrap'; w.dataset.for = id;
    const metrics = p.querySelector('.hw-metrics'); (metrics || p.firstChild)?.before(w);
  });
  const cmp = document.querySelector('.comparison-card');
  if (cmp) { const w = document.createElement('div'); w.className = 'hw-learn-wrap'; w.dataset.for = 'main'; (cmp.querySelector('h2')?.nextElementSibling || cmp.firstChild).before(w); }
  sec.querySelector('.hw-tabs')?.insertAdjacentHTML('beforeend', '<button type="button" role="tab" class="hw-tab" data-tab="ref" aria-selected="false"></button>');
  sec.querySelector('.hw-panels')?.insertAdjacentHTML('beforeend', '<div class="hw-panel" data-panel="ref" role="tabpanel" hidden></div>');

  exitBtn = document.createElement('button'); exitBtn.type = 'button'; exitBtn.className = 'button button-primary pad-exit'; exitBtn.hidden = true;
  exitBtn.addEventListener('click', unzoom); document.body.append(exitBtn);
  addZoom(document.getElementById('test-area'));
  document.querySelectorAll('.hw-pad').forEach(addZoom);
  document.addEventListener('mouselab:pads', (e) => { e.detail.forEach(addZoom); render(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && zoomed && !document.pointerLockElement) unzoom(); });
  document.addEventListener('pointerlockchange', () => { if (zoomed) zoomed.dataset.locked = document.pointerLockElement ? '1' : ''; });
  document.getElementById('lang-select')?.addEventListener('change', () => setTimeout(render, 0));
  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
