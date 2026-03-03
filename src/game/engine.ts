// ═══════════════════════════════════════════════
// GAME ENGINE — Core reducer + logic
// ═══════════════════════════════════════════════

import {
  CRAFT_SLOTS,
  GOLD_PER_POTION_DISCOVERY,
  HERO_BASE_HP,
  HERO_BASE_POWER,
  HERO_BASE_REGEN,
  HERO_COSTS,
  HERO_NAMES,
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
    deathTimer: 0,
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
    case 'RECALL_HERO':
      return handleRecallHero(state, action.heroId);
    case 'SET_CRAFT_SLOT':
      return handleSetCraftSlot(state, action.slotIndex, action.ingredientName);
    case 'CRAFT':
      return handleCraft(state);
    case 'SELL_SOUP':
      return handleSellSoup(state);
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

  // Prune old notifications (keep last 10)
  if (s.notifications.length > 10) {
    s = { ...s, notifications: s.notifications.slice(-10) };
  }

  return s;
}

function tickHero(hero: Hero, state: GameState): Hero {
  if (hero.status === 'idle') {
    return tickIdleHero(hero);
  }
  if (hero.status === 'exploring') {
    return tickExploringHero(hero, state);
  }
  return hero; // dead heroes handled elsewhere (deathTimer in idle tick)
}

function tickIdleHero(hero: Hero): Hero {
  // Regen HP when idle
  if (hero.hp >= hero.stats.maxHp && hero.deathTimer <= 0) return hero;

  let h = { ...hero };

  // Death timer countdown
  if (h.deathTimer > 0) {
    h.deathTimer = Math.max(0, h.deathTimer - TICK_INTERVAL / 1000);
    if (h.deathTimer <= 0) {
      h.hp = h.stats.maxHp;
      h.status = 'idle';
    }
    return h;
  }

  // Regen: regenPerSec * (TICK_INTERVAL / 1000)
  const regenAmount = h.stats.regenPerSec * (TICK_INTERVAL / 1000);
  h.hp = Math.min(h.stats.maxHp, h.hp + regenAmount);
  return h;
}

function tickExploringHero(hero: Hero, state: GameState): Hero {
  let h = { ...hero };
  const rng = createRng(state.seed ^ (h.id * 7919 + state.tick));

  // Advance depth (depth = seconds explored, tick = 100ms → add 0.1s per tick)
  h.depth += TICK_INTERVAL / 1000;

  // Check for events every 1 second
  const prevSecond = Math.floor((h.depth - TICK_INTERVAL / 1000));
  const currSecond = Math.floor(h.depth);
  if (currSecond > prevSecond && currSecond > 0) {
    const zone = getCurrentZone(h.depth);
    const event = rollExplorationEvent(rng, zone, h);

    if (event) {
      h = applyExplorationEvent(h, event, rng, zone);
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

  // Check if hero died (HP <= 0) → retreat with loot
  if (h.hp <= 0) {
    h.hp = 0;
    h.status = 'idle';
    // Loot is collected in handleHeroReturn (called by the component or tick)
    return heroReturnsHome(h);
  }

  return h;
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
function applyExplorationEvent(
  hero: Hero,
  event: ExplorationEvent,
  _rng: Rng,
  _zone: ZoneData,
): Hero {
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
      // Some damage taken from combat (10-30% of beast power)
      h.pendingLoot = { ...h.pendingLoot, gold: h.pendingLoot.gold + event.value };
      h.hp = Math.max(0, h.hp - Math.floor(event.value * 0.2));
      break;
    case 'beast_lose':
      h.hp = Math.max(0, h.hp - event.value);
      break;
  }

  return h;
}

/** Hero returns home: transfer loot to a "ready to collect" state. */
function heroReturnsHome(hero: Hero): Hero {
  return {
    ...hero,
    status: 'idle',
    depth: 0,
    lastEventTime: 0,
    // Keep pendingLoot — it gets collected when processed
  };
}

// ─── SEND EXPEDITION ───

function handleSendExpedition(state: GameState, heroId: number): GameState {
  const hero = state.heroes.find(h => h.id === heroId);
  if (!hero || hero.status !== 'idle' || hero.hp <= 0 || hero.deathTimer > 0) return state;

  // First, collect any pending loot from previous expedition
  let s = collectPendingLoot(state, heroId);

  s = {
    ...s,
    heroes: s.heroes.map(h =>
      h.id === heroId
        ? {
            ...h,
            status: 'exploring' as const,
            depth: 0,
            pendingLoot: { gold: 0, ingredients: {} },
            eventLog: [],
            lastEventTime: 0,
          }
        : h,
    ),
  };

  return addNotification(s, `${hero.name} sets out exploring!`, 'info');
}

// ─── RECALL HERO ───

function handleRecallHero(state: GameState, heroId: number): GameState {
  const hero = state.heroes.find(h => h.id === heroId);
  if (!hero || hero.status !== 'exploring') return state;

  let s = {
    ...state,
    heroes: state.heroes.map(h =>
      h.id === heroId ? heroReturnsHome(h) : h,
    ),
  };

  s = collectPendingLoot(s, heroId);
  return addNotification(s, `${hero.name} returns home with loot!`, 'info');
}

// ─── COLLECT PENDING LOOT ───

function collectPendingLoot(state: GameState, heroId: number): GameState {
  const hero = state.heroes.find(h => h.id === heroId);
  if (!hero) return state;

  const loot = hero.pendingLoot;
  if (loot.gold === 0 && Object.keys(loot.ingredients).length === 0) return state;

  const newInventory = { ...state.inventory };
  newInventory.gold += loot.gold;

  const newIngredients = { ...newInventory.ingredients };
  for (const [name, qty] of Object.entries(loot.ingredients)) {
    newIngredients[name] = (newIngredients[name] ?? 0) + qty;
  }
  newInventory.ingredients = newIngredients;

  return {
    ...state,
    inventory: newInventory,
    heroes: state.heroes.map(h =>
      h.id === heroId
        ? { ...h, pendingLoot: { gold: 0, ingredients: {} } as PendingLoot }
        : h,
    ),
  };
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
          gold: s.inventory.gold + GOLD_PER_POTION_DISCOVERY,
          potions: [
            ...s.inventory.potions,
            { recipeId: recipe.id, name: recipe.name, effect: recipe.effect },
          ],
        },
        gameOver: newCount >= TOTAL_POTIONS,
      };
      s = addNotification(s, `Discovered: ${recipe.name}! +${GOLD_PER_POTION_DISCOVERY}g`, 'discovery');
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
    // No recipe match → check progressive probability for "lucky" discovery
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
            gold: s.inventory.gold + GOLD_PER_POTION_DISCOVERY + SOUP_GOLD_VALUE,
            potions: [
              ...s.inventory.potions,
              { recipeId: luckyRecipe.id, name: luckyRecipe.name, effect: luckyRecipe.effect },
            ],
          },
          gameOver: newCount >= TOTAL_POTIONS,
        };
        s = addNotification(s, `Lucky discovery: ${luckyRecipe.name}! +${GOLD_PER_POTION_DISCOVERY}g`, 'discovery');
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
  s = { ...s, craftSlots: [{ ingredientName: null }, { ingredientName: null }] };
  return s;
}

/** Progressive probability: prevents deadlocks as grimoire completion rises. */
function calculateProgressiveChance(state: GameState): number {
  const completion = state.discoveredCount / TOTAL_POTIONS;
  const remaining = TOTAL_POTIONS - state.discoveredCount;
  const remainingCombos = TOTAL_POSSIBLE_2_COMBOS - state.craftAttempts;

  // As more recipes are discovered and attempts increase, chance rises
  if (remaining <= 0) return 0;
  const base = Math.pow(completion, PROGRESSIVE_EXPONENT);
  const attemptFactor = Math.max(0, 1 - remainingCombos / TOTAL_POSSIBLE_2_COMBOS);
  return Math.min(PROGRESSIVE_CAP, base * 0.3 + attemptFactor * 0.2);
}

// ─── SELL SOUP ───

function handleSellSoup(state: GameState): GameState {
  // Soup is auto-sold during crafting, this is a no-op but kept for action parity
  return state;
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
