import { useState } from 'react';
import type { GameState, GameAction, Recipe } from '../game/state';
import { TOTAL_POTIONS, HINT_BASE_COST, HINT_COST_MULTIPLIER, ingredientColor } from '../game/constants';
import { ingredientIconUrl, potionIconUrl, soupIconUrl } from './assetUrl';

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

  // Hinted recipes (undiscovered but with one ingredient revealed)
  const hinted = state.recipes.filter(r => !r.discovered && state.hintedRecipeIds.includes(r.id));

  // Hint cost
  const nextHintCost = HINT_BASE_COST * Math.pow(HINT_COST_MULTIPLIER, state.hintedRecipeIds.length);
  const canAffordHint = state.inventory.gold >= nextHintCost;
  const hasUnhinted = state.recipes.some(r => !r.discovered && !state.hintedRecipeIds.includes(r.id));

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
              title={brewCount > 0 ? 'Ingredients available — click to auto-fill' : 'Click to auto-fill craft slots'}
            >
              <img className="item-icon item-icon-lg" src={potionIconUrl(recipe.effect.type)} alt="" />
              <div className="recipe-info">
                <span className="recipe-name">{recipe.name}</span>
                <span className="recipe-ingredients">
                  <img className="item-icon-sm" src={ingredientIconUrl(recipe.ingredients[0])} alt="" />
                  <span style={{ color: ingredientColor(recipe.ingredients[0]) }}>{recipe.ingredients[0]}</span>
                  {' + '}
                  <img className="item-icon-sm" src={ingredientIconUrl(recipe.ingredients[1])} alt="" />
                  <span style={{ color: ingredientColor(recipe.ingredients[1]) }}>{recipe.ingredients[1]}</span>
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
                  Brew x{brewCount}
                </button>
              )}
            </div>
          );
        })}

        {/* Hinted recipes — show one ingredient */}
        {filter === 'all' && hinted.map(recipe => (
          <div key={recipe.id} className="grimoire-entry hinted">
            <span className="recipe-ingredients">
              <img className="item-icon-sm" src={ingredientIconUrl(recipe.ingredients[0])} alt="" />
              <span style={{ color: ingredientColor(recipe.ingredients[0]) }}>{recipe.ingredients[0]}</span>
              {' + ???'}
            </span>
          </div>
        ))}

        {/* Undiscovered (no hint) */}
        {filter === 'all' && Array.from({ length: undiscoveredCount - hinted.length }).map((_, i) => (
          <div key={`undiscovered-${i}`} className="grimoire-entry undiscovered">
            ???
          </div>
        ))}
      </div>

      {/* Buy Hint button */}
      {filter === 'all' && undiscoveredCount > 0 && hasUnhinted && (
        <button
          className="btn btn-hint"
          disabled={!canAffordHint}
          onClick={() => dispatch({ type: 'BUY_HINT' })}
          title={`Reveal one ingredient of a hidden recipe (${nextHintCost}g)`}
        >
          Buy Hint ({nextHintCost}g)
        </button>
      )}

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
                <img className="item-icon-sm" src={soupIconUrl()} alt="" />
                <span className="recipe-ingredients">
                  <img className="item-icon-sm" src={ingredientIconUrl(a)} alt="" />
                  <span style={{ color: ingredientColor(a) }}>{a}</span>
                  {' + '}
                  <img className="item-icon-sm" src={ingredientIconUrl(b)} alt="" />
                  <span style={{ color: ingredientColor(b) }}>{b}</span>
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
