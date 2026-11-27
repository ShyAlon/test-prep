import React, { useRef, useState } from 'react';
import { Button } from './UI.jsx';
import { Dropdown } from './Dropdown.jsx';
import { ThemeImportDialog } from './ThemeImportDialog.jsx';
import { creatureCard, creatureModes, creaturesForMode } from '../creatures.js';

export function AvatarMenu({ user, mode, changeMode, label }) {
  const menu = useRef(null);
  const [importOpen, setImportOpen] = useState(false);
  return (
    <>
    <Dropdown ref={menu} className="avatar-menu" label={label ?? 'תפריט אווטאר ובחירת עולם'} summary={<>
        <img alt="" src={creatureCard(creatureModes[mode].avatar).image} />
        <span className={label ? undefined : 'account-name'} title={label ? undefined : user.email ?? user.displayName ?? ''}>
          {label ?? (user.displayName || user.email || 'מאמן')}
        </span>
        <span aria-hidden="true">⌄</span>
      </>}>
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
        <Button variant="text" className="theme-upload" aria-haspopup="dialog" onClick={() => {
          menu.current.open = false;
          menu.current.querySelector('summary').focus();
          setImportOpen(true);
        }}>טעינת ערכת נושא · ZIP או קישור</Button>
        <p>האוסף נשמר בנפרד לכל עולם. תשובות ותוצאות נשארות כמו שהן.</p>
      </fieldset>
    </Dropdown>
    {importOpen && <ThemeImportDialog onClose={() => setImportOpen(false)} changeMode={changeMode} />}
    </>
  );
}
