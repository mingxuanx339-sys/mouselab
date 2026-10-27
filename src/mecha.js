// Decorative mecha layer: original unit "MX-01", HUD comms and state readouts.
// Purely visual — never touches click capture or timing.
import { getLang, t } from './i18n.js';

const LINES = {
  name: ['机甲少女 LYRA · MX-01', 'LYRA · MX-01 frame', '機甲少女 LYRA・MX-01'],
  hello: ['系统上线。双机对比程序已就绪。', 'Systems online. Dual-unit comparison ready.', 'システム起動。比較プログラム待機中。'],
  idle: ['待机中——按上方按钮启动。', 'Standing by — launch from the button above.', '待機中——上のボタンで起動。'],
  prep: ['充能中……3、2、1', 'Charging… 3, 2, 1', 'チャージ中…3、2、1'],
  go: ['全力输出！', 'Full output!', '全力出力！'],
  done: ['本轮数据已写入。', 'Round data logged.', 'ラウンドデータ記録完了。'],
  rest: ['冷却中——请切换机体。', 'Cooling down — switch units.', '冷却中——機体を交換。'],
  all: ['全部任务完成，查看战报。', 'All sorties complete. Check the report.', '全任務完了。戦果を確認。'],
};
const CODE = { idle: 'STANDBY', prep: 'CHARGING', go: 'ENGAGE', done: 'LOGGED', rest: 'COOLDOWN', all: 'COMPLETE' };
const IDX = { zh: 0, en: 1, ja: 2 };
const say = (key) => LINES[key][IDX[getLang()] ?? 0];

let uid = 0;
export function unitSVG() {
  const p = `u${++uid}`;
  const wing = (d) => `<path class="u-wing" d="${d}" fill="url(#${p}w)" stroke="var(--visor)" stroke-opacity=".7" stroke-width="1.2"/>`;
  return `
<svg class="unit" viewBox="0 0 300 290" aria-hidden="true">
  <defs>
    <linearGradient id="${p}w" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="var(--visor)" stop-opacity=".85"/><stop offset="1" stop-color="var(--visor)" stop-opacity="0"/></linearGradient>
    <linearGradient id="${p}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#d9d0f2"/><stop offset="1" stop-color="#9d8fc4"/></linearGradient>
    <linearGradient id="${p}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7b4dff"/><stop offset="1" stop-color="#ff5fd2"/></linearGradient>
    <linearGradient id="${p}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2466"/><stop offset="1" stop-color="#1a1030"/></linearGradient>
    <filter id="${p}g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3.2"/></filter>
  </defs>
  <!-- light-blade wings -->
  <g class="u-wings">
    <g class="u-wl">${wing('M120 178 L18 74 L34 70 L128 168 Z')}${wing('M116 188 L4 134 L18 124 L122 178 Z')}${wing('M114 200 L14 196 L22 184 L118 190 Z')}</g>
    <g class="u-wr">${wing('M180 178 L282 74 L266 70 L172 168 Z')}${wing('M184 188 L296 134 L282 124 L178 178 Z')}${wing('M186 200 L286 196 L278 184 L182 190 Z')}</g>
  </g>
  <!-- halo -->
  <ellipse class="u-halo" cx="150" cy="30" rx="46" ry="9" fill="none" stroke="var(--visor)" stroke-width="3" filter="url(#${p}g)"/>
  <ellipse class="u-halo" cx="150" cy="30" rx="46" ry="9" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.4"/>
  <!-- armour ribbons (twin tails) -->
  <path d="M104 104 C76 140 70 196 82 262 L96 258 C90 206 96 156 118 120 Z" fill="url(#${p}r)"/>
  <path d="M196 104 C224 140 230 196 218 262 L204 258 C210 206 204 156 182 120 Z" fill="url(#${p}r)"/>
  <g stroke="#2a1745" stroke-width="2" opacity=".55"><path d="M86 168 L100 166"/><path d="M82 200 L96 200"/><path d="M84 232 L96 233"/><path d="M214 168 L200 166"/><path d="M218 200 L204 200"/><path d="M216 232 L204 233"/></g>
  <circle cx="82" cy="262" r="5" fill="var(--visor)"/><circle cx="218" cy="262" r="5" fill="var(--visor)"/>
  <!-- body -->
  <path d="M138 160 L162 160 L166 196 L134 196 Z" fill="url(#${p}d)"/>
  <path d="M96 290 C96 236 112 206 150 200 C188 206 204 236 204 290 Z" fill="url(#${p}h)"/>
  <path d="M84 222 C96 202 118 198 128 204 C116 214 108 228 104 246 Z" fill="#efe9ff" stroke="#9d8fc4"/>
  <path d="M216 222 C204 202 182 198 172 204 C184 214 192 228 196 246 Z" fill="#efe9ff" stroke="#9d8fc4"/>
  <ellipse cx="150" cy="202" rx="30" ry="7" fill="none" stroke="#7b4dff" stroke-width="3"/>
  <path d="M150 226 L162 242 L150 258 L138 242 Z" fill="var(--visor)" filter="url(#${p}g)"/>
  <path d="M150 226 L162 242 L150 258 L138 242 Z" fill="var(--visor)"/>
  <path d="M150 232 L156 242 L150 250 Z" fill="#fff" opacity=".7"/>
  <path d="M118 270 C130 262 170 262 182 270" fill="none" stroke="#9d8fc4"/>
  <!-- antenna fins -->
  <path d="M122 66 L98 26 L104 24 L132 58 Z" fill="#efe9ff" stroke="#9d8fc4"/>
  <path d="M178 66 L202 26 L196 24 L168 58 Z" fill="#efe9ff" stroke="#9d8fc4"/>
  <path d="M110 40 L124 58" stroke="#ff5fd2" stroke-width="2.5"/><path d="M190 40 L176 58" stroke="#ff5fd2" stroke-width="2.5"/>
  <!-- helmet -->
  <path d="M150 52 C188 52 208 80 206 114 C204 142 186 162 150 168 C114 162 96 142 94 114 C92 80 112 52 150 52 Z" fill="url(#${p}h)" stroke="#8f80bd" stroke-width="1.5"/>
  <path d="M150 54 L160 72 L150 86 L140 72 Z" fill="#7b4dff"/><path d="M150 60 L155 72 L150 79 Z" fill="#fff" opacity=".7"/>
  <g fill="none" stroke="#a99ccc" stroke-width="1.2"><path d="M112 70 C120 84 122 92 120 100"/><path d="M188 70 C180 84 178 92 180 100"/><path d="M118 142 C130 154 170 154 182 142"/></g>
  <circle cx="96" cy="118" r="12" fill="#2a1745" stroke="#8f80bd"/><circle cx="96" cy="118" r="5" fill="var(--visor)"/>
  <circle cx="204" cy="118" r="12" fill="#2a1745" stroke="#8f80bd"/><circle cx="204" cy="118" r="5" fill="var(--visor)"/>
  <!-- visor -->
  <path d="M106 100 Q150 86 194 100 L190 128 Q150 142 110 128 Z" fill="#140b26" stroke="#8f80bd"/>
  <g class="u-eyes u-open">
    <path d="M116 114 Q128 104 142 112 Q130 124 116 114 Z" fill="var(--visor)" filter="url(#${p}g)"/>
    <path d="M184 114 Q172 104 158 112 Q170 124 184 114 Z" fill="var(--visor)" filter="url(#${p}g)"/>
    <path d="M116 114 Q128 104 142 112 Q130 124 116 114 Z" fill="var(--visor)"/>
    <path d="M184 114 Q172 104 158 112 Q170 124 184 114 Z" fill="var(--visor)"/>
    <circle cx="126" cy="111" r="2.2" fill="#fff"/><circle cx="168" cy="111" r="2.2" fill="#fff"/>
  </g>
  <g class="u-eyes u-sharp">
    <path d="M114 110 L144 116 L118 118 Z" fill="var(--visor)" filter="url(#${p}g)"/><path d="M186 110 L156 116 L182 118 Z" fill="var(--visor)" filter="url(#${p}g)"/>
    <path d="M114 110 L144 116 L118 118 Z" fill="#fff"/><path d="M186 110 L156 116 L182 118 Z" fill="#fff"/>
  </g>
  <g class="u-eyes u-happy" fill="none" stroke="var(--visor)" stroke-width="4" stroke-linecap="round">
    <path d="M118 118 Q129 104 140 118"/><path d="M160 118 Q171 104 182 118"/>
  </g>
  <path class="u-scan" d="M108 100 L112 100 L112 130 L108 130 Z" fill="#fff" opacity=".35"/>
</svg>`;
}

function init() {
  const hero = document.getElementById('hero-unit');
  const heroArt = document.getElementById('hero-unit-art');
  const heroSay = document.getElementById('hero-say');
  const heroName = document.getElementById('hero-name');
  const buddy = document.getElementById('buddy');
  const bubble = document.getElementById('buddy-say');
  const code = document.getElementById('buddy-code');
  if (heroArt) heroArt.innerHTML = unitSVG();
  if (buddy) buddy.innerHTML = unitSVG();
  if (hero) hero.dataset.mood = 'idle';

  const status = document.getElementById('test-status');
  const area = document.getElementById('test-area');
  let lastActive = false; let doneUntil = 0; let doneTimer = null;

  const update = () => {
    const txt = status?.textContent ?? '';
    const active = area?.classList.contains('is-active');
    const busy = status?.classList.contains('is-active');
    if (lastActive && !active) { doneUntil = performance.now() + 3500; clearTimeout(doneTimer); doneTimer = setTimeout(update, 3600); }
    lastActive = Boolean(active);
    let mood = 'idle'; let line = 'idle';
    if (active) { mood = 'go'; line = 'go'; }
    else if (busy) { mood = 'prep'; line = 'prep'; }
    else if (performance.now() < doneUntil) { mood = 'done'; line = 'done'; }
    else if (txt === t('stDone')) { mood = 'done'; line = 'all'; }
    else if (txt === t('stRest')) { mood = 'rest'; line = 'rest'; }
    if (buddy) buddy.dataset.mood = mood;
    document.querySelector('.capture-card')?.setAttribute('data-mood', mood);
    if (code) code.textContent = CODE[line];
    if (bubble && bubble.dataset.line !== `${line}:${getLang()}`) {
      bubble.dataset.line = `${line}:${getLang()}`; bubble.textContent = say(line);
      bubble.classList.remove('type'); void bubble.offsetWidth; bubble.classList.add('type');
    }
    if (heroSay) heroSay.textContent = say('hello');
    if (heroName) heroName.textContent = say('name');
  };
  if (status) new MutationObserver(update).observe(status, { childList: true, characterData: true, subtree: true, attributes: true });
  if (area) new MutationObserver(update).observe(area, { attributes: true, attributeFilter: ['class'] });
  document.getElementById('lang-select')?.addEventListener('change', () => setTimeout(update, 0));
  update();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
