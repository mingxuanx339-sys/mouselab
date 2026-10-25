import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { messages, LANGS } from '../src/i18n.js';

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('every language defines the same non-empty keys and placeholders', () => {
  const keys = Object.keys(messages.zh);
  for (const lang of Object.keys(LANGS)) {
    assert.deepEqual(Object.keys(messages[lang]), keys, `${lang} key mismatch`);
    for (const key of keys) {
      assert.ok(messages[lang][key].trim(), `${lang}.${key} is empty`);
      assert.equal(placeholders(messages[lang][key]), placeholders(messages.zh[key]), `${lang}.${key} placeholders differ`);
    }
  }
});

test('every data-i18n key used in index.html and every t() key in the app exists', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../src/ab-app.js', import.meta.url), 'utf8');
  const used = new Set([...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) for (const pair of m[1].split(';')) used.add(pair.split(':')[1]);
  for (const m of app.matchAll(/\bt\('(\w+)'/g)) used.add(m[1]);
  for (const m of app.matchAll(/\? '(\w+Aria)' : '(\w+Aria)'|'(warn\w+)'/g)) m.slice(1).filter(Boolean).forEach((key) => used.add(key));
  for (const key of used) assert.ok(key in messages.zh, `missing translation key: ${key}`);
  assert.doesNotMatch(app, /[\u4e00-\u9fff]/, 'ab-app.js should hold no hard-coded Chinese');
});
