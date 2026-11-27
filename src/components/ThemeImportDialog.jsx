import React, { useEffect, useRef, useState } from 'react';
import { MAX_THEME_BYTES, parseThemeZip, validateThemeImages } from '../theme-storage.js';
import { downloadThemeZip, ThemeDownloadError } from '../theme-download.js';
import { saveThemeLocally } from '../theme-database.js';
import { installTheme } from '../creatures.js';
import { Button, ExternalLink, Modal } from './UI.jsx';

export function ThemeImportDialog({ onClose, changeMode }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  async function load(readBytes) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(''); setDownloadUrl('');
    let stage = 'download';
    try {
      const bytes = await readBytes(controller.signal);
      controller.signal.throwIfAborted();
      stage = 'ZIP validation';
      const theme = parseThemeZip(bytes);
      stage = 'image decoding';
      await validateThemeImages(theme);
      controller.signal.throwIfAborted();
      stage = 'IndexedDB persistence';
      await saveThemeLocally(theme);
      // A completed save is still activated if the dialog closed during persistence.
      changeMode(installTheme(theme));
      if (!controller.signal.aborted) onClose();
    } catch (cause) {
      if (controller.signal.aborted) return;
      // Never log shared URLs, resource keys, file contents or user information.
      console.error('[Theme import] Failed', { stage, errorName: cause.name });
      setError(cause.name === 'QuotaExceededError'
        ? 'אין מספיק מקום בדפדפן לשמירת הערכה. הערכה הקודמת נשמרה.' : cause.message);
      if (cause instanceof ThemeDownloadError) setDownloadUrl(cause.downloadUrl);
    } finally {
      if (!controller.signal.aborted) { request.current = null; setBusy(false); }
    }
  }

  function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    load(async () => {
      if (!file.name.toLowerCase().endsWith('.zip') || file.size > MAX_THEME_BYTES) {
        throw new Error('יש לבחור קובץ ZIP בגודל עד 3MB.');
      }
      return new Uint8Array(await file.arrayBuffer());
    });
  }

  return <Modal title="טעינת ערכת נושא" eyebrow="בוחרים עולם חדש" onClose={onClose} className="theme-import-dialog">
    <div className="theme-import-content" aria-busy={busy}>
      <p>קובץ ZIP עד 3MB · נשמר רק בדפדפן הזה · מחליף ערכה שהועלתה</p>
      <form onSubmit={event => { event.preventDefault(); load(signal => downloadThemeZip(url, { signal })); }}>
        <label htmlFor="theme-link">קישור ל-ZIP, Google Drive או Dropbox</label>
        <input id="theme-link" type="url" dir="ltr" required value={url} disabled={busy}
          onChange={event => { setUrl(event.target.value); setError(''); setDownloadUrl(''); }} placeholder="https://…" />
        <p>לקישור שיתוף נדרשת הרשאת צפייה והורדה. אם ההורדה הישירה אינה זמינה, אפשר להוריד את הקובץ ולבחור אותו למטה.</p>
        <Button type="submit" disabled={busy || !url.trim()}>טעינה מהקישור</Button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {downloadUrl && <ExternalLink href={downloadUrl}>הורדת ה-ZIP מהקישור ↗</ExternalLink>}
      <label className="theme-file-input">או בחרו קובץ ZIP מהמכשיר
        <input type="file" accept=".zip,application/zip" disabled={busy} onChange={upload} aria-label="העלאת ערכת נושא" />
      </label>
      {busy && <p role="status">טוענים ובודקים את הערכה…</p>}
    </div>
  </Modal>;
}
