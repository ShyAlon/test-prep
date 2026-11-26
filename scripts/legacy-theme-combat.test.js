import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {IDBFactory} from 'fake-indexeddb';
import {themeFixture} from './fixtures/theme.js';
import {assignCombat,combatLimits,elements} from '../src/combat-rules.js';
import {parseThemeZip,readTheme} from '../src/theme-storage.js';
import {saveThemeLocally,loadLocalTheme} from '../src/theme-database.js';
import {installTheme,creatureCard} from '../src/creatures.js';
import {createAttempt} from '../src/model.js';
import {createBattle,finishBattle} from '../src/battle.js';

function oldTheme() {
  const theme=themeFixture();
  for(const c of theme.manifest.creatures)for(const field of ['attack','defense','health','element']) {
    delete c[field];if(c.evolution)delete c.evolution[field];
  }
  return theme;
}
function oldZip(theme) {
  const files={'theme.json':strToU8(JSON.stringify(theme.manifest))};
  for(const [path,uri]of Object.entries(theme.assets))files[path]=new Uint8Array(Buffer.from(uri.split(',')[1],'base64'));
  return zipSync(files);
}
function checkStats(c) {
  assert.ok(elements[c.element]);
  for(const [field,[min,max]]of Object.entries(combatLimits))assert.ok(Number.isInteger(c[field])&&c[field]>=min&&c[field]<=max,`${field} is in range`);
  if(c.evolution)checkStats(c.evolution);
}
test('an actual legacy ZIP with no combat metadata imports, persists, reloads and battles',async()=>{
  const source=oldTheme();const theme=parseThemeZip(oldZip(source));
  theme.manifest.creatures.forEach(checkStats);
  assert.equal(source.manifest.creatures[0].attack,undefined,'original ZIP data is not mutated');
  const database=new IDBFactory();await saveThemeLocally(theme,database,{removeItem(){}});
  const restored=await loadLocalTheme(database,{getItem(){return null;}});
  assert.deepEqual(restored.manifest,theme.manifest,'generated values never reroll on reload');
  const mode=installTheme(restored);checkStats(creatureCard(`${mode}:friend`));
  const a=createAttempt(10,55,mode);a.answers=a.rounds.map(r=>({creature:r.creature,correct:true,ms:20000}));
  const b=createBattle(a);assert.equal(b.allies.length,10);assert.equal(b.enemies.length,10);
  assert.ok(['won','lost'].includes(finishBattle(b).phase));
});
test('missing stats are sampled at both range endpoints while explicit and partial stats are preserved',()=>{
  const source=oldTheme().manifest.creatures;
  source[0].attack=77;source[0].element='water';source[0].evolution.defense=88;
  const low=assignCombat(source,()=>0),high=assignCombat(source,()=>.999999999);
  for(const roster of [low,high]){
    roster.forEach(checkStats);assert.equal(roster[0].attack,77);assert.equal(roster[0].element,'water');assert.equal(roster[0].evolution.defense,88);
  }
  assert.notEqual(low[0].defense,high[0].defense);assert.notEqual(low[0].health,high[0].health);
  assert.equal(source[0].health,undefined);
});
test('previously saved old themes without stats get stable defaults on repeated reads',()=>{
  const raw=JSON.stringify(oldTheme()),storage={getItem:()=>raw};
  const first=readTheme(storage),second=readTheme(storage);
  first.manifest.creatures.forEach(checkStats);assert.deepEqual(first,second);
});
