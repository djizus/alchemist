import type { GameState, GameAction } from '../game/state';
import { HERO_COSTS, MAX_HEROES } from '../game/constants';

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

          return (
            <div key={hero.id} className={`hero-card hero-${hero.status}`}>
              <div className="hero-header">
                <span className="hero-name">{hero.name}</span>
                <span className="hero-status">
                  {hero.status === 'exploring' ? '⚔ Exploring' :
                   hero.deathTimer > 0 ? '💤 Resting' :
                   hero.hp < hero.stats.maxHp ? '♥ Regen' : '● Idle'}
                </span>
              </div>
              <div className="hero-stats">
                <div className={`stat-bar hp-bar ${isCritical ? 'hp-critical' : ''}`}>
                  <div
                    className="stat-bar-fill"
                    style={{ width: `${hpPct * 100}%` }}
                  />
                  <span className="stat-bar-text">
                    {Math.ceil(hero.hp)}/{hero.stats.maxHp} HP
                  </span>
                </div>
                <div className="hero-stat-row">
                  <span>⚔ {hero.stats.power} Pow</span>
                  <span>♥ {hero.stats.regenPerSec}/s</span>
                </div>
              </div>
              <div className="hero-actions">
                {hero.status === 'idle' && hero.hp > 0 && hero.deathTimer <= 0 && (
                  <button
                    className="btn btn-primary"
                    onClick={() => dispatch({ type: 'SEND_EXPEDITION', heroId: hero.id })}
                  >
                    Explore
                  </button>
                )}
                {hero.status === 'exploring' && (
                  <button
                    className="btn btn-warning"
                    onClick={() => dispatch({ type: 'RECALL_HERO', heroId: hero.id })}
                  >
                    Recall
                  </button>
                )}
                {hero.deathTimer > 0 && (
                  <span className="death-timer">Reviving: {Math.ceil(hero.deathTimer)}s</span>
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
