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
export function combatStats(creature, index = 0) {
  const seed = seedFor(creature.id);
  const rarity = {standard:1,epic:1.06,legendary:1.1,mythical:1.12}[creature.rarity] ?? 1;
  return {
    element: elements[creature.element] ? creature.element : elementIds[index % elementIds.length],
    attack: creature.attack ?? Math.round((22 + seed % 9) * rarity),
    defense: creature.defense ?? Math.round((10 + (seed >>> 8) % 8) * rarity),
    health: creature.health ?? Math.round((85 + (seed >>> 16) % 26) * rarity),
  };
}
export function assignCombat(roster) {
  return roster.map((creature, index) => ({ ...creature, ...combatStats(creature, index) }));
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
