import type { GameState } from '../game/state';
import { TOTAL_POTIONS } from '../game/constants';

interface Props {
  state: GameState;
}

export function GrimoirePanel({ state }: Props) {
  const discovered = state.recipes.filter(r => r.discovered);
  const undiscoveredCount = TOTAL_POTIONS - discovered.length;
  const progressPct = (discovered.length / TOTAL_POTIONS) * 100;

  return (
    <section className="panel grimoire-panel">
      <h2 className="panel-title">
        <span>Grimoire ({discovered.length}/{TOTAL_POTIONS})</span>
        <span className="grimoire-meter">
          <span
            className="grimoire-meter-fill"
            style={{ width: `${progressPct}%` }}
          />
        </span>
      </h2>
      <div className="grimoire-grid">
        {discovered.map(recipe => (
          <div key={recipe.id} className="grimoire-entry discovered">
            <span className="recipe-name">{recipe.name}</span>
            <span className="recipe-ingredients">
              {recipe.ingredients[0]} + {recipe.ingredients[1]}
            </span>
            <span className="recipe-effect">
              {formatEffect(recipe.effect.type, recipe.effect.value)}
            </span>
          </div>
        ))}
        {Array.from({ length: undiscoveredCount }).map((_, i) => (
          <div key={`undiscovered-${i}`} className="grimoire-entry undiscovered">
            ???
          </div>
        ))}
      </div>
    </section>
  );
}

function formatEffect(type: string, value: number): string {
  switch (type) {
    case 'max_hp': return `+${value} Max HP`;
    case 'power': return `+${value} Power`;
    case 'regen_speed': return `+${value} HP/s`;
    default: return `+${value}`;
  }
}
