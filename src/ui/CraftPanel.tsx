import type { GameState, GameAction } from '../game/state';
import { ALL_INGREDIENTS } from '../game/constants';
import { findRecipe } from '../game/recipes';
import { isFailedCombo } from '../game/engine';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export function CraftPanel({ state, dispatch }: Props) {
  const [slotA, slotB] = state.craftSlots;
  const inv = state.inventory.ingredients;

  // Available ingredients for slot 1 (real inventory)
  const availableForSlot1 = ALL_INGREDIENTS.filter(
    name => (inv[name] ?? 0) > 0,
  );

  // Available ingredients for slot 2 — deduct slot 1's selection
  const availableForSlot2 = ALL_INGREDIENTS.filter(name => {
    const qty = inv[name] ?? 0;
    if (qty <= 0) return false;
    // If this is also selected in slot 1, need 2+ to use in both
    if (slotA.ingredientName === name) return qty >= 2;
    return true;
  });

  // Adjusted inventory display for slot 2 (show qty minus slot 1's use)
  const inventoryForSlot2: Record<string, number> = { ...inv };
  if (slotA.ingredientName && inventoryForSlot2[slotA.ingredientName]) {
    inventoryForSlot2[slotA.ingredientName] -= 1;
  }

  const canCraft =
    slotA.ingredientName !== null &&
    slotB.ingredientName !== null;

  const brewStatus = getBrewStatus(state);

  // Count untried combos with slot 1's ingredient
  const untriedCount = slotA.ingredientName
    ? countUntriedCombos(state, slotA.ingredientName)
    : 0;

  return (
    <section className="panel craft-panel">
      <h2 className="panel-title">Crafting</h2>
      <div className="craft-slots">
        <CraftSlot
          label="Ingredient 1"
          value={slotA.ingredientName}
          available={availableForSlot1}
          inventory={inv}
          onChange={name => dispatch({ type: 'SET_CRAFT_SLOT', slotIndex: 0, ingredientName: name })}
        />
        <span className="craft-plus">+</span>
        <CraftSlot
          label="Ingredient 2"
          value={slotB.ingredientName}
          available={availableForSlot2}
          inventory={inventoryForSlot2}
          onChange={name => dispatch({ type: 'SET_CRAFT_SLOT', slotIndex: 1, ingredientName: name })}
        />
      </div>
      {brewStatus && (
        <div className={`brew-status brew-status-${brewStatus.type}`}>
          {brewStatus.type === 'failed' && '⚠ Already tried → Soup'}
          {brewStatus.type === 'known' && `✓ Known: ${brewStatus.name}`}
        </div>
      )}
      <div className="craft-buttons">
        <button
          className="btn btn-craft"
          disabled={!canCraft}
          onClick={() => dispatch({ type: 'CRAFT' })}
        >
          Brew
        </button>
        {slotA.ingredientName && untriedCount > 0 && (
          <button
            className="btn btn-craft btn-craft-all"
            onClick={() => dispatch({ type: 'CRAFT_ALL' })}
          >
            Brew All Untried ({untriedCount})
          </button>
        )}
      </div>
    </section>
  );
}

function CraftSlot({
  label,
  value,
  available,
  inventory,
  onChange,
}: {
  label: string;
  value: string | null;
  available: string[];
  inventory: Record<string, number>;
  onChange: (name: string | null) => void;
}) {
  return (
    <div className="craft-slot">
      <label className="craft-slot-label">{label}</label>
      <select
        className="craft-select"
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
      >
        <option value="">— Select —</option>
        {available.map(name => (
          <option key={name} value={name}>
            {name} ({inventory[name] ?? 0})
          </option>
        ))}
      </select>
    </div>
  );
}

/** Check if the current slot combo was already tried or is a known recipe. */
function getBrewStatus(
  state: GameState,
): { type: 'failed' } | { type: 'known'; name: string } | null {
  const [slotA, slotB] = state.craftSlots;
  if (!slotA.ingredientName || !slotB.ingredientName) return null;

  const recipe = findRecipe(state.recipes, slotA.ingredientName, slotB.ingredientName);
  if (recipe?.discovered) return { type: 'known', name: recipe.name };

  if (isFailedCombo(state, slotA.ingredientName, slotB.ingredientName)) {
    return { type: 'failed' };
  }

  return null;
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
