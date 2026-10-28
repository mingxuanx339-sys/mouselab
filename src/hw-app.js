// "04 / 硬件实验室" — everything a browser can honestly measure about the mouse itself.
// Each tab states what it can measure and what it cannot.
import { getLang } from './i18n.js';
import {
  computePolling, computeStability, computeCpi, computeAcceleration, computeAngleSnap, computeSensor,
  computeMalfunction, computeDrift, computeChatter, computeDebounce, framesToMs, summarizeLatency,
  computeLod, summarize, deviationPct, toCsv, median,
} from './hw-model.js';

const IDX = { zh: 0, en: 1, ja: 2 };
const T = {
  eyebrow: ['04 / 硬件实验室', '04 / Hardware lab', '04 / ハードウェアラボ'],
  h: ['传感器响应与延迟', 'Sensor response and latency', 'センサー応答と遅延'],
  lead: ['这一节测的是鼠标本身：传感器怎么报数据、有没有被厂商做过平滑和加速、什么速度下会丢帧、微动和延迟如何。每项都写明测得到什么、测不到什么。',
    'This section looks at the mouse itself: how the sensor reports, whether the vendor smooths or accelerates it, at what speed it loses tracking, and how the switch and latency behave. Each tab states what it can and cannot measure.',
    'このセクションはマウス本体を測ります：センサーの報告の仕方、メーカーによる平滑化や加速の有無、どの速度でトラッキングが外れるか、スイッチと遅延の挙動。各タブに測れること・測れないことを明記しています。'],
  device: ['当前鼠标', 'Mouse', 'マウス'],
  // tabs
  tabCurve: ['传感器曲线', 'Sensor curve', 'センサー曲線'],
  tabDrift: ['静态抖动', 'Static drift', '静止時ドリフト'],
  tabCal: ['DPI·加速度·吸附', 'DPI · accel · snap', 'DPI・加速・吸着'],
  tabMal: ['极速丢帧', 'Malfunction speed', '破綻速度'],
  tabPoll: ['回报率·稳定性', 'Polling · stability', 'ポーリング・安定性'],
  tabSwitch: ['微动响应', 'Switch response', 'スイッチ応答'],
  tabPhys: ['抬升·按压力度', 'Lift-off · force', 'リフトオフ・押下圧'],
  // environment
  envH: ['测试环境（自动识别 + 手动填写）', 'Test environment (auto + manual)', 'テスト環境（自動 + 手入力）'],
  envBrowser: ['浏览器', 'Browser', 'ブラウザ'], envOs: ['系统', 'OS', 'OS'], envHz: ['屏幕刷新率', 'Display refresh', 'リフレッシュレート'],
  envDpr: ['缩放比例', 'Display scaling', '表示倍率'], envRaw: ['原始事件', 'Raw events', 'RAWイベント'],
  setRate: ['设定回报率', 'Set polling rate', '設定ポーリング'], setDpi: ['设定 DPI', 'Set DPI', '設定DPI'],
  conn: ['连接方式', 'Connection', '接続'], wired: ['有线', 'Wired', '有線'], bt: ['蓝牙', 'Bluetooth', 'Bluetooth'],
  surface: ['鼠标垫', 'Mousepad', 'マウスパッド'],
  envNote: ['设定值按鼠标 A / B 分别保存，用来和实测对比。每条记录都会带上这些环境信息。',
    'Settings are stored per mouse and compared against what is measured. Every record carries this environment.',
    '設定値はマウスA/Bごとに保存され、実測と比較されます。各記録にこの環境情報が付きます。'],
  // shared
  start: ['开始', 'Start', '開始'], stop: ['结束', 'Finish', '終了'], go: ['进行中…', 'Recording…', '記録中…'],
  notEnough: ['样本太少，请按说明重做一次。', 'Not enough data — repeat the run as described.', 'サンプル不足です。説明どおりにやり直してください。'],
  lockHint: ['点击下方方框开始（鼠标指针会被锁定，按 Esc 可随时退出）', 'Click the box below to start (the pointer is locked; press Esc to exit)', '下の枠をクリックして開始（ポインタがロックされます。Escで終了）'],
  repeat: ['多次测量', 'Repeat runs', '複数回測定'], runs: ['次', 'runs', '回'], spread: ['波动', 'spread', 'ばらつき'],
  needMore: ['建议至少测 3 次', 'run at least 3 times', '3回以上を推奨'], unstable: ['波动偏大，建议重测', 'large spread — re-test', 'ばらつき大：再測定を'], stable: ['稳定', 'stable', '安定'],
  table: ['记录', 'Records', '記録'], clear: ['清空本项', 'Clear this tab', 'このタブを消去'],
  csvAll: ['导出全部记录 CSV', 'Export all records CSV', '全記録をCSVで保存'],
  csvRaw: ['导出最近一次原始数据 CSV', 'Export last raw data CSV', '直近のRAWデータをCSVで保存'],
  exportAll: ['导出 JSON', 'Export JSON', 'JSONを保存'],
  none: ['还没有记录', 'No records yet', 'まだ記録がありません'],
  vsSet: ['与设定对比', 'vs setting', '設定との比較'], match: ['一致', 'matches', '一致'],
  mismatch: ['不一致：检查驱动档位 / USB 口 / 浏览器', 'mismatch: check driver, USB port or browser', '不一致：ドライバ・USBポート・ブラウザを確認'],
  // sensor curve
  curveHow: ['这是整套测试里最有信息量的一项。锁定后，用力快速左右甩动鼠标 5 秒，像游戏里大幅度转身那样，中间不要停。下面会画出每一次报告的移动量。',
    'The most informative test here. After locking, swipe the mouse hard left and right for 5 s, like a big in-game flick, without pausing. The chart below plots the movement in every single report.',
    '最も情報量の多いテストです。ロック後、ゲームの大きな振り向きのように5秒間マウスを左右に強く振ってください。下のグラフに1レポートごとの移動量を描画します。'],
  curveChart: ['每次报告的移动量（红点 = 异常跳点）', 'Movement per report (red = spike)', 'レポートごとの移動量（赤＝飛び）'],
  smoothT: ['平滑处理', 'Smoothing', '平滑化'], roughT: ['曲线粗糙度', 'Curve roughness', '曲線の粗さ'],
  smRaw: ['未平滑（曲线锯齿明显）', 'raw (jagged curve)', '未平滑（ギザギザ）'],
  smMild: ['轻度平滑', 'mild smoothing', '軽度の平滑化'],
  smSmoothed: ['明显平滑（厂商做了滤波）', 'smoothed (vendor filtering)', '明確な平滑化（メーカー側フィルタ）'],
  tailT: ['停手拖尾', 'Motion tail', '停止後の尾'],
  tailUnit: ['毫秒 · 手停下后仍在上报', 'ms of reports after the hand stopped', 'ms・手を止めた後も報告が継続'],
  spikes: ['异常跳点', 'Spikes', '飛び'], rev: ['反向抖动', 'Reversals', '逆方向ブレ'], peak: ['本次峰值速度', 'Peak speed this run', '今回のピーク速度'],
  per1000: ['每千次报告', 'per 1000 reports', '1000レポートあたり'], needCpi: ['先做 DPI 核对才能换算 m/s', 'run the DPI check to convert to m/s', 'm/s換算にはDPI確認が必要'],
  curveLimit: ['能看出来：厂商有没有做平滑滤波、传感器会不会跳点、停手之后还会不会继续输出。平滑会让曲线变圆滑、拖尾变长，手感上就是"跟手但发飘"。测不到：传感器自身的响应延迟（需要高速摄影或专用硬件）。',
    'What it shows: whether the vendor filters the signal, whether the sensor jumps, and whether it keeps reporting after your hand stops. Filtering rounds the curve and lengthens the tail — it feels smooth but floaty. What it cannot show: the sensor\'s own response delay, which needs high-speed capture or dedicated hardware.',
    '分かること：メーカーの平滑化フィルタの有無、センサーの飛び、手を止めた後も出力が続くか。平滑化は曲線を丸め尾を長くし、「追従するが浮つく」感触になります。分からないこと：センサー自体の応答遅延（高速撮影か専用機材が必要）。'],
  // drift
  driftHow: ['锁定后把手完全离开鼠标，15 秒内不要碰它，也不要碰桌子。理想结果是 0。有读数说明传感器在静止时也在输出，游戏里表现为准星自己飘。',
    'After locking, take your hand off the mouse completely and do not touch it — or the desk — for 15 s. The ideal result is zero. Anything else means the sensor reports while standing still, which shows up as a drifting crosshair.',
    'ロック後、マウスから完全に手を離し、15秒間マウスも机も触らないでください。理想は0です。値が出る場合、静止中もセンサーが出力しており、ゲームでは照準が勝手に動きます。'],
  driftCounts: ['累计抖动', 'Total drift', '累計ドリフト'], driftNet: ['净位移', 'Net displacement', '正味移動'],
  driftPerMin: ['每分钟', 'per minute', '毎分'],
  dClean: ['完全静止', 'perfectly still', '完全静止'], dMinor: ['轻微', 'minor', '軽微'], dNoisy: ['偏多，换个鼠标垫再测一次', 'noticeable — retest on another surface', '多め：別のパッドで再測定を'],
  driftLimit: ['玻璃、反光、深色或有图案的鼠标垫更容易让传感器误判。结果偏高时先换垫子再测，不要急着怪鼠标。',
    'Glass, glossy, very dark or patterned surfaces confuse sensors. If the number is high, retest on another pad before blaming the mouse.',
    'ガラス・光沢・濃色・柄物のパッドはセンサーを誤認させます。値が高い場合はまず別のパッドで再測定を。'],
  // calibration
  calHow1: ['DPI 核对：桌上放一把尺子，填好距离后锁定，沿尺子把鼠标**慢慢**平移这个距离，然后按左键结束。',
    'DPI check: put a ruler on the desk, enter the distance, lock, slide the mouse **slowly** along the ruler for exactly that distance, then left-click to finish.',
    'DPI確認：机に定規を置き距離を入力、ロック後その距離だけ**ゆっくり**水平移動して左クリックで終了。'],
  calHow2: ['加速度检测：同样的距离再做一次，但这次**用力快速**移动。如果鼠标没有内置加速，两次算出来的 DPI 应该几乎一样；快的那次明显更高，说明厂商加了加速或预测。',
    'Acceleration check: repeat the same distance, but **fast**. With no built-in acceleration both runs give nearly the same DPI. A higher value on the fast run means the vendor added acceleration or prediction.',
    '加速検出：同じ距離を今度は**速く**動かします。内蔵加速がなければ両者のDPIはほぼ同じ。速い方が明確に高ければ加速・予測が入っています。'],
  calHow3: ['角度吸附检测：锁定后，**徒手**沿尺子画一条尽量笔直的水平线，走慢一点。人手不可能画出完全笔直的线，如果纵向分量被强行归零，说明鼠标在偷偷修直你的轨迹。',
    'Angle-snapping check: lock, then draw one slow, as-straight-as-you-can horizontal line **freehand**. A human hand cannot draw a perfect line; if the vertical component is forced to zero, the mouse is straightening your path for you.',
    '角度吸着の検出：ロック後、定規に沿って**手で**できるだけまっすぐ水平にゆっくり線を引きます。人間の手で完全な直線は引けないため、縦成分が強制的に0になるなら軌跡が補正されています。'],
  slow: ['慢速', 'Slow', 'ゆっくり'], fast: ['快速', 'Fast', '速く'], line: ['画直线', 'Draw a line', '直線を引く'],
  dist: ['移动距离（厘米）', 'Distance (cm)', '移動距離（cm）'],
  cpiRes: ['实测 CPI', 'Measured CPI', '実測CPI'], dev: ['与标称偏差', 'vs nominal', '公称との差'], raw: ['原始输入', 'Raw input', 'RAW入力'],
  rawYes: ['已启用，不受系统指针速度影响', 'on — OS pointer speed ignored', '有効：OSのポインタ速度の影響なし'],
  rawNo: ['不可用：请把系统指针速度设为默认并关闭"提高指针精确度"', 'unavailable: set OS pointer speed to default and disable "Enhance pointer precision"', '利用不可：OSのポインタ速度を既定に、「ポインターの精度を高める」をオフに'],
  accelT: ['内置加速', 'Built-in acceleration', '内蔵加速'],
  accNone: ['无（快慢一致）', 'none (slow = fast)', 'なし（速度不変）'], accPos: ['有正向加速：移动越快走得越远', 'positive: faster hand travels further', '正の加速：速く動かすほど多く進む'], accNeg: ['有负向加速：移动越快走得越近', 'negative: faster hand travels less', '負の加速：速く動かすほど少なく進む'],
  snapT: ['角度吸附', 'Angle snapping', '角度吸着'], snapZero: ['纵向归零比例', 'zero-Y reports', '縦成分ゼロの割合'],
  snNone: ['没有吸附', 'none', 'なし'], snSus: ['可疑，建议重测', 'suspect — retest', '疑わしい：再測定を'], snYes: ['存在吸附 / 轨迹修直', 'snapping / path straightening', '吸着・軌跡補正あり'],
  calLimit: ['DPI 核对的误差主要来自手移动得准不准，一般在几个百分点；重复 3 次看波动更可靠。角度吸附只对水平或垂直方向有效，斜向画线测不出来。',
    'The CPI number is limited by how precisely your hand moves — usually a few percent; repeat three times and watch the spread. Angle snapping only applies to horizontal and vertical motion, so a diagonal line will not reveal it.',
    'CPI値の誤差は手の精度次第で通常数%です。3回繰り返してばらつきを見てください。角度吸着は水平・垂直方向のみに働くため、斜めの線では検出できません。'],
  // malfunction
  malHow: ['这是"甩枪会不会丢准星"的真实测试。先做 DPI 核对，然后固定一段距离（比如 20 厘米），每次都走完这段距离，但一次比一次快。传感器正常时，不管多快，走过的计数都一样；一旦超过它的极限，计数会明显变少——那就是丢帧速度。',
    'This is the real test for "does my flick lose the crosshair". Run the DPI check first, then pick a fixed distance (say 20 cm) and swipe it over and over, faster each time. A healthy sensor returns the same counts regardless of speed. Once past its limit the counts collapse — that is the malfunction speed.',
    '「振り向きで照準が飛ぶか」の実テストです。先にDPI確認をしてから一定距離（例：20cm）を決め、毎回その距離を、回を追うごとに速く振ります。正常なら速度に関わらずカウントは同じ。限界を超えるとカウントが急減し、それが破綻速度です。'],
  malRun: ['记录一次', 'Record a run', '1回記録'],
  malBase: ['基准计数', 'Baseline counts', '基準カウント'], malOk: ['已验证到', 'Verified up to', '確認済み'], malBad: ['开始丢帧', 'Loses tracking at', '破綻開始'],
  malNot: ['还没测到极限，继续加快', 'limit not reached — go faster', '限界未到達：さらに速く'],
  malLimit: ['测的是"这只鼠标在你的垫子上，能跟上多快的手速"。换个垫子结果会变。要测到极限，手速得真的够快；没丢帧只能说明"至少到这个速度都正常"。',
    'This measures how fast a hand this mouse can follow on your pad. Change the pad and the number changes. Reaching the limit needs a genuinely fast hand; no collapse only proves "clean at least up to this speed".',
    'このマウスがあなたのパッド上でどれだけ速い手の動きに追従できるかを測ります。パッドを変えれば値も変わります。限界到達には本当に速い手が必要で、破綻がなければ「少なくともこの速度までは正常」という意味です。'],
  ips: ['英寸/秒', 'IPS', 'IPS'],
  // polling
  pollHow: ['短测：锁定后快速画圈 5 秒，测实际回报率。',
    'Short run: lock and move in fast circles for 5 s to read the real report rate.',
    '短時間：ロック後5秒間すばやく円を描き、実際のレポートレートを測定。'],
  stabHow: ['长测：持续画圈 30 秒，中间不要停。用来抓无线干扰、省电降频、USB 供电不稳造成的掉包——短测看不出来。',
    'Long run: keep circling for 30 s without stopping. This catches wireless interference, power-saving downshifts and flaky USB that a short run hides.',
    '長時間：30秒間止めずに円を描き続けます。無線干渉・省電力による低下・USB給電の不安定を検出します（短時間では見えません）。'],
  medianHz: ['中位回报率', 'Median rate', '中央値レート'], avgHz: ['平均回报率', 'Average rate', '平均レート'],
  nearest: ['最接近档位', 'Closest setting', '最も近い設定'], stab: ['稳定度', 'Stability', '安定度'], drops: ['丢包率', 'Drop rate', 'ドロップ率'],
  chartPoll: ['每次报告的间隔（毫秒），紫线 = 中位数', 'Interval between reports (ms), purple = median', 'レポート間隔（ms）、紫＝中央値'],
  chartStab: ['30 秒内的回报率变化（每 250 毫秒一格）', 'Report rate across 30 s (per 250 ms)', '30秒間のレートの推移（250msごと）'],
  dropouts: ['断流次数', 'Dropouts', '途切れ回数'], worstGap: ['最长断流', 'Longest gap', '最長の途切れ'], lost: ['丢失报告', 'Reports lost', '欠落レポート'],
  pollLimit: ['测的是浏览器实际收到的报告频率。8K 这类高回报率会受浏览器、系统负载和 USB 接口限制，读数偏低时先换 USB 口、关掉后台软件再测，不一定是鼠标的问题。',
    'This is the rate the browser actually receives. 8K and other high rates can be capped by the browser, system load or the USB port; if it reads low, change port and close background apps before blaming the mouse.',
    'ブラウザが実際に受信したレートです。8Kなどはブラウザ・負荷・USBポートに制限されます。低い場合はポート変更と常駐ソフト終了を試してください。'],
  // switch
  dbHow: ['按住节奏测试：在框里用一根手指**尽可能快**地连点 10 秒。会记录每次"松开到再次按下"的最短间隔——这是这只鼠标去抖时间的上限。去抖时间越长，连点时越容易丢点。',
    'Rapid-click test: single-finger, click **as fast as you physically can** for 10 s. It records the shortest release-to-press gap the mouse ever reported, which is an upper bound on its debounce timer. A long debounce drops clicks when you spam.',
    '連打テスト：枠内で指1本、**できる限り速く**10秒間連打します。「離してから次に押されるまで」の最短間隔を記録し、これがデバウンス時間の上限になります。長いと連打時にクリックが落ちます。'],
  chatHow: ['连击检测：每次只点一下，慢慢点 30 次。如果一次按下被记成两次，会标红。微动老化最早就是这个症状。',
    'Chatter check: single-click slowly, 30 times. A press that registers twice is flagged in red — the first symptom of a worn switch.',
    'チャタリング検出：1回ずつゆっくり30回クリック。1回の押下が2回登録されると赤く表示されます。スイッチ劣化の初期症状です。'],
  thresh: ['判定阈值', 'Threshold', '判定しきい値'], clicks: ['点击次数', 'Clicks', 'クリック数'],
  susp: ['疑似连击', 'Suspected chatter', 'チャタリング疑い'], minGap: ['最短间隔', 'Shortest gap', '最短間隔'],
  dbMin: ['去抖上限', 'Debounce bound', 'デバウンス上限'], dbHold: ['中位按住时长', 'Median hold', '押下時間中央値'], dbCps: ['连点速度', 'Click rate', '連打速度'],
  chatOk: ['没有发现连击', 'no chatter found', 'チャタリングなし'], chatBad: ['发现疑似连击，多测几次确认', 'possible chatter — repeat to confirm', 'チャタリングの疑い：再測定で確認'],
  latHow: ['端到端延迟：点"进入慢动作模式"后屏幕变黑，用手机 240fps 慢动作把手指和屏幕一起拍下来，然后按左键，屏幕会立刻闪白。回放时数"手指按到底"到"屏幕变白"之间隔了几帧，填进下面。',
    'Click-to-photon latency: press "Enter slow-mo mode", the screen goes black. Film your finger and the screen together at 240 fps, then click — the screen flashes white. In playback, count the frames from the full press to the flash and enter them below.',
    'クリック→発光の遅延：「スロー撮影モード」で画面が黒になります。スマホの240fpsで指と画面を一緒に撮影し、クリックすると画面が白く光ります。再生して「押し切り」から「白」までのフレーム数を下に入力。'],
  enterSlow: ['进入慢动作模式', 'Enter slow-mo mode', 'スロー撮影モード'], exitSlow: ['按 Esc 退出', 'Press Esc to exit', 'Escで終了'],
  frames: ['帧数', 'Frames', 'フレーム数'], fps: ['手机帧率', 'Phone fps', 'スマホfps'], add: ['记录', 'Add', '記録'],
  latMed: ['中位延迟', 'Median latency', '中央値遅延'],
  latLimit: ['测的是"按下到屏幕亮"的总延迟，鼠标、系统、显示器全算在内。240fps 下每帧约 4.2 毫秒，能看出大差距，分不出一两毫秒。两只鼠标必须用同一台电脑、同一台显示器、同样的游戏设置测，比较才有意义。单独的微动触发延迟需要 USB 协议分析仪或专用硬件，网页做不到。',
    'This is total click-to-photon latency: mouse, system and display together. At 240 fps one frame is about 4.2 ms, so large differences show and 1–2 ms do not. Compare two mice only on the same PC, display and settings. Isolating the switch\'s own latency needs a USB protocol analyser or dedicated hardware, which a web page cannot do.',
    '「押下→画面発光」の総遅延で、マウス・システム・モニターを含みます。240fpsでは1フレーム約4.2msのため、大差は見えても1〜2msは判別できません。比較は同一PC・同一モニター・同一設定で。スイッチ単体の遅延はUSBプロトコルアナライザ等が必要で、ウェブでは不可能です。'],
  // physical
  lodHow: ['抬升高度：把鼠标放在一叠已知厚度的垫片上（A4 纸约 0.1 毫米一张，光盘约 1.2 毫米），在这个高度上平移鼠标，看下面的计数会不会动。会动就是"还在追踪"，不动就是"已经停止"。从薄到厚逐层记录，就能夹出这只鼠标的抬升高度。',
    'Lift-off distance: rest the mouse on a stack of known-thickness shims (a sheet of A4 is about 0.1 mm, a CD about 1.2 mm), slide it at that height and watch the counter below. Moving means it still tracks. Record thin to thick and the real LOD gets bracketed.',
    'リフトオフ距離：厚さが分かるシム（A4用紙1枚約0.1mm、CD約1.2mm）の上にマウスを置いて動かし、下のカウンタが動くか見ます。動けば追従中。薄い順に記録すれば実際のLODを挟み込めます。'],
  thick: ['垫片厚度（毫米）', 'Shim thickness (mm)', 'シム厚（mm）'],
  tracked: ['还在追踪', 'still tracks', '追従中'], notTracked: ['已经停止', 'stopped', '停止'],
  lodRes: ['抬升高度', 'Lift-off distance', 'リフトオフ距離'], lodBetween: ['介于', 'between', '範囲'],
  liveCounts: ['实时计数', 'Live counts', 'ライブカウント'],
  forceHow: ['按压力度：把鼠标放在厨房秤上，秤清零，用一根手指慢慢往下按左键，记下"咔哒"触发那一刻的读数。每只鼠标测 5 次取中位数。这能客观说明"这只微动按起来是不是更轻"。',
    'Click force: put the mouse on a kitchen scale, tare it, press the left button down slowly with one finger and note the reading at the moment it actuates. Five times per mouse, take the median. This turns "feels lighter" into a number.',
    '押下圧：マウスをキッチンスケールに載せて0点調整し、指1本で左ボタンをゆっくり押し、作動した瞬間の値を記録。各マウス5回の中央値を取ります。「軽い」を数値にできます。'],
  grams: ['克', 'grams', 'g'], forceMed: ['中位按压力度', 'Median force', '中央値押下圧'],
  physLimit: ['厨房秤一般精度 1 克，看得出明显差距，分不出零点几克。抬升高度的精度取决于垫片厚度，想测得细就用更薄的垫片。',
    'A kitchen scale typically resolves 1 g: clear differences show, fractions of a gram do not. LOD precision is set by your shims — use thinner ones for a finer answer.',
    'キッチンスケールの分解能は通常1gで、明確な差は分かりますが0.1g単位は測れません。LODの精度はシムの厚さ次第です。'],
};
const tr = (k) => T[k][IDX[getLang()] ?? 0];
const fmt = (v, d = 0) => (v === null || v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(d));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- state
const KEY = 'mouse-lab-hw-v2';
let store = { curve: [], drift: [], cpi: [], snap: [], mal: [], poll: [], stability: [], debounce: [], chatter: [], latency: [], lod: [], force: [], settings: {} };
try { store = { ...store, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* storage unavailable */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ } };
const settings = () => store.settings || (store.settings = {});
const lastRaw = { curve: null, poll: null, stability: null };

const ENV = (() => {
  const ua = navigator.userAgent;
  const m = ua.match(/Edg\/(\d+)/) || ua.match(/OPR\/(\d+)/) || ua.match(/Chrome\/(\d+)/) || ua.match(/Firefox\/(\d+)/) || ua.match(/Version\/(\d+).*Safari/);
  const browser = m ? (/Edg\//.test(m[0]) ? 'Edge ' : /OPR\//.test(m[0]) ? 'Opera ' : /Chrome\//.test(m[0]) ? 'Chrome ' : /Firefox\//.test(m[0]) ? 'Firefox ' : 'Safari ') + m[1] : 'Browser';
  const os = /Windows NT 10/.test(ua) ? 'Windows 10/11' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /Linux/.test(ua) ? 'Linux' : /iPhone|iPad/.test(ua) ? 'iOS' : 'Unknown';
  return { browser, os, dpr: window.devicePixelRatio || 1, refresh: null, rawEvents: 'onpointerrawupdate' in window };
})();
const RAW_TYPE = ENV.rawEvents ? 'pointerrawupdate' : 'pointermove';

function measureRefresh() {
  return new Promise((res) => {
    const t = [];
    const step = (now) => {
      t.push(now);
      if (t.length < 90) requestAnimationFrame(step);
      else {
        const d = t.slice(1).map((x, i) => x - t[i]).sort((a, b) => a - b);
        const hz = 1000 / d[Math.floor(d.length / 2)];
        res([60, 75, 90, 100, 120, 144, 165, 170, 180, 200, 240, 280, 360, 480, 540].reduce((b, c) => (Math.abs(c - hz) < Math.abs(b - hz) ? c : b)));
      }
    };
    requestAnimationFrame(step);
  });
}

// ---------------------------------------------------------------- helpers
function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
const metric = (label, value, unit = '', cls = '') => `<article class="metric ${cls}"><span class="metric-label">${label}</span><strong class="metric-value">${value}</strong><span class="metric-unit">${unit}</span></article>`;
const tableHtml = (head, rows) => (rows.length
  ? `<div class="table-scroll"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
  : `<p class="empty-state">${tr('none')}</p>`);
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Charts. series: array of numbers, or {at, value} for a timeline.
function drawChart(canvas, values, { medianLine = null, spikes = false, xLabel = null, bars = false } = {}) {
  if (!canvas || !values || !values.length) return;
  const dpr = window.devicePixelRatio || 1, W = canvas.clientWidth || 600, H = 170;
  canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.height = `${H}px`;
  const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
  const pad = { l: 46, r: 10, t: 10, b: 24 }, w = W - pad.l - pad.r, h = H - pad.t - pad.b;
  const sorted = [...values].sort((a, b) => a - b);
  const top = Math.max(sorted[Math.floor(sorted.length * 0.995)] * 1.15, 1e-6);
  const X = (i) => pad.l + (i / Math.max(values.length - 1, 1)) * w;
  const Y = (v) => pad.t + h - Math.min(v / top, 1) * h;
  c.strokeStyle = '#f6d3e5'; c.lineWidth = 1; c.fillStyle = '#9a6b8c'; c.font = '11px sans-serif'; c.textAlign = 'right';
  for (let k = 0; k <= 4; k++) {
    const v = (top * k) / 4, y = Y(v);
    c.beginPath(); c.moveTo(pad.l, y); c.lineTo(W - pad.r, y); c.stroke();
    c.fillText(v < 10 ? v.toFixed(2) : v.toFixed(0), pad.l - 6, y + 4);
  }
  c.textAlign = 'left'; c.fillText(xLabel || `n = ${values.length}`, pad.l, H - 7);
  if (medianLine) {
    c.strokeStyle = '#c084fc'; c.setLineDash([4, 4]);
    c.beginPath(); c.moveTo(pad.l, Y(medianLine)); c.lineTo(W - pad.r, Y(medianLine)); c.stroke(); c.setLineDash([]);
  }
  if (bars) {
    const bw = Math.max(1, w / values.length - 1);
    c.fillStyle = '#ff7ac8';
    values.forEach((v, i) => { const y = Y(v); c.fillRect(X(i) - bw / 2, y, bw, pad.t + h - y); });
  } else {
    const step = Math.max(1, Math.floor(values.length / (w * 2)));
    c.strokeStyle = '#ff4fa8'; c.lineWidth = 1.2; c.beginPath();
    for (let i = 0; i < values.length; i += step) { const x = X(i), y = Y(values[i]); i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
  }
  if (spikes) {
    c.fillStyle = '#e0306f';
    for (let i = 4; i < values.length - 4; i++) {
      const m = median([...values.slice(i - 4, i), ...values.slice(i + 1, i + 5)]);
      if (m >= 2 && values[i] > 5 * m && values[i] > 20) { c.beginPath(); c.arc(X(i), Y(values[i]), 3.5, 0, Math.PI * 2); c.fill(); }
    }
  }
}

// ---------------------------------------------------------------- build
const TABS = [['curve', 'tabCurve'], ['drift', 'tabDrift'], ['cal', 'tabCal'], ['mal', 'tabMal'], ['poll', 'tabPoll'], ['switch', 'tabSwitch'], ['phys', 'tabPhys']];

function build() {
  const sec = el(`<section id="hw" class="test-card hw-card" aria-labelledby="hw-heading">
    <p class="eyebrow" data-hw="eyebrow"></p><h2 id="hw-heading" data-hw="h"></h2><p class="detail-copy hw-lead" data-hw="lead"></p>
    <details class="hw-env"><summary data-hw="envH"></summary>
      <div class="hw-env-auto" id="env-auto"></div>
      <div class="hw-row hw-env-set">
        <label class="hw-inline"><span data-hw="setRate"></span><select id="env-rate"><option value="">—</option>${[125, 250, 500, 1000, 2000, 4000, 8000].map((r) => `<option value="${r}">${r} Hz</option>`).join('')}</select></label>
        <label class="hw-inline"><span data-hw="setDpi"></span><input id="env-dpi" type="number" min="50" max="64000" step="50" placeholder="800"></label>
        <label class="hw-inline"><span data-hw="conn"></span><select id="env-conn"><option value="">—</option><option value="wired" data-hw="wired"></option><option value="2.4G">2.4G</option><option value="bt" data-hw="bt"></option></select></label>
        <label class="hw-inline"><span data-hw="surface"></span><input id="env-pad" type="text" maxlength="40" placeholder="Artisan / G440 …"></label>
      </div><p class="detail-copy" data-hw="envNote"></p></details>
    <div class="hw-top"><div class="hw-tabs" role="tablist"></div>
      <label class="hw-device"><span data-hw="device"></span><select id="hw-device"><option value="A">A</option><option value="B">B</option></select></label></div>
    <div class="hw-panels"></div>
    <div class="export-actions hw-export">
      <button type="button" class="button button-primary" id="hw-csv" data-hw="csvAll"></button>
      <button type="button" class="button button-secondary" id="hw-raw" data-hw="csvRaw" disabled></button>
      <button type="button" class="button button-secondary" id="hw-export" data-hw="exportAll"></button>
    </div></section>`);
  document.querySelector('.notes')?.before(sec);

  const tl = sec.querySelector('.hw-tabs'), panels = sec.querySelector('.hw-panels');
  TABS.forEach(([id, k], i) => {
    tl.append(el(`<button type="button" role="tab" class="hw-tab" data-tab="${id}" aria-selected="${i === 0}" data-hw="${k}"></button>`));
    panels.append(el(`<div class="hw-panel" data-panel="${id}" role="tabpanel"${i ? ' hidden' : ''}></div>`));
  });
  tl.addEventListener('click', (e) => {
    const b = e.target.closest('.hw-tab'); if (!b) return;
    tl.querySelectorAll('.hw-tab').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    panels.querySelectorAll('.hw-panel').forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.tab; });
    redrawCharts();
  });
  const P = (id) => panels.querySelector(`[data-panel="${id}"]`);

  P('curve').innerHTML = `<p class="hw-how" data-hw="curveHow"></p>
    <p class="hw-hint" data-hw="lockHint"></p>
    <div class="hw-pad hw-pad-lock" id="curve-pad"><strong id="curve-count">0</strong><span class="hw-live" id="curve-live"></span></div>
    <div class="hw-metrics" id="curve-metrics"></div>
    <figure class="hw-fig" id="curve-fig" hidden><figcaption data-hw="curveChart"></figcaption><canvas class="hw-chart" id="curve-chart"></canvas></figure>
    <div class="hw-repeat" id="curve-repeat"></div><p class="hw-limit" data-hw="curveLimit"></p><div class="hw-table" id="curve-table"></div>`;

  P('drift').innerHTML = `<p class="hw-how" data-hw="driftHow"></p>
    <p class="hw-hint" data-hw="lockHint"></p>
    <div class="hw-pad hw-pad-lock" id="drift-pad"><strong id="drift-count">0</strong><span class="hw-live" id="drift-live"></span></div>
    <div class="hw-metrics" id="drift-metrics"></div><p class="hw-limit" data-hw="driftLimit"></p><div class="hw-table" id="drift-table"></div>`;

  P('cal').innerHTML = `<div class="hw-row"><label class="hw-inline"><span data-hw="dist"></span><input id="cpi-dist" type="number" min="1" max="60" step="0.5" value="10"></label></div>
    <p class="hw-how" data-hw="calHow1"></p><p class="hw-how" data-hw="calHow2"></p><p class="hw-how" data-hw="calHow3"></p>
    <div class="hw-row">
      <button type="button" class="button button-primary" data-cal="slow" data-hw="slow"></button>
      <button type="button" class="button button-primary" data-cal="fast" data-hw="fast"></button>
      <button type="button" class="button button-secondary" data-cal="line" data-hw="line"></button>
      <span class="hw-live" id="cal-live"></span></div>
    <div class="hw-pad hw-pad-lock" id="cal-pad"><strong id="cal-count">0</strong><span class="hw-hint" data-hw="lockHint"></span></div>
    <div class="hw-metrics" id="cal-metrics"></div><div class="hw-repeat" id="cal-repeat"></div>
    <p class="hw-limit" data-hw="calLimit"></p><div class="hw-table" id="cal-table"></div>`;

  P('mal').innerHTML = `<p class="hw-how" data-hw="malHow"></p>
    <div class="hw-row"><label class="hw-inline"><span data-hw="dist"></span><input id="mal-dist" type="number" min="5" max="60" step="1" value="20"></label>
      <button type="button" class="button button-primary" id="mal-start" data-hw="malRun"></button><span class="hw-live" id="mal-live"></span></div>
    <div class="hw-pad hw-pad-lock" id="mal-pad"><strong id="mal-count">0</strong><span class="hw-hint" data-hw="lockHint"></span></div>
    <div class="hw-metrics" id="mal-metrics"></div><p class="hw-limit" data-hw="malLimit"></p><div class="hw-table" id="mal-table"></div>`;

  P('poll').innerHTML = `<p class="hw-how" data-hw="pollHow"></p>
    <div class="hw-row"><button type="button" class="button button-primary" id="poll-start" data-hw="start"></button><span class="hw-live" id="poll-live"></span></div>
    <div class="hw-pad hw-pad-lock" id="poll-pad"><strong id="poll-count">0</strong><span class="hw-hint" data-hw="lockHint"></span></div>
    <div class="hw-metrics" id="poll-metrics"></div>
    <figure class="hw-fig" id="poll-fig" hidden><figcaption data-hw="chartPoll"></figcaption><canvas class="hw-chart" id="poll-chart"></canvas></figure>
    <div class="hw-repeat" id="poll-repeat"></div>
    <p class="hw-how" data-hw="stabHow"></p>
    <div class="hw-row"><button type="button" class="button button-secondary" id="stab-start" data-hw="start"></button><span class="hw-live" id="stab-live"></span></div>
    <div class="hw-metrics" id="stab-metrics"></div>
    <figure class="hw-fig" id="stab-fig" hidden><figcaption data-hw="chartStab"></figcaption><canvas class="hw-chart" id="stab-chart"></canvas></figure>
    <p class="hw-limit" data-hw="pollLimit"></p><div class="hw-table" id="poll-table"></div>`;

  P('switch').innerHTML = `<p class="hw-how" data-hw="dbHow"></p>
    <div class="hw-row"><button type="button" class="button button-primary" id="db-start" data-hw="start"></button><span class="hw-live" id="db-live"></span></div>
    <div class="hw-pad" id="db-pad"><strong id="db-count">0</strong><span class="hw-hint" data-hw="dbHow"></span></div>
    <div class="hw-metrics" id="db-metrics"></div>
    <p class="hw-how" data-hw="chatHow"></p>
    <div class="hw-row"><label class="hw-inline"><span data-hw="thresh"></span><select id="chat-th"><option value="30">30 ms</option><option value="40" selected>40 ms</option><option value="60">60 ms</option></select></label>
      <button type="button" class="button button-primary" id="chat-start" data-hw="start"></button>
      <button type="button" class="button button-secondary" id="chat-stop" data-hw="stop" disabled></button></div>
    <div class="hw-pad" id="chat-pad"><strong id="chat-count">0</strong><span id="chat-flag"></span></div>
    <div class="hw-metrics" id="chat-metrics"></div>
    <p class="hw-how" data-hw="latHow"></p>
    <div class="hw-row"><button type="button" class="button button-primary" id="lat-enter" data-hw="enterSlow"></button></div>
    <div class="hw-row"><label class="hw-inline"><span data-hw="frames"></span><input id="lat-frames" type="number" min="0" max="400" step="1"></label>
      <label class="hw-inline"><span data-hw="fps"></span><select id="lat-fps"><option>120</option><option selected>240</option><option>480</option><option>960</option></select></label>
      <button type="button" class="button button-secondary" id="lat-add" data-hw="add"></button></div>
    <div class="hw-metrics" id="lat-metrics"></div><p class="hw-limit" data-hw="latLimit"></p>
    <div class="hw-table" id="switch-table"></div>`;

  P('phys').innerHTML = `<p class="hw-how" data-hw="lodHow"></p>
    <div class="hw-row"><label class="hw-inline"><span data-hw="thick"></span><input id="lod-mm" type="number" min="0" max="10" step="0.1" placeholder="1.2"></label>
      <button type="button" class="button button-primary" id="lod-lock" data-hw="start"></button><span class="hw-live" id="lod-live"></span></div>
    <div class="hw-pad hw-pad-lock" id="lod-pad"><strong id="lod-count">0</strong><span data-hw="liveCounts"></span></div>
    <div class="hw-row"><button type="button" class="button button-secondary" data-lod="1" data-hw="tracked"></button><button type="button" class="button button-secondary" data-lod="0" data-hw="notTracked"></button></div>
    <div class="hw-metrics" id="lod-metrics"></div>
    <p class="hw-how" data-hw="forceHow"></p>
    <div class="hw-row"><label class="hw-inline"><span data-hw="grams"></span><input id="force-g" type="number" min="1" max="300" step="0.5"></label>
      <button type="button" class="button button-secondary" id="force-add" data-hw="add"></button></div>
    <div class="hw-metrics" id="force-metrics"></div><p class="hw-limit" data-hw="physLimit"></p><div class="hw-table" id="phys-table"></div>`;

  TABS.forEach(([id]) => P(id).append(el(`<div class="export-actions"><button type="button" class="button button-secondary hw-clear" data-clear="${id}" data-hw="clear"></button></div>`)));
  document.body.append(el('<div id="slowmo" hidden><span id="slowmo-tip"></span></div>'));
  return sec;
}

// ---------------------------------------------------------------- render
const deviceName = (d) => (document.getElementById(d === 'A' ? 'mouse-a' : 'mouse-b')?.value || '').trim() || d;
const dev = () => document.getElementById('hw-device')?.value || 'A';

function repeatLine(label, values, unit, digits, cvLimit) {
  const s = summarize(values); if (!s.n) return '';
  const cls = s.n < 3 ? 'warn' : s.cv > cvLimit ? 'bad' : 'ok';
  const verdict = s.n < 3 ? tr('needMore') : s.cv > cvLimit ? tr('unstable') : tr('stable');
  return `<span class="hw-rep ${cls}"><b>${esc(label)}</b> ${fmt(s.mean, digits)} ± ${fmt(s.sd, digits)} ${unit} · ${s.n} ${tr('runs')} · ${tr('spread')} ${fmt((s.cv || 0) * 100, 1)}% · ${verdict}</span>`;
}
function renderRepeats() {
  const block = (id, k, f, unit, digits, cv) => {
    const node = document.getElementById(id); if (!node) return;
    const html = ['A', 'B'].map((d) => repeatLine(`${d} · ${deviceName(d)}`, store[k].filter((r) => r.device === d).map(f), unit, digits, cv)).join('');
    node.innerHTML = html ? `<p class="hw-rep-h">${tr('repeat')}</p>${html}` : '';
  };
  block('poll-repeat', 'poll', (r) => r.medianHz, 'Hz', 0, 0.05);
  block('cal-repeat', 'cpi', (r) => r.cpi, 'CPI', 0, 0.03);
  block('curve-repeat', 'curve', (r) => r.peakIps ?? r.peakCountsPerSecond, tr('ips'), 1, 0.2);
}

function renderTables() {
  const q = (id) => document.getElementById(id);
  const smv = (v) => ({ raw: tr('smRaw'), mild: tr('smMild'), smoothed: tr('smSmoothed') }[v] || '—');
  if (q('curve-table')) q('curve-table').innerHTML = tableHtml([tr('device'), tr('smoothT'), tr('roughT'), tr('spikes'), tr('rev'), tr('tailT'), tr('peak')],
    store.curve.map((r) => [esc(r.name), smv(r.smoothVerdict), fmt(r.roughness, 2), `${r.spikes} (${fmt(r.spikesPer1000, 1)}‰)`, `${r.reversals} (${fmt(r.reversalsPer1000, 1)}‰)`, `${fmt(r.tailMs, 0)} ms`, r.peakIps ? `${fmt(r.peakIps, 1)} ${tr('ips')}` : `${fmt(r.peakCountsPerSecond)} c/s`]));
  if (q('drift-table')) q('drift-table').innerHTML = tableHtml([tr('device'), tr('driftCounts'), tr('driftNet'), tr('driftPerMin'), tr('surface')],
    store.drift.map((r) => [esc(r.name), r.counts ? `<b class="hw-bad">${fmt(r.counts, 0)}</b>` : '0', fmt(r.netCounts, 0), fmt(r.countsPerMinute, 1), esc(r.env?.set?.pad || '—')]));
  if (q('cal-table')) q('cal-table').innerHTML = tableHtml([tr('device'), tr('cpiRes'), tr('slow') + '/' + tr('fast'), tr('dist'), tr('dev'), tr('raw')],
    store.cpi.map((r) => [esc(r.name), fmt(r.cpi, 0), r.mode === 'fast' ? tr('fast') : tr('slow'), `${r.cm} cm`, r.deviationPct === null || r.deviationPct === undefined ? '—' : `${r.deviationPct > 0 ? '+' : ''}${fmt(r.deviationPct, 1)}%`, r.raw ? '✓' : '!']));
  if (q('mal-table')) q('mal-table').innerHTML = tableHtml([tr('device'), tr('peak'), 'counts', tr('dist')],
    store.mal.map((r) => [esc(r.name), `${fmt(r.peakIps, 1)} ${tr('ips')}`, fmt(r.counts, 0), `${r.cm} cm`]));
  if (q('poll-table')) q('poll-table').innerHTML = tableHtml([tr('device'), tr('medianHz'), tr('avgHz'), tr('nearest'), tr('stab'), tr('drops'), tr('envRaw')],
    store.poll.map((r) => [esc(r.name), `${fmt(r.medianHz)} Hz`, `${fmt(r.averageHz)} Hz`, `${r.nearest} Hz`, `${fmt(r.stability * 100)}%`, `${fmt((r.dropRate ?? 0) * 100, 2)}%`, r.source]));
  if (q('switch-table')) q('switch-table').innerHTML = tableHtml([tr('device'), tr('dbMin'), tr('dbCps'), tr('susp'), tr('latMed')],
    ['A', 'B'].map((d) => {
      const db = store.debounce.filter((r) => r.device === d).pop();
      const ch = store.chatter.filter((r) => r.device === d);
      const lat = summarizeLatency(store.latency.filter((r) => r.device === d))[d];
      if (!db && !ch.length && !lat) return null;
      return [esc(deviceName(d)), db ? `${fmt(db.minReleaseToPressMs, 1)} ms` : '—', db ? `${fmt(db.maxCps, 1)} CPS` : '—',
        ch.length ? (ch.reduce((a, r) => a + r.suspectCount, 0) ? `<b class="hw-bad">${ch.reduce((a, r) => a + r.suspectCount, 0)}</b>` : '0') : '—',
        lat ? `${fmt(lat.medianMs, 1)} ms (n=${lat.n})` : '—'];
    }).filter(Boolean));
  if (q('phys-table')) q('phys-table').innerHTML = tableHtml([tr('device'), tr('thick'), tr('tracked'), tr('grams')],
    [...store.lod.map((r) => [esc(r.name), `${r.thicknessMm} mm`, r.tracked ? '✓' : '✗', '']),
      ...store.force.map((r) => [esc(r.name), '', '', fmt(r.g, 1)])]);

  // live verdict tiles that persist across tab switches
  const lat = summarizeLatency(store.latency);
  if (q('lat-metrics')) q('lat-metrics').innerHTML = ['A', 'B'].map((d) => (lat[d] ? metric(`${tr('latMed')} · ${esc(deviceName(d))}`, fmt(lat[d].medianMs, 1), `ms · n=${lat[d].n} · ±${fmt(lat[d].sdMs, 1)}`) : '')).join('');
  if (q('force-metrics')) q('force-metrics').innerHTML = ['A', 'B'].map((d) => {
    const v = store.force.filter((r) => r.device === d).map((r) => r.g);
    return v.length ? metric(`${tr('forceMed')} · ${esc(deviceName(d))}`, fmt(median(v), 1), `g · n=${v.length}`) : '';
  }).join('');
  if (q('lod-metrics')) q('lod-metrics').innerHTML = ['A', 'B'].map((d) => {
    const r = computeLod(store.lod.filter((x) => x.device === d));
    if (!r.enough) return '';
    const val = r.bracketed ? `${r.trackedUpToMm}–${r.stoppedAtMm}` : r.trackedUpToMm !== null ? `> ${r.trackedUpToMm}` : `< ${r.stoppedAtMm}`;
    return metric(`${tr('lodRes')} · ${esc(deviceName(d))}`, val, `mm${r.bracketed ? ` · ${tr('lodBetween')}` : ''}`);
  }).join('');
  if (q('mal-metrics')) q('mal-metrics').innerHTML = ['A', 'B'].map((d) => {
    const r = computeMalfunction(store.mal.filter((x) => x.device === d));
    if (!r.enough) return '';
    return metric(`${esc(deviceName(d))} · ${tr('malBase')}`, fmt(r.baselineCounts, 0), 'counts')
      + metric(`${esc(deviceName(d))} · ${tr('malOk')}`, fmt(r.verifiedUpToIps, 1), tr('ips'), 'ok')
      + (r.reached ? metric(`${esc(deviceName(d))} · ${tr('malBad')}`, fmt(r.malfunctionIps, 1), tr('ips'), 'bad')
        : metric(`${esc(deviceName(d))}`, '—', tr('malNot'), 'warn'));
  }).join('');
  renderRepeats();
}

function redrawCharts() {
  if (lastRaw.curve) drawChart(document.getElementById('curve-chart'), lastRaw.curve.mags, { spikes: true });
  if (lastRaw.poll) drawChart(document.getElementById('poll-chart'), lastRaw.poll.intervals, { medianLine: lastRaw.poll.median });
  if (lastRaw.stability) drawChart(document.getElementById('stab-chart'), lastRaw.stability.hz, { bars: true, xLabel: `${fmt(lastRaw.stability.spanMs / 1000, 1)} s` });
}

function applyText(sec) {
  sec.querySelectorAll('[data-hw]').forEach((n) => { n.textContent = tr(n.dataset.hw); });
  const tip = document.getElementById('slowmo-tip'); if (tip) tip.textContent = tr('exitSlow');
  renderTables(); redrawCharts();
}

// ---------------------------------------------------------------- capture
// One shared routine: lock the pointer, collect every raw report, hand back the samples.
async function capture(pad, { durationMs = 5000, untilClick = false, onTick = null } = {}) {
  let raw = false;
  try { await pad.requestPointerLock({ unadjustedMovement: true }); raw = true; }
  catch { try { await pad.requestPointerLock(); } catch { return null; } }
  if (document.pointerLockElement !== pad) { try { await pad.requestPointerLock(); } catch { return null; } }
  if (document.pointerLockElement !== pad) return null;

  const samples = []; const t0 = performance.now();
  pad.classList.add('is-active');
  // The capture loop must stay as cheap as possible: at 8000 Hz any DOM work here would
  // slow the page down and drag the measured rate below the real one. So the handler only
  // pushes numbers, and the on-screen counter is refreshed once per frame instead.
  const on = (e) => {
    const list = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    if (list.length) { for (const c of list) samples.push({ t: c.timeStamp, dx: c.movementX, dy: c.movementY }); }
    else samples.push({ t: e.timeStamp, dx: e.movementX, dy: e.movementY });
  };
  document.addEventListener(RAW_TYPE, on, { passive: true });
  let painting = Boolean(onTick);
  const paint = () => { if (!painting) return; onTick(samples, performance.now() - t0); requestAnimationFrame(paint); };
  if (painting) requestAnimationFrame(paint);

  await new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; cleanup(); resolve(); };
    const click = (e) => { if (e.button === 0) { e.preventDefault(); finish(); } };
    const unlock = () => { if (document.pointerLockElement !== pad) finish(); };
    const timer = untilClick ? null : setTimeout(finish, durationMs);
    function cleanup() {
      if (timer) clearTimeout(timer);
      document.removeEventListener('mousedown', click);
      document.removeEventListener('pointerlockchange', unlock);
    }
    if (untilClick) setTimeout(() => document.addEventListener('mousedown', click), 60);
    document.addEventListener('pointerlockchange', unlock);
  });

  document.removeEventListener(RAW_TYPE, on);
  painting = false;
  if (onTick) onTick(samples, performance.now() - t0);
  pad.classList.remove('is-active');
  if (document.pointerLockElement === pad) document.exitPointerLock?.();
  return { samples, raw, durationMs: performance.now() - t0 };
}

const countdown = (node, ms, label) => {
  const t0 = performance.now();
  const id = setInterval(() => {
    const left = Math.max(0, ms - (performance.now() - t0)) / 1000;
    node.textContent = `${label} ${left.toFixed(1)} s`;
    if (left <= 0) { clearInterval(id); node.textContent = ''; }
  }, 100);
  return () => { clearInterval(id); node.textContent = ''; };
};

// ---------------------------------------------------------------- init
function init() {
  const sec = build();
  const $ = (id) => document.getElementById(id);
  const envSnapshot = () => ({ browser: ENV.browser, os: ENV.os, refresh: ENV.refresh, dpr: ENV.dpr, rawEvents: ENV.rawEvents, set: { ...(settings()[dev()] || {}) } });
  const rec = (k, obj) => { store[k].push({ device: dev(), name: deviceName(dev()), at: new Date().toISOString(), env: envSnapshot(), ...obj }); save(); renderTables(); };
  const lastCpi = () => { const v = store.cpi.filter((r) => r.device === dev() && r.mode !== 'fast').pop(); return v ? v.cpi : null; };

  // environment
  const paintEnv = () => {
    $('env-auto').innerHTML = [[tr('envBrowser'), ENV.browser], [tr('envOs'), ENV.os], [tr('envHz'), ENV.refresh ? `${ENV.refresh} Hz` : '…'],
      [tr('envDpr'), `${Math.round(ENV.dpr * 100)}%`], [tr('envRaw'), ENV.rawEvents ? 'pointerrawupdate ✓' : 'pointermove']]
      .map(([k, v]) => `<span><b>${k}</b>${esc(v)}</span>`).join('');
  };
  const loadSet = () => { const st = settings()[dev()] || {}; $('env-rate').value = st.rate || ''; $('env-dpi').value = st.dpi || ''; $('env-conn').value = st.conn || ''; $('env-pad').value = st.pad || ''; };
  const saveSet = () => { settings()[dev()] = { rate: $('env-rate').value, dpi: $('env-dpi').value, conn: $('env-conn').value, pad: $('env-pad').value }; save(); };
  ['env-rate', 'env-dpi', 'env-conn', 'env-pad'].forEach((id) => $(id).addEventListener('change', saveSet));
  $('hw-device').addEventListener('change', () => { loadSet(); renderTables(); });
  measureRefresh().then((hz) => { ENV.refresh = hz; paintEnv(); });

  // ---- sensor curve
  $('curve-pad').addEventListener('click', async () => {
    const stop = countdown($('curve-live'), 5000, tr('go'));
    const r = await capture($('curve-pad'), { durationMs: 5000, onTick: (s) => { $('curve-count').textContent = String(s.length); } });
    stop(); if (!r) return;
    const cpi = lastCpi(); const a = computeSensor(r.samples, cpi);
    if (!a.enough) { $('curve-metrics').innerHTML = `<p class="hw-limit">${tr('notEnough')}</p>`; return; }
    const sm = a.smoothing, smTxt = { raw: tr('smRaw'), mild: tr('smMild'), smoothed: tr('smSmoothed') }[sm.verdict] || '—';
    $('curve-metrics').innerHTML =
      metric(tr('smoothT'), smTxt.split('（')[0].split(' (')[0], smTxt, sm.verdict === 'smoothed' ? 'warn' : 'ok')
      + metric(tr('roughT'), fmt(sm.roughness, 2), `${tr('smRaw').slice(0, 2)} > 0.35`)
      + metric(tr('tailT'), fmt(a.tail.tailMs, 0), tr('tailUnit'), a.tail.tailMs > 12 ? 'warn' : 'ok')
      + metric(tr('spikes'), a.spikes, `${fmt(a.spikesPer1000, 1)} ${tr('per1000')}`, a.spikes ? 'bad' : 'ok')
      + metric(tr('rev'), a.reversals, `${fmt(a.reversalsPer1000, 1)} ${tr('per1000')}`, a.reversals ? 'warn' : 'ok')
      + metric(tr('peak'), a.peakIps ? fmt(a.peakIps, 1) : fmt(a.peakCountsPerSecond), a.peakIps ? `${tr('ips')} · ${fmt(a.peakMetersPerSecond, 2)} m/s` : `counts/s · ${tr('needCpi')}`);
    const mags = r.samples.map((p) => Math.hypot(p.dx, p.dy));
    lastRaw.curve = { mags, rows: r.samples.map((p, i) => ({ index: i, timestampMs: +p.t.toFixed(4), dx: p.dx, dy: p.dy, magnitude: +mags[i].toFixed(3) })) };
    $('hw-raw').disabled = false; $('curve-fig').hidden = false; drawChart($('curve-chart'), mags, { spikes: true });
    rec('curve', { spikes: a.spikes, spikesPer1000: a.spikesPer1000, reversals: a.reversals, reversalsPer1000: a.reversalsPer1000,
      peakIps: a.peakIps, peakCountsPerSecond: a.peakCountsPerSecond, peakMetersPerSecond: a.peakMetersPerSecond,
      roughness: sm.roughness, repeatRatio: sm.repeatRatio, smoothVerdict: sm.verdict,
      tailMs: a.tail.tailMs, tailReports: a.tail.tailReports, cpi, raw: r.raw, samples: a.samples });
  });

  // ---- static drift
  $('drift-pad').addEventListener('click', async () => {
    const stop = countdown($('drift-live'), 15000, tr('go'));
    const r = await capture($('drift-pad'), { durationMs: 15000, onTick: (s) => { $('drift-count').textContent = fmt(s.reduce((a, p) => a + Math.hypot(p.dx, p.dy), 0), 0); } });
    stop(); if (!r) return;
    const a = computeDrift(r.samples, r.durationMs);
    const vtxt = { clean: tr('dClean'), minor: tr('dMinor'), noisy: tr('dNoisy') }[a.verdict];
    $('drift-metrics').innerHTML = metric(tr('driftCounts'), fmt(a.counts, 0), vtxt, a.verdict === 'clean' ? 'ok' : a.verdict === 'minor' ? 'warn' : 'bad')
      + metric(tr('driftNet'), fmt(a.netCounts, 0), 'counts')
      + metric(tr('driftPerMin'), fmt(a.countsPerMinute, 1), 'counts/min');
    rec('drift', { counts: a.counts, netCounts: a.netCounts, countsPerMinute: a.countsPerMinute, reports: a.reports, durationMs: Math.round(a.durationMs), verdict: a.verdict });
  });

  // ---- calibration: cpi slow / fast / angle snap
  let calMode = null;
  sec.querySelectorAll('[data-cal]').forEach((b) => b.addEventListener('click', () => { calMode = b.dataset.cal; $('cal-live').textContent = tr('lockHint'); $('cal-pad').classList.add('hw-armed'); }));
  $('cal-pad').addEventListener('click', async () => {
    if (!calMode) { $('cal-live').textContent = tr('lockHint'); return; }
    const mode = calMode; calMode = null; $('cal-pad').classList.remove('hw-armed');
    const cm = parseFloat($('cpi-dist').value);
    const r = await capture($('cal-pad'), { untilClick: true, onTick: (s) => { const sx = s.reduce((a, p) => a + p.dx, 0), sy = s.reduce((a, p) => a + p.dy, 0); $('cal-count').textContent = String(Math.round(Math.hypot(sx, sy))); } });
    $('cal-live').textContent = ''; if (!r) return;
    if (mode === 'line') {
      const a = computeAngleSnap(r.samples);
      if (!a.enough) { $('cal-metrics').innerHTML = `<p class="hw-limit">${tr('notEnough')}</p>`; return; }
      const vt = { none: tr('snNone'), suspect: tr('snSus'), snapping: tr('snYes') }[a.verdict];
      $('cal-metrics').innerHTML = metric(tr('snapT'), vt.split('（')[0], `${tr('snapZero')} ${fmt(a.zeroYRatio * 100, 0)}%`, a.verdict === 'none' ? 'ok' : a.verdict === 'suspect' ? 'warn' : 'bad')
        + metric(tr('snapZero'), fmt(a.zeroYRatio * 100, 0), `% · run ${a.longestZeroRun}`);
      rec('snap', { zeroYRatio: a.zeroYRatio, longestZeroRun: a.longestZeroRun, yPerX: a.yPerX, verdict: a.verdict, samples: a.samples });
      return;
    }
    const sx = r.samples.reduce((a, p) => a + p.dx, 0), sy = r.samples.reduce((a, p) => a + p.dy, 0);
    const c = computeCpi(sx, sy, cm);
    if (!c || c.counts < 20) { $('cal-metrics').innerHTML = `<p class="hw-limit">${tr('notEnough')}</p>`; return; }
    const nominal = +(settings()[dev()]?.dpi || 0);
    const dv = deviationPct(c.cpi, nominal);
    rec('cpi', { cpi: c.cpi, cm, counts: c.counts, mode, raw: r.raw, nominalDpi: nominal || null, deviationPct: dv });
    const slowV = median(store.cpi.filter((x) => x.device === dev() && x.mode === 'slow').map((x) => x.cpi));
    const fastV = median(store.cpi.filter((x) => x.device === dev() && x.mode === 'fast').map((x) => x.cpi));
    const acc = computeAcceleration(slowV, fastV);
    $('cal-metrics').innerHTML = metric(tr('cpiRes'), fmt(c.cpi, 0), `CPI · ${mode === 'fast' ? tr('fast') : tr('slow')}`)
      + (dv === null ? '' : metric(tr('dev'), `${dv > 0 ? '+' : ''}${fmt(dv, 1)}%`, `${nominal} DPI`, Math.abs(dv) > 5 ? 'warn' : 'ok'))
      + metric(tr('raw'), r.raw ? '✓' : '!', r.raw ? tr('rawYes') : tr('rawNo'), r.raw ? 'ok' : 'warn')
      + (acc ? metric(tr('accelT'), `${acc.deviationPct > 0 ? '+' : ''}${fmt(acc.deviationPct, 1)}%`,
        { none: tr('accNone'), positive: tr('accPos'), negative: tr('accNeg') }[acc.verdict], acc.verdict === 'none' ? 'ok' : 'warn') : '');
  });

  // ---- malfunction speed
  $('mal-start').addEventListener('click', () => { $('mal-live').textContent = tr('lockHint'); $('mal-pad').classList.add('hw-armed'); });
  $('mal-pad').addEventListener('click', async () => {
    const cm = parseFloat($('mal-dist').value) || 20;
    $('mal-pad').classList.remove('hw-armed');
    const r = await capture($('mal-pad'), { untilClick: true, onTick: (s) => { $('mal-count').textContent = String(Math.round(Math.abs(s.reduce((a, p) => a + p.dx, 0)))); } });
    $('mal-live').textContent = ''; if (!r) return;
    const cpi = lastCpi(); const a = computeSensor(r.samples, cpi);
    const counts = Math.abs(r.samples.reduce((x, p) => x + p.dx, 0));
    if (!a.enough || counts < 50) { $('mal-metrics').innerHTML = `<p class="hw-limit">${tr('notEnough')}</p>`; return; }
    rec('mal', { counts, cm, peakIps: a.peakIps ?? a.peakCountsPerSecond / 800, peakCountsPerSecond: a.peakCountsPerSecond, cpi });
  });

  // ---- polling + stability
  const runPolling = async (key, pad, live, durationMs, countNode) => {
    const stop = countdown(live, durationMs, tr('go'));
    const r = await capture(pad, { durationMs, onTick: (s) => { countNode.textContent = String(s.length); } });
    stop(); return r;
  };
  $('poll-start').addEventListener('click', () => { $('poll-live').textContent = tr('lockHint'); });
  $('poll-pad').addEventListener('click', async () => {
    const r = await runPolling('poll', $('poll-pad'), $('poll-live'), 5000, $('poll-count'));
    if (!r) return;
    const ts = r.samples.map((p) => p.t);
    const a = computePolling(ts);
    if (!a.enough) { $('poll-metrics').innerHTML = `<p class="hw-limit">${tr('notEnough')}</p>`; return; }
    const setR = +(settings()[dev()]?.rate || 0);
    $('poll-metrics').innerHTML = metric(tr('medianHz'), fmt(a.medianHz), 'Hz') + metric(tr('avgHz'), fmt(a.averageHz), 'Hz')
      + metric(tr('nearest'), a.nearest, 'Hz') + metric(tr('stab'), fmt(a.stability * 100), `% · ${RAW_TYPE}`)
      + metric(tr('drops'), fmt(a.dropRate * 100, 2), '%', a.dropRate > 0.01 ? 'warn' : 'ok')
      + (setR ? metric(tr('vsSet'), setR === a.nearest ? '✓' : '✗', `${setR} Hz · ${setR === a.nearest ? tr('match') : tr('mismatch')}`, setR === a.nearest ? 'ok' : 'bad') : '');
    const sorted = [...ts].sort((x, y) => x - y);
    const intervals = sorted.slice(1).map((t, i) => t - sorted[i]).filter((d) => d > 0 && d <= 25);
    lastRaw.poll = { intervals, median: a.medianIntervalMs, rows: sorted.map((t, i) => ({ index: i, timestampMs: +t.toFixed(4), intervalMs: i ? +(t - sorted[i - 1]).toFixed(4) : '' })) };
    $('hw-raw').disabled = false; $('poll-fig').hidden = false; drawChart($('poll-chart'), intervals, { medianLine: a.medianIntervalMs });
    rec('poll', { medianHz: a.medianHz, averageHz: a.averageHz, nearest: a.nearest, stability: a.stability, dropRate: a.dropRate, drops: a.drops, samples: a.samples, source: RAW_TYPE });
  });
  $('stab-start').addEventListener('click', async () => {
    const r = await runPolling('stability', $('poll-pad'), $('stab-live'), 30000, $('poll-count'));
    if (!r) return;
    const a = computeStability(r.samples.map((p) => p.t));
    if (!a.enough) { $('stab-metrics').innerHTML = `<p class="hw-limit">${tr('notEnough')}</p>`; return; }
    $('stab-metrics').innerHTML = metric(tr('medianHz'), fmt(a.activeMedianHz ?? a.medianHz), 'Hz')
      + metric(tr('dropouts'), a.dropoutCount, `${fmt(a.dropoutsPerMinute, 1)} / min`, a.dropoutCount ? 'bad' : 'ok')
      + metric(tr('worstGap'), fmt(a.worstGapMs, 1), 'ms', a.worstGapMs > 8 ? 'warn' : 'ok')
      + metric(tr('lost'), a.lostReports, 'reports', a.lostReports > 20 ? 'warn' : 'ok');
    lastRaw.stability = { hz: a.buckets.map((b) => b.hz), spanMs: a.spanMs, rows: a.buckets.map((b) => ({ atMs: Math.round(b.atMs), hz: +b.hz.toFixed(1) })) };
    $('stab-fig').hidden = false; drawChart($('stab-chart'), lastRaw.stability.hz, { bars: true, xLabel: `${fmt(a.spanMs / 1000, 1)} s` });
    rec('stability', { medianHz: a.activeMedianHz ?? a.medianHz, dropoutCount: a.dropoutCount, dropoutsPerMinute: a.dropoutsPerMinute, worstGapMs: a.worstGapMs, lostReports: a.lostReports, spanMs: Math.round(a.spanMs) });
  });

  // ---- switch: debounce
  let db = null;
  $('db-start').addEventListener('click', () => {
    db = { down: [], up: [] }; $('db-count').textContent = '0'; $('db-pad').classList.add('is-active');
    const stop = countdown($('db-live'), 10000, tr('go'));
    setTimeout(() => {
      stop(); $('db-pad').classList.remove('is-active');
      const d = db; db = null; if (!d) return;
      const a = computeDebounce(d.down, d.up);
      if (!a.enough) { $('db-metrics').innerHTML = `<p class="hw-limit">${tr('notEnough')}</p>`; return; }
      $('db-metrics').innerHTML = metric(tr('dbMin'), fmt(a.minReleaseToPressMs, 1), 'ms', a.minReleaseToPressMs > 20 ? 'warn' : 'ok')
        + metric(tr('dbHold'), fmt(a.medianHoldMs, 1), 'ms')
        + metric(tr('dbCps'), fmt(a.maxCps, 1), `CPS · ${a.clicks} ${tr('clicks')}`);
      rec('debounce', { clicks: a.clicks, minReleaseToPressMs: a.minReleaseToPressMs, p1ReleaseToPressMs: a.p1ReleaseToPressMs, medianHoldMs: a.medianHoldMs, minHoldMs: a.minHoldMs, minPressToPressMs: a.minPressToPressMs, maxCps: a.maxCps });
    }, 10000);
  });
  $('db-pad').addEventListener('pointerdown', (e) => { if (!db || e.button !== 0) return; e.preventDefault(); db.down.push(e.timeStamp); $('db-count').textContent = String(db.down.length); });
  $('db-pad').addEventListener('pointerup', (e) => { if (db && e.button === 0) db.up.push(e.timeStamp); });

  // ---- switch: chatter
  let chat = null;
  const chatEnd = () => {
    if (!chat) return;
    const th = +$('chat-th').value; const a = computeChatter(chat.down, chat.up, th); chat = null;
    $('chat-start').disabled = false; $('chat-stop').disabled = true; $('chat-pad').classList.remove('is-active');
    $('chat-metrics').innerHTML = metric(tr('clicks'), a.clicks)
      + metric(tr('susp'), a.suspectCount, a.suspectCount ? tr('chatBad') : tr('chatOk'), a.suspectCount ? 'bad' : 'ok')
      + metric(tr('minGap'), fmt(a.minGapMs, 1), 'ms');
    if (a.clicks) rec('chatter', { clicks: a.clicks, suspectCount: a.suspectCount, minGapMs: a.minGapMs, threshold: th });
  };
  $('chat-start').addEventListener('click', () => { chat = { down: [], up: [] }; $('chat-count').textContent = '0'; $('chat-flag').textContent = ''; $('chat-start').disabled = true; $('chat-stop').disabled = false; $('chat-pad').classList.add('is-active'); });
  $('chat-stop').addEventListener('click', chatEnd);
  $('chat-pad').addEventListener('pointerdown', (e) => {
    if (!chat || e.button !== 0) return; e.preventDefault();
    const th = +$('chat-th').value, prev = chat.down.at(-1);
    chat.down.push(e.timeStamp); $('chat-count').textContent = String(chat.down.length);
    if (prev !== undefined && e.timeStamp - prev < th) {
      $('chat-flag').textContent = `⚠ ${fmt(e.timeStamp - prev, 1)} ms`;
      $('chat-pad').classList.add('hw-flash'); setTimeout(() => $('chat-pad').classList.remove('hw-flash'), 400);
    }
    if (chat.down.length >= 30) chatEnd();
  });
  $('chat-pad').addEventListener('pointerup', (e) => { if (chat && e.button === 0) chat.up.push(e.timeStamp); });
  ['db-pad', 'chat-pad'].forEach((id) => $(id).addEventListener('contextmenu', (e) => e.preventDefault()));

  // ---- switch: slow-mo latency
  const slow = $('slowmo');
  const key = (e) => { if (e.key === 'Escape') { slow.hidden = true; document.removeEventListener('keydown', key); if (document.fullscreenElement) document.exitFullscreen?.(); } };
  $('lat-enter').addEventListener('click', async () => {
    slow.hidden = false; slow.classList.remove('flash');
    try { await slow.requestFullscreen?.(); } catch { /* works without fullscreen too */ }
    document.addEventListener('keydown', key);
  });
  slow.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; slow.classList.add('flash'); setTimeout(() => slow.classList.remove('flash'), 320); });
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && !slow.hidden) { slow.hidden = true; document.removeEventListener('keydown', key); } });
  $('lat-add').addEventListener('click', () => {
    const f = parseInt($('lat-frames').value, 10), fps = +$('lat-fps').value;
    if (!(f >= 0)) return; rec('latency', { frames: f, fps, ms: framesToMs(f, fps) }); $('lat-frames').value = '';
  });

  // ---- physical: lift-off + force
  let lodLive = null;
  $('lod-lock').addEventListener('click', () => { $('lod-live').textContent = tr('lockHint'); $('lod-pad').classList.add('hw-armed'); });
  $('lod-pad').addEventListener('click', async () => {
    $('lod-pad').classList.remove('hw-armed');
    lodLive = 0;
    const r = await capture($('lod-pad'), { untilClick: true, onTick: (s) => { lodLive = s.reduce((a, p) => a + Math.hypot(p.dx, p.dy), 0); $('lod-count').textContent = fmt(lodLive, 0); } });
    $('lod-live').textContent = ''; if (!r) return;
  });
  sec.querySelectorAll('[data-lod]').forEach((b) => b.addEventListener('click', () => {
    const mm = parseFloat($('lod-mm').value); if (!(mm >= 0)) return;
    rec('lod', { thicknessMm: mm, tracked: b.dataset.lod === '1', counts: lodLive });
  }));
  $('force-add').addEventListener('click', () => { const g = parseFloat($('force-g').value); if (!(g > 0)) return; rec('force', { g }); $('force-g').value = ''; });

  // ---- shared: clear, exports, language
  sec.addEventListener('click', (e) => {
    const b = e.target.closest('.hw-clear'); if (!b) return;
    ({ curve: ['curve'], drift: ['drift'], cal: ['cpi', 'snap'], mal: ['mal'], poll: ['poll', 'stability'], switch: ['debounce', 'chatter', 'latency'], phys: ['lod', 'force'] }[b.dataset.clear] || [])
      .forEach((k) => { store[k] = []; });
    save(); renderTables();
  });
  $('hw-csv').addEventListener('click', () => {
    const rows = [];
    for (const k of ['curve', 'drift', 'cpi', 'snap', 'mal', 'poll', 'stability', 'debounce', 'chatter', 'latency', 'lod', 'force']) {
      for (const r of store[k]) {
        const { env, ...rest } = r;
        rows.push({ test: k, ...rest, browser: env?.browser, os: env?.os, refreshHz: env?.refresh, scaling: env?.dpr,
          setRate: env?.set?.rate, setDpi: env?.set?.dpi, connection: env?.set?.conn, pad: env?.set?.pad });
      }
    }
    download(`mouse-hw-records-${Date.now()}.csv`, toCsv(rows), 'text/csv');
  });
  $('hw-raw').addEventListener('click', () => {
    for (const k of ['curve', 'poll', 'stability']) { const r = lastRaw[k]; if (r?.rows) download(`mouse-raw-${k}-${Date.now()}.csv`, toCsv(r.rows), 'text/csv'); }
  });
  $('hw-export').addEventListener('click', () => {
    download(`mouse-hw-${Date.now()}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), userAgent: navigator.userAgent, env: ENV, ...store }, null, 2), 'application/json');
  });
  const syncDeviceLabels = () => { [...$('hw-device').options].forEach((o) => { o.textContent = `${o.value} · ${deviceName(o.value)}`; }); };
  ['mouse-a', 'mouse-b'].forEach((id) => $(id)?.addEventListener('input', () => { syncDeviceLabels(); renderTables(); }));
  document.getElementById('lang-select')?.addEventListener('change', () => setTimeout(() => { applyText(sec); syncDeviceLabels(); paintEnv(); }, 0));
  window.addEventListener('resize', redrawCharts);

  applyText(sec); syncDeviceLabels(); paintEnv(); loadSet();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
