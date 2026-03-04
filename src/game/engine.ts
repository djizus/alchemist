// ═══════════════════════════════════════════════
// GAME ENGINE — Core reducer + logic
// ═══════════════════════════════════════════════

import {
  CRAFT_SLOTS,
  HERO_BASE_HP,
  HERO_BASE_POWER,
  HERO_BASE_REGEN,
  HERO_COSTS,
  HERO_NAMES,
  HINT_BASE_COST,
  HINT_COST_MULTIPLIER,
  MAX_HEROES,
  PROGRESSIVE_CAP,
  PROGRESSIVE_EXPONENT,
  SOUP_GOLD_VALUE,
  TICK_INTERVAL,
  TOTAL_POSSIBLE_2_COMBOS,
  TOTAL_POTIONS,
  ZONES,
  type ZoneData,
} from './constants';
import { createRng, randInt, randPick, type Rng } from './rng';
import { generateRecipes, findRecipe } from './recipes';
import type {
  ExplorationEvent,
  GameAction,
  GameNotification,
  GameState,
  Hero,
  PendingLoot,
} from './state';

// ─── Constants ───

/** Return journey speed: hero returns at 2× the speed they explored. */
const RETURN_SPEED_MULTIPLIER = 2;

// ─── State Factory ───

export function createInitialState(seed: number): GameState {
  const recipes = generateRecipes(seed);
  return {
    seed,
    rngState: seed,
    tick: 0,
    elapsedMs: 0,
    heroes: [createHero(0)],
    recipes,
    inventory: { gold: 0, ingredients: {}, potions: [] },
    craftSlots: [{ ingredientName: null }, { ingredientName: null }],
    discoveredCount: 0,
    craftAttempts: 0,
    failedCombos: [],
    hintedRecipeIds: [],
    notifications: [],
    nextNotificationId: 0,
    gameOver: false,
  };
}

function createHero(id: number): Hero {
  return {
    id,
    name: HERO_NAMES[id],
    hp: HERO_BASE_HP,
    stats: {
      maxHp: HERO_BASE_HP,
      power: HERO_BASE_POWER,
      regenPerSec: HERO_BASE_REGEN,
    },
    status: 'idle',
    depth: 0,
    pendingLoot: { gold: 0, ingredients: {} },
    eventLog: [],
    lastEventTime: 0,
    returnTimer: 0,
    returnTimerMax: 0,
  };
}

// ─── Reducer ───

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (state.gameOver && action.type !== 'RESET') return state;

  switch (action.type) {
    case 'TICK':
      return handleTick(state, action.dt);
    case 'SEND_EXPEDITION':
      return handleSendExpedition(state, action.heroId);
    case 'CLAIM_LOOT':
      return handleClaimLoot(state, action.heroId);
    case 'SET_CRAFT_SLOT':
      return handleSetCraftSlot(state, action.slotIndex, action.ingredientName);
    case 'CRAFT':
      return handleCraft(state);
    case 'CRAFT_ALL':
      return handleCraftAll(state);
    case 'CRAFT_RECIPE':
      return handleCraftRecipe(state, action.recipeId);
    case 'CRAFT_NEXT':
      return handleCraftNext(state);
    case 'BUY_HINT':
      return handleBuyHint(state);
    case 'APPLY_POTION':
      return handleApplyPotion(state, action.potionIndex, action.heroId);
    case 'RECRUIT_HERO':
      return handleRecruitHero(state);
    case 'RESET':
      return createInitialState(action.seed);
    case 'DISMISS_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.id),
      };
    default:
      return state;
  }
}

// ─── TICK (runs every TICK_INTERVAL ms) ───

function handleTick(state: GameState, dt: number): GameState {
  let s = { ...state, tick: state.tick + 1, elapsedMs: state.elapsedMs + dt };
  s = { ...s, heroes: s.heroes.map(h => tickHero(h, s)) };

  // Auto-dismiss notifications older than 5 seconds
  const cutoff = s.elapsedMs - 5000;
  if (s.notifications.length > 0 && s.notifications[0].timestamp < cutoff) {
    s = { ...s, notifications: s.notifications.filter(n => n.timestamp >= cutoff) };
  }

  return s;
}

function tickHero(hero: Hero, state: GameState): Hero {
  switch (hero.status) {
    case 'idle':
      return tickIdleHero(hero);
    case 'exploring':
      return tickExploringHero(hero, state);
    case 'returning':
      return tickReturningHero(hero);
    default:
      return hero;
  }
}

function tickIdleHero(hero: Hero): Hero {
  // Regen HP when idle (and not at full HP)
  if (hero.hp >= hero.stats.maxHp) return hero;

  const regenAmount = hero.stats.regenPerSec * (TICK_INTERVAL / 1000);
  const newHp = Math.min(hero.stats.maxHp, hero.hp + regenAmount);
  return { ...hero, hp: newHp };
}

function tickExploringHero(hero: Hero, state: GameState): Hero {
  let h = { ...hero };
  const rng = createRng(state.seed ^ (h.id * 7919 + state.tick));

  // Advance depth (depth = seconds explored, tick = 100ms → add 0.1s per tick)
  h.depth += TICK_INTERVAL / 1000;

  // ── Zone HP drain: 1 HP × (zoneIndex + 1) per second ──
  const zone = getCurrentZone(h.depth);
  const drainPerSecond = zone.id + 1; // Zone D=1, C=2, B=3, A=4, S=5
  const drainThisTick = drainPerSecond * (TICK_INTERVAL / 1000);
  h.hp = Math.max(0, h.hp - drainThisTick);

  // Check for events every 1 second
  const prevSecond = Math.floor(h.depth - TICK_INTERVAL / 1000);
  const currSecond = Math.floor(h.depth);
  if (currSecond > prevSecond && currSecond > 0) {
    const event = rollExplorationEvent(rng, zone, h);

    if (event) {
      h = applyExplorationEvent(h, event);
      h.eventLog = [...h.eventLog, event];
    }

    // Ingredient drops (independent of event)
    if (rng() < zone.ingredientDropChance) {
      const qty = randInt(rng, zone.ingredientDropQty[0], zone.ingredientDropQty[1]);
      const ingredient = randPick(rng, zone.ingredients);
      const newIngredients = { ...h.pendingLoot.ingredients };
      newIngredients[ingredient] = (newIngredients[ingredient] ?? 0) + qty;
      h.pendingLoot = { ...h.pendingLoot, ingredients: newIngredients };
      h.eventLog = [
        ...h.eventLog,
        {
          kind: 'ingredient_drop',
          depth: h.depth,
          zoneId: zone.id,
          value: qty,
          message: `Found ${qty}x ${ingredient}`,
        },
      ];
    }
  }

  // Check if hero died (HP <= 0) → start return journey
  if (h.hp <= 0) {
    h.hp = 0;
    return startReturnJourney(h);
  }

  return h;
}

/** Tick a returning hero — countdown return timer. */
function tickReturningHero(hero: Hero): Hero {
  const dt = TICK_INTERVAL / 1000;
  const newTimer = Math.max(0, hero.returnTimer - dt);

  if (newTimer <= 0) {
    // Arrived home — switch to idle, keep pendingLoot for claiming
    return {
      ...hero,
      status: 'idle',
      returnTimer: 0,
      depth: 0,
    };
  }

  return { ...hero, returnTimer: newTimer };
}

/** Start the return journey — hero travels back at 2× speed. */
function startReturnJourney(hero: Hero): Hero {
  const travelTime = Math.max(1, hero.depth / RETURN_SPEED_MULTIPLIER);
  return {
    ...hero,
    status: 'returning',
    returnTimer: travelTime,
    returnTimerMax: travelTime,
  };
}

/** Get the current zone based on exploration depth. */
export function getCurrentZone(depth: number): ZoneData {
  let current = ZONES[0];
  for (const zone of ZONES) {
    if (depth >= zone.depthThreshold) {
      current = zone;
    } else {
      break;
    }
  }
  return current;
}

/** Roll for an exploration event based on current zone probabilities. */
function rollExplorationEvent(
  rng: Rng,
  zone: ZoneData,
  hero: Hero,
): ExplorationEvent | null {
  const roll = rng();
  let cumulative = 0;

  // Trap
  cumulative += zone.trapChance;
  if (roll < cumulative) {
    const damage = randInt(rng, zone.trapDamage[0], zone.trapDamage[1]);
    return {
      kind: 'trap',
      depth: hero.depth,
      zoneId: zone.id,
      value: damage,
      message: `Triggered a trap! -${damage} HP`,
    };
  }

  // Gold
  cumulative += zone.goldChance;
  if (roll < cumulative) {
    const gold = randInt(rng, zone.goldReward[0], zone.goldReward[1]);
    return {
      kind: 'gold',
      depth: hero.depth,
      zoneId: zone.id,
      value: gold,
      message: `Found ${gold} gold!`,
    };
  }

  // Heal
  cumulative += zone.healChance;
  if (roll < cumulative) {
    const heal = randInt(rng, zone.healAmount[0], zone.healAmount[1]);
    return {
      kind: 'heal',
      depth: hero.depth,
      zoneId: zone.id,
      value: heal,
      message: `Found a healing spring! +${heal} HP`,
    };
  }

  // Beast
  cumulative += zone.beastChance;
  if (roll < cumulative) {
    const beastPower = randInt(rng, zone.beastPower[0], zone.beastPower[1]);
    if (hero.stats.power >= beastPower) {
      const loot = randInt(rng, zone.beastLootGold[0], zone.beastLootGold[1]);
      return {
        kind: 'beast_win',
        depth: hero.depth,
        zoneId: zone.id,
        value: loot,
        message: `Slew a beast (pow ${beastPower})! +${loot} gold`,
      };
    } else {
      const damage = randInt(rng, zone.trapDamage[0], zone.trapDamage[1]) + beastPower;
      return {
        kind: 'beast_lose',
        depth: hero.depth,
        zoneId: zone.id,
        value: damage,
        message: `Ambushed by a beast (pow ${beastPower})! -${damage} HP`,
      };
    }
  }

  // Nothing
  return null;
}

/** Apply an exploration event to the hero. */
function applyExplorationEvent(hero: Hero, event: ExplorationEvent): Hero {
  let h = { ...hero };

  switch (event.kind) {
    case 'trap':
      h.hp = Math.max(0, h.hp - event.value);
      break;
    case 'gold':
      h.pendingLoot = { ...h.pendingLoot, gold: h.pendingLoot.gold + event.value };
      break;
    case 'heal':
      h.hp = Math.min(h.stats.maxHp, h.hp + event.value);
      break;
    case 'beast_win':
      // Minor damage from combat + gold loot
      h.pendingLoot = { ...h.pendingLoot, gold: h.pendingLoot.gold + event.value };
      h.hp = Math.max(0, h.hp - Math.floor(event.value * 0.2));
      break;
    case 'beast_lose':
      h.hp = Math.max(0, h.hp - event.value);
      break;
  }

  return h;
}

// ─── SEND EXPEDITION ───

function handleSendExpedition(state: GameState, heroId: number): GameState {
  const hero = state.heroes.find(h => h.id === heroId);
  if (!hero || hero.status !== 'idle' || hero.hp <= 0) return state;

  // Must have claimed any previous loot
  if (hasPendingLoot(hero)) return state;

  const s: GameState = {
    ...state,
    heroes: state.heroes.map(h =>
      h.id === heroId
        ? {
            ...h,
            status: 'exploring' as const,
            depth: 0,
            pendingLoot: { gold: 0, ingredients: {} },
            eventLog: [],
            lastEventTime: 0,
            returnTimer: 0,
            returnTimerMax: 0,
          }
        : h,
    ),
  };

  return addNotification(s, `${hero.name} sets out exploring!`, 'info');
}


// ─── CLAIM LOOT ───

function handleClaimLoot(state: GameState, heroId: number): GameState {
  const hero = state.heroes.find(h => h.id === heroId);
  if (!hero || hero.status !== 'idle') return state;
  if (!hasPendingLoot(hero)) return state;

  const loot = hero.pendingLoot;
  const newInventory = { ...state.inventory };
  newInventory.gold += loot.gold;

  const newIngredients = { ...newInventory.ingredients };
  for (const [name, qty] of Object.entries(loot.ingredients)) {
    newIngredients[name] = (newIngredients[name] ?? 0) + qty;
  }
  newInventory.ingredients = newIngredients;

  const ingredientCount = Object.values(loot.ingredients).reduce((s, q) => s + q, 0);
  const lootSummary = [
    loot.gold > 0 ? `${loot.gold}g` : '',
    ingredientCount > 0 ? `${ingredientCount} ingredients` : '',
  ].filter(Boolean).join(', ');

  let s: GameState = {
    ...state,
    inventory: newInventory,
    heroes: state.heroes.map(h =>
      h.id === heroId
        ? {
            ...h,
            pendingLoot: { gold: 0, ingredients: {} } as PendingLoot,
            eventLog: [],
          }
        : h,
    ),
  };

  return addNotification(s, `${hero.name}'s yield collected: ${lootSummary}`, 'gold');
}

/** Check if a hero has unclaimed loot. */
export function hasPendingLoot(hero: Hero): boolean {
  return hero.pendingLoot.gold > 0 || Object.keys(hero.pendingLoot.ingredients).length > 0;
}

/** Check if an ingredient combo was already tried and failed. */
export function isFailedCombo(state: GameState, a: string, b: string): boolean {
  const [x, y] = a < b ? [a, b] : [b, a];
  return state.failedCombos.some(([fa, fb]) => fa === x && fb === y);
}

// ─── CRAFTING ───

function handleSetCraftSlot(
  state: GameState,
  slotIndex: number,
  ingredientName: string | null,
): GameState {
  if (slotIndex < 0 || slotIndex >= CRAFT_SLOTS) return state;

  const newSlots = [...state.craftSlots] as [typeof state.craftSlots[0], typeof state.craftSlots[1]];
  newSlots[slotIndex] = { ingredientName };
  return { ...state, craftSlots: newSlots };
}

function handleCraft(state: GameState): GameState {
  const [slotA, slotB] = state.craftSlots;
  if (!slotA.ingredientName || !slotB.ingredientName) return state;

  // Check inventory
  const inv = state.inventory;
  const countA = inv.ingredients[slotA.ingredientName] ?? 0;
  const countB = inv.ingredients[slotB.ingredientName] ?? 0;

  // Handle same ingredient used in both slots
  if (slotA.ingredientName === slotB.ingredientName) {
    if (countA < 2) return state;
  } else {
    if (countA < 1 || countB < 1) return state;
  }

  // Consume ingredients
  const newIngredients = { ...inv.ingredients };
  newIngredients[slotA.ingredientName] = (newIngredients[slotA.ingredientName] ?? 0) - 1;
  newIngredients[slotB.ingredientName] = (newIngredients[slotB.ingredientName] ?? 0) - 1;

  // Clean up zero-quantity entries
  for (const key of Object.keys(newIngredients)) {
    if (newIngredients[key] <= 0) delete newIngredients[key];
  }

  let s: GameState = {
    ...state,
    inventory: { ...inv, ingredients: newIngredients },
    craftAttempts: state.craftAttempts + 1,
  };

  // Look up recipe
  const recipe = findRecipe(s.recipes, slotA.ingredientName, slotB.ingredientName);

  if (recipe) {
    // Known or new recipe → produce potion
    const isNewDiscovery = !recipe.discovered;

    if (isNewDiscovery) {
      const newRecipes = s.recipes.map(r =>
        r.id === recipe.id ? { ...r, discovered: true } : r,
      );
      const newCount = s.discoveredCount + 1;
      s = {
        ...s,
        recipes: newRecipes,
        discoveredCount: newCount,
        inventory: {
          ...s.inventory,
          potions: [
            ...s.inventory.potions,
            { recipeId: recipe.id, name: recipe.name, effect: recipe.effect },
          ],
        },
        gameOver: newCount >= TOTAL_POTIONS,
      };
      s = addNotification(s, `Discovered: ${recipe.name}!`, 'discovery');
    } else {
      // Already discovered — still produces a potion
      s = {
        ...s,
        inventory: {
          ...s.inventory,
          potions: [
            ...s.inventory.potions,
            { recipeId: recipe.id, name: recipe.name, effect: recipe.effect },
          ],
        },
      };
      s = addNotification(s, `Brewed: ${recipe.name}`, 'success');
    }
  } else {
    // No recipe match → record the failed combo
    const sortedPair: [string, string] = slotA.ingredientName < slotB.ingredientName
      ? [slotA.ingredientName, slotB.ingredientName]
      : [slotB.ingredientName, slotA.ingredientName];
    const alreadyFailed = s.failedCombos.some(
      ([a, b]) => a === sortedPair[0] && b === sortedPair[1],
    );
    if (!alreadyFailed) {
      s = { ...s, failedCombos: [...s.failedCombos, sortedPair] };
    }

    // Check progressive probability for "lucky" discovery
    const rng = createRng(s.seed ^ s.craftAttempts);
    const progressiveChance = calculateProgressiveChance(s);

    if (rng() < progressiveChance) {
      // Lucky discovery: find a random undiscovered recipe
      const undiscovered = s.recipes.filter(r => !r.discovered);
      if (undiscovered.length > 0) {
        const luckyRng = createRng(s.seed ^ (s.craftAttempts * 31));
        const luckyRecipe = undiscovered[Math.floor(luckyRng() * undiscovered.length)];
        const newRecipes = s.recipes.map(r =>
          r.id === luckyRecipe.id ? { ...r, discovered: true } : r,
        );
        const newCount = s.discoveredCount + 1;
        s = {
          ...s,
          recipes: newRecipes,
          discoveredCount: newCount,
          inventory: {
            ...s.inventory,
            gold: s.inventory.gold + SOUP_GOLD_VALUE,
            potions: [
              ...s.inventory.potions,
              { recipeId: luckyRecipe.id, name: luckyRecipe.name, effect: luckyRecipe.effect },
            ],
          },
          gameOver: newCount >= TOTAL_POTIONS,
        };
        s = addNotification(s, `Lucky discovery: ${luckyRecipe.name}!`, 'discovery');
      }
    } else {
      // Failure → soup
      s = {
        ...s,
        inventory: { ...s.inventory, gold: s.inventory.gold + SOUP_GOLD_VALUE },
      };
      s = addNotification(s, `Failed brew → Mysterious Soup (+${SOUP_GOLD_VALUE}g)`, 'info');
    }
  }

  // Clear craft slots
  s = { ...s, craftSlots: [s.craftSlots[0], { ingredientName: null }] };
  return s;
}

/** Batch-brew: try all untried combos with the ingredient in slot 1. */
function handleCraftAll(state: GameState): GameState {
  const baseIngredient = state.craftSlots[0].ingredientName;
  if (!baseIngredient) return state;

  let s = state;
  const candidates = Object.keys(s.inventory.ingredients);

  for (const partner of candidates) {
    const baseQty = s.inventory.ingredients[baseIngredient] ?? 0;
    if (baseQty < 1) break;

    const needed = partner === baseIngredient ? 2 : 1;
    if ((s.inventory.ingredients[partner] ?? 0) < needed) continue;

    const recipe = findRecipe(s.recipes, baseIngredient, partner);
    if (recipe?.discovered) continue;
    if (isFailedCombo(s, baseIngredient, partner)) continue;

    s = { ...s, craftSlots: [{ ingredientName: baseIngredient }, { ingredientName: partner }] };
    s = handleCraft(s);

    if (s.gameOver) break;
  }

  s = { ...s, craftSlots: [{ ingredientName: baseIngredient }, { ingredientName: null }] };
  s = autoSelectNextIngredient(s);
  return s;
}

/** Brew a known recipe as many times as ingredients allow. */
function handleCraftRecipe(state: GameState, recipeId: number): GameState {
  const recipe = state.recipes.find(r => r.id === recipeId);
  if (!recipe || !recipe.discovered) return state;

  const [ingA, ingB] = recipe.ingredients;
  let s = state;
  let brewed = 0;

  for (;;) {
    const inv = s.inventory;
    const qtyA = inv.ingredients[ingA] ?? 0;
    const qtyB = inv.ingredients[ingB] ?? 0;

    if (ingA === ingB) {
      if (qtyA < 2) break;
    } else {
      if (qtyA < 1 || qtyB < 1) break;
    }

    const newIngredients = { ...inv.ingredients };
    newIngredients[ingA] = (newIngredients[ingA] ?? 0) - 1;
    newIngredients[ingB] = (newIngredients[ingB] ?? 0) - 1;

    for (const key of Object.keys(newIngredients)) {
      if (newIngredients[key] <= 0) delete newIngredients[key];
    }

    s = {
      ...s,
      inventory: {
        ...s.inventory,
        ingredients: newIngredients,
        potions: [
          ...s.inventory.potions,
          { recipeId: recipe.id, name: recipe.name, effect: recipe.effect },
        ],
      },
    };
    brewed++;
  }

  if (brewed > 0) {
    s = addNotification(s, `Brewed ${brewed}x ${recipe.name}`, 'success');
  }
  return s;
}

/** Cycle to next untried combo with slot 1's ingredient and brew it. */
function handleCraftNext(state: GameState): GameState {
  const baseIngredient = state.craftSlots[0].ingredientName;
  if (!baseIngredient) return state;

  const currentPartner = state.craftSlots[1].ingredientName;
  const inv = state.inventory.ingredients;
  const candidates = Object.keys(inv).sort();

  // Find the next untried partner after the current one
  const startIdx = currentPartner ? candidates.indexOf(currentPartner) + 1 : 0;
  const ordered = [...candidates.slice(startIdx), ...candidates.slice(0, startIdx)];

  for (const partner of ordered) {
    const baseQty = inv[baseIngredient] ?? 0;
    if (baseQty < 1) break;

    const needed = partner === baseIngredient ? 2 : 1;
    if ((inv[partner] ?? 0) < needed) continue;

    const recipe = findRecipe(state.recipes, baseIngredient, partner);
    if (recipe?.discovered) continue;
    if (isFailedCombo(state, baseIngredient, partner)) continue;

    // Found next untried: set slot 2 and brew
    let s: GameState = { ...state, craftSlots: [{ ingredientName: baseIngredient }, { ingredientName: partner }] };
    s = handleCraft(s);
    // After brewing, check if this ingredient still has untried combos
    // If not, auto-select the next ingredient that does
    s = autoSelectNextIngredient(s);
    return s;
  }

  // No more combos — auto-advance to next ingredient
  let s = autoSelectNextIngredient(state);
  if (s.craftSlots[0].ingredientName === baseIngredient) {
    return addNotification(state, 'No more untried combos', 'info');
  }
  return s;
}

/** Auto-select the next ingredient that has untried combos. */
function autoSelectNextIngredient(state: GameState): GameState {
  const current = state.craftSlots[0].ingredientName;
  const inv = state.inventory.ingredients;
  const allOwned = Object.keys(inv).filter(k => (inv[k] ?? 0) > 0).sort();

  // Check if current ingredient still has untried combos
  if (current && hasUntriedCombos(state, current)) {
    return state;
  }

  // Find next ingredient with untried combos
  const startIdx = current ? allOwned.indexOf(current) + 1 : 0;
  const ordered = [...allOwned.slice(startIdx), ...allOwned.slice(0, startIdx)];

  for (const name of ordered) {
    if (hasUntriedCombos(state, name)) {
      return { ...state, craftSlots: [{ ingredientName: name }, { ingredientName: null }] };
    }
  }

  // Nothing left — clear slot
  return { ...state, craftSlots: [{ ingredientName: null }, { ingredientName: null }] };
}

/** Check if an ingredient has any untried combinations. */
function hasUntriedCombos(state: GameState, base: string): boolean {
  const inv = state.inventory.ingredients;
  for (const partner of Object.keys(inv)) {
    if (partner === base && (inv[partner] ?? 0) < 2) continue;
    if ((inv[partner] ?? 0) < 1) continue;
    const recipe = findRecipe(state.recipes, base, partner);
    if (recipe?.discovered) continue;
    if (isFailedCombo(state, base, partner)) continue;
    return true;
  }
  return false;
}

/** Buy a hint: reveal one ingredient of a random undiscovered recipe. */
function handleBuyHint(state: GameState): GameState {
  const unhinted = state.recipes.filter(r => !r.discovered && !state.hintedRecipeIds.includes(r.id));
  if (unhinted.length === 0) return addNotification(state, 'No more recipes to hint!', 'info');

  const cost = HINT_BASE_COST * Math.pow(HINT_COST_MULTIPLIER, state.hintedRecipeIds.length);
  if (state.inventory.gold < cost) {
    return addNotification(state, `Not enough gold! Hint costs ${cost}g`, 'danger');
  }

  // Pick a random undiscovered & unhinted recipe
  const rng = createRng(state.seed ^ (state.hintedRecipeIds.length * 97));
  const recipe = unhinted[Math.floor(rng() * unhinted.length)];

  const s: GameState = {
    ...state,
    inventory: { ...state.inventory, gold: state.inventory.gold - cost },
    hintedRecipeIds: [...state.hintedRecipeIds, recipe.id],
  };

  // Reveal one ingredient (always the first alphabetically for consistency)
  const hint = recipe.ingredients[0];
  return addNotification(s, `Hint: a recipe uses ${hint} (cost ${cost}g)`, 'discovery');
}

/** Progressive probability: prevents deadlocks as grimoire completion rises. */
function calculateProgressiveChance(state: GameState): number {
  const completion = state.discoveredCount / TOTAL_POTIONS;
  const remaining = TOTAL_POTIONS - state.discoveredCount;
  const remainingCombos = TOTAL_POSSIBLE_2_COMBOS - state.craftAttempts;

  if (remaining <= 0) return 0;
  const base = Math.pow(completion, PROGRESSIVE_EXPONENT);
  const attemptFactor = Math.max(0, 1 - remainingCombos / TOTAL_POSSIBLE_2_COMBOS);
  return Math.min(PROGRESSIVE_CAP, base * 0.3 + attemptFactor * 0.2);
}

// ─── APPLY POTION ───

function handleApplyPotion(state: GameState, potionIndex: number, heroId: number): GameState {
  const hero = state.heroes.find(h => h.id === heroId);
  if (!hero) return state;

  const potion = state.inventory.potions[potionIndex];
  if (!potion) return state;

  // Apply effect to hero stats (permanent, consumed)
  const updatedHeroes = state.heroes.map(h => {
    if (h.id !== heroId) return h;
    const newStats = { ...h.stats };
    switch (potion.effect.type) {
      case 'max_hp':
        newStats.maxHp += potion.effect.value;
        return { ...h, stats: newStats, hp: Math.min(h.hp + potion.effect.value, newStats.maxHp) };
      case 'power':
        newStats.power += potion.effect.value;
        return { ...h, stats: newStats };
      case 'regen_speed':
        newStats.regenPerSec += potion.effect.value;
        return { ...h, stats: newStats };
      default:
        return h;
    }
  });

  // Remove potion from inventory
  const newPotions = [...state.inventory.potions];
  newPotions.splice(potionIndex, 1);

  let s: GameState = {
    ...state,
    heroes: updatedHeroes,
    inventory: { ...state.inventory, potions: newPotions },
  };

  const effectLabel =
    potion.effect.type === 'max_hp' ? `+${potion.effect.value} Max HP` :
    potion.effect.type === 'power' ? `+${potion.effect.value} Power` :
    `+${potion.effect.value} HP/s Regen`;

  return addNotification(s, `${hero.name} consumed ${potion.name}: ${effectLabel}`, 'success');
}

// ─── RECRUIT HERO ───

function handleRecruitHero(state: GameState): GameState {
  if (state.heroes.length >= MAX_HEROES) return state;

  const cost = HERO_COSTS[state.heroes.length];
  if (state.inventory.gold < cost) return state;

  const newHero = createHero(state.heroes.length);
  return addNotification(
    {
      ...state,
      heroes: [...state.heroes, newHero],
      inventory: { ...state.inventory, gold: state.inventory.gold - cost },
    },
    `Recruited ${newHero.name}! (-${cost}g)`,
    'success',
  );
}

// ─── NOTIFICATIONS ───

function addNotification(
  state: GameState,
  message: string,
  type: GameNotification['type'],
): GameState {
  const notification: GameNotification = {
    id: state.nextNotificationId,
    message,
    type,
    timestamp: state.elapsedMs,
  };
  return {
    ...state,
    notifications: [...state.notifications, notification],
    nextNotificationId: state.nextNotificationId + 1,
  };
}
