import { elements, assignCombat, combatLimits } from './combat-rules.js';
import { unzipSync } from 'fflate';

export const THEME_KEY = 'gifted.local-theme.v1';
export const MAX_THEME_BYTES = 3 * 1024 * 1024;
const fail = () => { throw new Error('קובץ ערכת הנושא אינו תקין. נדרש ZIP עם theme.json ותמונות מקומיות בלבד (עד 3MB).'); };
const safePath = path => typeof path === 'string' && /^[a-zA-Z0-9_./-]+$/.test(path) && !path.startsWith('/') && !path.split('/').some(part => part === '..' || part === '.');
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 160;
const colors = ['grass', 'fire', 'water', 'air', 'electric', 'psychic', 'earth', 'fairy'];
const rarities = ['standard', 'epic', 'legendary', 'mythical'];
function validateManifest(m, assets) {
  if (!m || m.version !== 1 || !/^[a-z0-9-]{1,40}$/.test(m.id) || !text(m.name) || !text(m.description) || !Array.isArray(m.creatures) || !m.creatures.length || m.creatures.length > 200) fail();
  const ids = new Set();
  const image = path => { if (!safePath(path) || !Object.hasOwn(assets, path)) fail(); };
  function validateCombat(c) {
    if(c.element !== undefined && !Object.hasOwn(elements,c.element)) fail();
    for(const [field,[min,max]] of Object.entries(combatLimits)) if(c[field] !== undefined && (!Number.isInteger(c[field]) || c[field]<min || c[field]>max)) fail();
  }
  for (const c of m.creatures) {
    validateCombat(c);
    if (!/^[a-z0-9-]{1,50}$/.test(c.id) || ids.has(c.id) || !text(c.name) || !text(c.english) || !colors.includes(c.color) || !rarities.includes(c.rarity)) fail();
    ids.add(c.id); image(c.image);
    if (c.encounter !== undefined && typeof c.encounter !== 'boolean') fail();
    if (c.number !== undefined && (!Number.isInteger(c.number) || c.number < 1 || c.number > 9999)) fail();
    if (c.animation) image(c.animation);
    if (c.evolution) {
      validateCombat(c.evolution);
      if (!text(c.evolution.name) || !text(c.evolution.english)) fail();
      image(c.evolution.image);
      if (c.evolution.animation) image(c.evolution.animation);
    }
  }
  if (!m.creatures.some(c => c.encounter !== false)) fail();
  for (const field of ['singular', 'plural', 'mark', 'tagline']) if (m[field] !== undefined && !text(m[field])) fail();
  if (m.mark !== undefined && m.mark !== 'ball') fail();
  if (!ids.has(m.avatar) || !ids.has(m.companion)) fail();
  if (m.icon) image(m.icon);
  if (m.testImages !== undefined) {
    if (!m.testImages || typeof m.testImages !== 'object') fail();
    image(m.testImages.incomplete);
    image(m.testImages.completed);
  }
  if (m.brand !== undefined && !text(m.brand)) fail();
  if (m.hero !== undefined && !text(m.hero)) fail();
  return { manifest: m, assets };
}
function mime(bytes) {
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return 'image/png';
  if (String.fromCharCode(...bytes.subarray(0, 6)).match(/^GIF8[79]a$/)) return 'image/gif';
  if (String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP') return 'image/webp';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  fail();
}
export function parseThemeZip(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length > MAX_THEME_BYTES || bytes[0] !== 80 || bytes[1] !== 75) fail();
  let total = 0, count = 0;
  const paths = new Set();
  let files;
  try {
    files = unzipSync(bytes, { filter: entry => {
      if (paths.has(entry.name)) fail();
      paths.add(entry.name);
      if (!safePath(entry.name) || ++count > 450 || entry.originalSize > MAX_THEME_BYTES || (total += entry.originalSize) > MAX_THEME_BYTES) fail();
      return true;
    }});
  } catch { fail(); }
  let manifest;
  try { manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(files['theme.json'])); } catch { fail(); }
  const assets = Object.create(null);
  for (const [path, data] of Object.entries(files)) {
    if (path === 'theme.json' || path.endsWith('/') || path === 'README.txt') continue;
    const type = mime(data);
    let binary = '';
    for (let i = 0; i < data.length; i += 8192) binary += String.fromCharCode(...data.subarray(i, i + 8192));
    assets[path] = `data:${type};base64,${btoa(binary)}`;
  }
  const theme=validateManifest(manifest, assets);
  return {...theme,manifest:{...theme.manifest,creatures:assignCombat(theme.manifest.creatures,Math.random)}};
}
// Read-only compatibility for themes saved before IndexedDB became the sole writer.
export function readTheme(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(THEME_KEY);
    if (!raw || raw.length > MAX_THEME_BYTES * 1.4) return null;
    const theme = JSON.parse(raw);
    if (!theme.assets || Object.values(theme.assets).some(value => typeof value !== 'string' || !/^data:image\/(png|gif|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(value))) return null;
    const valid=validateManifest(theme.manifest, theme.assets);
    return {...valid,manifest:{...valid.manifest,creatures:assignCombat(valid.manifest.creatures)}};
  } catch { return null; }
}

// Decode before saving, so a file with a forged image header cannot become an installed pack.
export async function validateThemeImages(theme) {
  for (const source of Object.values(theme.assets)) {
    const image = new Image();
    image.src = source;
    try { await image.decode(); } catch { fail(); }
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > 2048 || image.naturalHeight > 2048) fail();
  }
  return theme;
}
