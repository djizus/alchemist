// ═══════════════════════════════════════════════
// GAME CONSTANTS — All balancing levers
// ═══════════════════════════════════════════════

export interface ZoneData {
  id: number;
  name: string;
  tier: string;
  color: number;
  colorCSS: string;
  depthThreshold: number; // seconds of exploration to reach this zone
  ingredients: string[];
  rarity: 'common' | 'rare' | 'epic';
  // Event probabilities per second — remainder = nothing happens
  trapChance: number;
  goldChance: number;
  healChance: number;
  beastChance: number;
  // Event magnitudes
  trapDamage: [number, number];
  goldReward: [number, number];
  healAmount: [number, number];
  beastPower: [number, number];
  beastLootGold: [number, number];
  // Ingredient drops
  ingredientDropChance: number;
  ingredientDropQty: [number, number];
}

export const ZONES: ZoneData[] = [
  {
    id: 0, name: 'Verdant Meadow', tier: 'D',
    color: 0x4a9e4a, colorCSS: '#4a9e4a', depthThreshold: 0,
    ingredients: ['Moonpetal', 'Dewmoss', 'River Clay', 'Copper Dust', 'Nightberry'],
    rarity: 'common',
    trapChance: 0.05, goldChance: 0.10, healChance: 0.08, beastChance: 0.03,
    trapDamage: [3, 8], goldReward: [2, 5], healAmount: [3, 6],
    beastPower: [2, 5], beastLootGold: [5, 10],
    ingredientDropChance: 0.25, ingredientDropQty: [1, 2],
  },
  {
    id: 1, name: 'Misty Marsh', tier: 'C',
    color: 0x4a7a9e, colorCSS: '#4a7a9e', depthThreshold: 15,
    ingredients: ['Crimson Lichen', 'Fog Essence', 'Iron Filing', 'Stoneroot', 'Amber Sap'],
    rarity: 'rare',
    trapChance: 0.08, goldChance: 0.08, healChance: 0.06, beastChance: 0.05,
    trapDamage: [5, 12], goldReward: [4, 10], healAmount: [4, 8],
    beastPower: [5, 10], beastLootGold: [8, 18],
    ingredientDropChance: 0.20, ingredientDropQty: [1, 2],
  },
  {
    id: 2, name: 'Crystal Cavern', tier: 'B',
    color: 0xb8860b, colorCSS: '#b8860b', depthThreshold: 35,
    ingredients: ['Crystal Shard', 'Drake Moss', 'Sulfur Bloom', 'Shadow Silk', 'Venom Drop'],
    rarity: 'rare',
    trapChance: 0.10, goldChance: 0.07, healChance: 0.05, beastChance: 0.07,
    trapDamage: [8, 18], goldReward: [6, 15], healAmount: [5, 10],
    beastPower: [8, 16], beastLootGold: [12, 25],
    ingredientDropChance: 0.18, ingredientDropQty: [1, 3],
  },
  {
    id: 3, name: 'Volcanic Ridge', tier: 'A',
    color: 0x9e4a4a, colorCSS: '#9e4a4a', depthThreshold: 60,
    ingredients: ['Phoenix Ash', 'Void Salt', 'Starlight Dew', 'Obsidian Flake', 'Spirit Vine'],
    rarity: 'epic',
    trapChance: 0.12, goldChance: 0.06, healChance: 0.04, beastChance: 0.10,
    trapDamage: [10, 25], goldReward: [10, 22], healAmount: [6, 12],
    beastPower: [12, 22], beastLootGold: [18, 35],
    ingredientDropChance: 0.15, ingredientDropQty: [1, 3],
  },
  {
    id: 4, name: 'Aether Spire', tier: 'S',
    color: 0x9e4a9e, colorCSS: '#9e4a9e', depthThreshold: 90,
    ingredients: ['Dragon Scale', 'Aether Core', 'Titan Blood', 'Celestial Dust', 'Abyssal Pearl'],
    rarity: 'epic',
    trapChance: 0.14, goldChance: 0.05, healChance: 0.03, beastChance: 0.12,
    trapDamage: [15, 30], goldReward: [15, 35], healAmount: [8, 15],
    beastPower: [18, 30], beastLootGold: [25, 50],
    ingredientDropChance: 0.12, ingredientDropQty: [1, 4],
  },
];

export const ALL_INGREDIENTS = ZONES.flatMap(z => z.ingredients);

export const INGREDIENT_ZONE: Record<string, number> = {};
export const INGREDIENT_TIER: Record<string, string> = {};
ALL_INGREDIENTS.forEach((ing, i) => {
  const zoneIdx = Math.floor(i / 5);
  INGREDIENT_ZONE[ing] = zoneIdx;
  INGREDIENT_TIER[ing] = ZONES[zoneIdx].rarity;
});

// Heroes
export const HERO_NAMES = ['Alaric', 'Brynn', 'Cassiel'];
export const HERO_COSTS = [0, 80, 200];
export const MAX_HEROES = 3;
export const HERO_BASE_HP = 100;
export const HERO_BASE_POWER = 5;
export const HERO_BASE_REGEN = 1; // HP/s when idle

// Crafting
export const CRAFT_SLOTS = 2;
export const SOUP_GOLD_VALUE = 1;
export const GOLD_PER_POTION_DISCOVERY = 15;

// Recipes
export const TOTAL_POTIONS = 30;

// Potion effects
export type PotionEffectType = 'max_hp' | 'power' | 'regen_speed';
export interface PotionEffect {
  type: PotionEffectType;
  value: number;
}

// Progressive discovery
export const PROGRESSIVE_EXPONENT = 3;
export const PROGRESSIVE_CAP = 0.8;
export const TOTAL_POSSIBLE_2_COMBOS = 325;

// Timing
export const TICK_INTERVAL = 100;  // ms
export const EVENT_INTERVAL = 1000; // ms — exploration events fire every second

// Name generation
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
