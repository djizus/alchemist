import type { GameState, GameAction } from '../game/state';
import { HERO_COSTS, MAX_HEROES } from '../game/constants';
import { hasPendingLoot } from '../game/engine';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export function HeroPanel({ state, dispatch }: Props) {
  const canRecruit = state.heroes.length < MAX_HEROES &&
    state.inventory.gold >= HERO_COSTS[state.heroes.length];
  const nextCost = state.heroes.length < MAX_HEROES ? HERO_COSTS[state.heroes.length] : null;

  return (
    <section className="panel hero-panel">
      <h2 className="panel-title">Heroes</h2>
      <div className="hero-list">
        {state.heroes.map(hero => {
          const hpPct = hero.hp / hero.stats.maxHp;
          const isCritical = hpPct > 0 && hpPct < 0.3;
          const hasLoot = hasPendingLoot(hero);

          return (
            <div key={hero.id} className={`hero-card hero-${hero.status}`}>
              <div className="hero-header">
                <span className="hero-name">{hero.name}</span>
                <span className="hero-status">
                  {hero.status === 'exploring' ? '⚔ Exploring' :
                   hero.status === 'returning' ? '🏃 Returning' :
                   hasLoot ? '📦 Yield Ready' :
                   hero.hp < hero.stats.maxHp ? '♥ Regen' : '● Ready'}
                </span>
              </div>

              {/* HP Bar */}
              <div className={`stat-bar hp-bar ${isCritical ? 'hp-critical' : ''}`}>
                <div
                  className="stat-bar-fill"
                  style={{ width: `${hpPct * 100}%` }}
                />
                <span className="stat-bar-text">
                  {Math.ceil(hero.hp)}/{hero.stats.maxHp} HP
                </span>
              </div>

              {/* Return progress bar */}
              {hero.status === 'returning' && hero.returnTimerMax > 0 && (
                <div className="stat-bar return-bar">
                  <div
                    className="stat-bar-fill return-fill"
                    style={{ width: `${((hero.returnTimerMax - hero.returnTimer) / hero.returnTimerMax) * 100}%` }}
                  />
                  <span className="stat-bar-text">
                    Returning... {Math.ceil(hero.returnTimer)}s
                  </span>
                </div>
              )}

              {/* Stats */}
              <div className="hero-stat-row">
                <span>⚔ {hero.stats.power} Pow</span>
                <span>♥ {hero.stats.regenPerSec}/s</span>
                <span>❤ {hero.stats.maxHp} Max</span>
              </div>

              {/* Pending loot preview */}
              {hasLoot && hero.status === 'idle' && (
                <div className="hero-loot-preview">
                  {hero.pendingLoot.gold > 0 && (
                    <span className="loot-gold">◆ {hero.pendingLoot.gold}g</span>
                  )}
                  {Object.entries(hero.pendingLoot.ingredients).map(([name, qty]) => (
                    <span key={name} className="loot-ingredient">{qty}x {name}</span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="hero-actions">
                {hero.status === 'idle' && !hasLoot && hero.hp > 0 && (
                  <button
                    className="btn btn-primary"
                    onClick={() => dispatch({ type: 'SEND_EXPEDITION', heroId: hero.id })}
                  >
                    Explore
                  </button>
                )}
                {hero.status === 'idle' && hasLoot && (
                  <button
                    className="btn btn-gold"
                    onClick={() => dispatch({ type: 'CLAIM_LOOT', heroId: hero.id })}
                  >
                    Claim Yield
                  </button>
                )}
                {hero.status === 'returning' && (
                  <span className="returning-label">Heading home...</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {nextCost !== null && (
        <button
          className="btn btn-recruit"
          disabled={!canRecruit}
          onClick={() => dispatch({ type: 'RECRUIT_HERO' })}
        >
          Recruit Hero ({nextCost}g)
        </button>
      )}
    </section>
  );
}
