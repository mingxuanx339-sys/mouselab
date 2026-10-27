// Decorative mecha layer: original unit "MX-01", HUD comms and state readouts.
// Purely visual — never touches click capture or timing.
import { getLang, t } from './i18n.js';

const LINES = {
  name: ['机体 MX-01 · 点击测试单元', 'Unit MX-01 · Click test frame', '機体 MX-01・クリック試験ユニット'],
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
  return `
<svg class="unit" viewBox="0 0 260 240" aria-hidden="true">
  <defs>
    <linearGradient id="${p}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5560"/><stop offset="1" stop-color="#1c2228"/></linearGradient>
    <linearGradient id="${p}b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#626f7b"/><stop offset="1" stop-color="#2a3138"/></linearGradient>
    <filter id="${p}g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
    <clipPath id="${p}v"><path d="M78 118 L130 108 L182 118 L174 134 L130 128 L86 134 Z"/></clipPath>
  </defs>
  <!-- shoulders -->
  <path d="M20 236 L34 176 L92 160 L104 236 Z" fill="url(#${p}a)" stroke="#6b7884" stroke-width="1.5"/>
  <path d="M240 236 L226 176 L168 160 L156 236 Z" fill="url(#${p}a)" stroke="#6b7884" stroke-width="1.5"/>
  <path d="M34 176 L92 160 L94 172 L38 188 Z" fill="var(--accent)"/>
  <path d="M226 176 L168 160 L166 172 L222 188 Z" fill="var(--accent)"/>
  <g stroke="#1b2026" stroke-width="5"><line x1="46" y1="210" x2="58" y2="198"/><line x1="58" y1="214" x2="70" y2="202"/><line x1="70" y1="218" x2="82" y2="206"/></g>
  <text x="196" y="214" fill="#8d9aa6" font-size="11" font-family="monospace" text-anchor="middle">MX-01</text>
  <!-- neck / collar -->
  <path d="M100 236 L106 168 L154 168 L160 236 Z" fill="#20262c" stroke="#56616c"/>
  <g stroke="#56616c"><line x1="112" y1="182" x2="148" y2="182"/><line x1="110" y1="196" x2="150" y2="196"/><line x1="108" y1="210" x2="152" y2="210"/></g>
  <!-- side fins (swept back) -->
  <path d="M70 104 L16 70 L28 96 L64 122 Z" fill="url(#${p}b)" stroke="#7a8794"/>
  <path d="M190 104 L244 70 L232 96 L196 122 Z" fill="url(#${p}b)" stroke="#7a8794"/>
  <path d="M22 76 L60 102" stroke="var(--accent)" stroke-width="3"/>
  <path d="M238 76 L200 102" stroke="var(--accent)" stroke-width="3"/>
  <!-- helmet -->
  <path d="M130 26 L176 46 L196 96 L188 150 L160 172 L100 172 L72 150 L64 96 L84 46 Z" fill="url(#${p}b)" stroke="#8a97a3" stroke-width="2"/>
  <!-- crest -->
  <path d="M130 8 L140 30 L134 74 L126 74 L120 30 Z" fill="#cfd6dc" stroke="#7a8794"/>
  <path d="M130 14 L135 30 L131 66 L129 66 L125 30 Z" fill="var(--accent)" opacity=".85"/>
  <!-- brow plates -->
  <path d="M84 50 L124 82 L82 104 Z" fill="#3a434c" stroke="#7a8794"/>
  <path d="M176 50 L136 82 L178 104 Z" fill="#3a434c" stroke="#7a8794"/>
  <!-- visor -->
  <path d="M74 116 L130 104 L186 116 L176 138 L130 132 L84 138 Z" fill="#0b0f13" stroke="#8a97a3" stroke-width="1.5"/>
  <path class="u-glow" d="M78 118 L130 108 L182 118 L174 134 L130 128 L86 134 Z" fill="var(--visor)" filter="url(#${p}g)" opacity=".9"/>
  <path class="u-visor" d="M78 118 L130 108 L182 118 L174 134 L130 128 L86 134 Z" fill="var(--visor)" opacity=".85"/>
  <g clip-path="url(#${p}v)"><rect class="u-scan" x="60" y="104" width="16" height="36" fill="#fff" opacity=".55"/></g>
  <!-- faceguard -->
  <path d="M100 146 L130 140 L160 146 L154 168 L106 168 Z" fill="#2a3138" stroke="#7a8794"/>
  <g stroke="#7a8794" stroke-width="2"><line x1="116" y1="150" x2="116" y2="164"/><line x1="124" y1="149" x2="124" y2="166"/><line x1="136" y1="149" x2="136" y2="166"/><line x1="144" y1="150" x2="144" y2="164"/></g>
  <!-- panel lines + rivets -->
  <g stroke="#56616c" fill="none"><path d="M94 60 L108 140"/><path d="M166 60 L152 140"/><path d="M72 146 L96 150"/><path d="M188 146 L164 150"/></g>
  <g fill="#9aa6b1"><circle cx="78" cy="96" r="2"/><circle cx="182" cy="96" r="2"/><circle cx="96" cy="160" r="2"/><circle cx="164" cy="160" r="2"/></g>
  <!-- thruster flares (engage) -->
  <g class="u-flare"><path d="M28 98 L4 112 L30 104 Z" fill="var(--visor)"/><path d="M232 98 L256 112 L230 104 Z" fill="var(--visor)"/></g>
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
