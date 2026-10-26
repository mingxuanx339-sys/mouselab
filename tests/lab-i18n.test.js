import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { messages, LANGS } from '../src/i18n.js';
import { LAB } from '../src/lab-i18n.js';

test('lab strings exist in every language with matching placeholders', () => {
  const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  for (const [key, values] of Object.entries(LAB)) {
    assert.equal(values.length, 3, `${key} needs zh/en/ja`);
    for (const lang of Object.keys(LANGS)) {
      assert.ok(messages[lang][key]?.trim(), `${lang}.${key} empty`);
      assert.equal(ph(messages[lang][key]), ph(values[0]), `${lang}.${key} placeholders`);
    }
  }
});

test('every key used by lab.html and lab-app.js is translated', async () => {
  const html = await readFile(new URL('../lab.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/lab-app.js', import.meta.url), 'utf8');
  const used = new Set([...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) for (const pair of m[1].split(';')) used.add(pair.split(':')[1]);
  for (const m of app.matchAll(/\bt\('(\w+)'/g)) used.add(m[1]);
  for (const m of app.matchAll(/(?:setStatus|setMsg)\(\d, '(\w+)'/g)) used.add(m[1]);
  for (const m of app.matchAll(/'(method\w+|raw(?:Yes|No)|dir(?:Up|Down)|st(?:Idle|Run|Done|Wait))'/g)) used.add(m[1]);
  for (const key of used) assert.ok(key in messages.zh, `missing key: ${key}`);
  assert.doesNotMatch(app, /[一-鿿]/, 'lab-app.js should hold no hard-coded Chinese');
});
