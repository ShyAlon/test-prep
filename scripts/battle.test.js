import test from 'node:test';
import assert from 'node:assert/strict';
import {elements,elementIds,elementMultiplier,speedBoost,recruitCreature,strongestRecruit} from '../src/combat-rules.js';
import {creatureModes,creaturesForMode,creatureCard,installTheme,chooseEncounter} from '../src/creatures.js';
import {createBattle,startBattle,advanceBattle,finishBattle} from '../src/battle.js';
import {createAttempt} from '../src/model.js';
import {themeFixture} from './fixtures/theme.js';
import {zipSync,strToU8} from 'fflate';
import {parseThemeZip} from '../src/theme-storage.js';

function attempt(count=5,mode='srd') {
 const attempt=createAttempt(count,12345,mode);
 attempt.answers=attempt.rounds.map((round,index)=>({correct:index%2===0,creature:round.creature,ms:10000,catchCount:1}));
 return attempt;
}
test('all built-in rosters have positive stats and distribute all eight elements evenly',()=>{
 for(const mode of Object.keys(creatureModes)) {
  const roster=creaturesForMode(mode),counts={};
  for(const item of roster){const c=creatureCard(item.id);assert.ok(c.attack>0&&c.defense>0&&c.health>0);assert.ok(elements[c.element]);counts[c.element]=(counts[c.element]??0)+1;}
  assert.equal(Object.keys(counts).length,8);assert.ok(Math.max(...Object.values(counts))-Math.min(...Object.values(counts))<=1);
 }
});
test('every element has exactly one strength and weakness, with neutral self-matchups',()=>{
 for(const element of elementIds){
  assert.equal(elementIds.filter(other=>elementMultiplier(element,other)>1).length,1);
  assert.equal(elementIds.filter(other=>elementMultiplier(element,other)<1).length,1);
  assert.equal(elementMultiplier(element,element),1);
 }
});
test('faster correct answers boost all stats, capped at 50%, with extra reading time and no slow-answer penalty',()=>{
 const card=creatureCard('bat'),fast=recruitCreature(card,0,{}),slow=recruitCreature(card,999999,{});
 assert.equal(fast.speedBonus,50);assert.equal(slow.speedBonus,0);
 for(const stat of ['attack','defense','health']){assert.equal(slow[stat],card[stat]);assert.ok(fast[stat]>slow[stat]);}
 assert.equal(speedBoost(-1,{}),1);assert.equal(speedBoost(undefined,{}),1);
 assert.ok(speedBoost(20000,{passageText:'reading'})>speedBoost(20000,{}));
});
test('only correct answers recruit a test team and enemies always match its size',()=>{
 const a=attempt();const battle=createBattle(a);
 assert.equal(battle.allies.length,3);assert.equal(battle.enemies.length,3);
 assert.deepEqual(createBattle(a),battle,'enemy lineup is deterministic');
 a.answers.forEach(answer=>answer.correct=false);
 assert.equal(createBattle(a).phase,'empty');
});
test('saved recruit strength is immutable across theme changes or collection growth',()=>{
 const a=attempt(1),saved=recruitCreature(creatureCard(a.answers[0].creature),10000,{});
 a.answers[0].recruit=saved;a.answers[0].ms=0;a.answers[0].catchCount=100;
 assert.equal(createBattle(a).allies[0].attack,saved.attack);
 assert.equal(createBattle(a).allies[0].element,saved.element);
});
test('battle steps do not mutate saved history, preserve HP bounds and survive JSON reload',()=>{
 const original=startBattle(createBattle(attempt())),before=JSON.stringify(original);
 const step=advanceBattle(original);
 assert.equal(JSON.stringify(original),before);assert.equal(step.side,'enemy');assert.equal(step.turn,1);
 assert.deepEqual(advanceBattle(JSON.parse(JSON.stringify(step))),advanceBattle(step));
 const result=finishBattle(original);
 assert.ok(['won','lost'].includes(result.phase));
 for(const c of [...result.allies,...result.enemies])assert.ok(c.hp>=0&&c.hp<=c.health);
 assert.equal(advanceBattle(result),result);
});
test('guarding reduces the next incoming hit and heals without exceeding maximum health',()=>{
 const b=startBattle(createBattle(attempt(1)));b.allies[0].hp-=20;
 const guard=advanceBattle(b,'guard'),unguarded=advanceBattle(b,'attack');
 assert.ok(guard.guarding);assert.ok(guard.allies[0].hp>b.allies[0].hp);
 const defended=advanceBattle(guard),plain=advanceBattle(unguarded);
 assert.ok(defended.last.damage<plain.last.damage);assert.equal(defended.guarding,false);
});
test('wins and losses terminate and cannot award recruits again; skipped state remains terminal',()=>{
 const b=startBattle(createBattle(attempt(1)));b.enemies[0].hp=1;
 assert.equal(advanceBattle(b).phase,'won');
 b.side='enemy';b.allies[0].hp=1;assert.equal(advanceBattle(b).phase,'lost');
 const skipped={...b,phase:'skipped'};assert.equal(advanceBattle(skipped),skipped);assert.equal(finishBattle(skipped),skipped);
});
test('old theme packs gain battle stats and explicit pack stats/evolutions remain available',()=>{
 const theme=themeFixture();theme.manifest.creatures[0]={...theme.manifest.creatures[0],element:'water',attack:33,defense:18,health:110};
 const mode=installTheme(theme),card=creatureCard(`${mode}:friend`);
 assert.equal(card.attack,33);assert.equal(card.element,'water');
 assert.equal(creatureCard(`${mode}:friend`,2).health,theme.manifest.creatures[0].evolution.health,'explicit evolution values are preserved');
 assert.ok(creatureCard(`${mode}:epic`).health>0);
 const b=createBattle(attempt(10,mode));assert.equal(b.allies.length,b.enemies.length);
});
test('a one-creature pack can supply repeated encounters',()=>{
 const theme=themeFixture();theme.manifest.id='single';theme.manifest.creatures=theme.manifest.creatures.slice(0,1);theme.manifest.companion='friend';
 const mode=installTheme(theme),id=`${mode}:friend`;
 assert.equal(chooseEncounter(()=>.5,id,mode),id);
});
test('invalid combat data in uploaded packs is rejected',()=>{
 const image=new Uint8Array([137,80,78,71]);
 for(const field of [{element:'invalid'},{attack:0},{defense:101},{health:9},{attack:NaN}]) {
  const manifest={version:1,id:'bad',name:'Bad',description:'Invalid combat',avatar:'a',companion:'a',creatures:[{id:'a',name:'A',english:'A',color:'grass',rarity:'standard',image:'a.png',...field}]};
  assert.throws(()=>parseThemeZip(zipSync({'theme.json':strToU8(JSON.stringify(manifest)),'a.png':image})));
 }
});


test('strongest collection stats and a partially played battle survive saved-game migration', async()=>{
 const {generatedOnlyGame}=await import('../src/model.js');
 const {saveGame,readGame}=await import('../src/profile-storage.js');
 const fast=recruitCreature(creatureCard('bat'),1000,{}),slow=recruitCreature(creatureCard('bat'),99999,{});
 assert.equal(strongestRecruit(fast,slow),fast);assert.equal(strongestRecruit(slow,fast),fast);
 const completed=attempt();completed.finishedAt=1;completed.battle=advanceBattle(startBattle(createBattle(completed)));
 const values=new Map(),storage={setItem:(k,v)=>values.set(k,v),getItem:k=>values.get(k)??null};
 saveGame({history:[completed],collection:{bat:1},collectionStats:{bat:fast}},'test-user',storage);
 const restored=generatedOnlyGame(readGame('test-user',storage));
 assert.deepEqual(restored.history[0].battle,completed.battle);assert.deepEqual(restored.collectionStats.bat,fast);
});
