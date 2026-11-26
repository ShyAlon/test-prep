import React from 'react';
import { elements } from '../combat-rules.js';
export function CombatStats({ creature, compact=false }) {
  const element=elements[creature.element];
  return <div className={`combat-stats${compact?' compact':''}`}>
    <span className={`element-badge element-${creature.element}`}>{element?.icon} {element?.name}</span>
    <span title="התקפה">⚔️ <b>{creature.attack}</b><small>התקפה</small></span>
    <span title="הגנה">🛡️ <b>{creature.defense}</b><small>הגנה</small></span>
    <span title="בריאות">♥ <b>{creature.health}</b><small>בריאות</small></span>
  </div>;
}
