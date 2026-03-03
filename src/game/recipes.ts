// ═══════════════════════════════════════════════
// RECIPE GENERATION — Full spec algorithm
// ═══════════════════════════════════════════════

import { createRng } from './rng';
import type { Recipe } from './state';
import {
  ZONES,
  ALL_INGREDIENTS,
  INGREDIENT_ZONE,
  TOTAL_POTIONS,
  RECIPE_2_COUNT,
  RECIPE_3_COUNT,
  POTION_ADJECTIVES,
  POTION_NOUNS,
} from './constants';

function comboKey(ingredients: string[]): string {
  return ingredients.slice().sort().join('|');
}

function highestZoneTier(ingredients: string[]): number {
  return Math.max(...ingredients.map(ing => INGREDIENT_ZONE[ing] ?? 0));
}

/**
 * Generate all recipes for a session. Deterministic given the seed.
 *
 * Algorithm per spec:
 * Phase 1: Pinned recipes — guarantee zone coverage (2-3 per zone, ~12-13)
 * Phase 2: Fill remaining 2-ingredient recipes up to ~32
 * Phase 3: 3-ingredient recipes (~13)
 * Phase 4: 4-ingredient recipes (~5)
 * Post-check: every ingredient appears in at least 1 recipe
 */
export function generateRecipes(seed: number): Recipe[] {
  const rng = createRng(seed);
  const recipes: Recipe[] = [];
  const usedCombos = new Set<string>();

  // Generate unique potion names
  const potionNames = generatePotionNames(seed);

  let potionIdx = 0;

  function addRecipe(ingredients: string[], size: number): boolean {
    if (potionIdx >= TOTAL_POTIONS) return false;
    const key = comboKey(ingredients);
    if (usedCombos.has(key)) return false;
    usedCombos.add(key);
    recipes.push({
      id: potionIdx,
      name: potionNames[potionIdx],
      ingredients: ingredients.slice().sort(),
      size,
      tier: highestZoneTier(ingredients),
    });
    potionIdx++;
    return true;
  }

  // ─── Phase 1: Pinned recipes (zone coverage) ───
  // For each zone, generate 2-3 recipes with at least 1 pinned ingredient
  for (let z = 0; z < 5; z++) {
    const count = z < 3 ? 3 : 2; // more recipes for easier zones
    for (let r = 0; r < count; r++) {
      const pinned = ZONES[z].ingredients[rng.nextInt(5)];
      // Second ingredient from any zone <= current+1
      const maxZone = Math.min(z + 1, 4);
      let other: string;
      let attempts = 0;
      do {
        other = ZONES[rng.nextInt(maxZone + 1)].ingredients[rng.nextInt(5)];
        attempts++;
      } while (other === pinned && attempts < 50);

      if (other !== pinned) {
        addRecipe([pinned, other], 2);
      }
    }
  }

  // ─── Phase 2: Fill remaining 2-ingredient recipes ───
  let safety = 0;
  while (potionIdx < RECIPE_2_COUNT && potionIdx < TOTAL_POTIONS && safety < 500) {
    safety++;
    const a = rng.pick(ALL_INGREDIENTS);
    let b: string;
    let attempts = 0;
    do {
      b = rng.pick(ALL_INGREDIENTS);
      attempts++;
    } while (b === a && attempts < 50);
    if (b !== a) {
      addRecipe([a, b], 2);
    }
  }

  // ─── Phase 3: 3-ingredient recipes ───
  const target3 = potionIdx + RECIPE_3_COUNT;
  safety = 0;
  while (potionIdx < target3 && potionIdx < TOTAL_POTIONS && safety < 500) {
    safety++;
    // At least 1 from zone B or higher
    const highZone = 2 + rng.nextInt(3); // zones B(2), A(3), S(4)
    const a = ZONES[highZone].ingredients[rng.nextInt(5)];
    let b: string;
    let attempts = 0;
    do {
      b = rng.pick(ALL_INGREDIENTS);
      attempts++;
    } while (b === a && attempts < 50);
    let c: string;
    attempts = 0;
    do {
      c = rng.pick(ALL_INGREDIENTS);
      attempts++;
    } while ((c === a || c === b) && attempts < 50);

    if (a !== b && a !== c && b !== c) {
      addRecipe([a, b, c], 3);
    }
  }

  // ─── Phase 4: 4-ingredient recipes ───
  safety = 0;
  while (potionIdx < TOTAL_POTIONS && safety < 500) {
    safety++;
    // At least 1 pinned from zone A or S
    const pinZone = 3 + rng.nextInt(2); // zone A(3) or S(4)
    const pinned = ZONES[pinZone].ingredients[rng.nextInt(5)];
    const a = rng.pick(ALL_INGREDIENTS);
    let b: string;
    let attempts = 0;
    do {
      b = rng.pick(ALL_INGREDIENTS);
      attempts++;
    } while ((b === a || b === pinned) && attempts < 50);
    let c: string;
    attempts = 0;
    do {
      c = rng.pick(ALL_INGREDIENTS);
      attempts++;
    } while ((c === a || c === b || c === pinned) && attempts < 50);

    const ings = [pinned, a, b, c];
    // Ensure all 4 are unique
    const unique = new Set(ings);
    if (unique.size === 4) {
      addRecipe(Array.from(unique), 4);
    }
  }

  // ─── Post-check: every ingredient in at least 1 recipe ───
  const usedIngredients = new Set<string>();
  recipes.forEach(r => r.ingredients.forEach(ing => usedIngredients.add(ing)));

  const orphans = ALL_INGREDIENTS.filter(ing => !usedIngredients.has(ing));
  for (const orphan of orphans) {
    // Replace the last 2-ingredient recipe that doesn't create a dup
    for (let i = recipes.length - 1; i >= 0; i--) {
      if (recipes[i].size === 2) {
        const partner = rng.pick(ALL_INGREDIENTS.filter(x => x !== orphan));
        const key = comboKey([orphan, partner]);
        if (!usedCombos.has(key)) {
          // Remove old combo key
          usedCombos.delete(comboKey(recipes[i].ingredients));
          usedCombos.add(key);
          recipes[i] = {
            ...recipes[i],
            ingredients: [orphan, partner].sort(),
            tier: highestZoneTier([orphan, partner]),
          };
          break;
        }
      }
    }
  }

  return recipes.slice(0, TOTAL_POTIONS);
}

function generatePotionNames(seed: number): string[] {
  const rng = createRng(seed + 999); // offset seed to avoid correlation with recipe RNG
  const names: string[] = [];
  const used = new Set<string>();

  for (let i = 0; i < TOTAL_POTIONS; i++) {
    let name: string;
    let attempts = 0;
    do {
      name = rng.pick(POTION_ADJECTIVES) + ' ' + rng.pick(POTION_NOUNS);
      attempts++;
    } while (used.has(name) && attempts < 200);
    used.add(name);
    names.push(name);
  }

  return names;
}
