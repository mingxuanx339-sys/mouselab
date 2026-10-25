# MouseLab

**English** · [中文](#中文) · [日本語](#日本語)

A browser tool for A/B comparing two mice by rapid clicking: click count (CPS), click interval and hold time, over alternating timed rounds. UI in Chinese, English and Japanese. No build step, no server, no dependencies.

## What it measures — and what it doesn't
- Measures: browser pointer-event timestamps from one person, one mouse, one browser. Useful only for relative comparison in the *same* setup.
- Does **not** measure: hardware switch/actuation latency, USB polling rate, sensor latency, or click-to-photon latency. Browser scheduling, OS and event coalescing prevent that. No millisecond value here should be read as switch response speed.
- All data stays in your browser (localStorage). Nothing is uploaded. Export JSON / CSV / PNG yourself.

## Run
Open `index.html` through any static server (e.g. `python3 -m http.server`), or deploy the repo root with GitHub Pages. Tests: `npm test` (Node 18+).

## Files
`index.html`, `styles.css`, `src/` (app, model, i18n), `tests/`, `legacy.html` (older mouse-movement page, Chinese only). Add a language by adding a column to `src/i18n.js`.

License: MIT.

## 中文
在浏览器里用连续点击对 A/B 两只鼠标做交替计时对比：点击次数（CPS）、点击间隔、按住时长。界面支持中、英、日。**不测**硬件触发延迟、USB 回报率或传感器延迟，只适合同一环境下的相对比较。数据只保存在本机浏览器，不上传。

## 日本語
2つのマウスを連続クリックで交互にA/B比較するブラウザツールです（CPS・クリック間隔・押下時間）。UIは中国語・英語・日本語に対応。ハードウェアの反応遅延、USBポーリングレート、センサー遅延は**測定しません**。同一環境での相対比較にのみ使えます。データはブラウザ内にのみ保存され、アップロードされません。
