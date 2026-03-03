import type { GameState, GameAction } from '../game/state';
import { ALL_INGREDIENTS } from '../game/constants';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export function CraftPanel({ state, dispatch }: Props) {
  const [slotA, slotB] = state.craftSlots;
  const availableIngredients = ALL_INGREDIENTS.filter(
    name => (state.inventory.ingredients[name] ?? 0) > 0,
  );

  const canCraft =
    slotA.ingredientName !== null &&
    slotB.ingredientName !== null;

  return (
    <section className="panel craft-panel">
      <h2 className="panel-title">Crafting</h2>
      <div className="craft-slots">
        <CraftSlot
          label="Ingredient 1"
          value={slotA.ingredientName}
          available={availableIngredients}
          inventory={state.inventory.ingredients}
          onChange={name => dispatch({ type: 'SET_CRAFT_SLOT', slotIndex: 0, ingredientName: name })}
        />
        <span className="craft-plus">+</span>
        <CraftSlot
          label="Ingredient 2"
          value={slotB.ingredientName}
          available={availableIngredients}
          inventory={state.inventory.ingredients}
          onChange={name => dispatch({ type: 'SET_CRAFT_SLOT', slotIndex: 1, ingredientName: name })}
        />
      </div>
      <button
        className="btn btn-craft"
        disabled={!canCraft}
        onClick={() => dispatch({ type: 'CRAFT' })}
      >
        Brew
      </button>
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
