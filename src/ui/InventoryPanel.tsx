import type { GameState, GameAction } from '../game/state';
import { ingredientColor } from '../game/constants';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export function InventoryPanel({ state, dispatch }: Props) {
  const { potions } = state.inventory;
  const ingredients = Object.entries(state.inventory.ingredients)
    .filter(([, qty]) => qty > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <section className="panel inventory-panel">
      <h2 className="panel-title">Inventory</h2>

      {/* Potions */}
      {potions.length > 0 && (
        <div className="inventory-section">
          <h3 className="inventory-subtitle">Potions ({potions.length})</h3>
          <div className="potion-list">
            {potions.map((potion, index) => (
              <div key={index} className="potion-item">
                <div className="potion-info">
                  <span className="potion-name">{potion.name}</span>
                  <span className="potion-effect">
                    {formatEffect(potion.effect.type, potion.effect.value)}
                  </span>
                </div>
                <div className="potion-actions">
                  {state.heroes.map(hero => (
                    <button
                      key={hero.id}
                      className="btn btn-sm btn-apply"
                      title={`Give to ${hero.name}`}
                      onClick={() => dispatch({
                        type: 'APPLY_POTION',
                        potionIndex: index,
                        heroId: hero.id,
                      })}
                    >
                      → {hero.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <div className="inventory-section">
          <h3 className="inventory-subtitle">Ingredients</h3>
          <div className="ingredient-list">
            {ingredients.map(([name, qty]) => (
              <div key={name} className="ingredient-item">
                <span className="ingredient-name" style={{ color: ingredientColor(name) }}>{name}</span>
                <span className="ingredient-qty">x{qty}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {potions.length === 0 && ingredients.length === 0 && (
        <p className="empty-state">Nothing yet. Send heroes exploring!</p>
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
