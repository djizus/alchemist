import type { GameState, GameAction } from '../game/state';
import { TOTAL_POTIONS } from '../game/constants';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export function GrimoirePanel({ state, dispatch }: Props) {
  const discovered = state.recipes.filter(r => r.discovered);
  const undiscoveredCount = TOTAL_POTIONS - discovered.length;
  const progressPct = (discovered.length / TOTAL_POTIONS) * 100;

  const handleRecipeClick = (ingredients: [string, string]) => {
    dispatch({ type: 'SET_CRAFT_SLOT', slotIndex: 0, ingredientName: ingredients[0] });
    dispatch({ type: 'SET_CRAFT_SLOT', slotIndex: 1, ingredientName: ingredients[1] });
  };

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
          <div
            key={recipe.id}
            className="grimoire-entry discovered"
            onClick={() => handleRecipeClick(recipe.ingredients)}
            title="Click to auto-fill craft slots"
          >
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

      {state.failedCombos.length > 0 && (
        <div className="grimoire-failed-section">
          <h3 className="inventory-subtitle">
            Failed Brews ({state.failedCombos.length})
          </h3>
          <div className="grimoire-grid">
            {state.failedCombos.map(([a, b], i) => (
              <div
                key={i}
                className="grimoire-entry failed"
                onClick={() => handleRecipeClick([a, b])}
                title="Click to retry"
              >
                <span className="recipe-ingredients">
                  {a} + {b}
                </span>
                <span className="failed-result">→ Soup</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
