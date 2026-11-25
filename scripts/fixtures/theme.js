import { zipSync, strToU8 } from 'fflate';
import { parseThemeZip } from '../../src/theme-storage.js';

// Tiny inline raster fixtures keep tests independent of generated/private packs.
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH1sAAAAASUVORK5CYII=', 'base64'));
const gif = Uint8Array.from(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
export function themeFixture({ large = false } = {}) {
  const manifest = {
    version: 1, id: 'fixture', name: 'Fixture', description: 'Test theme', avatar: 'friend', companion: 'epic',
    testImages: { incomplete: 'closed.png', completed: 'open.gif' },
    testImages: { incomplete: 'test-closed.png', completed: 'test-open.png' },
    creatures: [
      { id:'friend', name:'Friend', english:'Friend', color:'grass', rarity:'standard', image:'closed.png', animation:'open.gif',
        evolution:{name:'Evolved friend',english:'Evolved friend',image:'closed.png'} },
      { id:'epic', name:'Epic', english:'Epic', color:'water', rarity:'epic', image:'closed.png' },
      { id:'legendary', name:'Legendary', english:'Legendary', color:'fire', rarity:'legendary', image:'closed.png' },
    ],
  };
  const files = { 'theme.json':strToU8(JSON.stringify(manifest)), 'closed.png':png, 'open.gif':gif,
    'test-closed.png':Uint8Array.from([...png, 1]), 'test-open.png':Uint8Array.from([...png, 2]) };
  if (large) {
    const padded = new Uint8Array(2_800_000);
    padded.set(png);
    files['padded.png'] = padded;
  }
  return parseThemeZip(zipSync(files));
}
