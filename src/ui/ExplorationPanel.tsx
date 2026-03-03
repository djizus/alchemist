import type { GameState, GameAction } from '../game/state';
import { getCurrentZone } from '../game/engine';
import { ZONES } from '../game/constants';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export function ExplorationPanel({ state, dispatch: _dispatch }: Props) {
  const exploringHeroes = state.heroes.filter(h => h.status === 'exploring');

  if (exploringHeroes.length === 0) {
    return (
      <section className="panel exploration-panel">
        <h2 className="panel-title">Exploration</h2>
        <p className="empty-state">No heroes exploring. Send one out!</p>
      </section>
    );
  }

  return (
    <section className="panel exploration-panel">
      <h2 className="panel-title">Exploration</h2>
      {exploringHeroes.map(hero => {
        const zone = getCurrentZone(hero.depth);
        const nextZone = ZONES.find(z => z.depthThreshold > hero.depth);
        const depthInZone = hero.depth - zone.depthThreshold;
        const zoneWidth = nextZone
          ? nextZone.depthThreshold - zone.depthThreshold
          : 30; // last zone has no cap
        const zoneProgress = Math.min(1, depthInZone / zoneWidth);

        return (
          <div key={hero.id} className="exploration-card">
            <div className="exploration-header">
              <span className="hero-name">{hero.name}</span>
              <span className="zone-badge" style={{ backgroundColor: zone.colorCSS }}>
                {zone.name} ({zone.tier})
              </span>
            </div>
            <div className="depth-bar">
              <div className="depth-bar-track">
                {ZONES.map(z => (
                  <div
                    key={z.id}
                    className={`depth-zone-segment ${z.id <= zone.id ? 'active' : ''}`}
                    style={{ backgroundColor: z.id <= zone.id ? z.colorCSS : undefined }}
                  />
                ))}
              </div>
              <span className="depth-text">{Math.floor(hero.depth)}s deep</span>
            </div>
            <div className="zone-progress-bar">
              <div
                className="zone-progress-fill"
                style={{
                  width: `${zoneProgress * 100}%`,
                  backgroundColor: zone.colorCSS,
                }}
              />
            </div>
            <div className="pending-loot">
              {hero.pendingLoot.gold > 0 && (
                <span className="loot-gold">+{hero.pendingLoot.gold}g</span>
              )}
              {Object.entries(hero.pendingLoot.ingredients).map(([name, qty]) => (
                <span key={name} className="loot-ingredient">{qty}x {name}</span>
              ))}
            </div>
            {hero.eventLog.length > 0 && (
              <div className="last-event">
                {hero.eventLog[hero.eventLog.length - 1].message}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
