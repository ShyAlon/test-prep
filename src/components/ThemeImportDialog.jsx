import React, { useEffect, useRef, useState } from 'react';
import { MAX_THEME_BYTES, parseThemeZip, validateThemeImages } from '../theme-storage.js';
import { downloadThemeZip, ThemeDownloadError, validateThemeLink } from '../theme-download.js';
import { saveThemeLocally } from '../theme-database.js';
import { installTheme } from '../creatures.js';
import { createThemeImportDiagnostics } from '../theme-import-diagnostics.js';
import { Button, ExternalLink, Modal } from './UI.jsx';

export function ThemeImportDialog({ onClose, changeMode }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [urlTouched, setUrlTouched] = useState(false);
  const linkInput = useRef(null);
  const validation = validateThemeLink(url);
  const showUrlError = (urlTouched || url.length > 0) && !validation.valid;
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  async function load(readBytes, source = 'file') {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(''); setDownloadUrl('');
    const diagnostics = createThemeImportDiagnostics({ source });
    if (source === 'file') diagnostics.stage('file read');
    try {
      const bytes = await readBytes(controller.signal, diagnostics);
      controller.signal.throwIfAborted();
      diagnostics.info('Input ready', { zipBytes: bytes.length, maxBytes: MAX_THEME_BYTES });
      diagnostics.stage('ZIP validation');
      const theme = parseThemeZip(bytes);
      diagnostics.info('ZIP validated', { creatureCount: theme.manifest.creatures.length, imageCount: Object.keys(theme.assets).length });
      diagnostics.stage('image decoding');
      await validateThemeImages(theme);
      controller.signal.throwIfAborted();
      diagnostics.info('Images decoded');
      diagnostics.stage('IndexedDB persistence');
      await saveThemeLocally(theme);
      diagnostics.info('Theme saved');
      diagnostics.stage('theme activation');
      // A completed save is still activated if the dialog closed during persistence.
      changeMode(installTheme(theme));
      diagnostics.info('Completed');
      if (!controller.signal.aborted) onClose();
    } catch (cause) {
      if (controller.signal.aborted) {
        diagnostics.failure(Object.assign(new DOMException('Theme import cancelled', 'AbortError'), { reason: 'cancelled' }));
        return;
      }
      diagnostics.failure(cause);
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
    load(async (_signal, diagnostics) => {
      diagnostics.info('File selected', { fileBytes: file.size, zipExtension: file.name.toLowerCase().endsWith('.zip'), maxBytes: MAX_THEME_BYTES });
      if (!file.name.toLowerCase().endsWith('.zip') || file.size > MAX_THEME_BYTES) {
        throw new Error('יש לבחור קובץ ZIP בגודל עד 3MB.');
      }
      return new Uint8Array(await file.arrayBuffer());
    });
  }

  return <Modal title="טעינת ערכת נושא" eyebrow="בוחרים עולם חדש" onClose={onClose} className="theme-import-dialog">
    <div className="theme-import-content" aria-busy={busy}>
      <p>קובץ ZIP עד 3MB · נשמר רק בדפדפן הזה · מחליף ערכה שהועלתה</p>
      <form noValidate onSubmit={event => {
        event.preventDefault();
        setUrlTouched(true);
        if (!validation.valid) { linkInput.current?.focus(); return; }
        load((signal, diagnostics) => downloadThemeZip(url, { signal, diagnostics }), 'url');
      }}>
        <label htmlFor="theme-link">קישור ל-ZIP, Google Drive או Dropbox</label>
        <input ref={linkInput} id="theme-link" type="url" dir="ltr" required value={url} disabled={busy}
          aria-invalid={showUrlError} aria-describedby={`theme-link-hint${showUrlError ? ' theme-link-error' : ''}`}
          onBlur={() => setUrlTouched(true)}
          onChange={event => { setUrl(event.target.value); setError(''); setDownloadUrl(''); }} placeholder="https://…" />
        {showUrlError && <div id="theme-link-error" className="error" role="alert">
          <p>{validation.message}</p>
          {validation.correction && <Button variant="text" className="theme-link-correction" onClick={() => {
            setUrl(validation.correction); setError(''); setDownloadUrl(''); linkInput.current?.focus();
          }}>שימוש בקישור המתוקן: <bdi dir="ltr">{validation.correction}</bdi></Button>}
        </div>}
        <p id="theme-link-hint">{url.trim() || urlTouched ? validation.hint : 'הדביקו קישור מלא שמתחיל ב-https://, או קישור שיתוף לקובץ ZIP ב-Google Drive או Dropbox.'}</p>
        <p>ב-Google Drive הגדירו ״כל מי שקיבל את הקישור״ עם הרשאת צפייה והורדה. אפשר גם לבחור קובץ ZIP מהמכשיר.</p>
        <Button type="submit" disabled={busy}>טעינה מהקישור</Button>
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
