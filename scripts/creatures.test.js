import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { creatures, creatureCard, chooseEncounter, migrateCreatureGame, creatureModes, creaturesForMode, companionFor } from '../src/creatures.js';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url));
test('every creature has local public-domain art, documented provenance, and matching animation frames', () => {
  const sources = JSON.parse(read('public/licenses/artwork-sources.json'));
  const attribution = read('public/licenses/ATTRIBUTION.txt').toString();
  assert.equal(creaturesForMode('srd').length,32);
  assert.equal(creaturesForMode('mythology').length,23);
  assert.equal(creaturesForMode('animals').length,25);
  const roster=JSON.parse(read('public/licenses/creature-roster.json'));
  const artwork=JSON.parse(read('src/creature-art.json'));
  assert.ok(Object.values(artwork).filter(item=>Math.min(...item.nativeSize)>=48).length>=20);
  assert.equal(new Set(creatures.map(creature => creature.id)).size, creatures.length);
  for (const source of sources.sources) {
    assert.ok(['CC0-1.0','LicenseRef-Public-Domain'].includes(source.license));
    assert.match(source.url, /^https:\/\/(?:[^/]+\.itch\.io|openclipart\.org)\//);
  }
  for (const creature of creatures) {
    const card = creatureCard(creature.id, 2);
    assert.ok(existsSync(new URL(`../public/${card.image}`, import.meta.url)));
    assert.ok(roster.some(item=>item.id===creature.id && item.english===creature.english));
    if(creature.mode==='srd')assert.ok(Number.isInteger(creature.page));
    assert.ok(card.experienced);
    assert.equal(card.id, creature.id, 'friendship rank must not invent a species evolution');
    if (card.animation) {
      const png = read(`public/${card.animation}`);
      assert.equal(png.readUInt32BE(16), png.readUInt32BE(20) * card.frames, 'consistent square idle frames');
    }
  }
  assert.match(attribution, /This work includes material from the System Reference Document 5\.2\.1/);
  assert.match(attribution, /Creative Commons Attribution 4\.0 International License/);
});

test('encounters stay in the chosen world, cover every creature and avoid immediate repeats', () => {
  for(const mode of Object.keys(creatureModes)) {
    const choices = new Set();
    let seed = 91, previous;
    const random = () => {seed = (Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
    for(let i=0;i<5000;i++) {
      const id=chooseEncounter(random,previous,mode);
      assert.equal(creatureCard(id).mode,mode);
      assert.notEqual(id,previous);
      choices.add(id);previous=id;
    }
    assert.equal(choices.size,creaturesForMode(mode).length);
  }
});

test('switching worlds changes only unanswered companions and is deterministic across reloads', () => {
  const round={id:'generated-2',creature:'bat',question:{prompt:'snapshot'}};
  assert.equal(companionFor(round,'srd',123),'bat');
  const myth=companionFor(round,'mythology',123);
  assert.equal(creatureCard(myth).mode,'mythology');
  assert.equal(companionFor(JSON.parse(JSON.stringify(round)),'mythology',123),myth);
  assert.equal(creatureCard(companionFor(round,'animals',123)).mode,'animals');
  const answer={choice:1,correct:true,creature:myth,catchCount:1};
  assert.equal(companionFor(round,'animals',123,answer),myth);
  assert.equal(round.creature,'bat');
});

test('legacy reward migration preserves learning snapshots, scores and total rewards, and is idempotent', () => {
  const question = {prompt:'original snapshot', choices:['7','5'], correct:0};
  const answer = {choice:0,correct:true,catchCount:2};
  const attempt = {id:123, rounds:[{id:'generated-0',question,pokemon:25}], answers:[answer],index:0,totalMs:1234};
  const game = {active:attempt,history:[attempt],collection:{25:2,133:3,bat:4},sound:false};
  const result = migrateCreatureGame(game);
  assert.equal(Object.values(result.collection).reduce((a,b)=>a+b,0),9);
  assert.equal(result.active.rounds[0].question,question);
  assert.deepEqual(result.active.answers[0],{...answer,creature:'giant-spider'});
  assert.equal(result.active.rounds[0].creature,'giant-spider','legacy mapping must remain fixed as the roster expands');
  assert.equal(result.active.totalMs,1234);
  assert.ok(creatures.some(creature=>creature.id===result.active.rounds[0].creature));
  assert.ok(!('pokemon' in result.active.rounds[0]));
  assert.deepEqual(migrateCreatureGame(result),result);
  assert.equal(game.active.rounds[0].pokemon,25);
});

test('every mythical creature has native artwork of at least 32x32 and the roster has expanded', () => {
  const mythology = creaturesForMode('mythology');
  const artwork = JSON.parse(read('src/creature-art.json'));
  assert.ok(mythology.length >= 16, 'mythology should offer at least 16 companions');
  for (const creature of mythology) {
    const metadata = artwork[creature.asset];
    assert.ok(metadata, `${creature.id} needs documented source dimensions`);
    assert.ok(metadata.nativeSize.every(size => size >= 32), `${creature.id} uses sub-32px source artwork`);
    const png = read(`public/${creatureCard(creature.id).image}`);
    assert.ok(png.readUInt32BE(16) >= 32 && png.readUInt32BE(20) >= 32, `${creature.id} is too small after cropping`);
  }
});


test('voxel world has 20 animated CC0 companions and survives saved-game migration', () => {
  const roster = creaturesForMode('voxel');
  const artwork = JSON.parse(read('src/creature-art.json'));
  assert.equal(roster.length,20);
  for (const creature of roster) {
    const card = creatureCard(creature.id);
    assert.ok(card.animation);
    assert.ok(card.frames >= 3);
    assert.ok(artwork[creature.asset].nativeSize.every(size => size >= 32));
    assert.match(artwork[creature.asset].source, /^cole-voxel-/);
  }
  const game = {creatureMode:'voxel',history:[],collection:{'voxel-golem':2,'myth-dragon':1,bat:3}};
  const migrated = migrateCreatureGame(game);
  assert.equal(migrated.creatureMode,'voxel');
  assert.deepEqual(migrated.collection,game.collection);
  assert.equal(companionFor({id:'q',creature:'voxel-golem'},'voxel',123),'voxel-golem');
});
