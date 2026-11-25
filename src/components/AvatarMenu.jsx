import React, { useEffect, useRef, useState } from 'react';
import { parseThemeZip, validateThemeImages } from '../theme-storage.js';
import { saveThemeLocally } from '../theme-database.js';
import { installTheme, creatureCard, creatureModes, creaturesForMode } from '../creatures.js';

export function AvatarMenu({ user, mode, changeMode }) {
  const menu = useRef(null);
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploadError(''); setUploading(true);
    const startedAt = performance.now();
    let stage = 'file validation';
    console.info('[Theme upload] Started', { zipBytes: file.size, mimeType: file.type });
    try {
      if (!file.name.toLowerCase().endsWith('.zip') || file.size > 3 * 1024 * 1024) throw new Error('יש לבחור קובץ ZIP בגודל עד 3MB.');
      stage = 'ZIP parsing and manifest validation';
      const theme = parseThemeZip(new Uint8Array(await file.arrayBuffer()));
      console.info('[Theme upload] ZIP validated', {
        creatureCount: theme.manifest.creatures.length,
        imageCount: Object.keys(theme.assets).length,
      });
      stage = 'image decoding';
      await validateThemeImages(theme);
      console.info('[Theme upload] Images decoded');
      stage = 'IndexedDB persistence';
      await saveThemeLocally(theme);
      stage = 'theme activation';
      changeMode(installTheme(theme));
      console.info('[Theme upload] Completed', { elapsedMs: Math.round(performance.now() - startedAt) });
      menu.current.open = false;
    } catch (error) {
      console.error('[Theme upload] Failed', {
        stage, errorName: error.name, errorMessage: error.message,
        elapsedMs: Math.round(performance.now() - startedAt),
      }, error);
      setUploadError(error.name === 'QuotaExceededError' ? 'אין מספיק מקום בדפדפן לשמירת הערכה. הערכה הקודמת נשמרה.' : error.message);
    } finally { setUploading(false); }
  }
  useEffect(() => {
    const closeOutside = (event) => {
      if (!menu.current?.contains(event.target) && menu.current) menu.current.open = false;
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);
  return (
    <details
      ref={menu}
      className="avatar-menu"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          menu.current.open = false;
          menu.current.querySelector('summary').focus();
        }
      }}
    >
      <summary aria-label="תפריט אווטאר ובחירת עולם">
        <img alt="" src={creatureCard(creatureModes[mode].avatar).image} />
        <span className="account-name" title={user.email ?? user.displayName ?? ''}>
          {user.displayName || user.email || 'מאמן'}
        </span>
        <span aria-hidden="true">⌄</span>
      </summary>
      <fieldset className="avatar-options">
        <legend>באיזה עולם מתאמנים?</legend>
        {Object.entries(creatureModes).map(([id, item]) => (
          <label key={id}>
            <input
              type="radio"
              name="creature-mode"
              aria-label={item.name}
              value={id}
              checked={mode === id}
              onChange={() => {
                changeMode(id);
                menu.current.open = false;
              }}
            />
            <img alt="" src={creatureCard(item.avatar).image} />
            <span>
              <strong>{item.name}</strong>
              <small>
                {item.description} · {creaturesForMode(id).length} יצורים
              </small>
            </span>
          </label>
        ))}
        <label className="theme-upload">
          <span><strong>{uploading ? 'טוענים ערכה…' : 'העלאת ערכת נושא'}</strong><small>ZIP עד 3MB · נשמר רק בדפדפן הזה · מחליף ערכה שהועלתה</small></span>
          <input type="file" accept=".zip,application/zip" disabled={uploading} onChange={upload} aria-label="העלאת ערכת נושא" />
        </label>
        {uploadError && <p role="alert">{uploadError}</p>}
        <p>האוסף נשמר בנפרד לכל עולם. תשובות ותוצאות נשארות כמו שהן.</p>
      </fieldset>
    </details>
  );
}
