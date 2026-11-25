import test from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { themeFixture } from './fixtures/theme.js';
import { THEME_KEY } from '../src/theme-storage.js';
import { saveThemeLocally, loadLocalTheme } from '../src/theme-database.js';

const theme = themeFixture({ large: true });
function storage() {
  const entries = new Map([['saved-progress', 'keep me'], [THEME_KEY, JSON.stringify(theme)]]);
  return { getItem: key => entries.get(key) ?? null, removeItem: key => entries.delete(key) };
}

test('large theme pack saves and reloads in IndexedDB without writing to localStorage', async () => {
  const database = new IDBFactory();
  const legacy = storage();
  legacy.setItem = () => { throw new DOMException('full', 'QuotaExceededError'); };
  await saveThemeLocally(theme, database, legacy);
  assert.equal(legacy.getItem(THEME_KEY), null);
  assert.equal(legacy.getItem('saved-progress'), 'keep me');
  assert.deepEqual(await loadLocalTheme(database, legacy), JSON.parse(JSON.stringify(theme)));
  const replacement = structuredClone(theme);
  replacement.manifest.name = 'Replacement';
  await saveThemeLocally(replacement, database, legacy);
  assert.equal((await loadLocalTheme(database, legacy)).manifest.name, 'Replacement');
});

test('failed IndexedDB writes preserve the old pack and account data', async () => {
  const database = new IDBFactory();
  const legacy = storage();
  await saveThemeLocally(theme, database, legacy);
  const replacement = structuredClone(theme);
  replacement.manifest.name = 'Must not survive aborted transaction';
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (...args) {
    const request = put.apply(this, args);
    this.transaction.abort();
    return request;
  };
  try { await assert.rejects(saveThemeLocally(replacement, database, legacy)); }
  finally { IDBObjectStore.prototype.put = put; }
  assert.equal((await loadLocalTheme(database, legacy)).manifest.name, theme.manifest.name);
  assert.equal(legacy.getItem('saved-progress'), 'keep me');
});

test('unavailable IndexedDB falls back to legacy reads and does not delete anything on save failure', async () => {
  const legacy = storage();
  assert.deepEqual(await loadLocalTheme(null, legacy), JSON.parse(JSON.stringify(theme)));
  await assert.rejects(saveThemeLocally(theme, null, legacy), /unavailable/);
  assert.ok(legacy.getItem(THEME_KEY));
  assert.equal(legacy.getItem('saved-progress'), 'keep me');
});
