// ═══════════════════════════════════════════════
// RECIPE GENERATION — 30 two-ingredient recipes
// ═══════════════════════════════════════════════
//
// Deterministic from session seed.
// Each recipe: 2 ingredients + PotionEffect (max_hp | power | regen_speed).
// Algorithm ensures:
//   1. All 5 zones contribute ingredients (pinning)
//   2. No duplicate combos
//   3. Effect distribution is balanced

import {
  ALL_INGREDIENTS,
  INGREDIENT_ZONE,
  POTION_ADJECTIVES,
  POTION_NOUNS,
  TOTAL_POTIONS,
  ZONES,
  type PotionEffect,
  type PotionEffectType,
} from './constants';
import { createRng, randInt, randPick, shuffle } from './rng';
import type { Recipe } from './state';

/** Canonical key for an ingredient pair (sorted). */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Generate all 30 recipes deterministically from a seed. */
export function generateRecipes(seed: number): Recipe[] {
  const rng = createRng(seed);
  const recipes: Recipe[] = [];
  const usedPairs = new Set<string>();
  const usedNames = new Set<string>();

  // ── Phase 1: Pinned recipes ──
  // Guarantee each zone has at least 2 recipes using its ingredients.
  // This ensures all zones must be explored to complete the grimoire.
  for (const zone of ZONES) {
    const zoneIngredients = [...zone.ingredients];
    shuffle(rng, zoneIngredients);

    // Create 2 pinned recipes per zone = 10 pinned recipes
    for (let p = 0; p < 2; p++) {
      const a = zoneIngredients[p * 2];
      const b = zoneIngredients[p * 2 + 1] ?? zoneIngredients[(p * 2 + 1) % zoneIngredients.length];
      const key = pairKey(a, b);
      if (usedPairs.has(key)) continue;
      usedPairs.add(key);

      const effect = generateEffect(rng, recipes.length);
      const name = generatePotionName(rng, usedNames);
      recipes.push({
        id: recipes.length,
        name,
        ingredients: a < b ? [a, b] : [b, a],
        effect,
        discovered: false,
      });
    }
  }

  // ── Phase 2: Cross-zone recipes ──
  // Mix ingredients from different zones for the remaining recipes.
  // Prefer mixing adjacent tiers for moderate difficulty ramp.
  const allIngredients = [...ALL_INGREDIENTS];
  let attempts = 0;
  const maxAttempts = 5000;

  while (recipes.length < TOTAL_POTIONS && attempts < maxAttempts) {
    attempts++;
    const a = randPick(rng, allIngredients);
    const b = randPick(rng, allIngredients);
    if (a === b) continue;

    const key = pairKey(a, b);
    if (usedPairs.has(key)) continue;

    // Bias toward cross-zone combos
    const zoneA = INGREDIENT_ZONE[a];
    const zoneB = INGREDIENT_ZONE[b];
    if (zoneA === zoneB && rng() < 0.5) continue;

    usedPairs.add(key);
    const effect = generateEffect(rng, recipes.length);
    const name = generatePotionName(rng, usedNames);
    recipes.push({
      id: recipes.length,
      name,
      ingredients: a < b ? [a, b] : [b, a],
      effect,
      discovered: false,
    });
  }

  return recipes;
}

/** Generate a potion effect based on recipe index for balanced distribution. */
function generateEffect(rng: () => number, index: number): PotionEffect {
  const types: PotionEffectType[] = ['max_hp', 'power', 'regen_speed'];

  // Cycle through types with some randomness to ensure balance
  const baseType = types[index % 3];
  const type = rng() < 0.7 ? baseType : randPick(rng, types);

  let value: number;
  switch (type) {
    case 'max_hp':
      value = randInt(rng, 5, 20);   // +5 to +20 max HP
      break;
    case 'power':
      value = randInt(rng, 1, 5);    // +1 to +5 power
      break;
    case 'regen_speed':
      value = randInt(rng, 1, 3);    // +1 to +3 HP/s regen (significant)
      break;
  }

  return { type, value };
}

/** Generate a unique potion name. */
function generatePotionName(rng: () => number, used: Set<string>): string {
  let name: string;
  let attempts = 0;
  do {
    const adj = randPick(rng, POTION_ADJECTIVES);
    const noun = randPick(rng, POTION_NOUNS);
    name = `${adj} ${noun}`;
    attempts++;
  } while (used.has(name) && attempts < 100);

  used.add(name);
  return name;
}

/** Look up a recipe by ingredient pair. Returns recipe or undefined. */
export function findRecipe(
  recipes: readonly Recipe[],
  ingredientA: string,
  ingredientB: string,
): Recipe | undefined {
  const key = pairKey(ingredientA, ingredientB);
  return recipes.find(r => pairKey(r.ingredients[0], r.ingredients[1]) === key);
}
