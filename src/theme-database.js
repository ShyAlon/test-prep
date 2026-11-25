import { THEME_KEY, readTheme } from './theme-storage.js';

const DATABASE = 'gifted-local-themes';
const STORE = 'themes';
const CURRENT = 'current';

function themeTransaction(mode, action, indexedDB = globalThis.indexedDB) {
  return new Promise((resolve, reject) => {
    if (!indexedDB) return reject(new Error('IndexedDB is unavailable in this browser'));
    const opening = indexedDB.open(DATABASE, 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore(STORE);
    let abandoned = false;
    const timeout = setTimeout(() => {
      abandoned = true;
      reject(new Error('Theme storage did not respond within 10 seconds'));
    }, 10000);
    opening.onsuccess = () => {
      const database = opening.result;
      if (abandoned) { database.close(); return; }
      let transaction;
      try {
        transaction = database.transaction(STORE, mode);
        const request = action(transaction.objectStore(STORE));
        transaction.oncomplete = () => { clearTimeout(timeout); database.close(); resolve(request.result); };
        transaction.onabort = transaction.onerror = () => {
          clearTimeout(timeout); database.close(); reject(transaction.error ?? request.error ?? new Error('Theme storage transaction failed'));
        };
      } catch (error) {
        clearTimeout(timeout); database.close(); reject(error);
      }
    };
    // Clear the timer on open errors too; callers must be able to continue without storage.
    opening.onerror = () => { clearTimeout(timeout); reject(opening.error); };
    opening.onblocked = () => { abandoned = true; clearTimeout(timeout); reject(new Error('Theme storage is blocked by another browser tab')); };
  });
}

function validatedTheme(theme) {
  // Reuse validation for saved themes, including data URLs and size limits.
  const serialized = JSON.stringify(theme);
  const validated = readTheme({ getItem: () => serialized });
  if (!validated) throw new Error('Invalid saved theme');
  return validated;
}

export async function saveThemeLocally(theme, indexedDB = globalThis.indexedDB, storage = undefined) {
  const validated = validatedTheme(theme);
  console.info('[Theme upload] Saving to IndexedDB', {
    imageCount: Object.keys(validated.assets).length,
    payloadCharacters: JSON.stringify(validated).length,
  });
  try {
    await themeTransaction('readwrite', store => store.put(validated, CURRENT), indexedDB);
    console.info('[Theme upload] IndexedDB save committed');
  } catch (error) {
    console.error('[Theme upload] IndexedDB save failed', { errorName: error.name, errorMessage: error.message }, error);
    // Do not activate an unsaved theme or modify the previous saved pack.
    throw error;
  }
  try { (storage ?? globalThis.localStorage)?.removeItem(THEME_KEY); }
  catch (error) { console.warn('[Theme upload] Could not remove the legacy localStorage copy', error.name); }
}

export async function loadLocalTheme(indexedDB = globalThis.indexedDB, storage = undefined) {
  try {
    const theme = await themeTransaction('readonly', store => store.get(CURRENT), indexedDB);
    if (theme) {
      const validated = validatedTheme(theme);
      console.info('[Theme upload] Restored theme from IndexedDB');
      return validated;
    }
  } catch (error) {
    console.warn('[Theme upload] Could not restore IndexedDB theme; checking legacy localStorage', { errorName: error.name, errorMessage: error.message });
  }
  try { return readTheme(storage ?? globalThis.localStorage); }
  catch { return null; }
}
