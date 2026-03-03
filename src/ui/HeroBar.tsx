import React from 'react';
import type { Hero } from '../game/state';
import type { ZoneData } from '../game/constants';
import { HERO_MAX_HP } from '../game/constants';

interface HeroBarProps {
  heroes: Hero[];
  gold: number;
  zones: ZoneData[];
  now: number;
  onSendExpedition: (heroId: number, zoneId: number) => void;
  onRecruit: () => void;
  heroCosts: number[];
  maxHeroes: number;
}

export const HeroBar: React.FC<HeroBarProps> = ({
  heroes,
  gold,
  zones,
  now,
  onSendExpedition,
  onRecruit,
  heroCosts,
  maxHeroes,
}) => {
  const nextHeroCost = heroCosts[heroes.length] ?? Infinity;
  const canRecruit = heroes.length < maxHeroes && gold >= nextHeroCost;
  const idleHeroes = heroes.filter(h => h.status === 'idle');

  return (
    <div className="hero-bar">
      {heroes.map((hero) => {
        const isExploring = hero.status === 'exploring';
        const isCooldown = hero.status === 'cooldown';
        const hpPct = Math.max(0, (hero.hp / HERO_MAX_HP) * 100);
        const hpColor = hpPct > 60 ? '#4a9e4a' : hpPct > 30 ? '#c4a44a' : '#9e4a4a';

        let statusText: string;
        if (isExploring && hero.zoneId !== null) {
          statusText = `Exploring ${zones[hero.zoneId].name}`;
        } else if (isCooldown) {
          statusText = `Recovering... ${Math.ceil(Math.max(0, (hero.cooldownEnd - now) / 1000))}s`;
        } else if (hero.hp < HERO_MAX_HP) {
          statusText = `Resting (${Math.floor(hero.hp)} HP)`;
        } else {
          statusText = 'Ready';
        }

        const timeLeft = isExploring
          ? Math.max(0, Math.ceil((hero.expEnd - now) / 1000))
          : 0;

        return (
          <div key={hero.id} className={`hero-card ${hero.status}`}>
            <div
              className="hero-icon"
              style={{
                background:
                  isCooldown
                    ? 'linear-gradient(135deg,#3a1a1a,#2a1515)'
                    : 'linear-gradient(135deg,#1a2040,#2a1a50)',
                border: `2px solid ${isExploring ? '#4a7a9e' : isCooldown ? '#6a3030' : '#2a4a2a'}`,
              }}
            >
              ⚔️
            </div>
            <div className="hero-info">
              <div className="hero-name">{hero.name}</div>
              <div className="hp-bar">
                <div
                  className="hp-fill"
                  style={{ width: `${hpPct}%`, background: hpColor }}
                />
              </div>
              <div className="hero-status">{statusText}</div>
            </div>
            {isExploring && timeLeft > 0 && (
              <div className="exp-timer">{timeLeft}s</div>
            )}
          </div>
        );
      })}

      {/* Recruit Button */}
      {heroes.length < maxHeroes && (
        <button
          className="recruit-btn"
          onClick={onRecruit}
          disabled={!canRecruit}
        >
          + Recruit{' '}
          <span className="recruit-cost">{nextHeroCost}g</span>
        </button>
      )}

      {/* Quick Zone Buttons */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: '#4a4560', marginRight: '4px' }}>Quick:</span>
        {zones.map((zone) => {
          const canSurvive = idleHeroes.some(h => h.hp > zone.dps * 2);
          return (
            <button
              key={zone.id}
              style={{
                padding: '4px 10px',
                fontSize: '11px',
                fontFamily: 'Cinzel',
                background: '#13101e',
                border: `1px solid ${zone.colorCSS}`,
                borderRadius: '4px',
                color: zone.colorCSS,
                cursor: canSurvive ? 'pointer' : 'not-allowed',
                opacity: canSurvive ? 1 : 0.3,
              }}
              disabled={!canSurvive}
              onClick={() => {
                const best = idleHeroes.find(h => h.hp > zone.dps * 2);
                if (best) onSendExpedition(best.id, zone.id);
              }}
            >
              {zone.tier}
            </button>
          );
        })}
      </div>
    </div>
  );
};
