// ═══════════════════════════════════════════════
// GAME CONSTANTS — All balancing levers in one place
// ═══════════════════════════════════════════════

export interface ZoneData {
  id: number;
  name: string;
  tier: string;
  color: number;
  colorCSS: string;
  duration: number;    // seconds
  dps: number;         // damage per second
  hpCost: number;      // total HP cost if hero survives full duration (dps * duration)
  ingredients: string[];
  rarity: 'common' | 'rare' | 'epic';
  goldDropBase: number;
  goldDropVariance: number;
}

export const ZONES: ZoneData[] = [
  {
    id: 0, name: 'Verdant Meadow', tier: 'D',
    color: 0x4a9e4a, colorCSS: '#4a9e4a',
    duration: 8, dps: 1.25, hpCost: 10,
    ingredients: ['Moonpetal', 'Dewmoss', 'River Clay', 'Copper Dust', 'Nightberry'],
    rarity: 'common', goldDropBase: 5, goldDropVariance: 0,
  },
  {
    id: 1, name: 'Misty Marsh', tier: 'C',
    color: 0x4a7a9e, colorCSS: '#4a7a9e',
    duration: 15, dps: 2.0, hpCost: 30,
    ingredients: ['Crimson Lichen', 'Fog Essence', 'Iron Filing', 'Stoneroot', 'Amber Sap'],
    rarity: 'rare', goldDropBase: 10, goldDropVariance: 5,
  },
  {
    id: 2, name: 'Crystal Cavern', tier: 'B',
    color: 0xb8860b, colorCSS: '#b8860b',
    duration: 25, dps: 2.2, hpCost: 55,
    ingredients: ['Crystal Shard', 'Drake Moss', 'Sulfur Bloom', 'Shadow Silk', 'Venom Drop'],
    rarity: 'rare', goldDropBase: 18, goldDropVariance: 10,
  },
  {
    id: 3, name: 'Volcanic Ridge', tier: 'A',
    color: 0x9e4a4a, colorCSS: '#9e4a4a',
    duration: 40, dps: 1.875, hpCost: 75,
    ingredients: ['Phoenix Ash', 'Void Salt', 'Starlight Dew', 'Obsidian Flake', 'Spirit Vine'],
    rarity: 'epic', goldDropBase: 28, goldDropVariance: 15,
  },
  {
    id: 4, name: 'Aether Spire', tier: 'S',
    color: 0x9e4a9e, colorCSS: '#9e4a9e',
    duration: 60, dps: 1.58, hpCost: 95,
    ingredients: ['Dragon Scale', 'Aether Core', 'Titan Blood', 'Celestial Dust', 'Abyssal Pearl'],
    rarity: 'epic', goldDropBase: 40, goldDropVariance: 20,
  },
];

export const ALL_INGREDIENTS = ZONES.flatMap(z => z.ingredients);

// Ingredient -> zone index mapping
export const INGREDIENT_ZONE: Record<string, number> = {};
export const INGREDIENT_TIER: Record<string, string> = {};
ALL_INGREDIENTS.forEach((ing, i) => {
  const zoneIdx = Math.floor(i / 5);
  INGREDIENT_ZONE[ing] = zoneIdx;
  INGREDIENT_TIER[ing] = ZONES[zoneIdx].rarity;
});

// Hero constants
export const HERO_NAMES = ['Alaric', 'Brynn', 'Cassiel'];
export const HERO_COSTS = [0, 80, 200]; // gold cost per hero
export const MAX_HEROES = 3;
export const HERO_MAX_HP = 100;
export const HERO_REGEN_PER_SEC = 5; // HP per second when idle
export const COOLDOWN_DURATION = 10_000; // 10 seconds in ms

// Economy
export const GOLD_PER_POTION_DISCOVERY = 15;

// Recipes
export const TOTAL_POTIONS = 50;
export const RECIPE_2_COUNT = 32;
export const RECIPE_3_COUNT = 13;
export const RECIPE_4_COUNT = 5;

// Progressive discovery
export const PROGRESSIVE_EXPONENT = 3;
export const PROGRESSIVE_CAP = 0.8;
export const TOTAL_POSSIBLE_2_COMBOS = 325; // C(25,2) + 25

// Game tick
export const TICK_INTERVAL = 100; // ms

// Potion name generation
export const POTION_ADJECTIVES = [
  'Luminous', 'Shadow', 'Crystal', 'Ember', 'Frost', 'Void', 'Celestial', 'Ancient',
  'Mystic', 'Storm', 'Crimson', 'Azure', 'Golden', 'Silver', 'Verdant', 'Obsidian',
  'Ethereal', 'Arcane', 'Primal', 'Astral', 'Infernal', 'Radiant', 'Twilight',
  'Phantom', 'Spectral', 'Abyssal', 'Divine', 'Feral', 'Molten', 'Glacial',
];

export const POTION_NOUNS = [
  'Elixir', 'Tonic', 'Brew', 'Draught', 'Philter', 'Essence', 'Tincture', 'Serum',
  'Nectar', 'Cordial', 'Mixture', 'Solution', 'Potion', 'Balm', 'Salve', 'Infusion',
  'Concentrate', 'Decoction', 'Distillate', 'Remedy',
];
