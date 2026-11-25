import React from 'react';
import { creatureCard } from '../creatures.js';

export function Creature({ id, className = '', animated = true }) {
  const card = creatureCard(id);
  return (
    <div
      className={`creature ${animated ? 'is-animated' : ''} ${card.pixelated ? '' : 'creature-illustration'} ${className}`}
      aria-hidden="true"
      style={{
        '--sprite-frames': card.frames || 1,
        '--sprite-duration': `${Math.max(0.8, card.frames * 0.15)}s`,
      }}
    >
      {animated && card.animation ? (
        <span className="creature-frame">
          <img className="creature-strip" alt="" draggable="false" src={card.animation} />
        </span>
      ) : (
        <img alt="" draggable="false" src={card.image} />
      )}
    </div>
  );
}
