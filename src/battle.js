import { creatureCard, creaturesForMode } from './creatures.js';
import { seedFor, recruitCreature, elementMultiplier } from './combat-rules.js';

export function createBattle(attempt) {
  const allies = attempt.answers.flatMap((answer,index) => {
    if (!answer.correct) return [];
    const card=creatureCard(answer.creature ?? attempt.rounds[index].creature,answer.catchCount??0);
    const recruit=answer.recruit ?? recruitCreature(card,answer.ms,attempt.rounds[index].question,answer.catchCount??0);
    return [{...recruit,hp:recruit.health,key:`ally-${index}`}];
  });
  const enemies=allies.map((ally,index) => {
    const pool=creaturesForMode(ally.mode).filter(c=>c.encounter!==false);
    const creature=pool[seedFor(`${attempt.id}:enemy:${index}`)%pool.length];
    const card=creatureCard(creature.id);
    const recruit=recruitCreature(card,undefined,null);
    return {...recruit,attack:Math.max(1,Math.round(recruit.attack*.9)),health:Math.round(recruit.health*.95),
      hp:Math.round(recruit.health*.95),key:`enemy-${index}`};
  });
  return {version:1,allies,enemies,allyIndex:0,enemyIndex:0,side:'ally',phase:allies.length?'ready':'empty',turn:0,guarding:false,last:null};
}
export function startBattle(battle) {
  return battle.phase==='ready'?{...battle,phase:'active'}:battle;
}
export function advanceBattle(battle, action='attack') {
  if(battle.phase!=='active')return battle;
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
    if(isAlly)next.enemyIndex++;else next.allyIndex++;
  }
  if(next.enemyIndex===next.enemies.length)next.phase='won';
  else if(next.allyIndex===next.allies.length)next.phase='lost';
  next.side=isAlly?'enemy':'ally';
  return next;
}
export function finishBattle(battle) {
  let next=startBattle(battle);
  // Maximum team size 100, health 750 after speed bonuses, minimum damage 4.
  for(let i=0;i<100000 && next.phase==='active';i++)next=advanceBattle(next);
  if(next.phase==='active')throw new Error('Battle exceeded its turn limit');
  return next;
}
