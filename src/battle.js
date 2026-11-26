import { creatureCard, creaturesForMode } from './creatures.js';
import { seedFor, recruitCreature, elementMultiplier } from './combat-rules.js';

export function createBattle(attempt, mode) {
  const allies = attempt.answers.flatMap((answer,index) => {
    if (!answer.correct) return [];
    const card=creatureCard(answer.creature ?? attempt.rounds[index].creature,answer.catchCount??0);
    const recruit=answer.recruit ?? recruitCreature(card,answer.ms,attempt.rounds[index].question,answer.catchCount??0);
    return [{...recruit,hp:recruit.health,key:`ally-${index}`}];
  });
  const enemies=allies.map((ally,index) => {
    const pool=creaturesForMode(mode ?? ally.mode).filter(c=>c.encounter!==false);
    const creature=pool[seedFor(`${attempt.id}:enemy:${index}`)%pool.length];
    const card=creatureCard(creature.id);
    const recruit=recruitCreature(card,undefined,null);
    return {...recruit,attack:Math.max(1,Math.round(recruit.attack*.9)),health:Math.round(recruit.health*.95),
      hp:Math.round(recruit.health*.95),key:`enemy-${index}`};
  });
  return {version:1,mode:mode??allies[0]?.mode,allies,enemies,allyIndex:0,enemyIndex:0,side:'ally',phase:allies.length?'ready':'empty',turn:0,guarding:false,last:null};
}
export function startBattle(battle) {
  return battle.phase==='ready'?{...battle,phase:'active'}:battle;
}
export function advanceBattle(battle, action='attack') {
  if(battle.phase!=='active'||battle.needsChampion)return battle;
  if(!['attack','guard'].includes(action))return battle;
  const next={...battle,allies:battle.allies.map(c=>({...c})),enemies:battle.enemies.map(c=>({...c})),turn:battle.turn+1};
  const isAlly=battle.side==='ally';
  const attacker=isAlly?next.allies[next.allyIndex]:next.enemies[next.enemyIndex];
  const target=isAlly?next.enemies[next.enemyIndex]:next.allies[next.allyIndex];
  if(isAlly && action==='guard') {
    const healed=Math.min(attacker.health-attacker.hp,Math.ceil(attacker.health*.08));attacker.hp+=healed;
    next.guarding=true;next.side='enemy';next.last={side:'ally',kind:'guard',healed,name:attacker.name};return next;
  }
  const multiplier=elementMultiplier(attacker.element,target.element);
  const damage=Math.max(4,Math.round((attacker.attack-target.defense*.45)*multiplier*(!isAlly && battle.guarding ? 0.55 : 1)));
  target.hp=Math.max(0,target.hp-damage);
  next.last={side:battle.side,kind:'attack',damage,multiplier,name:attacker.name,targetName:target.name,knockout:target.hp===0,attackerKey:attacker.key,targetKey:target.key};
  if(!isAlly)next.guarding=false;
  if(target.hp===0) {
    if(isAlly)next.enemyIndex++;else if(battle.version!==2)next.allyIndex++;
    if(battle.version===2)next.needsChampion=true;
  }
  if(next.enemyIndex===next.enemies.length)next.phase='won';
  else if(battle.version===2?!hasChampion(next):next.allyIndex===next.allies.length)next.phase='lost';
  next.side=isAlly?'enemy':'ally';
  return next;
}
export function finishBattle(battle) {
  let next=startBattle(battle);
  // Maximum team size 100, health 750 after speed bonuses, minimum damage 4.
  for(let i=0;i<100000 && next.phase==='active';i++)next=next.needsChampion?selectChampion(next,bestChampion(next)):advanceBattle(next);
  if(next.phase==='active')throw new Error('Battle exceeded its turn limit');
  return next;
}


// Bag choices are compact species entries; at most one test-sized team is deployed.
export function withChampionSelection(battle, collection={}, collectionStats={}, mode=battle.mode) {
  if(battle.version===2)return battle;
  const counts={...collection};
  for(const unit of battle.allies) {
    if(!mode||unit.mode===mode)counts[unit.creatureId]=Math.max(counts[unit.creatureId]??0,battle.allies.filter(c=>c.creatureId===unit.creatureId).length);
  }
  const pool=Object.entries(counts).flatMap(([id,count])=>{
    const card=creatureCard(id,count);
    if(!Number.isInteger(count)||count<=0||(mode&&card.mode!==mode))return [];
    const earned=battle.allies.filter(c=>c.creatureId===id).sort((a,b)=>(b.attack+b.defense+b.health)-(a.attack+a.defense+a.health))[0];
    const recruit=collectionStats[id]??earned??recruitCreature(card,undefined,null,count);
    return [{...recruit,key:`bag:${id}`,remaining:Math.min(count,battle.enemies.length)}];
  });
  const untouched=battle.phase==='ready';
  const allies=untouched?[]:battle.allies;
  if(!untouched)for(const entry of pool)entry.remaining=Math.max(0,entry.remaining-allies.filter(c=>c.creatureId===entry.creatureId).length);
  return {...battle,version:2,mode,slots:battle.enemies.length,pool,allies,
    needsChampion:untouched,phase:untouched&&!pool.length?'empty':battle.phase};
}
export function hasChampion(battle) {
  return battle.allies.some(c=>c.hp>0)||(battle.allies.length<battle.slots&&battle.pool.some(c=>c.remaining>0));
}
export function selectChampion(battle,key) {
  if(battle.version!==2||!['ready','active'].includes(battle.phase)||!battle.needsChampion)return battle;
  const living=battle.allies.findIndex(c=>c.key===key&&c.hp>0);
  if(living>=0)return {...battle,phase:'active',allyIndex:living,needsChampion:false,side:'ally',guarding:false};
  const index=battle.pool.findIndex(c=>c.key===key&&c.remaining>0);
  if(index<0||battle.allies.length>=battle.slots)return battle;
  const source=battle.pool[index];
  const unit={...source,key:`champion-${battle.allies.length}`,hp:source.health};
  return {...battle,phase:'active',pool:battle.pool.map((c,i)=>i===index?{...c,remaining:c.remaining-1}:c),
    allies:[...battle.allies,unit],allyIndex:battle.allies.length,needsChampion:false,side:'ally',guarding:false};
}
export function bestChampion(battle) {
  const enemy=battle.enemies[battle.enemyIndex];
  const options=[...battle.allies.filter(c=>c.hp>0),...(battle.allies.length<battle.slots?battle.pool.filter(c=>c.remaining>0):[])];
  return options.sort((a,b)=>b.attack*elementMultiplier(b.element,enemy.element)-a.attack*elementMultiplier(a.element,enemy.element))[0]?.key;
}

// Keep survivors in the backpack and deduct each defeated copy exactly once.
// The receipt travels with the saved battle so reopening it cannot charge twice.
export function settleChampionLosses(battle, collection = {}, collectionStats = {}) {
  const removed = new Set(battle.removedChampionKeys ?? []);
  const counts = { ...collection }, stats = { ...collectionStats };
  for (const unit of battle.allies) {
    if (unit.hp > 0 || removed.has(unit.key)) continue;
    removed.add(unit.key);
    const remaining = (counts[unit.creatureId] ?? 0) - 1;
    if (remaining > 0) counts[unit.creatureId] = remaining;
    else {
      delete counts[unit.creatureId];
      delete stats[unit.creatureId];
    }
  }
  return { battle: { ...battle, removedChampionKeys: [...removed] }, collection: counts, collectionStats: stats };
}
