# Alchemist PoC - System Specification

Detailed breakdown of the V0 browser prototype. Every number in this document is pulled directly from the implementation.

---

## 1. Architecture

### State Model

All game state lives in a single `GameState` object managed by React's `useReducer`. No external state libraries. The reducer (`gameReducer` in `engine.ts`) is the sole authority on state transitions.

```
React useReducer (state + logic)
       |
       ├── useGameLoop (100ms tick)
       ├── useGameState (localStorage persistence)
       └── UI components (pure render)
```

### Directory Structure

| Directory | Purpose | Constraint |
|-----------|---------|------------|
| `src/game/` | Pure game logic | No React, no DOM imports. Framework-agnostic for future Cairo port. |
| `src/ui/` | React components | Pure presentational. Props in, JSX out. No state hooks. |
| `src/hooks/` | React hooks | State management + game loop only. |

### Action System

The reducer handles 13 action types:

| Action | Trigger | Effect |
|--------|---------|--------|
| `TICK` | Game loop (100ms) | Advance exploration, regen idle heroes, auto-dismiss notifications |
| `SEND_EXPEDITION` | Player clicks "Explore" | Hero starts at zone D, depth 0 |
| `CLAIM_LOOT` | Player clicks "Claim Yield" | Transfer pendingLoot to inventory |
| `SET_CRAFT_SLOT` | Player selects ingredient | Set slot 1 ingredient |
| `CRAFT` | Internal (called by CRAFT_NEXT) | Consume 2 ingredients, produce potion or soup |
| `CRAFT_ALL` | Player clicks "Brew Untried" | Batch-brew all untried combos for slot 1 ingredient |
| `CRAFT_NEXT` | Player clicks "Brew Untried (N)" | Brew next untried combo, auto-advance ingredient |
| `CRAFT_RECIPE` | Player clicks "Brew xN" in grimoire | Brew a known recipe as many times as ingredients allow |
| `BUY_HINT` | Player clicks "Buy Hint" | Spend gold, reveal one ingredient of random undiscovered recipe |
| `APPLY_POTION` | Player clicks potion on hero | Consume potion, permanently buff hero stats |
| `RECRUIT_HERO` | Player clicks "Recruit" | Spend gold, add new hero |
| `RESET` | Player clicks "New Game" | Fresh state with new seed |
| `DISMISS_NOTIFICATION` | Auto (5s timeout) | Remove notification from list |

---

## 2. Exploration System

### Linear Zone Progression

Heroes auto-advance through zones based on depth (seconds explored). The player cannot choose which zone to visit. Progression is strictly linear: D -> C -> B -> A -> S.

| Zone | Tier | Color | Depth Threshold | HP Drain/s | Ingredients |
|------|------|-------|----------------|------------|-------------|
| Verdant Meadow | D | `#4a9e4a` | 0s | 1 | Moonpetal, Dewmoss, River Clay, Copper Dust, Nightberry |
| Misty Marsh | C | `#4a7a9e` | 15s | 2 | Crimson Lichen, Fog Essence, Iron Filing, Stoneroot, Amber Sap |
| Crystal Cavern | B | `#b8860b` | 35s | 3 | Crystal Shard, Drake Moss, Sulfur Bloom, Shadow Silk, Venom Drop |
| Volcanic Ridge | A | `#9e4a4a` | 60s | 4 | Phoenix Ash, Void Salt, Starlight Dew, Obsidian Flake, Spirit Vine |
| Aether Spire | S | `#9e4a9e` | 90s | 5 | Dragon Scale, Aether Core, Titan Blood, Celestial Dust, Abyssal Pearl |

**HP Drain**: `1 HP * (zoneIndex + 1)` per second. Zone D drains 1 HP/s, Zone S drains 5 HP/s. This is applied every tick (100ms) as a fractional amount.

**Zone Detection**: `getCurrentZone(depth)` iterates ZONES array, returning the last zone whose `depthThreshold <= depth`.

### Exploration Events

Every 1 second of exploration (when `Math.floor(depth)` crosses an integer boundary), a random event rolls against the current zone's probability table:

| Event | Zone D | Zone C | Zone B | Zone A | Zone S |
|-------|--------|--------|--------|--------|--------|
| Trap | 5% | 8% | 10% | 12% | 14% |
| Gold | 10% | 8% | 7% | 6% | 5% |
| Heal | 8% | 6% | 5% | 4% | 3% |
| Beast | 3% | 5% | 7% | 10% | 12% |
| Nothing | 74% | 73% | 71% | 68% | 66% |

Events are mutually exclusive (cumulative probability roll). Ingredient drops are independent (separate roll after the event).

#### Event Details

**Trap**: Hero loses HP. Damage range per zone:

| Zone | Trap Damage |
|------|------------|
| D | 3-8 |
| C | 5-12 |
| B | 8-18 |
| A | 10-25 |
| S | 15-30 |

**Gold**: Hero finds gold added to `pendingLoot`.

| Zone | Gold Range |
|------|-----------|
| D | 2-5 |
| C | 4-10 |
| B | 6-15 |
| A | 10-22 |
| S | 15-35 |

**Heal**: Hero recovers HP (capped at maxHp).

| Zone | Heal Range |
|------|-----------|
| D | 3-6 |
| C | 4-8 |
| B | 5-10 |
| A | 6-12 |
| S | 8-15 |

**Beast**: Auto-resolved by comparing hero power vs beast power. Two outcomes:

- **Win** (`hero.stats.power >= beastPower`): Hero gains gold loot + takes minor damage (20% of loot value).
- **Lose** (`hero.stats.power < beastPower`): Hero takes heavy damage (trap damage + beast power).

| Zone | Beast Power | Beast Loot (Win) |
|------|------------|-----------------|
| D | 2-5 | 5-10g |
| C | 5-10 | 8-18g |
| B | 8-16 | 12-25g |
| A | 12-22 | 18-35g |
| S | 18-30 | 25-50g |

#### Ingredient Drops (Independent Roll)

After each event resolution, an independent roll determines ingredient drops:

| Zone | Drop Chance | Quantity Range |
|------|------------|---------------|
| D | 25% | 1-2 |
| C | 20% | 1-2 |
| B | 18% | 1-3 |
| A | 15% | 1-3 |
| S | 12% | 1-4 |

A random ingredient from the current zone's 5-ingredient pool is selected.

### Retreat & Return

When a hero's HP reaches 0:
1. HP is set to 0
2. Hero status changes to `returning`
3. Return timer = `depth / 2` seconds (hero returns at 2x exploration speed)
4. Hero keeps ALL accumulated `pendingLoot` (gold + ingredients)
5. When timer expires, hero becomes `idle` with pendingLoot intact
6. Player must click "Claim Yield" to transfer loot to inventory
7. Hero cannot be sent on new expedition until loot is claimed

There is no manual recall. The hero always explores until HP hits 0.

---

## 3. Hero System

### Base Stats

| Stat | Base Value | Buffable By |
|------|-----------|-------------|
| Max HP | 100 | `max_hp` potions (+5 to +20) |
| Power | 5 | `power` potions (+1 to +5) |
| Regen | 1 HP/s | `regen_speed` potions (+1 to +3) |

### Recruitment

| Hero | Name | Cost |
|------|------|------|
| 1st | Alaric | Free |
| 2nd | Brynn | 80g |
| 3rd | Cassiel | 200g |

Maximum 3 heroes. Each operates independently with their own expedition state.

### Status Lifecycle

```
idle ──[SEND_EXPEDITION]──> exploring ──[HP=0]──> returning ──[timer=0]──> idle (with loot)
                                                                              │
                                                                    [CLAIM_LOOT]
                                                                              │
                                                                         idle (clean)
```

### Idle Regen

When idle, heroes regenerate HP at `stats.regenPerSec` per second (base 1 HP/s). Applied every tick as `regenPerSec * (TICK_INTERVAL / 1000)`. Capped at `stats.maxHp`.

Regen only applies while idle. Heroes do NOT regenerate while exploring or returning.

---

## 4. Crafting System

Crafting is split into two separate interfaces:

- **Craft Panel**: For discovering new recipes (untried combinations only)
- **Grimoire Panel**: For re-brewing known recipes

### Craft Panel (Discovery)

The player selects a single ingredient from their inventory. The UI shows "Brew Untried (N)" where N is the count of untried combinations with that ingredient.

**CRAFT_NEXT flow**:
1. Find the next untried partner ingredient (alphabetical order, wrapping around)
2. Set both craft slots
3. Execute CRAFT (consume ingredients, check recipe match)
4. If the base ingredient has no more untried combos, auto-advance to the next ingredient that does (`autoSelectNextIngredient`)

**CRAFT_ALL flow** (batch):
1. Iterate all available partner ingredients
2. Skip discovered recipes and failed combos
3. Brew each untried combination
4. Stop if base ingredient runs out or game is won
5. Auto-advance to next ingredient with untried combos

### Craft Outcomes

When two ingredients are combined:

1. **Recipe Match (new)**: Recipe marked `discovered`, potion added to inventory. Notification: "Discovered: [name]!"
2. **Recipe Match (known)**: Potion added to inventory. Notification: "Brewed: [name]"
3. **No Match**: Failed combo recorded in `failedCombos` array. Then:
   - Roll progressive probability for "lucky discovery"
   - **Lucky**: Random undiscovered recipe is revealed, potion produced, +1g (soup value)
   - **Not Lucky**: +1g soup. Notification: "Failed brew -> Mysterious Soup (+1g)"

After any craft, slot 2 is cleared. Slot 1 is preserved (for continued brewing with same ingredient).

### Known Recipe Brewing (Grimoire)

`CRAFT_RECIPE` brews a discovered recipe as many times as ingredients allow in a single action. Loops until either ingredient is exhausted. No failed-combo logic needed since the recipe is already known.

---

## 5. Recipe System

### Generation Algorithm

30 recipes generated deterministically from session seed via `generateRecipes(seed)`.

**Phase 1 - Pinned Recipes (10 total)**:
- 2 recipes per zone (5 zones x 2 = 10)
- Uses only ingredients from the same zone
- Guarantees all zones must be explored to complete the grimoire

**Phase 2 - Cross-Zone Recipes (20 total)**:
- Random ingredient pairs from any zone
- Biased toward cross-zone combinations (same-zone pairs have 50% chance of being rerolled)
- Maximum 5000 attempts to fill remaining 20 slots
- No duplicate ingredient pairs

### Recipe Structure

```typescript
{
  id: number,           // 0-29
  name: string,         // "[Adjective] [Noun]" (unique, seeded)
  ingredients: [string, string],  // sorted alphabetically
  effect: PotionEffect, // { type: 'max_hp'|'power'|'regen_speed', value: number }
  discovered: boolean   // starts false
}
```

### Effect Distribution

Effects cycle through types with randomness: 70% chance of using the cycled type (`index % 3`), 30% chance of random type. This produces roughly balanced distribution across all three effect types.

| Effect Type | Value Range |
|-------------|------------|
| `max_hp` | +5 to +20 |
| `power` | +1 to +5 |
| `regen_speed` | +1 to +3 |

### Potion Names

Generated from 30 adjectives x 20 nouns (600 possible combinations). Each name is unique within a session. Examples: "Luminous Elixir", "Shadow Tonic", "Crystal Brew".

### Progressive Probability

Safety net that prevents hard deadlocks as grimoire completion rises.

Formula: `min(0.8, completion^3 * 0.3 + attemptFactor * 0.2)`

Where:
- `completion` = `discoveredCount / 30`
- `attemptFactor` = `max(0, 1 - remainingCombos / 325)`
- `325` = total possible 2-ingredient combinations from 25 ingredients (25 choose 2)

At low completion, chance is near 0. At high completion with many attempts, approaches the 80% cap. A "lucky discovery" reveals a random undiscovered recipe regardless of what ingredients were used.

---

## 6. Hint System

Players can spend gold to receive a hint revealing one ingredient of an undiscovered recipe.

### Cost Formula

`HINT_BASE_COST * HINT_COST_MULTIPLIER ^ hintsUsed` = `10 * 3^n`

| Hint # | Cost |
|--------|------|
| 1st | 10g |
| 2nd | 30g |
| 3rd | 90g |
| 4th | 270g |
| 5th | 810g |
| 6th | 2,430g |

### Hint Selection

1. Filter recipes that are neither discovered nor already hinted
2. Pick one at random (seeded: `seed ^ (hintCount * 97)`)
3. Reveal the first ingredient (alphabetically) of that recipe
4. Recipe ID stored in `hintedRecipeIds`

Hinted recipes appear in the grimoire with one ingredient visible and one marked "???".

---

## 7. Potion System

Potions are consumable items produced by crafting. They exist in `inventory.potions` until applied to a hero.

### Application

`APPLY_POTION` takes a potion index and hero ID:
1. Potion is removed from inventory (splice)
2. Hero stats are permanently modified:
   - `max_hp`: `stats.maxHp += value`, also heals the hero by the same amount (capped at new maxHp)
   - `power`: `stats.power += value`
   - `regen_speed`: `stats.regenPerSec += value`

Potions can be applied to any hero regardless of status (idle, exploring, returning).

---

## 8. Gold Economy

### Income Sources

| Source | Amount | Notes |
|--------|--------|-------|
| Zone gold events | 2-35g | Varies by zone tier |
| Beast victories | 5-50g | Varies by zone tier |
| Failed brew (soup) | 1g | Flat |
| Lucky discovery | 1g | Gets soup value even on lucky find |

### Expenses

| Expense | Cost | Notes |
|---------|------|-------|
| Hero 2 (Brynn) | 80g | One-time |
| Hero 3 (Cassiel) | 200g | One-time |
| Hint 1 | 10g | |
| Hint 2 | 30g | |
| Hint 3 | 90g | |
| Hint N | 10 * 3^(N-1) | Exponential scaling |

No gold is awarded for discovering recipes. No gold cost for crafting (only ingredients consumed).

---

## 9. Persistence

### localStorage Auto-Save

State is saved to `localStorage` under key `alchemist-save`:
- **Auto-save**: Every 2 seconds via `setInterval`
- **Unload save**: `beforeunload` event handler
- **Unmount save**: React cleanup in `useEffect`

### What Gets Saved

The full `GameState` object minus transient data:
- Notifications are stripped (empty array on save)
- `nextNotificationId` is preserved for continuity

### Load & Migration

On startup, `loadSavedState()`:
1. Reads and parses `localStorage`
2. Validates required fields (`seed`, `heroes`, `recipes`, `inventory`)
3. Migrates missing fields: `failedCombos` defaults to `[]`, `hintedRecipeIds` defaults to `[]`
4. Falls back to fresh state if parse fails or validation fails

### Reset

"New Game" calls `clearSave()` (removes the key) then dispatches `RESET` with a fresh random seed.

---

## 10. Game Loop & Background Tab Support

### Tick System

The game loop fires every 100ms (`TICK_INTERVAL`). Each tick:
1. Increment `tick` counter and `elapsedMs`
2. Process each hero (regen if idle, advance exploration if exploring, countdown if returning)
3. Auto-dismiss notifications older than 5 seconds

### Background Tab Catch-Up

`useGameLoop` uses `performance.now()` to detect time gaps:

1. On each interval fire, compute `elapsed = now - lastTime`
2. Calculate ticks needed: `Math.floor(elapsed / 100)`
3. Cap at 600 ticks (60 seconds of catch-up) to prevent browser freeze
4. Dispatch that many TICK actions in a tight loop

This means the game continues progressing when the tab is in the background. If the tab is hidden for 30 seconds, it will fire 300 catch-up ticks on refocus. If hidden for more than 60 seconds, the excess time is lost (capped).

---

## 11. RNG System

### Mulberry32

All randomness uses the Mulberry32 PRNG seeded deterministically:

```typescript
function createRng(seed: number): () => number
```

Returns floats in [0, 1). The same seed always produces the same sequence.

### Seed Derivation

Different game systems derive sub-seeds from the master seed to avoid correlation:
- **Exploration events**: `seed ^ (heroId * 7919 + tickCount)`
- **Progressive discovery**: `seed ^ craftAttempts`
- **Lucky recipe selection**: `seed ^ (craftAttempts * 31)`
- **Hint selection**: `seed ^ (hintCount * 97)`
- **Recipe generation**: Direct `seed`

### Helpers

| Function | Signature | Purpose |
|----------|-----------|---------|
| `randInt` | `(rng, min, max) -> number` | Integer in [min, max] inclusive |
| `randFloat` | `(rng, min, max) -> number` | Float in [min, max] |
| `randPick` | `(rng, array) -> element` | Random array element |
| `shuffle` | `(rng, array) -> array` | Fisher-Yates in-place shuffle |
| `randomSeed` | `() -> number` | Non-deterministic seed from Math.random |

---

## 12. UI Components

All components are stateless — they receive `state` and `dispatch` as props.

| Component | Responsibility |
|-----------|---------------|
| `TopBar` | Gold display, elapsed timer, grimoire progress (X/30 discovered, Y failed), New Game button |
| `HeroPanel` | Hero cards with HP bar, stats, status, Explore/Claim Yield buttons, Recruit button |
| `ExplorationPanel` | Active expedition view: zone name, depth bar across zones, current event, HP drain info |
| `CraftPanel` | Single ingredient selector (zone-colored), "Brew Untried (N)" button. Blocks known recipes, redirects to grimoire |
| `GrimoirePanel` | Filter tabs (All / Max HP / Power / Regen), sorted by craftability then power. Brew xN for known recipes. Hinted recipes with partial ingredient reveal. Buy Hint button with cost display |
| `InventoryPanel` | Ingredient list (zone-colored, quantities), potion list with Apply buttons per hero |
| `EventLog` | Scrollable log of exploration events for the selected hero |
| `Notifications` | Top-right toast notifications, auto-dismiss after 5 seconds |
| `WinOverlay` | Full-screen victory overlay when all 30 recipes discovered |

### Layout

Two-column layout:
- **Left column**: HeroPanel, ExplorationPanel, EventLog
- **Right column**: CraftPanel, InventoryPanel, GrimoirePanel

### Ingredient Zone Colors

All ingredients are color-coded by their source zone across every panel (craft selector, grimoire, inventory). The `ingredientColor(name)` utility maps ingredient -> zone -> CSS color.

---

## 13. Win Condition

The game is won when `discoveredCount >= 30` (all recipes discovered). This is checked after every craft action. When triggered:
- `gameOver` flag is set to `true`
- `WinOverlay` component renders
- All actions except `RESET` are blocked by the reducer

---

## 14. Key Constants Reference

| Constant | Value | Purpose |
|----------|-------|---------|
| `TICK_INTERVAL` | 100ms | Game loop frequency |
| `EVENT_INTERVAL` | 1000ms | Exploration event frequency |
| `TOTAL_POTIONS` | 30 | Recipes to discover |
| `MAX_HEROES` | 3 | Hero cap |
| `HERO_BASE_HP` | 100 | Starting HP |
| `HERO_BASE_POWER` | 5 | Starting power |
| `HERO_BASE_REGEN` | 1 HP/s | Starting regen |
| `HERO_COSTS` | [0, 80, 200] | Recruitment costs |
| `CRAFT_SLOTS` | 2 | Ingredients per recipe |
| `SOUP_GOLD_VALUE` | 1 | Failed brew reward |
| `HINT_BASE_COST` | 10 | First hint cost |
| `HINT_COST_MULTIPLIER` | 3 | Hint cost scaling |
| `PROGRESSIVE_EXPONENT` | 3 | Lucky discovery curve |
| `PROGRESSIVE_CAP` | 0.8 | Max lucky discovery chance |
| `TOTAL_POSSIBLE_2_COMBOS` | 325 | 25 choose 2 |
| `RETURN_SPEED_MULTIPLIER` | 2 | Hero returns at 2x speed |
| `MAX_CATCHUP_TICKS` | 600 | 60s max background catch-up |
| `SAVE_INTERVAL_MS` | 2000 | Auto-save frequency |
