import { MAX_THEME_BYTES } from './theme-storage.js';

const invalidLink = () => { throw new Error('יש להזין קישור HTTPS לקובץ ZIP, או קישור שיתוף לקובץ ב-Google Drive או Dropbox.'); };

export function themeDownloadLink(value) {
  let url;
  try { url = new URL(value.trim()); } catch { invalidLink(); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) invalidLink();
  url.hash = '';
  const host = url.hostname;
  if (host === 'drive.google.com' || host === 'drive.usercontent.google.com') {
    const id = url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/)?.[1] ??
      (['/open', '/uc', '/download'].includes(url.pathname) ? url.searchParams.get('id') : null);
    if (!id || !/^[\w-]{1,200}$/.test(id)) invalidLink();
    const direct = new URL('https://drive.usercontent.google.com/download');
    direct.searchParams.set('id', id);
    direct.searchParams.set('export', 'download');
    const resourceKey = url.searchParams.get('resourcekey');
    if (resourceKey) direct.searchParams.set('resourcekey', resourceKey);
    return { provider: 'Google Drive', url: direct.href, downloadUrl: direct.href };
  }
  if (['dropbox.com', 'www.dropbox.com', 'dl.dropboxusercontent.com'].includes(host)) {
    if (!/^\/(?:s\/[^/]+\/[^/]+|scl\/fi\/[^/]+\/[^/]+)$/.test(url.pathname)) invalidLink();
    url.hostname = 'www.dropbox.com';
    url.searchParams.delete('raw');
    url.searchParams.set('dl', '1');
    const downloadUrl = url.href;
    url.hostname = 'dl.dropboxusercontent.com';
    url.searchParams.delete('dl');
    return { provider: 'Dropbox', url: url.href, downloadUrl };
  }
  return { provider: 'קישור ישיר', url: url.href, downloadUrl: url.href };
}

export class ThemeDownloadError extends Error {
  constructor(message, link) {
    super(message);
    this.name = 'ThemeDownloadError';
    this.downloadUrl = link.downloadUrl;
  }
}

// Keep shared-link normalization and bounded downloading independent of the UI.
export async function downloadThemeZip(value, { fetch: fetcher = globalThis.fetch, signal, timeoutMs = 20000 } = {}) {
  const link = themeDownloadLink(value);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(abort, timeoutMs);
  const tooLarge = () => new Error('קובץ ערכת הנושא גדול מדי. הגודל המרבי הוא 3MB.');
  try {
    const response = await fetcher(link.url, {
      signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer',
    });
    if (!response.ok || response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
      throw new ThemeDownloadError('לא ניתן להוריד את הקובץ ישירות. ודאו שהקישור מאפשר צפייה והורדה, או הורידו את ה-ZIP ובחרו אותו כאן.', link);
    }
    if (Number(response.headers.get('content-length')) > MAX_THEME_BYTES) {
      await response.body?.cancel();
      throw tooLarge();
    }
    const reader = response.body?.getReader();
    if (!reader) throw new ThemeDownloadError('ההורדה לא החזירה קובץ. אפשר להוריד את ה-ZIP ולבחור אותו כאן.', link);
    const chunks = [];
    let length = 0;
    try {
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        length += chunk.length;
        if (length > MAX_THEME_BYTES) {
          await reader.cancel();
          throw tooLarge();
        }
        chunks.push(chunk);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    if (bytes[0] !== 80 || bytes[1] !== 75) {
      throw new ThemeDownloadError('הקישור לא החזיר קובץ ZIP. בדקו את הרשאות השיתוף, או הורידו את ה-ZIP ובחרו אותו כאן.', link);
    }
    return bytes;
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Theme import cancelled', 'AbortError');
    if (error instanceof TypeError || controller.signal.aborted) {
      throw new ThemeDownloadError('לא ניתן לטעון את הקישור ישירות בדפדפן. הורידו את ה-ZIP מהקישור ובחרו את הקובץ כאן.', link);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
