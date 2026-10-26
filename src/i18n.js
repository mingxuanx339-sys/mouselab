// Three-language UI strings: [zh, en, ja]. Keys are referenced by data-i18n attributes and t().
const D = {
title: ['MouseLab — 鼠标点击实验室', 'MouseLab — Mouse Click Lab', 'MouseLab — マウスクリックラボ'],
metaDesc: ['MouseLab 鼠标 A/B 点击实验：对比次数、点击间隔与按住时长，数据仅存本机。不是硬件触发延迟测试。', 'MouseLab mouse A/B click experiment: compare click counts, intervals and hold times. Data stays on your device. Not a hardware latency test.', 'MouseLab マウス A/B クリック実験：回数・クリック間隔・押下時間を比較。データは端末内のみ。ハードウェア遅延の測定ではありません。'],
langLabel: ['语言', 'Language', '言語'],
recMode: ['录屏视图', 'Recording view', '録画ビュー'],
navAb: ['A/B 点击测试', 'A/B click test', 'A/Bクリックテスト'],
navLab: ['传感器实验室', 'Sensor lab', 'センサーラボ'],
recExit: ['退出录屏视图', 'Exit recording view', '録画ビューを終了'],
h1a: ['两只鼠标，', 'Two mice, ', '2つのマウス、'],
h1b: ['同一个你。', 'one you.', '同じあなた。'],
introCopy: ['不只看点了多少次，也看点击间隔与按住时长。固定时间、交替测试，让每一轮都有记录。', 'Look beyond click counts to click intervals and hold times. Fixed-time, alternating rounds, every round recorded.', 'クリック数だけでなく、クリック間隔と押下時間も見ます。時間を固定し交互にテストして、全ラウンドを記録します。'],
limit: ['这是个人点击表现测试，不是硬件触发延迟测试。网页没有记录物理动作起点，任何毫秒数都不能解释为微动响应速度。', 'This measures your personal clicking performance, not hardware actuation latency. The page cannot see when the physical press began, so no millisecond value reflects switch response speed.', 'これは個人のクリック性能テストで、ハードウェアの反応遅延テストではありません。物理的な押下の開始時点は記録できないため、ミリ秒値をスイッチの応答速度として解釈しないでください。'],
setupEyebrow: ['01 / 准备', '01 / Setup', '01 / 準備'],
setupH: ['先给两只鼠标命名', 'Name your two mice', '2つのマウスに名前を付ける'],
labelA: ['A · 鼠标名称', 'A · Mouse name', 'A · マウス名'],
labelB: ['B · 鼠标名称', 'B · Mouse name', 'B · マウス名'],
namePh: ['例如：Razer Viper V4 Pro', 'e.g. Razer Viper V4 Pro', '例：Razer Viper V4 Pro'],
durLabel: ['每轮时长', 'Round length', '1ラウンドの長さ'],
roundsLabel: ['每只鼠标轮数', 'Rounds per mouse', 'マウスごとのラウンド数'],
restLabel: ['轮间休息', 'Rest between rounds', 'ラウンド間の休憩'],
notesLabel: ['测试备注', 'Test notes', 'テストメモ'],
s5: ['5 秒', '5 s', '5秒'], s10: ['10 秒 · 推荐', '10 s · recommended', '10秒 · 推奨'], s15: ['15 秒', '15 s', '15秒'],
r3: ['3 轮', '3 rounds', '3ラウンド'], r5: ['5 轮 · 推荐', '5 rounds · recommended', '5ラウンド · 推奨'], r10: ['10 轮', '10 rounds', '10ラウンド'],
rest10: ['10 秒', '10 s', '10秒'], rest20: ['20 秒 · 推荐', '20 s · recommended', '20秒 · 推奨'], rest30: ['30 秒', '30 s', '30秒'],
notesPh: ['填写回报率、连接方式、触发 / 复位设置、手指及姿势、浏览器 / 显示器设置……', 'Polling rate, connection, actuation/reset settings, finger and posture, browser/display settings…', 'ポーリングレート、接続方法、トリガー/リセット設定、指と姿勢、ブラウザ/ディスプレイ設定など…'],
detail: ['先用两只鼠标各热身一次。每轮使用同一手指与姿势，固定测试设置。第一轮开始后锁定设置；更改条件请开始新对比。', 'Warm up once with each mouse. Use the same finger and posture every round and keep settings fixed. Settings lock after the first round starts; to change conditions, start a new comparison.', '各マウスで一度ウォームアップします。毎回同じ指と姿勢を使い、設定は固定してください。最初のラウンド開始後は設定がロックされます。条件を変える場合は新しい比較を開始してください。'],
protoSum: ['测试顺序与记录方式', 'Test order and recording', 'テスト順序と記録方法'],
proto1: ['每两轮组成一对，顺序交替为 A→B、B→A，降低顺序影响。鼠标由你手动切换，网页不会识别具体设备。完整的零点击轮次也会保留。', 'Rounds come in pairs, alternating A→B then B→A to reduce order effects. You switch mice manually; the page cannot identify devices. Complete zero-click rounds are kept.', '2ラウンドを1組とし、A→B、B→Aと交互に行って順序の影響を減らします。マウスは手動で切り替えます。ページは機器を識別しません。クリック0回の完了ラウンドも保持されます。'],
proto2: ['结果自动保存在本浏览器；不上传。清除浏览器数据会丢失记录，请及时导出。准备或测试中刷新会标记本轮中断。', 'Results are saved automatically in this browser and never uploaded. Clearing browser data loses them, so export in time. Refreshing during preparation or a round marks it interrupted.', '結果はこのブラウザに自動保存され、アップロードされません。ブラウザのデータを消去すると失われるため、早めにエクスポートしてください。準備中やテスト中に更新するとそのラウンドは中断扱いになります。'],
capEyebrow: ['02 / 连续点击', '02 / Rapid clicking', '02 / 連続クリック'],
statusReady: ['准备就绪', 'Ready', '準備完了'],
stopBtn: ['中断本轮', 'Abort round', 'このラウンドを中断'],
areaAria: ['连续点击区域，倒计时结束后使用鼠标左键点击', 'Click area: use the left mouse button after the countdown', 'クリックエリア：カウントダウン後に左ボタンでクリック'],
areaIdle: ['从上方按钮开始下一轮', 'Use the button above to start the next round', '上のボタンで次のラウンドを開始'],
hintIdle: ['本轮结束后自动保存，再换另一只鼠标', 'Saved automatically when the round ends; then switch mice', 'ラウンド終了後に自動保存。その後マウスを切り替えます'],
progAria: ['本轮计时进度', 'Round progress', 'ラウンドの進行'],
timeLeft: ['剩余时间', 'Time left', '残り時間'], timeUnit: ['秒 · 到时自动停止', 's · stops automatically', '秒 · 時間で自動停止'],
clicksL: ['主键点击', 'Primary clicks', '主ボタンのクリック'], clicksUnit: ['次按下事件', 'press events', '押下イベント'],
cpsL: ['当前速度', 'Current speed', '現在の速度'], cpsUnit: ['CPS · 每秒点击数', 'CPS · clicks per second', 'CPS · 毎秒クリック数'],
resEyebrow: ['03 / 结果', '03 / Results', '03 / 結果'],
resH: ['保留全部轮次，再看整体表现', 'Keep every round, then look at the overall picture', '全ラウンドを保持して全体を見る'],
t1: ['点击间隔：', 'Click interval: ', 'クリック間隔：'], d1: ['相邻两次按下的间隔，描述点击节奏。', 'time between two consecutive presses; describes click rhythm.', '連続する2回の押下の間隔。クリックのリズムを表します。'],
t2: ['按住时长：', 'Hold time: ', '押下時間：'], d2: ['一次按下到松开的时长，不是触发延迟。', 'duration from press to release; not actuation latency.', '押してから離すまでの時間。トリガー遅延ではありません。'],
t3: ['P95 间隔：', 'P95 interval: ', 'P95間隔：'], d3: ['95% 的有效间隔不超过此值，用来观察较慢的点击间隔；越小不等于硬件延迟越低。', '95% of valid intervals are no longer than this; it shows slower clicks. A smaller value does not mean lower hardware latency.', '有効な間隔の95%がこの値以下です。遅めのクリック間隔を見るための指標で、小さいほどハード遅延が低いという意味ではありません。'],
medCps: ['CPS 中位数', 'Median CPS', 'CPS中央値'],
dtRange: ['每轮 CPS 范围', 'CPS range per round', 'ラウンドごとのCPS範囲'],
dtInt: ['点击间隔中位数¹', 'Median click interval¹', 'クリック間隔の中央値¹'],
dtHold: ['按住时长中位数¹', 'Median hold time¹', '押下時間の中央値¹'],
foot1: ['¹ 先求每轮中位数，再取这些中位数的中位数。按住时长只使用测试窗口内完整的按下 / 松开配对；CPS 按完整固定时长计算。', '¹ Median of per-round medians. Hold time uses only complete press/release pairs inside the test window; CPS uses the full scheduled duration.', '¹ ラウンドごとの中央値の中央値です。押下時間はテスト時間内の完全な押下/解放ペアのみを使用し、CPSは設定した全時間で計算します。'],
caption: ['每轮原始成绩（按测试顺序，包含中断 / 排除记录）', 'Raw results per round (in test order, including interrupted/excluded)', 'ラウンドごとの生データ（テスト順、中断・除外を含む）'],
thRound: ['轮次', 'Round', 'ラウンド'], thMouse: ['鼠标', 'Mouse', 'マウス'], thClicks: ['点击', 'Clicks', 'クリック'],
thInt: ['间隔 ms', 'Interval ms', '間隔 ms'], thHold: ['按住 ms', 'Hold ms', '押下 ms'], thStatus: ['状态', 'Status', '状態'],
empty: ['完成第一轮后，成绩会出现在这里。', 'Results will appear here after the first round.', '最初のラウンドが終わると、ここに結果が表示されます。'],
exPng: ['保存对比图 PNG', 'Save comparison PNG', '比較画像をPNG保存'], exJson: ['完整记录 JSON', 'Full record JSON', '全記録 JSON'],
exCsv: ['每轮成绩 CSV', 'Per-round CSV', 'ラウンド別 CSV'], newBtn: ['开始新对比', 'New comparison', '新しい比較を開始'],
notesH: ['让结果能被正确理解', 'Reading the results correctly', '結果を正しく理解するために'],
n1: ['固定回报率、连接方式、触发 / 复位 / 反馈设置、手指与姿势。每只至少完成 3 轮，保留全部有效轮次；不要只选最好的一轮。', 'Keep polling rate, connection, actuation/reset/feedback settings, finger and posture fixed. Complete at least 3 rounds per mouse and keep every valid round; don\'t cherry-pick the best one.', 'ポーリングレート、接続方法、トリガー/リセット/フィードバック設定、指と姿勢を固定します。各マウス最低3ラウンドを行い、有効なラウンドはすべて残してください。最良の1回だけを選ばないでください。'],
n2: ['网页不会识别实际鼠标型号或自动核验回报率。请手动切换鼠标，避免其他鼠标误操作。外形、行程、力度、熟练度与浏览器调度都可能影响结果。', 'The page doesn\'t identify the actual mouse model or verify polling rate. Switch mice manually and avoid stray input from other mice. Shape, travel, force, skill and browser scheduling can all affect results.', 'ページは実際のマウスの機種を識別せず、ポーリングレートも検証しません。マウスは手動で切り替え、他のマウスの誤操作を避けてください。形状、ストローク、押下力、習熟度、ブラウザのスケジューリングも結果に影響します。'],
n3: ['需要更详细的逐次记录时，导出完整 JSON；CSV 保留每轮次数、点击间隔中位数、P95 间隔与按住时长。数据保存在你自己的浏览器，不收集、不上传实验记录。', 'For per-click detail, export the full JSON; the CSV keeps per-round counts, median interval, P95 interval and hold time. Data stays in your own browser and is never collected or uploaded.', 'クリックごとの詳細が必要な場合は完全なJSONをエクスポートしてください。CSVにはラウンドごとの回数、間隔の中央値、P95間隔、押下時間が含まれます。データはお使いのブラウザ内にのみ保存され、収集・アップロードされません。'],
n4a: ['这是我们搭建的 MouseLab 工具，不是鼠标厂商官方软件或实验室认证。', 'This is a MouseLab tool, not official mouse-vendor software or a certified lab test. ', 'これはMouseLabが作ったツールで、マウスメーカーの公式ソフトや認定試験ではありません。'],
n4link: ['旧版移动事件页面', 'The legacy mouse-movement page', '旧版の移動イベントページ'],
n4b: ['同样不测硬件延迟。', ' does not measure hardware latency either.', 'もハードウェア遅延は測定しません。'],
footer: ['本机保存 · 用户主动导出 · 个人点击表现，不代表微动硬件延迟', 'Saved on this device · exported only by you · personal clicking performance, not switch hardware latency', '端末内に保存 · ユーザーが明示的にエクスポート · 個人のクリック性能であり、スイッチのハード遅延ではありません'],
noscript: ['请启用浏览器 JavaScript 才能开始测试。', 'Enable JavaScript in your browser to start testing.', 'テストを開始するにはブラウザのJavaScriptを有効にしてください。'],
mouseA: ['鼠标 A', 'Mouse A', 'マウス A'], mouseB: ['鼠标 B', 'Mouse B', 'マウス B'],
allDone: ['全部完成', 'All done', 'すべて完了'],
roundsDone: ['{c} / {n} 轮完成', '{c} / {n} rounds done', '{c} / {n} ラウンド完了'],
restBtn: ['休息 {s} 秒 · 然后换鼠标', 'Rest {s} s · then switch mice', '休憩 {s} 秒 · その後マウスを切り替え'],
prepBtn: ['准备测试 {d}（3 秒倒计时）', 'Get ready: {d} (3 s countdown)', '{d} をテスト準備（3秒カウントダウン）'],
doneBtn: ['本次对比已完成', 'Comparison complete', '今回の比較は完了しました'],
stPrep: ['准备中', 'Preparing', '準備中'], stClick: ['点击中', 'Clicking', 'クリック中'], stRest: ['休息 / 换鼠标', 'Rest / switch mice', '休憩 / マウス交換'], stDone: ['对比完成', 'Comparison done', '比較完了'],
areaPrep: ['把鼠标移入此区域，等待开始', 'Move the mouse into this area and wait for the start', 'マウスをこのエリアに入れて開始を待ちます'],
areaGo: ['开始！连续点击左键', 'Go! Click the left button rapidly', 'スタート！左ボタンを連打'],
areaOk: ['{d} 本轮完成 · {v} CPS', '{d} round complete · {v} CPS', '{d} ラウンド完了 · {v} CPS'],
areaCut: ['本轮中断 · 已保留记录，稍后重测', 'Round interrupted · record kept; retest later', 'ラウンド中断 · 記録は保持。後で再テストしてください'],
hintPrep: ['准备阶段点击不计分', 'Clicks during preparation don\'t count', '準備中のクリックはカウントされません'],
hintGo: ['区域外的点击不计入；时间到自动保存', 'Clicks outside the area don\'t count; saved automatically at time-up', 'エリア外のクリックは無効。時間切れで自動保存されます'],
noteTrial: ['保持本页在前台。切换窗口、刷新或提前停止会中断本轮，不计入汇总。', 'Keep this page in the foreground. Switching windows, refreshing or stopping early interrupts the round and excludes it from the summary.', 'このページを前面に保ってください。ウィンドウ切替・更新・途中停止でラウンドは中断され、集計に含まれません。'],
noteDone: ['所有计划轮次已完成。请导出完整记录，再保存对比图用于视频。', 'All planned rounds are done. Export the full record, then save the comparison image to use in your video.', '予定のラウンドはすべて完了しました。完全な記録をエクスポートしてから、動画用に比較画像を保存してください。'],
noteNext: ['接下来使用 {d}。同一手指、相同点击姿势；按下开始后有 3 秒准备时间。', 'Next: use {d}. Same finger and click posture; there is a 3 s preparation time after you press start.', '次は {d} を使います。同じ指・同じ姿勢で。開始後に3秒の準備時間があります。'],
warnOff: ['浏览器保存不可用；请及时导出，本页关闭后数据可能丢失。', 'Browser storage is unavailable; export promptly, as data may be lost when this page closes.', 'ブラウザへの保存が利用できません。このページを閉じるとデータが失われる可能性があるため、早めにエクスポートしてください。'],
warnFail: ['本机保存失败（空间或权限不足）；请立即导出结果。', 'Saving to this device failed (not enough space or permission); export your results now.', '端末への保存に失敗しました（容量または権限不足）。今すぐ結果をエクスポートしてください。'],
roundsIn: ['{n} 轮纳入汇总', '{n} rounds in summary', '{n} ラウンドを集計に含む'],
rangeWait: ['等待完整轮次', 'Waiting for complete rounds', '完了ラウンド待ち'],
cmpReady: ['当前 A − B = {v} CPS（各轮 CPS 的中位数之差）。这是本人的连续点击表现，不能换算为硬件延迟或显著性结论。', 'Currently A − B = {v} CPS (difference of median per-round CPS). This is your own clicking performance and cannot be converted into hardware latency or a significance claim.', '現在 A − B = {v} CPS（ラウンドごとのCPS中央値の差）。これは個人のクリック性能であり、ハード遅延や有意性の結論に換算できません。'],
cmpWait: ['每只鼠标至少完成 3 轮再比较；零点击的完整轮次也会保留，不挑选最好成绩。', 'Complete at least 3 rounds per mouse before comparing; zero-click rounds are kept and the best score is never cherry-picked.', '比較する前に各マウスで最低3ラウンドを完了してください。クリック0回のラウンドも保持され、最高成績だけを選ぶことはありません。'],
rStopped: ['提前停止', 'Stopped early', '途中停止'], rBlur: ['窗口失焦', 'Window lost focus', 'ウィンドウ非アクティブ'], rHidden: ['进入后台', 'Page hidden', 'バックグラウンド化'],
rCancel: ['输入中断', 'Input cancelled', '入力中断'], rReload: ['刷新中断', 'Reload interrupted', '更新により中断'], rOther: ['中断', 'Interrupted', '中断'],
sExcluded: ['手动排除', 'Manually excluded', '手動で除外'], sComplete: ['完整', 'Complete', '完了'],
restore: ['恢复', 'Restore', '復元'], exclude: ['排除', 'Exclude', '除外'],
restoreAria: ['恢复第 {i} 轮', 'Restore round {i}', 'ラウンド {i} を復元'], excludeAria: ['排除第 {i} 轮', 'Exclude round {i}', 'ラウンド {i} を除外'],
confirmNew: ['开始新对比会清空本浏览器中的当前记录。请先导出 JSON 或 CSV。确定继续？', 'Starting a new comparison clears the current records in this browser. Export JSON or CSV first. Continue?', '新しい比較を開始すると、このブラウザの現在の記録が消去されます。先にJSONまたはCSVをエクスポートしてください。続行しますか？'],
imgTitle: ['Mouse Feel Score · A/B 连续点击对比', 'Mouse Feel Score · A/B rapid-click comparison', 'Mouse Feel Score · A/B 連続クリック比較'],
imgSub: ['每轮 {d} 秒 · 每轮休息 {r} 秒 · {t}', '{d} s per round · {r} s rest · {t}', '1ラウンド {d} 秒 · 休憩 {r} 秒 · {t}'],
imgMed: ['CPS 中位数 · {n} 轮纳入汇总', 'Median CPS · {n} rounds in summary', 'CPS中央値 · {n} ラウンドを集計'],
imgRange: ['每轮范围：{a} – {b} CPS', 'Per-round range: {a} – {b} CPS', 'ラウンド範囲：{a} – {b} CPS'],
imgInt: ['点击间隔中位数：{v} ms', 'Median click interval: {v} ms', 'クリック間隔の中央値：{v} ms'],
imgHold: ['按住时长中位数：{v} ms', 'Median hold time: {v} ms', '押下時間の中央値：{v} ms'],
imgFew: ['样本尚少：建议每只鼠标至少完成 3 轮', 'Few samples: complete at least 3 rounds per mouse', 'サンプルが少なめです：各マウス最低3ラウンドを推奨'],
imgN1: ['记录所有轮次；中断及手动排除的轮次不进入汇总。完整记录见 JSON / CSV。', 'All rounds are recorded; interrupted and manually excluded rounds are left out of the summary. See JSON / CSV for the full record.', '全ラウンドを記録します。中断・手動除外のラウンドは集計に含まれません。完全な記録はJSON / CSVを参照。'],
imgN2: ['结果描述本人的点击表现；不代表物理微动延迟、USB 回报率或统计显著性。', 'Results describe personal clicking performance, not physical switch latency, USB polling rate or statistical significance.', '結果は個人のクリック性能を示すもので、物理的なスイッチ遅延、USBポーリングレート、統計的有意性を示すものではありません。'],
imgNoNotes: ['测试设置：未填写', 'Test settings: not provided', 'テスト設定：未入力'],
};

export const LANGS = { zh: '中文', en: 'English', ja: '日本語' };
export const LOCALES = { zh: 'zh-CN', en: 'en-US', ja: 'ja-JP' };
const ORDER = ['zh', 'en', 'ja'];
export const messages = Object.fromEntries(ORDER.map((lang, i) => [lang, Object.fromEntries(Object.entries(D).map(([key, value]) => [key, value[i]]))]));
const STORE = 'mouse-lab-lang';

export function detectLang() {
  try { const saved = localStorage.getItem(STORE); if (saved in LANGS) return saved; } catch { /* storage unavailable */ }
  const hint = String(globalThis.navigator?.language ?? '').toLowerCase();
  return hint.startsWith('ja') ? 'ja' : hint.startsWith('zh') ? 'zh' : hint.startsWith('en') ? 'en' : 'zh';
}
// Lets another page (e.g. lab.html) register its own [zh, en, ja] strings.
export function addMessages(dict) {
  ORDER.forEach((lang, i) => { for (const [key, value] of Object.entries(dict)) messages[lang][key] = value[i]; });
}
let current = detectLang();
export const getLang = () => current;
export function setLang(lang) {
  if (!(lang in LANGS)) return;
  current = lang;
  try { localStorage.setItem(STORE, lang); } catch { /* storage unavailable */ }
}
export function t(key, params = {}) {
  const text = messages[current][key] ?? messages.zh[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ''));
}
// Fills elements marked data-i18n="key" (text) or data-i18n-attr="attr:key;attr2:key2".
export function applyStatic() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.getAttribute('data-i18n')); });
  document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    for (const pair of el.getAttribute('data-i18n-attr').split(';')) { const [attr, key] = pair.split(':'); el.setAttribute(attr, t(key)); }
  });
  document.documentElement.lang = LOCALES[current];
  document.title = t('title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('metaDesc'));
}
