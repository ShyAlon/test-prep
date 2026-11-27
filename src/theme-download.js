import { MAX_THEME_BYTES } from './theme-storage.js';
import { createThemeImportDiagnostics } from './theme-import-diagnostics.js';
import { googleDriveApiRequest } from './google-drive-download.js';

class ThemeLinkError extends Error {
  constructor(message, hint, correction = '') {
    super(message);
    this.hint = hint;
    this.correction = correction;
  }
}
const invalidLink = (hint = 'הדביקו קישור מלא לקובץ ZIP, או קישור שיתוף לקובץ ב-Google Drive או Dropbox.', correction = '') => {
  throw new ThemeLinkError('הקישור אינו תקין. נדרש קישור HTTPS לקובץ ערכת נושא.', hint, correction);
};

export function validateThemeLink(value) {
  try {
    const link = themeDownloadLink(value);
    return { valid: true, hint: `${link.provider} · הקישור תקין במבנה שלו. הרשאות ההורדה ותוכן ה-ZIP ייבדקו בזמן הטעינה.` };
  } catch (error) {
    return { valid: false, message: error.message, hint: error.hint, correction: error.correction };
  }
}

export function themeDownloadLink(value) {
  const input = value.trim();
  if (!input) invalidLink('הדביקו כאן את קישור השיתוף של קובץ הערכה. לדוגמה: https://example.com/theme.zip');
  if (/\s/.test(input)) invalidLink('הקישור מכיל רווחים או מעבר שורה. העתיקו שוב את הקישור המלא באמצעות ״העתקת קישור״.');
  let url;
  try { url = new URL(input); } catch {
    const correction = /^(?:[a-z\d-]+\.)+[a-z]{2,}(?::443)?(?:[/?#]|$)/i.test(input) ? `https://${input}` : '';
    invalidLink(correction ? 'חסרה התחילית https://. אפשר להשתמש בקישור המתוקן למטה.' : undefined, correction);
  }
  if (url.username || url.password) invalidLink('הקישור כולל שם משתמש או סיסמה. השתמשו בקישור שיתוף ללא פרטי התחברות.');
  if (url.protocol === 'http:') {
    url.protocol = 'https:';
    invalidLink('נדרש חיבור מאובטח. אפשר להחליף את http:// ב-https:// באמצעות התיקון למטה.', url.href);
  }
  if (url.protocol !== 'https:') invalidLink('הקישור חייב להתחיל ב-https://. קישורים לקבצים מקומיים אינם מתאימים; בחרו אותם באמצעות בורר הקבצים.');
  if (url.port) invalidLink('הסירו את מספר הפורט והשתמשו בקישור HTTPS רגיל לקובץ.');
  if (!/^(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z\d-]{2,}$/i.test(url.hostname)) invalidLink('חסרה כתובת אתר מלאה, למשל example.com. הדביקו את הקישור המקורי בשלמותו.');
  url.hash = '';
  const host = url.hostname;
  if (host === 'drive.google.com' || host === 'drive.usercontent.google.com') {
    const id = url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/)?.[1] ??
      (['/open', '/uc', '/download'].includes(url.pathname) ? url.searchParams.get('id') : null);
    if (!id || !/^[\w-]{1,200}$/.test(id)) invalidLink('ב-Google Drive יש לבחור את קובץ ה-ZIP עצמו, ואז ״שיתוף״ ← ״העתקת קישור״. קישור לתיקייה או לדף הבית אינו מתאים.');
    const direct = new URL('https://drive.usercontent.google.com/download');
    direct.searchParams.set('id', id);
    direct.searchParams.set('export', 'download');
    const resourceKey = url.searchParams.get('resourcekey');
    if (resourceKey && !/^[\w-]{1,200}$/.test(resourceKey)) invalidLink('מפתח השיתוף של Google Drive אינו תקין. העתיקו מחדש את קישור השיתוף המקורי.');
    if (resourceKey) direct.searchParams.set('resourcekey', resourceKey);
    return { provider: 'Google Drive', url: direct.href, downloadUrl: direct.href };
  }
  if (['dropbox.com', 'www.dropbox.com', 'dl.dropboxusercontent.com'].includes(host)) {
    if (!/^\/(?:s\/[^/]+\/[^/]+|scl\/fi\/[^/]+\/[^/]+)$/.test(url.pathname)) invalidLink('ב-Dropbox יש להעתיק קישור שיתוף לקובץ ה-ZIP עצמו. קישור לתיקייה או לדף הבית אינו מתאים.');
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
  constructor(message, link, reason, diagnosticHint) {
    super(message);
    this.name = 'ThemeDownloadError';
    this.downloadUrl = link.downloadUrl;
    this.reason = reason;
    this.diagnosticHint = diagnosticHint;
  }
}

// Keep shared-link normalization and bounded downloading independent of the UI.
export async function downloadThemeZip(value, { fetch: fetcher = globalThis.fetch, signal, timeoutMs = 20000, diagnostics, logger = console, driveApiKey } = {}) {
  const link = themeDownloadLink(value);
  const request = link.provider === 'Google Drive' ? googleDriveApiRequest(link, driveApiKey) : {
    url: link.url, headers: {}, referrerPolicy: 'no-referrer',
  };
  const trace = diagnostics ?? createThemeImportDiagnostics({ logger });
  trace.stage('download request');
  trace.downloadContext({ ...link, url: request?.url ?? link.url }, { timeoutMs, maxBytes: MAX_THEME_BYTES });
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(() => { timedOut = true; abort(); }, timeoutMs);
  let receivedBytes = 0;
  const tooLarge = reason => Object.assign(new Error('קובץ ערכת הנושא גדול מדי. הגודל המרבי הוא 3MB.'), { reason });
  try {
    if (!request) throw new ThemeDownloadError('ייבוא מ-Google Drive אינו מוגדר כרגע. יש להגדיר מפתח API עבור היישום.', link,
      'drive-api-not-configured', 'Enable the Google Drive API and configure its restricted browser key.');
    const response = await fetcher(request.url, {
      signal: controller.signal, credentials: 'omit', headers: request.headers, referrerPolicy: request.referrerPolicy,
    });
    const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? null;
    const contentLength = response.headers.get('content-length');
    const advertisedBytes = contentLength !== null && Number.isFinite(Number(contentLength)) ? Number(contentLength) : null;
    trace.stage('download response');
    trace.info('Response received', {
      httpStatus: response.status, responseType: response.type,
      redirected: response.redirected, finalHost: response.url ? new URL(response.url).hostname : null,
      contentType: /^[\w.+-]+\/[\w.+-]+$/.test(contentType) ? contentType : null,
      advertisedBytes, maxBytes: MAX_THEME_BYTES,
    });
    if (!response.ok || contentType === 'text/html') {
      await response.body?.cancel();
      const message = link.provider === 'Google Drive' && [401, 403, 404].includes(response.status)
        ? 'לא ניתן לקרוא את הקובץ מ-Google Drive. הגדירו בשיתוף ״כל מי שקיבל את הקישור״ והרשאת צפייה, ואפשרו הורדת הקובץ.'
        : 'לא ניתן להוריד את הקובץ ישירות. ודאו שהקישור מאפשר צפייה והורדה, או הורידו את ה-ZIP ובחרו אותו כאן.';
      throw new ThemeDownloadError(message, link,
        response.ok ? 'html-response' : 'http-error',
        response.ok ? 'The provider returned an HTML page instead of a ZIP (possibly sign-in, permissions, or download confirmation).'
          : `The provider returned HTTP ${response.status}. Check file sharing and download permissions.`);
    }
    if (Number(response.headers.get('content-length')) > MAX_THEME_BYTES) {
      await response.body?.cancel();
      throw tooLarge('advertised-size-limit');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new ThemeDownloadError('ההורדה לא החזירה קובץ. אפשר להוריד את ה-ZIP ולבחור אותו כאן.', link, 'missing-body');
    trace.stage('download body');
    const chunks = [];
    let length = 0;
    try {
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        length += chunk.length;
        receivedBytes = length;
        if (length > MAX_THEME_BYTES) {
          await reader.cancel();
          throw tooLarge('stream-size-limit');
        }
        chunks.push(chunk);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    if (bytes[0] !== 80 || bytes[1] !== 75) {
      throw new ThemeDownloadError('הקישור לא החזיר קובץ ZIP. בדקו את הרשאות השיתוף, או הורידו את ה-ZIP ובחרו אותו כאן.', link, 'not-zip', 'Downloaded bytes do not have a ZIP signature. No response content is logged.');
    }
    trace.info('Download completed', { receivedBytes, zipSignature: true });
    return bytes;
  } catch (error) {
    let failure = error;
    if (signal?.aborted) failure = Object.assign(new DOMException('Theme import cancelled', 'AbortError'), { reason: 'cancelled' });
    else if (error instanceof TypeError || timedOut) {
      failure = new ThemeDownloadError('לא ניתן לטעון את הקישור ישירות בדפדפן. הורידו את ה-ZIP מהקישור ובחרו את הקובץ כאן.', link,
        timedOut ? 'timeout' : 'network-or-cors',
        timedOut ? `Download exceeded ${timeoutMs} ms.`
          : 'The browser did not expose a readable response. CORS, offline, DNS, or TLS failures can look identical to JavaScript. Check the browser Network tab and preceding console errors. Changing deployment origin does not automatically fix provider CORS; use download-and-select if blocked.');
      failure.cause = error;
    }
    trace.info('Download stopped', { receivedBytes, timedOut, cancelled: Boolean(signal?.aborted), fallbackAvailable: failure instanceof ThemeDownloadError });
    if (!diagnostics) trace.failure(failure);
    throw failure;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
