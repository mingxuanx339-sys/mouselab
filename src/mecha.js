// Decorative mecha layer: original unit "MX-01", HUD comms and state readouts.
// Purely visual — never touches click capture or timing.
import { getLang, t } from './i18n.js';

const LINES = {
  name: ['Q版机甲 LYRA', 'Chibi mecha LYRA', 'ミニ機甲 LYRA'],
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
  const feather = (d) => `<path d="${d}" fill="url(#${p}w)" stroke="#ff8fc8" stroke-width="1.2"/>`;
  return `
<svg class="unit chibi" viewBox="0 0 200 200" aria-hidden="true">
  <defs>
    <linearGradient id="${p}w" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffd1ea"/><stop offset="1" stop-color="#ff8fc8" stop-opacity=".85"/></linearGradient>
    <linearGradient id="${p}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#fff0f8"/><stop offset="1" stop-color="#f7cfe6"/></linearGradient>
    <linearGradient id="${p}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2350"/><stop offset="1" stop-color="#2a1230"/></linearGradient>
    <filter id="${p}g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4"/></filter>
  </defs>
  <!-- mini light-feather wings -->
  <g class="u-wings">
    <g class="u-wl">${feather('M70 128 C40 118 18 96 10 70 C30 84 50 92 72 112 Z')}${feather('M68 134 C40 134 20 122 8 104 C30 110 48 114 70 124 Z')}${feather('M70 140 C48 148 30 146 18 138 C36 136 52 134 70 132 Z')}</g>
    <g class="u-wr">${feather('M130 128 C160 118 182 96 190 70 C170 84 150 92 128 112 Z')}${feather('M132 134 C160 134 180 122 192 104 C170 110 152 114 130 124 Z')}${feather('M130 140 C152 148 170 146 182 138 C164 136 148 134 130 132 Z')}</g>
  </g>
  <!-- halo -->
  <ellipse class="u-halo" cx="100" cy="18" rx="26" ry="6" fill="none" stroke="var(--visor)" stroke-width="3" filter="url(#${p}g)"/>
  <ellipse class="u-halo" cx="100" cy="18" rx="26" ry="6" fill="none" stroke="#fff" stroke-width="1.4"/>
  <!-- thruster flames (engage) -->
  <g class="u-flare"><path d="M80 186 l6 12 6 -12 Z" fill="var(--visor)"/><path d="M108 186 l6 12 6 -12 Z" fill="var(--visor)"/></g>
  <!-- legs + boots -->
  <rect x="78" y="156" width="16" height="24" rx="7" fill="url(#${p}h)" stroke="#e7a9cb"/>
  <rect x="106" y="156" width="16" height="24" rx="7" fill="url(#${p}h)" stroke="#e7a9cb"/>
  <path d="M75 178 h22 a4 4 0 0 1 4 4 v4 h-28 v-4 a4 4 0 0 1 2 -4 Z" fill="#ff6fb5"/>
  <path d="M103 178 h22 a4 4 0 0 1 2 4 v4 h-28 v-4 a4 4 0 0 1 4 -4 Z" fill="#ff6fb5"/>
  <!-- body -->
  <path d="M72 128 Q100 116 128 128 L124 160 Q100 168 76 160 Z" fill="url(#${p}h)" stroke="#e7a9cb" stroke-width="1.5"/>
  <path d="M78 132 Q100 124 122 132" fill="none" stroke="#ff8fc8" stroke-width="3" stroke-linecap="round"/>
  <path d="M100 141 c-4 -6 -12 -2 -10 4 c1 4 10 9 10 9 c0 0 9 -5 10 -9 c2 -6 -6 -10 -10 -4 Z" fill="var(--visor)" filter="url(#${p}g)"/>
  <path d="M100 141 c-4 -6 -12 -2 -10 4 c1 4 10 9 10 9 c0 0 9 -5 10 -9 c2 -6 -6 -10 -10 -4 Z" fill="var(--visor)"/>
  <!-- arms -->
  <rect x="58" y="128" width="14" height="28" rx="7" fill="url(#${p}h)" stroke="#e7a9cb" transform="rotate(12 65 132)"/>
  <rect x="128" y="128" width="14" height="28" rx="7" fill="url(#${p}h)" stroke="#e7a9cb" transform="rotate(-12 135 132)"/>
  <circle cx="62" cy="158" r="6" fill="#ff8fc8"/><circle cx="138" cy="158" r="6" fill="#ff8fc8"/>
  <!-- antenna ears -->
  <path d="M60 52 L48 18 L76 40 Z" fill="#ff8fc8" stroke="#e46aa8" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M140 52 L152 18 L124 40 Z" fill="#ff8fc8" stroke="#e46aa8" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M60 46 L54 28 L68 40 Z" fill="#fff" opacity=".6"/><path d="M140 46 L146 28 L132 40 Z" fill="#fff" opacity=".6"/>
  <!-- big head -->
  <rect x="44" y="34" width="112" height="92" rx="44" fill="url(#${p}h)" stroke="#e7a9cb" stroke-width="2"/>
  <path d="M60 50 Q100 30 140 50" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity=".9"/>
  <circle cx="44" cy="84" r="11" fill="#ff8fc8" stroke="#e46aa8"/><circle cx="44" cy="84" r="4.5" fill="var(--visor)"/>
  <circle cx="156" cy="84" r="11" fill="#ff8fc8" stroke="#e46aa8"/><circle cx="156" cy="84" r="4.5" fill="var(--visor)"/>
  <path d="M100 38 l5 8 -5 8 -5 -8 Z" fill="var(--visor)"/>
  <!-- visor -->
  <rect x="60" y="64" width="80" height="42" rx="20" fill="url(#${p}v)"/>
  <g class="u-eyes u-open">
    <ellipse cx="82" cy="85" rx="8" ry="10" fill="var(--visor)" filter="url(#${p}g)"/><ellipse cx="118" cy="85" rx="8" ry="10" fill="var(--visor)" filter="url(#${p}g)"/>
    <ellipse cx="82" cy="85" rx="7" ry="9" fill="var(--visor)"/><ellipse cx="118" cy="85" rx="7" ry="9" fill="var(--visor)"/>
    <circle cx="79" cy="81" r="2.6" fill="#fff"/><circle cx="115" cy="81" r="2.6" fill="#fff"/><circle cx="85" cy="89" r="1.3" fill="#fff"/><circle cx="121" cy="89" r="1.3" fill="#fff"/>
  </g>
  <g class="u-eyes u-sharp" fill="none" stroke="var(--visor)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M74 78 L90 85 L74 92"/><path d="M126 78 L110 85 L126 92"/>
  </g>
  <g class="u-eyes u-happy" fill="none" stroke="var(--visor)" stroke-width="4.5" stroke-linecap="round">
    <path d="M73 89 Q82 77 91 89"/><path d="M109 89 Q118 77 127 89"/>
  </g>
  <rect class="u-scan" x="64" y="66" width="7" height="38" rx="3" fill="#fff" opacity=".22"/>
  <!-- blush -->
  <ellipse cx="66" cy="114" rx="8" ry="4" fill="#ff8fc8" opacity=".55"/><ellipse cx="134" cy="114" rx="8" ry="4" fill="#ff8fc8" opacity=".55"/>
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
