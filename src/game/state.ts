// ═══════════════════════════════════════════════
// GAME STATE — All TypeScript interfaces
// ═══════════════════════════════════════════════

import type { PotionEffect } from './constants';

// ─── Exploration Events ───

export type ExplorationEventKind =
  | 'trap'
  | 'gold'
  | 'heal'
  | 'beast_win'
  | 'beast_lose'
  | 'ingredient_drop'
  | 'nothing';

export interface ExplorationEvent {
  kind: ExplorationEventKind;
  depth: number;        // seconds into exploration when event occurred
  zoneId: number;       // which zone the hero was in
  value: number;        // damage taken, gold earned, HP healed, etc.
  message: string;      // display text
}

// ─── Hero ───

export type HeroStatus = 'idle' | 'exploring' | 'returning';

export interface HeroStats {
  maxHp: number;
  power: number;
  regenPerSec: number;  // HP/s when idle
}

export interface PendingLoot {
  gold: number;
  ingredients: Record<string, number>;  // ingredient name → quantity
}

export interface Hero {
  id: number;
  name: string;
  hp: number;
  stats: HeroStats;
  status: HeroStatus;
  // Exploration state (active when status === 'exploring')
  depth: number;                   // seconds explored so far
  pendingLoot: PendingLoot;
  eventLog: ExplorationEvent[];    // events from current expedition
  lastEventTime: number;           // ms timestamp of last event roll
  // Return journey (active when status === 'returning')
  returnTimer: number;             // seconds remaining until home (based on depth reached)
  returnTimerMax: number;          // total return time (for progress bar)
}

// ─── Recipes & Potions ───

export interface Recipe {
  id: number;
  name: string;
  ingredients: [string, string];   // always 2 ingredients
  effect: PotionEffect;
  discovered: boolean;
}

export interface PotionItem {
  recipeId: number;
  name: string;
  effect: PotionEffect;
}

// ─── Crafting ───

export interface CraftSlot {
  ingredientName: string | null;
}

// ─── Notifications ───

export interface GameNotification {
  id: number;
  message: string;
  type: 'info' | 'success' | 'danger' | 'gold' | 'discovery';
  timestamp: number;
}

// ─── Inventory ───

export interface Inventory {
  gold: number;
  ingredients: Record<string, number>;  // ingredient name → quantity
  potions: PotionItem[];                // crafted potions ready to use
}

// ─── Game State ───

export interface GameState {
  seed: number;
  rngState: number;           // current RNG counter (for determinism)
  tick: number;               // tick counter
  elapsedMs: number;          // total elapsed game time in ms

  heroes: Hero[];
  recipes: Recipe[];
  inventory: Inventory;
  craftSlots: [CraftSlot, CraftSlot];

  discoveredCount: number;    // how many recipes discovered
  craftAttempts: number;      // total craft attempts (for progressive probability)
  failedCombos: [string, string][];  // sorted ingredient pairs that produced soup

  notifications: GameNotification[];
  nextNotificationId: number;

  gameOver: boolean;          // true when all recipes discovered
}

// ─── Actions ───

export type GameAction =
  | { type: 'TICK'; dt: number }
  | { type: 'SEND_EXPEDITION'; heroId: number }
  | { type: 'RECALL_HERO'; heroId: number }
  | { type: 'CLAIM_LOOT'; heroId: number }
  | { type: 'SET_CRAFT_SLOT'; slotIndex: number; ingredientName: string | null }
  | { type: 'CRAFT' }
  | { type: 'CRAFT_ALL' }
  | { type: 'APPLY_POTION'; potionIndex: number; heroId: number }
  | { type: 'RECRUIT_HERO' }
  | { type: 'RESET'; seed: number }
  | { type: 'DISMISS_NOTIFICATION'; id: number };
