// A closed ring guarantees one advantage and one disadvantage for every element.
export const elements = {
  fire: { name: 'אש', icon: '🔥', strongAgainst: 'grass' },
  grass: { name: 'טבע', icon: '🌿', strongAgainst: 'earth' },
  earth: { name: 'אדמה', icon: '🪨', strongAgainst: 'electric' },
  electric: { name: 'חשמל', icon: '⚡', strongAgainst: 'water' },
  water: { name: 'מים', icon: '💧', strongAgainst: 'air' },
  air: { name: 'אוויר', icon: '🌬️', strongAgainst: 'psychic' },
  psychic: { name: 'מחשבה', icon: '🔮', strongAgainst: 'fairy' },
  fairy: { name: 'קסם', icon: '✨', strongAgainst: 'fire' },
};
export const elementIds = Object.keys(elements);
export function seedFor(value) {
  let seed = 2166136261;
  for (const char of String(value)) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  return seed;
}
export const combatLimits = {attack:[1,100],defense:[1,100],health:[10,500]};
// Narrow generation ranges keep old packs balanced; explicit pack values may use the full limits.
export const generatedStatRanges = {attack:[22,30],defense:[10,17],health:[85,110]};
function randomFor(id) {
  let seed=seedFor(id);
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
}
const randomInteger=(random,min,max)=>min+Math.floor(random()*(max-min+1));
export function combatStats(creature, index = 0, random = randomFor(creature.id)) {
  const rarity = {standard:1,epic:1.06,legendary:1.1,mythical:1.12}[creature.rarity] ?? 1;
  const stats={element:elements[creature.element]?creature.element:elementIds[index%elementIds.length]};
  for(const [field,[min,max]] of Object.entries(generatedStatRanges)) {
    stats[field]=creature[field]??randomInteger(random,Math.round(min*rarity),Math.round(max*rarity));
  }
  return stats;
}
export function assignCombat(roster, random) {
  // Imports get a random rotation of a balanced elemental distribution. Saved values win.
  const offset=random?randomInteger(random,0,elementIds.length-1):0;
  return roster.map((creature,index)=>{
    const stats=combatStats(creature,index+offset,random);
    const result={...creature,...stats};
    if(creature.evolution){
      const roll=random??randomFor(`${creature.id}:evolution`);
      const evolution={...creature.evolution,element:creature.evolution.element??stats.element};
      for(const [field,[min,max]] of Object.entries(combatLimits)) {
        evolution[field]=creature.evolution[field]??randomInteger(roll,
          Math.min(max,Math.max(min,Math.ceil(stats[field]*1.05))),
          Math.min(max,Math.max(min,Math.ceil(stats[field]*1.15))));
      }
      result.evolution=evolution;
    }
    return result;
  });
}
export function elementMultiplier(attack, defense) {
  if (elements[attack]?.strongAgainst === defense) return 1.5;
  if (elements[defense]?.strongAgainst === attack) return 0.75;
  return 1;
}
export function speedBoost(ms, question) {
  // Reading questions allow extra time; missing/invalid historical timing gives no bonus.
  if (!Number.isFinite(ms) || ms < 0) return 1;
  const windowMs = question?.passageText || question?.passage ? 60000 : 30000;
  return 1 + 0.5 * Math.max(0, 1 - ms / windowMs);
}
export function recruitCreature(card, ms, question, count = 0) {
  const bonus = speedBoost(ms, question);
  const stats = combatStats(card);
  return { creatureId:card.id, name:card.name, mode:card.mode, element:stats.element, catchCount:count,
    attack:Math.round(stats.attack * bonus), defense:Math.round(stats.defense * bonus),
    health:Math.round(stats.health * bonus), speedBonus:Math.round((bonus-1)*100),
  };
}

export function strongestRecruit(previous, recruit) {
  const strength = unit => unit.attack + unit.defense + unit.health;
  return previous && strength(previous) >= strength(recruit) ? previous : recruit;
}
