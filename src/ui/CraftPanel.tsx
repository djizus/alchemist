import type { GameState, GameAction } from '../game/state';
import { ALL_INGREDIENTS, ingredientColor } from '../game/constants';
import { findRecipe } from '../game/recipes';
import { isFailedCombo } from '../game/engine';
import { ingredientIconUrl } from './assetUrl';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export function CraftPanel({ state, dispatch }: Props) {
  const slotA = state.craftSlots[0];
  const inv = state.inventory.ingredients;

  // Only show ingredients the player owns
  const available = ALL_INGREDIENTS.filter(
    name => (inv[name] ?? 0) > 0,
  );

  // If selected ingredient is no longer in inventory, clear it
  const selected = slotA.ingredientName && available.includes(slotA.ingredientName)
    ? slotA.ingredientName
    : null;

  // Count untried combos with the selected ingredient
  const untriedCount = selected
    ? countUntriedCombos(state, selected)
    : 0;

  return (
    <section className="panel craft-panel">
      <h2 className="panel-title">Crafting</h2>
      <div className="craft-slot">
        <label className="craft-slot-label">Ingredient</label>
        <div className="craft-select-row">
          {selected && <img className="item-icon" src={ingredientIconUrl(selected)} alt="" />}
          <select
            className="craft-select"
            value={selected ?? ''}
            onChange={e => dispatch({ type: 'SET_CRAFT_SLOT', slotIndex: 0, ingredientName: e.target.value || null })}
          >
            <option value="">— Select —</option>
            {available.map(name => {
              const untried = countUntriedCombos(state, name);
              return (
                <option key={name} value={name} style={{ color: ingredientColor(name) }}>
                  {name} ({inv[name] ?? 0}) {untried > 0 ? `· ${untried} untried` : ''}
                </option>
              );
            })}
          </select>
        </div>
      </div>
      <button
        className="btn btn-craft"
        disabled={untriedCount === 0}
        onClick={() => dispatch({ type: 'CRAFT_NEXT' })}
      >
        Brew Untried ({untriedCount})
      </button>
    </section>
  );
}

/** Count how many untried ingredient combinations exist with a given base ingredient. */
function countUntriedCombos(state: GameState, base: string): number {
  const inv = state.inventory.ingredients;
  let count = 0;
  for (const partner of Object.keys(inv)) {
    if (partner === base && (inv[partner] ?? 0) < 2) continue;
    if ((inv[partner] ?? 0) < 1) continue;
    const recipe = findRecipe(state.recipes, base, partner);
    if (recipe?.discovered) continue;
    if (isFailedCombo(state, base, partner)) continue;
    count++;
  }
  return count;
}
