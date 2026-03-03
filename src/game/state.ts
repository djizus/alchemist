// ═══════════════════════════════════════════════
// GAME STATE TYPES
// ═══════════════════════════════════════════════

export interface Hero {
  id: number;
  name: string;
  hp: number;
  maxHp: number;
  status: 'idle' | 'exploring' | 'cooldown';
  zoneId: number | null;
  expStart: number;  // timestamp ms
  expEnd: number;    // timestamp ms
  cooldownEnd: number; // timestamp ms
}

export interface Recipe {
  id: number;
  name: string;
  ingredients: string[]; // sorted alphabetically
  size: number;          // 2, 3, or 4
  tier: number;          // highest zone tier among ingredients (0-4)
}

export interface Notification {
  id: number;
  type: 'potion-found' | 'gold-earned' | 'hero-died';
  text: string;
  time: number; // timestamp ms
}

export interface GameState {
  seed: number;
  gold: number;
  heroes: Hero[];
  inventory: Record<string, number>; // ingredient name -> quantity
  discovered: number[];              // recipe IDs
  testedCombos: Set<string>;         // combo keys already tried
  recipes: Recipe[];                 // generated at session start
  craftSlots: string[];              // 4 slots, '' if empty
  craftResult: { type: 'success' | 'fail'; text: string } | null;
  notifications: Notification[];
  sessionStart: number;              // timestamp
  won: boolean;
}

// Action types for useReducer
export type GameAction =
  | { type: 'TICK'; now: number }
  | { type: 'SEND_EXPEDITION'; heroId: number; zoneId: number }
  | { type: 'CRAFT'; selectedIngredients: string[] }
  | { type: 'RECRUIT' }
  | { type: 'SET_CRAFT_SLOT'; slotIdx: number; value: string }
  | { type: 'RESET' }
  | { type: 'CLEAR_CRAFT_RESULT' };
