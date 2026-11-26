import test from 'node:test';import assert from 'node:assert/strict';
import {createBattle,withChampionSelection,selectChampion,advanceBattle,finishBattle,settleChampionLosses}from'../src/battle.js';
import{createAttempt}from'../src/model.js';import{creatureCard,installTheme,companionFor}from'../src/creatures.js';
import{themeFixture}from'./fixtures/theme.js';import{shareMessage,publicAppUrl,tryNativeShare}from'../src/share-result.js';
function attempt(){const a=createAttempt(5,99,'srd');a.answers=a.rounds.map((r,i)=>({correct:i<3,creature:r.creature,ms:10000}));return a;}

test('survivors return while defeated copies are removed once, including after reload and skipping',()=>{
 const collection={bat:2,imp:1}, stats={bat:{attack:20},imp:{attack:30}};
 const battle={phase:'won',allies:[{key:'a',creatureId:'bat',hp:0},{key:'b',creatureId:'bat',hp:10},{key:'c',creatureId:'imp',hp:0}]};
 const settled=settleChampionLosses(battle,collection,stats);
 assert.deepEqual(settled.collection,{bat:1});
 assert.deepEqual(settled.collectionStats,{bat:{attack:20}});
 assert.deepEqual(collection,{bat:2,imp:1});
 const restored=JSON.parse(JSON.stringify(settled));
 assert.deepEqual(settleChampionLosses({...restored.battle,phase:'skipped'},restored.collection,restored.collectionStats).collection,{bat:1});
 const lost=settleChampionLosses({...restored.battle,phase:'lost',allies:battle.allies.map(c=>({...c,hp:0}))},restored.collection,restored.collectionStats);
 assert.deepEqual(lost.collection,{});
 assert.deepEqual(lost.collectionStats,{});
});

test('enemy is ready before selection, full bag offers owned champions, and choosing starts the encounter',()=>{
 const a=attempt(),b=withChampionSelection(createBattle(a),{bat:2,imp:1},{},'srd');
 assert.equal(b.enemies.length,3);assert.equal(b.slots,3);assert.equal(b.allies.length,0);assert.ok(b.needsChampion);
 assert.ok(b.pool.some(c=>c.creatureId==='bat'));assert.ok(b.pool.some(c=>c.creatureId==='imp'));
 assert.equal(advanceBattle(b),b);
 const chosen=selectChampion(b,'bag:bat');assert.equal(chosen.phase,'active');assert.equal(chosen.allies[0].creatureId,'bat');assert.equal(chosen.pool.find(c=>c.creatureId==='bat').remaining,1);
 assert.equal(chosen.needsChampion,false);assert.equal(advanceBattle(chosen).side,'enemy');
});
test('each new enemy requires a champion choice; survivors can return without consuming another bag copy',()=>{
 const b=selectChampion(withChampionSelection(createBattle(attempt()),{bat:1},{},'srd'),'bag:bat');
 b.enemies[0].hp=1;const next=advanceBattle(b);
 assert.equal(next.enemyIndex,1);assert.ok(next.needsChampion);assert.equal(next.allies.length,1);
 const count=next.pool.find(c=>c.creatureId==='bat').remaining;
 const continued=selectChampion(next,next.allies[0].key);
 assert.equal(continued.allies.length,1);assert.equal(continued.pool.find(c=>c.creatureId==='bat').remaining,count);
 assert.equal(continued.needsChampion,false);
});
test('dead champions cannot return and team slots cannot be exceeded; quick finish terminates',()=>{
 const b=selectChampion(withChampionSelection(createBattle(attempt()),{bat:1,imp:1},{},'srd'),'bag:bat');
 b.allies[0].hp=1;b.side='enemy';const next=advanceBattle(b);
 assert.ok(next.needsChampion);assert.equal(selectChampion(next,next.allies[0].key),next);
 const capped={...next,slots:next.allies.length};assert.equal(selectChampion(capped,'bag:imp'),capped);
 const result=finishBattle(next);assert.ok(['won','lost'].includes(result.phase));
 assert.ok(result.allies.length<=result.slots);
});
test('selected theme supplies new companions and enemies, and champions stay in that world',()=>{
 const theme=themeFixture();const mode=installTheme(theme),a=attempt();
 const id=companionFor(a.rounds[0],mode,a.id);assert.equal(creatureCard(id).mode,mode);
 const b=withChampionSelection(createBattle(a,mode),{bat:20,[`${mode}:friend`]:1},{},mode);
 assert.ok(b.enemies.every(c=>c.mode===mode));assert.ok(b.pool.every(c=>c.mode===mode));
 assert.equal(b.pool[0].creatureId,`${mode}:friend`);
});
test('share text uses outcome totals and a clean public URL, without user IDs or account details',()=>{
 const a=attempt();a.battle={phase:'won'};const text=shareMessage(a);
 assert.ok(text.includes('3 מתוך 5'));assert.ok(text.includes('3 חברים'));assert.ok(text.includes('ניצחתי'));
 assert.ok(!text.includes(String(a.id)));assert.ok(!text.includes('@'));
 assert.equal(publicAppUrl(new URL('https://example.com/app/?token=private#account')),'https://example.com/app/');
});
test('native sharing supports success, cancellation and copyable fallback',async()=>{
 const data={text:'test'};let received;
 assert.equal(await tryNativeShare(data,{share:async d=>{received=d;}}),'shared');assert.deepEqual(received,data);
 assert.equal(await tryNativeShare(data,{}),'fallback');
 assert.equal(await tryNativeShare(data,{share:async()=>{throw new DOMException('cancelled','AbortError');}}),'cancelled');
 assert.equal(await tryNativeShare(data,{share:async()=>{throw new Error('unsupported');}}),'fallback');
});

test('champion choices and spent copies survive reload without changing the permanent bag',()=>{
 const collection={bat:2,imp:1},before=JSON.stringify(collection);
 const b=selectChampion(withChampionSelection(createBattle(attempt()),collection,{},'srd'),'bag:bat');
 const restored=JSON.parse(JSON.stringify(b));
 assert.equal(withChampionSelection(restored,collection),restored);
 assert.deepEqual(advanceBattle(restored),advanceBattle(b));
 assert.equal(JSON.stringify(collection),before);
});
