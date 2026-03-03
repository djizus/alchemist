import { useState } from 'react';
import type { GameState, GameAction, Recipe } from '../game/state';
import { TOTAL_POTIONS } from '../game/constants';

type EffectFilter = 'all' | 'max_hp' | 'power' | 'regen_speed';

const FILTER_TABS: { key: EffectFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'max_hp', label: 'Max HP' },
  { key: 'power', label: 'Power' },
  { key: 'regen_speed', label: 'Regen' },
];

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export function GrimoirePanel({ state, dispatch }: Props) {
  const [filter, setFilter] = useState<EffectFilter>('all');

  const discovered = state.recipes.filter(r => r.discovered);
  const undiscoveredCount = TOTAL_POTIONS - discovered.length;
  const progressPct = (discovered.length / TOTAL_POTIONS) * 100;

  // Filter by effect type
  const filtered = filter === 'all'
    ? discovered
    : discovered.filter(r => r.effect.type === filter);

  // Sort: craftable first, then by effect value descending
  const sorted = [...filtered].sort((a, b) => {
    const aCraft = canCraftRecipe(state, a.ingredients) ? 1 : 0;
    const bCraft = canCraftRecipe(state, b.ingredients) ? 1 : 0;
    if (aCraft !== bCraft) return bCraft - aCraft;
    return b.effect.value - a.effect.value;
  });

  const handleRecipeClick = (ingredients: [string, string]) => {
    dispatch({ type: 'SET_CRAFT_SLOT', slotIndex: 0, ingredientName: ingredients[0] });
    dispatch({ type: 'SET_CRAFT_SLOT', slotIndex: 1, ingredientName: ingredients[1] });
  };

  return (
    <section className="panel grimoire-panel">
      <h2 className="panel-title">
        <span>Grimoire ({discovered.length}/{TOTAL_POTIONS}){state.failedCombos.length > 0 && (
          <span className="grimoire-failed-count"> — {state.failedCombos.length} failed</span>
        )}</span>
        <span className="grimoire-meter">
          <span
            className="grimoire-meter-fill"
            style={{ width: `${progressPct}%` }}
          />
        </span>
      </h2>
      <div className="grimoire-filters">
        {FILTER_TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`grimoire-filter-btn${filter === key ? ' active' : ''}`}
            onClick={() => setFilter(key)}
          >
            {label}
            {key !== 'all' && (
              <span className="filter-count">
                {countByType(discovered, key)}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="grimoire-grid">
        {sorted.map(recipe => {
          const brewCount = maxBrewCount(state, recipe.ingredients);
          return (
            <div
              key={recipe.id}
              className={`grimoire-entry discovered${brewCount > 0 ? ' craftable' : ''}`}
              onClick={() => handleRecipeClick(recipe.ingredients)}
              title={brewCount > 0 ? 'Ingredients available \u2014 click to auto-fill' : 'Click to auto-fill craft slots'}
            >
              <div className="recipe-info">
                <span className="recipe-name">{recipe.name}</span>
                <span className="recipe-ingredients">
                  {recipe.ingredients[0]} + {recipe.ingredients[1]}
                </span>
                <span className="recipe-effect">
                  {formatEffect(recipe.effect.type, recipe.effect.value)}
                </span>
              </div>
              {brewCount > 0 && (
                <button
                  className="btn btn-sm btn-brew-inline"
                  onClick={e => {
                    e.stopPropagation();
                    dispatch({ type: 'CRAFT_RECIPE', recipeId: recipe.id });
                  }}
                  title={`Brew all ${brewCount}`}
                >
                  Brew \u00d7{brewCount}
                </button>
              )}
            </div>
          );
        })}
        {filter === 'all' && Array.from({ length: undiscoveredCount }).map((_, i) => (
          <div key={`undiscovered-${i}`} className="grimoire-entry undiscovered">
            ???
          </div>
        ))}
      </div>

      {filter === 'all' && state.failedCombos.length > 0 && (
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

/** Check if the player has both ingredients to craft a recipe. */
function canCraftRecipe(state: GameState, ingredients: [string, string]): boolean {
  return maxBrewCount(state, ingredients) > 0;
}

/** How many times can this recipe be brewed with current inventory? */
function maxBrewCount(state: GameState, ingredients: [string, string]): number {
  const [a, b] = ingredients;
  const inv = state.inventory.ingredients;
  if (a === b) return Math.floor((inv[a] ?? 0) / 2);
  return Math.min(inv[a] ?? 0, inv[b] ?? 0);
}

function countByType(recipes: Recipe[], type: EffectFilter): number {
  return recipes.filter(r => r.effect.type === type).length;
}

function formatEffect(type: string, value: number): string {
  switch (type) {
    case 'max_hp': return `+${value} Max HP`;
    case 'power': return `+${value} Power`;
    case 'regen_speed': return `+${value} HP/s`;
    default: return `+${value}`;
  }
}
