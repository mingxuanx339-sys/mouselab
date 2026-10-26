# MouseLab

**English** · [中文](#中文) · [日本語](#日本語)

A browser tool for A/B comparing two mice by rapid clicking: click count (CPS), click interval and hold time, over alternating timed rounds. UI in Chinese, English and Japanese. No build step, no server, no dependencies.

## What it measures — and what it doesn't
- Measures: browser pointer-event timestamps from one person, one mouse, one browser. Useful only for relative comparison in the *same* setup.
- Does **not** measure: hardware switch/actuation latency, USB polling rate, sensor latency, or click-to-photon latency. Browser scheduling, OS and event coalescing prevent that. No millisecond value here should be read as switch response speed.
- All data stays in your browser (localStorage). Nothing is uploaded. Export JSON / CSV / PNG yourself.

## Sensor & Response Lab (`lab.html`)
Seven extra tests that need no lab equipment:

| Test | How | What it can tell you |
| --- | --- | --- |
| Polling rate | Draw circles for 5 s; `pointerrawupdate` / coalesced events are counted | Reports the browser actually received per second, and how stable that is. Not a USB-level measurement. |
| DPI accuracy | Pointer Lock (raw `unadjustedMovement` where supported); slide a known distance along a ruler | Real counts per inch vs. the DPI set in the driver |
| Acceleration | Stroke back and forth between two fixed stops, slow then fast | Whether fast strokes report more or fewer counts than slow ones |
| Idle jitter | Hands off for 10 s under Pointer Lock | Movement reported while the mouse is still |
| Line drawing | Draw straight lines; each is fitted with PCA | Angle and RMS deviation; helps spot angle snapping |
| Buttons & wheel | Press every button, click normally, roll the wheel one way | Button mapping, suspected switch chatter (second press within 20–50 ms), reversed wheel events |
| Raw recorder | Pointer Lock + `pointerrawupdate`, up to 10 s; plots counts, report interval, speed (m/s) and X-Y path | MouseTester-style view: top speed, spin-outs / empty reports during fast moves, 8-bit (±127) data-path clipping. Exports MouseTester-format CSV |
| Click force | Japanese 1-yen coins (exactly 1.00 g each) stacked on the button, or a kitchen scale; the page flashes and beeps the instant the click registers | Actuation force in grams per mouse and button, median of repeated runs, and how much lighter/heavier one mouse is than another |
| Click-to-screen latency | Film the click and a flash area with a 240 fps+ phone, count frames | The only end-to-end latency figure here (mouse + USB + OS + browser + monitor) |

The raw recorder follows the plot set popularised by [MouseTester](https://github.com/microe1/MouseTester) (MIT) and is inspired by [MousePlotter](https://github.com/XBAB-Tech/MousePlotter); no code is copied from either. `lab.html` loads [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker) (MIT, © Guido Zuidhof) so GitHub Pages can serve it cross-origin isolated, which raises timer resolution from ~100 µs to ~5 µs. The first visit reloads once to install it. Firefox freezes `PointerEvent.timeStamp`, so the lab falls back to `performance.now()` there; use Chrome or Edge for timing tests.

## Run
Open `index.html` through any static server (e.g. `python3 -m http.server`), or deploy the repo root with GitHub Pages. Tests: `npm test` (Node 18+).

## Files
`index.html`, `lab.html`, `styles.css`, `src/` (app, model, i18n, lab), `tests/`, `legacy.html` (older mouse-movement page, Chinese only). Add a language by adding a column to `src/i18n.js`.

License: MIT.

## 中文
在浏览器里用连续点击对 A/B 两只鼠标做交替计时对比：点击次数（CPS）、点击间隔、按住时长。界面支持中、英、日。**不测**硬件触发延迟、USB 回报率或传感器延迟，只适合同一环境下的相对比较。数据只保存在本机浏览器，不上传。

传感器与响应实验室（`lab.html`）新增 7 项不用仪器的测试：回报率、DPI 准确度、加速度、静止抖动、直线修正、按键/双击/滚轮跳格，以及用手机慢动作拍摄测端到端点击延迟。

## 日本語
2つのマウスを連続クリックで交互にA/B比較するブラウザツールです（CPS・クリック間隔・押下時間）。UIは中国語・英語・日本語に対応。ハードウェアの反応遅延、USBポーリングレート、センサー遅延は**測定しません**。同一環境での相対比較にのみ使えます。データはブラウザ内にのみ保存され、アップロードされません。

センサー＆応答ラボ（`lab.html`）では、測定器なしで7項目をテストできます：ポーリングレート、DPI精度、加速、静止時のブレ、直線補正、ボタン/チャタリング/ホイールの飛び、スマホのスロー撮影によるエンドツーエンドのクリック遅延。
