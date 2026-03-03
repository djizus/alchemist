import React from 'react';
import type { ZoneData } from '../game/constants';
import type { Hero } from '../game/state';

interface ZoneTooltipProps {
  zone: ZoneData | null;
  mousePos: { x: number; y: number };
  idleHeroes: Hero[];
}

export const ZoneTooltip: React.FC<ZoneTooltipProps> = ({
  zone,
  mousePos,
  idleHeroes,
}) => {
  if (!zone) return null;

  // Find best hero for this zone
  const capableHeroes = idleHeroes.filter(h => h.hp > zone.dps * 2);
  const bestHero = capableHeroes.sort((a, b) => b.hp - a.hp)[0];

  return (
    <div
      className="zone-tooltip"
      style={{
        left: mousePos.x + 15,
        top: mousePos.y + 15,
      }}
    >
      <h4>{zone.tier} — {zone.name}</h4>
      <div className="zt-row">
        <span>Duration:</span>
        <span>{zone.duration}s</span>
      </div>
      <div className="zt-row">
        <span>HP Cost:</span>
        <span style={{ color: '#e07070' }}>{Math.ceil(zone.hpCost)}</span>
      </div>
      <div className="zt-row">
        <span>Rarity:</span>
        <span style={{ textTransform: 'capitalize', color: zone.rarity === 'common' ? '#8aaa80' : zone.rarity === 'rare' ? '#70a0d0' : '#c080e0' }}>
          {zone.rarity}
        </span>
      </div>
      <div style={{ marginTop: '8px', borderTop: '1px solid #3a2d6a', paddingTop: '4px' }}>
        <div style={{ fontSize: '11px', color: '#6a6280', marginBottom: '2px' }}>Ingredients:</div>
        <div style={{ color: '#a898c8', lineHeight: '1.2' }}>
          {zone.ingredients.join(', ')}
        </div>
      </div>
      <div style={{ marginTop: '8px', color: bestHero ? '#7ae070' : '#e07070', fontStyle: 'italic' }}>
        {bestHero ? `Ready: ${bestHero.name}` : 'No available heroes'}
      </div>
    </div>
  );
};
