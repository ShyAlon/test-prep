import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { readFileSync } from 'node:fs';
import { parseThemeZip, persistTheme, readTheme, THEME_KEY, MAX_THEME_BYTES } from '../src/theme-storage.js';
import { fixedTests, createAttempt, generatedOnlyGame } from '../src/model.js';
import { installTheme, creatureCard, chooseEncounter, companionFor } from '../src/creatures.js';

const image = Uint8Array.from([137,80,78,71,13,10,26,10]);
const manifest = () => ({ version: 1, id: 'test', name: 'Test', description: 'A test theme', avatar: 'one', companion: 'one', creatures: [{ id: 'one', name: 'One', english: 'One', color: 'grass', rarity: 'standard', image: 'one.png' }] });
const zip = (m = manifest(), extra = {}) => zipSync({ 'theme.json': strToU8(JSON.stringify(m)), 'one.png': image, ...extra });
const memory = () => { const values = new Map(); return { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v) }; };

test('five fixed snapshots keep questions and choice order across dates and themes, and survive reload', () => {
  assert.equal(fixedTests.length, 5);
  const signatures = new Set();
  for (const test of fixedTests) {
    const first = createAttempt(10, 1, 'srd', test.id);
    const second = createAttempt(100, Date.now(), 'animals', test.id);
    assert.equal(first.rounds.length, 30);
    assert.deepEqual(first.rounds.map(r=>r.question), second.rounds.map(r=>r.question));
    signatures.add(JSON.stringify(first.rounds.map(r=>r.question)));
    const game = generatedOnlyGame(JSON.parse(JSON.stringify({ active: first, history: [{ ...second, finishedAt: 2 }] })));
    assert.equal(game.active.testId, test.id);
    assert.equal(game.history[0].testId, test.id);
  }
  assert.equal(signatures.size, 5);
});

test('ZIP validation rejects remote assets, traversal, executable files, invalid references and oversized expansion', () => {
  assert.throws(()=>parseThemeZip(new Uint8Array([1,2,3])));
  assert.throws(()=>parseThemeZip(zipSync({'theme.json':strToU8('{}')})));
  const remote=manifest(); remote.creatures[0].image='https://example.com/one.png';
  assert.throws(()=>parseThemeZip(zip(remote)));
  assert.throws(()=>parseThemeZip(zip(manifest(),{'../evil.png':image})));
  assert.throws(()=>parseThemeZip(zip(manifest(),{'evil.svg':strToU8('<svg onload="alert(1)"/>')})));
  assert.throws(()=>parseThemeZip(zip(manifest(),{'huge.png':new Uint8Array(MAX_THEME_BYTES+1)})));
  const missingTestImage=manifest(); missingTestImage.testImages={incomplete:'one.png',completed:'missing.png'};
  assert.throws(()=>parseThemeZip(zip(missingTestImage)));
  const duplicate=manifest();duplicate.creatures.push(duplicate.creatures[0]);assert.throws(()=>parseThemeZip(zip(duplicate)));
});

test('theme persistence is separate from profile data and failed writes preserve the existing theme', () => {
  const storage=memory();const theme=parseThemeZip(zip());persistTheme(theme,storage);
  assert.deepEqual(JSON.parse(JSON.stringify(readTheme(storage))), JSON.parse(JSON.stringify(theme)));
  const before=storage.getItem(THEME_KEY);
  assert.throws(()=>persistTheme(theme,{setItem(){throw new DOMException('full','QuotaExceededError');}}));
  assert.equal(storage.getItem(THEME_KEY),before);
  storage.setItem(THEME_KEY,JSON.stringify({...theme,assets:{'one.png':'https://example.com/one.png'}}));
  assert.equal(readTheme(storage),null);
});

test('Pokémon pack restores the roster, local animations, rarity tiers and two-catch evolutions', () => {
  const theme=parseThemeZip(new Uint8Array(readFileSync(new URL('../artifacts/pokemon-theme.zip',import.meta.url))));
  assert.equal(theme.manifest.creatures.length,116);
  const mode=installTheme(theme);
  const base=creatureCard(`${mode}:25`,1), evolved=creatureCard(`${mode}:25`,2);
  assert.equal(base.name,'Pikachu');assert.equal(evolved.name,'Raichu');assert.ok(evolved.evolved);
  assert.match(base.image,/^data:image\/webp/); assert.match(base.animation,/^data:image\/webp/);
  for (const [roll, rarities] of [[0,['legendary','mythical']],[0.1,['epic']],[0.9,['standard']]]) {
    let calls=0;const id=chooseEncounter(()=>calls++ ? 0 : roll,null,mode);
    assert.ok(rarities.includes(creatureCard(id).rarity));
  }
  const attempt=createAttempt(10,123,mode);
  assert.equal(companionFor(attempt.rounds[0],mode,String(attempt.id)),attempt.rounds[0].creature);
  const storage=memory();persistTheme(theme,storage);assert.ok(readTheme(storage));
});

test('missing local packs preserve earned IDs for a later reimport', () => {
  const id='local-missing:one';
  const game=generatedOnlyGame({ history: [], creatureMode:'local-missing', collection:{[id]:2} });
  assert.equal(game.collection[id],2);
  assert.equal(creatureCard(id).mode,'local-missing');
});

test('fixed test tiles show completion only for finished saved tests', async () => {
  const {createServer}=await import('vite');
  const React=(await import('react')).default;
  const {renderToStaticMarkup}=await import('react-dom/server');
  const server=await createServer({server:{middlewareMode:true,ws:false,watch:null},appType:'custom',logLevel:'error'});
  try {
    const {Home}=await server.ssrLoadModule('/src/components/Home.jsx');
    const finished={...createAttempt(30,1,'srd','fixed-1'),finishedAt:2};
    const active=createAttempt(30,3,'srd','fixed-2');
    const html=renderToStaticMarkup(React.createElement(Home,{game:{history:[finished],active},start(){}}));
    assert.equal((html.match(/✓ הושלם/g)??[]).length,1);
    assert.equal((html.match(/בתהליך/g)??[]).length,1);
    assert.equal((html.match(/טרם הושלם/g)??[]).length,3);
    const theme = parseThemeZip(new Uint8Array(readFileSync(new URL('../artifacts/pokemon-theme.zip',import.meta.url))));
    const creatures = await server.ssrLoadModule('/src/creatures.js');
    const mode = creatures.installTheme(theme);
    const themed = renderToStaticMarkup(React.createElement(Home,{mode,game:{history:[finished],active},start(){}}));
    const completedImage = theme.assets[theme.manifest.testImages.completed];
    const incompleteImage = theme.assets[theme.manifest.testImages.incomplete];
    assert.notEqual(completedImage, incompleteImage);
    assert.equal(themed.split(completedImage).length - 1, 1);
    assert.equal(themed.split(incompleteImage).length - 1, 4);
    const {HelpDialog} = await server.ssrLoadModule('/src/components/Dialogs.jsx');
    const help = renderToStaticMarkup(React.createElement(HelpDialog,{close(){}}));
    assert.match(help,/העלאת ערכת נושא/);
    assert.match(help,/ZIP/);
    assert.match(help,/אינה נשלחת לשרת/);
  } finally {await server.close();}
});
