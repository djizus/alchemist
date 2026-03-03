// ═══════════════════════════════════════════════
// GAME ENGINE — Core logic: tick, craft, recruit
// ═══════════════════════════════════════════════

import { createRng } from './rng';
import { generateRecipes } from './recipes';
import type { GameState, GameAction, Hero, Notification } from './state';
import {
  ZONES,
  HERO_NAMES,
  HERO_COSTS,
  MAX_HEROES,
  HERO_MAX_HP,
  HERO_REGEN_PER_SEC,
  COOLDOWN_DURATION,
  GOLD_PER_POTION_DISCOVERY,
  TOTAL_POTIONS,
  PROGRESSIVE_EXPONENT,
  PROGRESSIVE_CAP,
  TOTAL_POSSIBLE_2_COMBOS,
  TICK_INTERVAL,
} from './constants';

let notifIdCounter = 0;

function nextNotifId(): number {
  return ++notifIdCounter;
}

// ─── State Factory ───

export function createInitialState(seed?: number): GameState {
  const s = seed ?? Math.floor(Math.random() * 2147483647);
  return {
    seed: s,
    gold: 0,
    heroes: [
      {
        id: 0,
        name: HERO_NAMES[0],
        hp: HERO_MAX_HP,
        maxHp: HERO_MAX_HP,
        status: 'idle',
        zoneId: null,
        expStart: 0,
        expEnd: 0,
        cooldownEnd: 0,
      },
    ],
    inventory: {},
    discovered: [],
    testedCombos: new Set(),
    recipes: generateRecipes(s),
    craftSlots: ['', '', '', ''],
    craftResult: null,
    notifications: [],
    sessionStart: Date.now(),
    won: false,
  };
}

// ─── Reducer ───

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'TICK':
      return handleTick(state, action.now);
    case 'SEND_EXPEDITION':
      return handleSendExpedition(state, action.heroId, action.zoneId);
    case 'CRAFT':
      return handleCraft(state, action.selectedIngredients);
    case 'RECRUIT':
      return handleRecruit(state);
    case 'SET_CRAFT_SLOT':
      return handleSetCraftSlot(state, action.slotIdx, action.value);
    case 'RESET':
      return createInitialState();
    case 'CLEAR_CRAFT_RESULT':
      return { ...state, craftResult: null };
    default:
      return state;
  }
}

// ─── Tick Handler (runs every 100ms) ───

function handleTick(state: GameState, now: number): GameState {
  if (state.won) return state;

  let changed = false;
  let newGold = state.gold;
  const newInv = { ...state.inventory };
  const newNotifs: Notification[] = [...state.notifications];

  // Track events for Phaser
  const events: GameEvent[] = [];

  const heroes = state.heroes.map(hero => {
    // 1. Exploring heroes: apply DPS continuously
    if (hero.status === 'exploring' && hero.zoneId !== null) {
      const zone = ZONES[hero.zoneId];
      const newHp = hero.hp - zone.dps * (TICK_INTERVAL / 1000);

      // Death check: HP <= 0
      if (newHp <= 0) {
        changed = true;
        newNotifs.push({
          id: nextNotifId(),
          type: 'hero-died',
          text: `${hero.name} fell in ${zone.name}!`,
          time: now,
        });
        events.push({ type: 'hero-died', zoneId: hero.zoneId });
        return {
          ...hero,
          hp: 0,
          status: 'cooldown' as const,
          zoneId: null,
          cooldownEnd: now + COOLDOWN_DURATION,
        };
      }

      // Expedition complete check
      if (now >= hero.expEnd) {
        changed = true;
        const { ingredients, gold } = generateLoot(state.seed, hero);
        for (const [ing, qty] of Object.entries(ingredients)) {
          newInv[ing] = (newInv[ing] || 0) + qty;
        }
        newGold += gold;
        newNotifs.push({
          id: nextNotifId(),
          type: 'gold-earned',
          text: `+${gold}g from ${zone.name}`,
          time: now,
        });
        events.push({ type: 'expedition-complete', zoneId: hero.zoneId });
        return {
          ...hero,
          hp: newHp,
          status: 'idle' as const,
          zoneId: null,
        };
      }

      // Still exploring, HP reduced
      if (newHp !== hero.hp) changed = true;
      return { ...hero, hp: newHp };
    }

    // 2. Idle heroes: regenerate HP
    if (hero.status === 'idle' && hero.hp < hero.maxHp) {
      changed = true;
      return {
        ...hero,
        hp: Math.min(hero.maxHp, hero.hp + HERO_REGEN_PER_SEC * (TICK_INTERVAL / 1000)),
      };
    }

    // 3. Cooldown heroes: check if recovered
    if (hero.status === 'cooldown' && now >= hero.cooldownEnd) {
      changed = true;
      return {
        ...hero,
        status: 'idle' as const,
        hp: hero.maxHp,
      };
    }

    return hero;
  });

  if (!changed) return state;

  // Clean notifications older than 3s
  const filteredNotifs = newNotifs.filter(n => now - n.time < 3000);

  const newState: GameState = {
    ...state,
    heroes,
    gold: newGold,
    inventory: newInv,
    notifications: filteredNotifs,
  };

  // Store events for Phaser to consume
  (newState as GameStateWithEvents).__events = events;

  return newState;
}

// ─── Loot Generation ───

interface LootResult {
  ingredients: Record<string, number>;
  gold: number;
}

function generateLoot(sessionSeed: number, hero: Hero): LootResult {
  if (hero.zoneId === null) return { ingredients: {}, gold: 0 };

  const zone = ZONES[hero.zoneId];
  const rng = createRng(sessionSeed + hero.id * 10000 + hero.expStart);

  const ingredients: Record<string, number> = {};

  // Number of drops: 2..4
  const numDrops = 2 + rng.nextInt(3);
  for (let i = 0; i < numDrops; i++) {
    const ing = zone.ingredients[rng.nextInt(5)];
    const qty = 1 + rng.nextInt(3); // 1..3
    ingredients[ing] = (ingredients[ing] || 0) + qty;
  }

  // Gold: base + random variance
  const gold = zone.goldDropBase + rng.nextInt(zone.goldDropVariance + 1);

  return { ingredients, gold };
}

// ─── Send Expedition ───

function handleSendExpedition(state: GameState, heroId: number, zoneId: number): GameState {
  const hero = state.heroes.find(h => h.id === heroId);
  if (!hero || hero.status !== 'idle') return state;

  const zone = ZONES[zoneId];
  // Soft minimum: hero needs more HP than 2 ticks of damage to not instantly die
  if (hero.hp <= zone.dps * 2) return state;

  const now = Date.now();
  const heroes = state.heroes.map(h =>
    h.id === heroId
      ? {
          ...h,
          status: 'exploring' as const,
          zoneId,
          expStart: now,
          expEnd: now + zone.duration * 1000,
        }
      : h
  );

  return { ...state, heroes };
}

// ─── Crafting ───

function handleCraft(state: GameState, selectedIngredients: string[]): GameState {
  const slots = selectedIngredients.filter(s => s !== '');
  if (slots.length < 2) {
    return { ...state, craftResult: { type: 'fail', text: 'Need at least 2 ingredients' } };
  }

  // Validate inventory
  const needed: Record<string, number> = {};
  slots.forEach(s => {
    needed[s] = (needed[s] || 0) + 1;
  });
  for (const [ing, count] of Object.entries(needed)) {
    if ((state.inventory[ing] || 0) < count) {
      return { ...state, craftResult: { type: 'fail', text: `Not enough ${ing}` } };
    }
  }

  // Consume ingredients
  const newInv = { ...state.inventory };
  for (const [ing, count] of Object.entries(needed)) {
    newInv[ing] -= count;
    if (newInv[ing] <= 0) delete newInv[ing];
  }

  // Generate combo key
  const key = slots.slice().sort().join('|');
  const testedCombos = new Set(state.testedCombos);
  testedCombos.add(key);

  // Check for recipe match
  const matchedRecipe = state.recipes.find(
    r => r.ingredients.join('|') === key && !state.discovered.includes(r.id)
  );

  const now = Date.now();

  if (matchedRecipe) {
    const discovered = [...state.discovered, matchedRecipe.id];
    const won = discovered.length >= TOTAL_POTIONS;
    const newNotifs: Notification[] = [
      ...state.notifications,
      {
        id: nextNotifId(),
        type: 'potion-found',
        text: `Discovered: ${matchedRecipe.name}!`,
        time: now,
      },
    ];

    const newState: GameState = {
      ...state,
      inventory: newInv,
      discovered,
      testedCombos,
      gold: state.gold + GOLD_PER_POTION_DISCOVERY,
      notifications: newNotifs,
      won,
      craftResult: {
        type: 'success',
        text: `${matchedRecipe.name} (+${GOLD_PER_POTION_DISCOVERY}g)`,
      },
      craftSlots: ['', '', '', ''],
    };
    (newState as GameStateWithEvents).__events = [{ type: 'potion-discovered' }];
    return newState;
  }

  // Progressive discovery probability
  const progressiveChance = getProgressiveChance(
    state.discovered.length,
    testedCombos.size
  );

  const roll = createRng(state.seed + testedCombos.size * 7 + (now % 10000)).next();

  if (roll < progressiveChance) {
    const undiscovered = state.recipes.filter(r => !state.discovered.includes(r.id));
    if (undiscovered.length > 0) {
      const lucky = undiscovered[Math.floor(roll / Math.max(progressiveChance, 0.001) * undiscovered.length) % undiscovered.length];
      const discovered = [...state.discovered, lucky.id];
      const won = discovered.length >= TOTAL_POTIONS;
      const newNotifs: Notification[] = [
        ...state.notifications,
        {
          id: nextNotifId(),
          type: 'potion-found',
          text: `Lucky discovery: ${lucky.name}!`,
          time: now,
        },
      ];

      const newState: GameState = {
        ...state,
        inventory: newInv,
        discovered,
        testedCombos,
        gold: state.gold + GOLD_PER_POTION_DISCOVERY,
        notifications: newNotifs,
        won,
        craftResult: {
          type: 'success',
          text: `Lucky! ${lucky.name} (+${GOLD_PER_POTION_DISCOVERY}g)`,
        },
        craftSlots: ['', '', '', ''],
      };
      (newState as GameStateWithEvents).__events = [{ type: 'potion-discovered' }];
      return newState;
    }
  }

  return {
    ...state,
    inventory: newInv,
    testedCombos,
    craftResult: { type: 'fail', text: 'Nothing happened... ingredients lost.' },
    craftSlots: ['', '', '', ''],
  };
}

function getProgressiveChance(discoveredCount: number, testedCount: number): number {
  const remaining = TOTAL_POTIONS - discoveredCount;
  if (remaining <= 0) return 0;

  const testedRatio = testedCount / TOTAL_POSSIBLE_2_COMBOS;

  // Exponential ramp: barely noticeable early, strong late
  const chance = Math.pow(testedRatio, PROGRESSIVE_EXPONENT) * 0.6;

  // Guarantee: last potion + 90%+ tested -> 100%
  if (remaining === 1 && testedRatio > 0.9) return 1.0;

  return Math.min(chance, PROGRESSIVE_CAP);
}

// ─── Recruit Hero ───

function handleRecruit(state: GameState): GameState {
  const idx = state.heroes.length;
  if (idx >= MAX_HEROES) return state;
  const cost = HERO_COSTS[idx];
  if (state.gold < cost) return state;

  const newHero: Hero = {
    id: idx,
    name: HERO_NAMES[idx],
    hp: HERO_MAX_HP,
    maxHp: HERO_MAX_HP,
    status: 'idle',
    zoneId: null,
    expStart: 0,
    expEnd: 0,
    cooldownEnd: 0,
  };

  return {
    ...state,
    gold: state.gold - cost,
    heroes: [...state.heroes, newHero],
  };
}

// ─── Set Craft Slot ───

function handleSetCraftSlot(state: GameState, slotIdx: number, value: string): GameState {
  const craftSlots = [...state.craftSlots];
  craftSlots[slotIdx] = value;
  return { ...state, craftSlots, craftResult: null };
}

// ─── Event System (for Phaser) ───

export interface GameEvent {
  type: 'hero-died' | 'expedition-complete' | 'potion-discovered';
  zoneId?: number;
}

export interface GameStateWithEvents extends GameState {
  __events?: GameEvent[];
}

export function consumeEvents(state: GameState): GameEvent[] {
  const events = (state as GameStateWithEvents).__events || [];
  delete (state as GameStateWithEvents).__events;
  return events;
}
