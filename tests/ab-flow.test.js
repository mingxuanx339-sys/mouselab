// UI logic integration test using a minimal DOM fixture, not a substitute for visual browser QA.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('full UI flow: setup, trusted input, automatic save, rest, device switch, interruption, exports and refresh', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const ids = [...html.matchAll(/id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique');
  class Element {
    constructor() {
      this.listeners = {}; this.children = []; this.textContent = ''; this.value = '';
      this.style = {}; this.disabled = false; this.attributes = {};
      const classes = new Set();
      this.classList = { toggle(name, force) { const on = force ?? !classes.has(name); if (on) classes.add(name); else classes.delete(name); return on; } };
    }
    addEventListener(type, callback) { this.listeners[type] = callback; }
    fire(type, values = {}) { return this.listeners[type]?.({ type, preventDefault() {}, ...values }); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
    focus() {}
    getBoundingClientRect() { return { left: 0, top: 0, right: 600, bottom: 300 }; }
    setPointerCapture() {}
    hasPointerCapture() { return true; }
    releasePointerCapture() {}
    click() {}
    remove() {}
    getContext() { return { fillRect() {}, fillText() {} }; }
    toBlob(callback) { callback(new Blob(['mock png'])); }
  }
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  const setupIds = ['mouse-a', 'mouse-b', 'duration-setting', 'round-setting', 'rest-setting', 'setup-notes'];
  const documentFixture = new Element();
  documentFixture.body = new Element();
  documentFixture.getElementById = (id) => { assert.ok(elements[id], `Missing DOM element ${id}`); return elements[id]; };
  documentFixture.querySelectorAll = (selector) => String(selector).startsWith('#setup') ? setupIds.map((id) => elements[id]) : [];
  documentFixture.querySelector = () => null;
  documentFixture.documentElement = new Element();
  documentFixture.createElement = () => new Element();
  const windowFixture = new Element();
  const timers = new Map(); let tickId = 0; let now = 0; let wall = 1000000;
  windowFixture.setInterval = (callback) => { timers.set(++tickId, callback); return tickId; };
  windowFixture.clearInterval = (id) => timers.delete(id);
  windowFixture.setTimeout = () => {};
  windowFixture.confirm = () => false;
  const stored = new Map();
  const storage = { getItem: (key) => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) };
  const downloads = [];
  const originalNow = Date.now;
  const names = ['document', 'window', 'localStorage', 'performance', 'URL'];
  const originals = Object.fromEntries(names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  Object.defineProperties(globalThis, {
    document: { configurable: true, value: documentFixture }, window: { configurable: true, value: windowFixture },
    localStorage: { configurable: true, value: storage }, performance: { configurable: true, value: { now: () => now } },
    URL: { configurable: true, value: { createObjectURL(blob) { downloads.push(blob); return 'blob:test'; }, revokeObjectURL() {} } },
  });
  Date.now = () => wall;
  const advance = (ms) => { now += ms; wall += ms; for (const callback of [...timers.values()]) callback(); };
  const saved = () => JSON.parse(stored.get('mouse-feel-score-ab-v2'));
  const pointer = (type, overrides = {}) => elements['test-area'].fire(type, { isTrusted: true, pointerType: 'mouse', button: 0, clientX: 100, clientY: 100, pointerId: 1, ...overrides });
  try {
    await import('../src/ab-app.js?flow-test');
    elements['mouse-b'].value = 'Test B'; elements['mouse-b'].fire('change');
    elements['start-button'].fire('click');
    assert.equal(elements['mouse-a'].disabled, true);
    pointer('pointerdown'); pointer('pointerup'); // Preparation clicks must not count.
    advance(3000);
    pointer('pointerdown', { isTrusted: false }); pointer('pointerup', { isTrusted: false });
    pointer('pointerdown', { pointerType: 'touch' }); pointer('pointerup', { pointerType: 'touch' });
    pointer('pointerdown', { clientX: 700 }); pointer('pointerup');
    pointer('pointerdown'); advance(30); pointer('pointerup');
    advance(70); pointer('pointerdown'); advance(40); pointer('pointerup');
    advance(9860);
    assert.equal(saved().trials.length, 1);
    assert.equal(saved().trials[0].stats.clickCount, 2);
    assert.equal(saved().trials[0].cps, 0.2);
    assert.equal(elements['start-button'].disabled, true, 'rest blocks immediate next round');
    assert.equal(elements['score-A'].textContent, '0.20');
    advance(20000);
    assert.equal(elements['start-button'].disabled, false);
    assert.match(elements['next-device'].textContent, /^B/);
    elements['start-button'].fire('click'); advance(3000);
    pointer('pointerdown'); advance(20); pointer('pointerup');
    windowFixture.fire('blur');
    assert.equal(saved().trials.length, 2);
    assert.equal(saved().trials[1].reason, 'blur');
    assert.equal(elements['score-B'].textContent, '—');
    elements['export-json'].fire('click');
    const json = JSON.parse(await downloads.at(-1).text());
    assert.equal(json.schemaVersion, 2);
    assert.equal(json.summary.A.medianCps, 0.2);
    assert.equal(json.summary.B.roundCount, 0);
    assert.equal(json.trials[0].events.length, 4);
    elements['export-csv'].fire('click');
    assert.match(await downloads.at(-1).text(), /"Test B"/);
    elements['export-image'].fire('click');
    assert.equal(downloads.length, 3);
    // Refresh an in-progress trial; the checkpoint must be recovered as incomplete.
    advance(20000); elements['start-button'].fire('click'); advance(3500);
    pointer('pointerdown'); advance(100); pointer('pointerup');
    windowFixture.fire('pagehide');
    assert.ok(saved().inProgress);
    await import('../src/ab-app.js?refresh-test');
    assert.equal(saved().inProgress, undefined);
    assert.equal(saved().trials.at(-1).reason, 'reload');
    assert.equal(saved().trials.at(-1).completed, false);
    assert.match(elements['next-device'].textContent, /^B/);
    elements['new-button'].fire('click');
    assert.equal(saved().trials.length, 3, 'cancelled reset preserves all data');
  } finally {
    Date.now = originalNow;
    for (const name of names) {
      if (originals[name]) Object.defineProperty(globalThis, name, originals[name]);
      else delete globalThis[name];
    }
  }
});
