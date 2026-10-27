// LYRA guide: a small chibi mecha in the corner that walks people through a test.
// Visual/help only — never touches click capture or timing.
import { getLang, t } from './i18n.js';

const IDX = { zh: 0, en: 1, ja: 2 };
const L = {
  hello: ['我是 LYRA，点我看怎么测 ✦', 'I’m LYRA — tap me for a quick tour ✦', 'LYRAだよ。使い方はタップしてね ✦'],
  open: ['打开导览', 'Open guide', 'ガイドを開く'],
  title: ['LYRA 导览', 'LYRA guide', 'LYRA ガイド'],
  prev: ['上一步', 'Back', '戻る'],
  next: ['下一步', 'Next', '次へ'],
  done: ['开始测试', 'Start testing', 'テスト開始'],
  close: ['关闭', 'Close', '閉じる'],
  steps: [
    [['给两只鼠标起名字', '在"准备"里填好鼠标 A 和 B 的名字，备注里写上回报率、触发设置等。'],
     ['Name both mice', 'Fill in mouse A and B under Setup, and note polling rate and trigger settings.'],
     ['2つのマウスに名前を付ける', '「準備」でマウスAとBの名前を入力し、メモにポーリングレートなどを書いておこう。']],
    [['选好时长和轮数', '推荐每轮 10 秒、每只 5 轮、休息 20 秒。第一轮开始后设置会锁定。'],
     ['Pick duration and rounds', 'Recommended: 10 s per round, 5 rounds each, 20 s rest. Settings lock once round 1 starts.'],
     ['時間とラウンド数を選ぶ', 'おすすめは1ラウンド10秒・各5ラウンド・休憩20秒。開始後は設定が固定されるよ。']],
    [['开始一轮', '点"准备测试"，3 秒倒计时后在点击框里用左键连续点击，时间到会自动停止。'],
     ['Run a round', 'Press the prepare button; after the 3 s countdown, click rapidly inside the pad. It stops by itself.'],
     ['ラウンドを始める', '準備ボタンを押して3秒後、枠の中で左クリックを連打。時間になると自動で止まるよ。']],
    [['轮流换鼠标', '按页面提示 A、B 交替测试，休息时切换鼠标，直到所有轮次完成。'],
     ['Alternate the mice', 'Follow the A/B order on screen, switch mice during the rest, until every round is done.'],
     ['マウスを交互に', '画面の順番どおりA・Bを交互に。休憩中にマウスを持ち替えて全ラウンドまで続けよう。']],
    [['看结果、导出', '在"结果"里看 CPS、点击间隔和按住时长，可以保存对比图或导出 CSV。记得：这不是硬件延迟测试。'],
     ['Read and export', 'See CPS, intervals and hold time under Results; save the image or export CSV. Remember: this is not a hardware latency test.'],
     ['結果を見て保存', '「結果」でCPS・クリック間隔・押下時間を確認。画像やCSVで保存できるよ。ハード遅延テストではないので注意。']],
  ],
};
const TARGETS = ['#setup', '#setup .settings-grid', '.capture-card', '.capture-card', '.comparison-card'];
const say = (k) => L[k][IDX[getLang()] ?? 0];
const step = (i) => L.steps[i][IDX[getLang()] ?? 0];

function init() {
  const root = document.createElement('div');
  root.className = 'guide'; root.dataset.mood = 'idle';
  root.innerHTML = `
    <div class="guide-panel" role="dialog" aria-modal="false" hidden>
      <div class="guide-head"><b class="guide-title"></b><span class="guide-count"></span><button type="button" class="guide-x" aria-label="">✕</button></div>
      <p class="guide-step"></p><p class="guide-text"></p>
      <div class="guide-dots"></div>
      <div class="guide-actions"><button type="button" class="button button-secondary guide-prev"></button><button type="button" class="button button-primary guide-next"></button></div>
    </div>
    <p class="guide-bubble" hidden></p>
    <button type="button" class="guide-bot"><img src="./assets/chibi-idle.webp" alt="" width="180" height="180"></button>`;
  document.body.append(root);
  const $ = (s) => root.querySelector(s);
  const panel = $('.guide-panel'), bubble = $('.guide-bubble'), bot = $('.guide-bot'), img = bot.querySelector('img');
  let cur = 0;

  const highlight = (sel) => {
    document.querySelectorAll('.guide-focus').forEach((el) => el.classList.remove('guide-focus'));
    const el = document.querySelector(sel); if (!el) return;
    el.classList.add('guide-focus'); el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el.classList.remove('guide-focus'), 2600);
  };
  const render = () => {
    $('.guide-title').textContent = say('title');
    $('.guide-x').setAttribute('aria-label', say('close'));
    bot.setAttribute('aria-label', say('open'));
    $('.guide-count').textContent = `${cur + 1} / ${L.steps.length}`;
    const [h, body] = step(cur); $('.guide-step').textContent = h; $('.guide-text').textContent = body;
    $('.guide-dots').innerHTML = L.steps.map((_, i) => `<i class="${i === cur ? 'on' : ''}"></i>`).join('');
    $('.guide-prev').textContent = say('prev'); $('.guide-prev').disabled = cur === 0;
    $('.guide-next').textContent = cur === L.steps.length - 1 ? say('done') : say('next');
    bubble.textContent = say('hello');
  };
  const open = () => { panel.hidden = false; bubble.hidden = true; render(); highlight(TARGETS[cur]); };
  const close = () => { panel.hidden = true; };
  bot.addEventListener('click', () => (panel.hidden ? open() : close()));
  $('.guide-x').addEventListener('click', close);
  $('.guide-prev').addEventListener('click', () => { if (cur > 0) { cur--; render(); highlight(TARGETS[cur]); } });
  $('.guide-next').addEventListener('click', () => {
    if (cur < L.steps.length - 1) { cur++; render(); highlight(TARGETS[cur]); }
    else { close(); cur = 0; highlight('#setup'); document.getElementById('mouse-a')?.focus({ preventScroll: true }); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });
  document.getElementById('lang-select')?.addEventListener('change', () => setTimeout(render, 0));

  // first visit: a short hello bubble
  let seen = false; try { seen = localStorage.getItem('mouse-lab-guide-seen') === '1'; } catch { /* storage unavailable */ }
  render();
  if (!seen) { bubble.hidden = false; setTimeout(() => { bubble.hidden = true; }, 7000); try { localStorage.setItem('mouse-lab-guide-seen', '1'); } catch { /* ignore */ } }

  // follow the test state: expression + tuck the panel away while clicking
  const status = document.getElementById('test-status'), area = document.getElementById('test-area');
  let last = false, doneUntil = 0;
  const update = () => {
    const active = area?.classList.contains('is-active'), busy = status?.classList.contains('is-active');
    if (last && !active) { doneUntil = performance.now() + 3500; setTimeout(update, 3600); }
    last = Boolean(active);
    const txt = status?.textContent ?? '';
    const mood = active ? 'go' : busy ? 'prep' : performance.now() < doneUntil || txt === t('stDone') ? 'done' : txt === t('stRest') ? 'rest' : 'idle';
    if (busy) close();
    if (root.dataset.mood !== mood) { root.dataset.mood = mood; img.src = `./assets/chibi-${mood}.webp`; }
  };
  if (status) new MutationObserver(update).observe(status, { childList: true, characterData: true, subtree: true, attributes: true });
  if (area) new MutationObserver(update).observe(area, { attributes: true, attributeFilter: ['class'] });
  ['prep', 'go', 'done', 'rest'].forEach((m) => { const i = new Image(); i.src = `./assets/chibi-${m}.webp`; });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
