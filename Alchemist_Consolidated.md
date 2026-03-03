# ALCHEMIST — Consolidated Design & Implementation Document

**Platform:** Starknet (Fully Onchain)
**Date:** 2026-03-03
**Status:** V0 in development

---

## Table of Contents

1. Product Vision
2. Version Roadmap
3. Key Definitions
4. Core Game Loop
5. Victory Condition
6. Exploration System
7. Ingredient System
8. Potion & Crafting System
9. The Grimoire
10. Hero System
11. Gold Economy
12. Session Design & Pacing
13. Technical Architecture (V0)
14. Technical Principles (V1 Onchain)
15. UI Specification
16. Game Tick & Engine
17. Edge Cases & Rules
18. Balancing Levers
19. V2+ Features
20. Open Design Questions
21. Definition of Done (per version)

---

## 1. Product Vision

Alchemist is a fully onchain competitive game built on Starknet. Players compete in a real-time race to complete a potion grimoire by exploring zones, gathering ingredients, crafting potions, and discovering hidden recipes through pure experimentation.

**Victory condition:** The first player to discover all potions in the grimoire wins the session.

**Target session duration:** 15-30 minutes for a confirmed player.

**Core identity:** Fast-paced, deterministic, information-as-advantage. No RNG gates, no pay-to-win. The game rewards systematic thinking, resource optimization, and speed of execution.

---

## 2. Version Roadmap

### V0 — Browser PoC (current)

Playable browser prototype. Validates the core game loop and balancing before any smart contract work.

| Property | Value |
|----------|-------|
| Stack | React 18 + Phaser 3 + TypeScript + Vite |
| Onchain | None. All logic client-side. Seed-based determinism simulates onchain behavior. |
| Multiplayer | None. Solo play only. |
| Goal | Prove the loop is fun. Tune balancing. Ship fast. |

### V1 — Onchain PvE Race

Port validated game logic to Starknet smart contracts. First public release.

| Property | Value |
|----------|-------|
| Stack | Starknet (Cairo), client TBD |
| Onchain | Fully onchain. Player state, recipes, expeditions — all on Starknet. |
| Multiplayer | Open PvE race. No player cap. First to complete grimoire wins. |
| Goal | Competitive onchain grimoire race. |

### V2+ — PvP & Depth

Expand with player-vs-player mechanics and deeper systems.

| Property | Value |
|----------|-------|
| Additions | PvP exploration, hero upgrades, gear, multiple cauldrons, potion-to-potion crafting, hint system, scoring |
| Goal | Replayability, meta-game depth, competitive scene. |

---

## 3. Key Definitions

| Term | Definition |
|------|-----------|
| **Expedition** | Sending a hero to a zone for a fixed duration to generate ingredients. The hero takes damage over time. |
| **Game Session** | A complete run from spawn to grimoire completion. |
| **Grimoire** | The collection of all discoverable potions. Progression tracker and win condition. |
| **Recipe** | A hidden combination of 2-4 ingredients that produces a specific potion. Some ingredients may be pinned. |
| **Global Seed** | A deterministic seed shared across all players that defines zone structures, loot tables, and recipe hashes for a session. |
| **Pinned Ingredient** | An ingredient hardcoded into a recipe to guarantee that specific zones must be explored. |
| **Combo Key** | The sorted, joined ingredient list of a craft attempt. Used to check recipe matches and track tested combinations. |

---

## 4. Core Game Loop

The core loop is designed for rapid iteration. Early loops complete in approximately 8 seconds (zone D expedition), scaling upward as the player progresses into harder zones. The player always has agency.

1. Player spawns into a new session
2. Recruit 1 starting hero (free)
3. Send hero on an expedition to a zone
4. Hero explores for up to the zone's max duration, taking damage over time
5. If HP reaches 0: hero returns empty-handed, enters cooldown
6. If hero survives: receive ingredients + gold
7. Craft potions instantly using gathered ingredients (trial and error)
8. Discover new recipes when a valid combination is found
9. Earn gold from exploration drops and potion crafting
10. Spend gold to recruit additional heroes (max 3)
11. Repeat until the grimoire is 100% complete

The loop accelerates as the player acquires more heroes: multiple expeditions run in parallel, increasing ingredient throughput and enabling faster experimentation.

---

## 5. Victory Condition

The first player to discover all potions in the grimoire wins the session. This is the sole victory condition in V0 and V1.

**There is no:** final boss, survival timer, endgame RNG gate, or score-based ranking.

Victory depends purely on exploration efficiency, resource management, and recipe discovery speed.

> **V2+ direction:** A point-based scoring system (gold earned, time, potions discovered, heroes recruited) was discussed to create varied meta-strategies a la 7 Wonders. Deferred.

---

## 6. Exploration System

### 6.1 Zone Structure

5 zones, tiered D (easiest) to S (hardest). All accessible from the start — no unlock gates. Difficulty expressed through expedition duration and zone damage (DPS).

Each zone contains 5 unique ingredients, for a total of 25 ingredients across all zones.

| Zone | Tier | Name | Duration | DPS | HP Cost* | Rarity | Gold Base | Gold Variance |
|------|------|------|----------|-----|----------|--------|-----------|---------------|
| 0 | D | Verdant Meadow | 8s | 1.25 | 10 | common | 5 | 0 |
| 1 | C | Misty Marsh | 15s | 2.0 | 30 | common/rare | 10 | 5 |
| 2 | B | Crystal Cavern | 25s | 2.2 | 55 | rare | 18 | 10 |
| 3 | A | Volcanic Ridge | 40s | 1.875 | 75 | rare/epic | 28 | 15 |
| 4 | S | Aether Spire | 60s | 1.58 | 95 | epic | 40 | 20 |

*HP Cost = DPS x Duration. Theoretical cost if hero survives full expedition.*

### 6.2 HP & Survival Mechanic

Heroes have HP. Zones deal DPS continuously during the expedition. If HP reaches 0 before the expedition completes, the hero returns empty-handed and enters a cooldown state.

This prevents a degenerate strategy where players send underleveled heroes to high-tier zones briefly to grab rare ingredients. To survive zone S, a hero needs enough HP to endure the full 60 seconds.

**DPS application:** Each game tick (100ms), hero loses zone.dps * 0.1 HP. Damage is continuous, not burst.

**Death:** HP reaches 0: expedition fails immediately. Hero status becomes cooldown. After COOLDOWN_DURATION (10s), hero revives at full HP.

### 6.3 Expedition Rules

- One hero per expedition. Multiple heroes can explore different zones simultaneously.
- No recall mechanic. Once an expedition starts, it must complete (or the hero dies).
- **V1 onchain:** Expedition start = 1 tx. Expedition resolve = 1 tx.

### 6.4 Loot Generation

On successful expedition completion:

```typescript
// Number of ingredient drops: uniform random 2..4
const numDrops = 2 + rng.nextInt(3);

// Each drop: random ingredient from zone's 5, quantity 1..3
for (let i = 0; i < numDrops; i++) {
  const ingredient = zone.ingredients[rng.nextInt(5)];
  const qty = 1 + rng.nextInt(3);
  inventory[ingredient] += qty;
}

// Gold: base + random variance
const gold = zone.goldDropBase + rng.nextInt(zone.goldDropVariance + 1);
```

Expedition loot RNG seeded with: sessionSeed + heroId * 10000 + expeditionStartTimestamp.

### 6.5 Information Visibility

Players see macro-level info (zone identity, tier, possible ingredient types) but exact drop quantities are hidden until the expedition resolves.

**V1 onchain note:** Because the game is fully onchain with a deterministic seed, technically savvy players can read the contract to predict outcomes. This is accepted as part of the onchain ethos — information advantage through technical skill is by design.

---

## 7. Ingredient System

### 7.1 Ingredient Table

25 total. 5 per zone.

| Zone | Tier | Ingredients |
|------|------|-------------|
| D | common | Moonpetal, Dewmoss, River Clay, Copper Dust, Nightberry |
| C | rare | Crimson Lichen, Fog Essence, Iron Filing, Stoneroot, Amber Sap |
| B | rare | Crystal Shard, Drake Moss, Sulfur Bloom, Shadow Silk, Venom Drop |
| A | epic | Phoenix Ash, Void Salt, Starlight Dew, Obsidian Flake, Spirit Vine |
| S | epic | Dragon Scale, Aether Core, Titan Blood, Celestial Dust, Abyssal Pearl |

### 7.2 Ingredient Tier Mapping

Derived from zone:
- Zone D: common (UI: green)
- Zone C: rare (UI: blue)
- Zone B: rare (UI: blue)
- Zone A: epic (UI: purple)
- Zone S: epic (UI: purple)

### 7.3 Combinatorial Space

With 25 ingredients:
- 2-ingredient combos (order-independent): C(25,2) + 25 = 325 (including same-ingredient pairs)
- 3-ingredient combos: C(25,3) = 2,300
- 4-ingredient combos: C(25,4) = 12,650

The 2-ingredient space (325) is large enough to make brute-forcing impractical in 15-30 minutes, but small enough that systematic experimentation is rewarded. 3 and 4-ingredient recipes are used sparingly for late-game potions.

---

## 8. Potion & Crafting System

### 8.1 Crafting Rules

| Rule | Detail | Version |
|------|--------|---------|
| Crafting speed | Instant. No production timers. | V0, V1 |
| Cauldrons | Single cauldron per player. | V0, V1 |
| Recipe size | Variable: 2, 3, or 4 ingredients per recipe. Majority are 2-ingredient. | V0, V1 |
| Recipe discovery | Pure experimentation. No hints. | V0, V1 |
| Failed craft | Ingredients consumed. No potion produced. No feedback on proximity. | V0, V1 |
| Onchain cost | Craft = single transaction. | V1 |

### 8.2 Craft Flow (Implementation)

```
1. Validate: at least 2 ingredients selected, all present in inventory
2. Consume ingredients from inventory (even on failure)
3. Sort selected ingredients alphabetically -> comboKey
4. Add comboKey to testedCombos set
5. Check: does comboKey match any undiscovered recipe?
   YES -> Discovery! Add recipe.id to discovered[], award 15 gold, notification
   NO  -> Check progressive probability (see 8.5)
         Lucky roll -> Discover random undiscovered recipe, award gold
         No luck    -> Fail. "Nothing happened. Ingredients consumed."
6. Check win condition: discovered.length >= TOTAL_POTIONS
```

### 8.3 Recipe Generation

Called once at session start. Produces exactly TOTAL_POTIONS (50) recipes. RNG seeded with sessionSeed.

```typescript
interface Recipe {
  id: number;
  name: string;            // "[Adjective] [Noun]" — generated, unique
  ingredients: string[];   // Sorted alphabetically (canonical form)
  size: number;            // 2, 3, or 4
  tier: number;            // Highest zone tier among ingredients (0-4)
}
```

**Algorithm:**

```
Phase 1 — Pinned recipes (guarantee zone coverage):
  For each zone (0-4), generate 2-3 recipes with at least 1 pinned
  ingredient from that zone.
  2-ingredient: [pinned_from_zone, random_from_any_zone <= current+1]
  Produces ~12-13 recipes.

Phase 2 — Fill remaining 2-ingredient recipes up to ~32 total:
  Pick 2 random ingredients from any zone.
  Ensure no duplicate combo.

Phase 3 — 3-ingredient recipes (~13):
  Pick 3 random ingredients, at least 1 from zone B or higher.
  Ensure uniqueness.

Phase 4 — 4-ingredient recipes (~5):
  Pick 4 random ingredients, at least 1 pinned from zone A or S.
  Ensure uniqueness.

Post-check: every ingredient appears in at least 1 recipe.
If not, replace random recipes to include orphan ingredients.
```

**Recipe count targets:**

| Size | Count | Focus |
|------|-------|-------|
| 2 ingredients | ~32 | Early/mid-game. Easiest to discover. |
| 3 ingredients | ~13 | Mid/late-game. Complexity spike. |
| 4 ingredients | ~5 | Endgame. Requires epic ingredients. |
| **Total** | **50** | |

### 8.4 Pinned Ingredients

**Problem:** Without constraints, a player could discover all potions using only early-zone ingredients.

**Solution:** Some recipes have hardcoded ingredients from specific zone tiers. This guarantees that all zones must be explored.

Rules:
- Every zone has at least 1 ingredient required by at least 1 recipe. All 5 zones are worth exploring.
- Higher-tier potions pin ingredients from higher-tier zones.
- Pinned slots: typically 1 out of 2-4 ingredients, preserving experimentation freedom.

**Example:** [Dragon Scale, ???] — Dragon Scale is pinned (zone S epic), second slot is open.

### 8.5 Progressive Discovery Probability

**Problem:** Hash-based system could deadlock if a player tests every combination and still misses potions.

**Solution:** Probability of a failed craft yielding a lucky discovery increases as more combinations are tested.

```typescript
function getProgressiveChance(discoveredCount: number, testedCount: number): number {
  const remaining = TOTAL_POTIONS - discoveredCount;
  if (remaining <= 0) return 0;

  const totalPossibleCombos = 325;
  const testedRatio = testedCount / totalPossibleCombos;

  // Exponential ramp: barely noticeable early, strong late
  const chance = Math.pow(testedRatio, 3) * 0.6;

  // Guarantee: last potion + 90%+ tested -> 100%
  if (remaining === 1 && testedRatio > 0.9) return 1.0;

  return Math.min(chance, 0.8);
}
```

When triggered, the lucky discovery reveals a random undiscovered recipe — not the one matching the current combo. This is a safety net, not a strategy.

### 8.6 Potions as Progression

Potions are progression markers only. No stats, abilities, or buffs in V0/V1. The grimoire is a checklist. Completing all slots wins the game.

---

## 9. The Grimoire

### 9.1 UX Specification

- Total count always visible: **X/50**
- Undiscovered entries: **????** — zero information leak about ingredient types or recipe size
- Discovered entries: potion name revealed permanently, recipe shown on hover/click
- Grimoire completion triggers win state and ends the session

### 9.2 Target Numbers

| Parameter | Value | Notes |
|-----------|-------|-------|
| Total potions | 50 | Calibrated for 15-30 min sessions |
| 2-ingredient | ~32 | Early/mid focus |
| 3-ingredient | ~13 | Mid/late complexity |
| 4-ingredient | ~5 | Endgame, epic ingredients required |

**Constraint:** At least 1 potion per ingredient (25 minimum) — every ingredient has a purpose.

---

## 10. Hero System

### 10.1 V0/V1 Spec

| Property | Value |
|----------|-------|
| Stats | HP only. Fixed per hero. All heroes identical. |
| Max HP | 100 |
| HP regen (idle) | 5 HP/s |
| Upgrades | None |
| Gear / Equipment | None |
| Specialization | None |
| Maximum count | 3 |
| Hero 1 | Free at spawn |
| Hero 2 cost | 80 gold |
| Hero 3 cost | 200 gold |
| Cooldown on death | 10 seconds, revives at full HP |
| Names | Alaric, Brynn, Cassiel |

```typescript
interface Hero {
  id: number;            // 0, 1, 2
  name: string;
  hp: number;            // Current HP, 0..maxHp
  maxHp: number;         // 100
  status: 'idle' | 'exploring' | 'cooldown';
  zoneId: number | null;
  expStart: number;      // timestamp ms
  expEnd: number;        // timestamp ms
  cooldownEnd: number;   // timestamp ms
}
```

With 3 heroes, a player runs 3 simultaneous expeditions across different zones, tripling ingredient throughput. Hero recruitment timing is a key strategic decision.

### 10.2 V2+ Hero Evolution

- Variable stats (HP, speed, damage resistance)
- Gear and equipment slots
- Specialization (tank for hard zones vs. scout for fast zones)
- Upgrades purchased with gold

---

## 11. Gold Economy

### 11.1 Sources

| Source | Amount | Notes |
|--------|--------|-------|
| Expedition (zone D) | ~5g | Base 5, variance 0 |
| Expedition (zone C) | ~10-15g | Base 10, variance 5 |
| Expedition (zone B) | ~18-28g | Base 18, variance 10 |
| Expedition (zone A) | ~28-43g | Base 28, variance 15 |
| Expedition (zone S) | ~40-60g | Base 40, variance 20 |
| Potion discovery | 15g | Flat per discovery |

### 11.2 Sinks

| Sink | Cost | Version |
|------|------|---------|
| Hero 2 | 80g | V0, V1 |
| Hero 3 | 200g | V0, V1 |
| Cauldron upgrades | TBD | V2+ |
| Housing (hero/cauldron cap expansion) | TBD | V2+ |
| Zone access fees | TBD | V2+ |

### 11.3 Economy Pacing

Gold is a tempo accelerator. It does not directly help recipe discovery, but enables faster exploration via hero recruitment.

| Milestone | Target Time | Gold Needed |
|-----------|------------|-------------|
| Hero 2 | ~2-3 min | 80g |
| Hero 3 | ~6-8 min | 200g |

A player running zone D (8s, 5g) earns ~37g/min with 1 hero. After recruiting hero 2 at ~2 min, throughput doubles. Hero 3 becomes affordable around 6-8 min with mixed zone exploration.

---

## 12. Session Design & Pacing

### 12.1 Timing Targets

| Phase | Duration | Description |
|-------|----------|-------------|
| Opening (1 hero, zone D) | 0-2 min | Fast loops (8s expeditions). First ingredients, first craft attempts. |
| Early mid-game (2 heroes) | 2-7 min | Parallel expeditions. First discoveries. Exploring zones C-B. |
| Late mid-game (3 heroes) | 7-15 min | Full throughput. Systematic recipe hunting. Zones A-S for epic ingredients. |
| Endgame | 15-30 min | Last 5-10 recipes. 3-4 ingredient combos. Epic ingredients required. |

### 12.2 Pacing Principles

- Fast-paced at every stage. No idle time without a decision to make.
- Early loops: ~8 seconds to hook the player.
- Longer expedition times in late zones offset by multiple heroes.
- Crafting is instant — the only waiting time is expedition duration.
- Player should always have a meaningful action: send expedition, attempt craft, plan strategy.

### 12.3 Multiplayer Model

**V0:** Solo play only. No multiplayer.

**V1:** Open PvE race. No player cap, no matchmaking, no lobbies. All players compete asynchronously on the same global seed. First to complete grimoire wins. Players can observe each other's progress on a grimoire leaderboard.

**V2+:** PvP during exploration. Loot contesting. Same-zone interactions.

---

## 13. Technical Architecture (V0)

### 13.1 Project Structure

```
alchemist-v0/
├── src/
│   ├── main.tsx                  # Entry point
│   ├── App.tsx                   # Root component, layout grid
│   ├── game/
│   │   ├── state.ts              # GameState type + initial state factory
│   │   ├── engine.ts             # Core logic (tick, resolve, craft, recruit)
│   │   ├── recipes.ts            # Recipe generation from seed
│   │   ├── rng.ts                # Seeded RNG (mulberry32)
│   │   └── constants.ts          # All game constants
│   ├── phaser/
│   │   ├── PhaserContainer.tsx   # React wrapper for Phaser canvas
│   │   ├── AlchemistScene.ts     # Zone map, hero sprites, particles
│   │   └── config.ts             # Phaser game config
│   ├── ui/
│   │   ├── TopBar.tsx            # Gold, timer, grimoire progress
│   │   ├── GrimoirePanel.tsx     # Left panel — potion grid
│   │   ├── CraftPanel.tsx        # Right panel — cauldron + inventory
│   │   ├── HeroBar.tsx           # Bottom bar — hero cards + recruit + quick zone buttons
│   │   ├── ZoneTooltip.tsx       # Hover tooltip over zones
│   │   ├── Notifications.tsx     # Toast notifications
│   │   └── WinOverlay.tsx        # Victory screen
│   └── hooks/
│       ├── useGameLoop.ts        # setInterval tick, state updates
│       └── useGameState.ts       # useReducer state management
├── public/
│   └── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 13.2 State Ownership

React owns all game state via useReducer. Phaser is a pure renderer — reads state from a shared ref, never mutates it.

```
React (state + logic) --ref--> Phaser (render only)
       |
       └── dispatch(action) -- TICK | SEND_EXPEDITION | CRAFT | RECRUIT | RESET
```

Phaser emits zone-click events back to React via callback ref.

### 13.3 Seeded RNG

```typescript
function createRng(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
```

- Session seed: random at start, shared across all systems
- Recipe RNG: createRng(sessionSeed)
- Expedition loot RNG: createRng(sessionSeed + heroId * 10000 + expStartTimestamp)

### 13.4 Game State Type

```typescript
interface GameState {
  seed: number;
  gold: number;
  heroes: Hero[];
  inventory: Record<string, number>;  // ingredient name -> quantity
  discovered: number[];               // recipe IDs
  testedCombos: Set<string>;          // combo keys already tried
  recipes: Recipe[];                  // generated at session start
  craftSlots: string[];               // 4 slots, '' if empty
  craftResult: { type: 'success' | 'fail'; text: string } | null;
  notifications: Notification[];
  sessionStart: number;               // timestamp
  won: boolean;
}
```

---

## 14. Technical Principles (V1 Onchain)

| Principle | Implementation |
|-----------|---------------|
| Platform | Starknet — fully onchain |
| Determinism | Global seed defines all zone structures, loot tables, and recipe hashes. No server-side RNG. |
| Player state | Stored entirely onchain: heroes, inventory, grimoire progress, gold, HP. |
| Gas optimization | Minimal gas-heavy operations. Craft and expedition resolve are each a single transaction. |
| Information visibility | All data technically readable onchain. Macro-level zone info visible in UX; exact outputs hidden until resolution. Contract readers have an advantage — by design. |

### 14.1 Transaction Map (V1)

| Action | Transactions |
|--------|-------------|
| Spawn + recruit first hero | 1 tx |
| Send hero on expedition | 1 tx |
| Resolve expedition (claim loot or confirm death) | 1 tx |
| Craft potion attempt | 1 tx |
| Recruit additional hero | 1 tx |

---

## 15. UI Specification

### 15.1 Layout

```
┌─────────────────────────────────────────────────────┐
│  TopBar: Gold | ALCHEMIST | Grimoire X/50 | MM:SS   │
├────────┬──────────────────────────┬─────────────────┤
│        │                          │                 │
│ Grim-  │    Phaser Canvas         │  Craft Panel    │
│ oire   │    (Zone Map)            │  - 4 slots      │
│ Panel  │                          │  - Brew button  │
│        │    5 zone nodes in arc   │  - Result msg   │
│ Grid   │    Hero sprites moving   │                 │
│ of 50  │    Progress arcs         │  Inventory      │
│ slots  │    Particles on events   │  - Ingredients  │
│        │                          │  - Tested count │
├────────┴──────────────────────────┴─────────────────┤
│  HeroBar: [Hero Cards] [Recruit] [Quick Zone D-S]   │
└─────────────────────────────────────────────────────┘
```

Grid: grid-template-rows: 56px 1fr 90px; grid-template-columns: 220px 1fr 260px;

### 15.2 TopBar

- Left: gold count with icon
- Center: "ALCHEMIST" title
- Right: grimoire progress ("12/50"), session timer (MM:SS)

### 15.3 Grimoire Panel (left, scrollable)

- Header: "Grimoire"
- Grid: 2 columns x 25 rows
- Undiscovered: "????" in muted color
- Discovered: potion name, highlighted border, subtle glow
- Newly discovered: 1.5s glow animation
- Hover (discovered only): tooltip showing ingredient list

### 15.4 Phaser Canvas (center)

Scene contents:
- Background: dark space, ~60 twinkling star dots (alpha tween)
- 5 zone nodes in arc formation, each showing: tier letter, zone name, duration
- Thin connection lines between adjacent zones
- Progress arcs around zone nodes during active expeditions (0 to 100%)
- Hero sprites: small colored circles, smooth lerp movement toward target zone or home
- Particle bursts: zone color on expedition success, red on hero death, gold on potion discovery

Zone interaction: transparent HTML overlay divs positioned over zone nodes. On click: send best available idle hero.

### 15.5 Craft Panel (right, scrollable)

- Header: "Cauldron"
- 4 ingredient slots (select dropdowns):
  - Slots 1-2: required (*)
  - Slots 3-4: optional
  - Dropdown lists ingredients with qty > 0
- "Brew" button (disabled if < 2 slots filled)
- Result area: success (green) / fail (red) / empty (muted prompt)
- Inventory section: ingredient list sorted by tier, showing name + quantity
- Footer: "Tested: X combos"

### 15.6 Hero Bar (bottom, full width)

- Hero cards (1-3): icon, name, HP bar (green/yellow/red), status text, countdown timer if exploring
- Recruit button: shows cost, disabled if insufficient gold or max heroes
- Quick zone buttons (D C B A S): colored by zone, disabled if no hero can survive, sends best available hero on click

### 15.7 Notifications

- Toast at top center, auto-dismiss 3s
- Types: potion-found (purple), gold-earned (gold), hero-died (red)
- Animate: slide down in, fade out

### 15.8 Win Overlay

- Covers center canvas area
- "GRIMOIRE COMPLETE" in large golden text
- Stats: potions found, time, gold earned
- "New Session" button: resets with new seed

---

## 16. Game Tick & Engine

Game tick runs every **100ms**. Single reducer dispatch per tick.

### 16.1 Tick Order

```
1. For each exploring hero:
   a. Apply DPS: hero.hp -= zone.dps * 0.1
   b. If hp <= 0: death
      - status = 'cooldown'
      - cooldownEnd = now + 10000
      - zoneId = null
      - No loot. Notification: "[Hero] fell in [Zone]!"
   c. If now >= expEnd: success
      - Generate loot (ingredients + gold) using expedition RNG
      - status = 'idle'
      - zoneId = null
      - Notification: "+Xg from [Zone]"

2. For each idle hero with hp < maxHp:
   - hero.hp = min(maxHp, hero.hp + 5 * 0.1)

3. For each cooldown hero:
   - If now >= cooldownEnd: status = 'idle', hp = maxHp

4. Clean notifications older than 3s

5. (Win check happens on craft only, not on tick)
```

### 16.2 Action Handlers

**SEND_EXPEDITION(heroId, zoneId):**
```
- Validate: hero.status === 'idle'
- Validate: hero.hp > zone.dps * 2 (soft minimum to prevent instant death)
- hero.status = 'exploring'
- hero.zoneId = zoneId
- hero.expStart = now
- hero.expEnd = now + zone.duration * 1000
```

**CRAFT(selectedIngredients: string[]):**
```
- Validate: length >= 2, all in inventory
- Consume from inventory
- comboKey = sorted(ingredients).join('|')
- testedCombos.add(comboKey)
- Match against recipes: success or progressive probability or fail
- If discovered.length >= TOTAL_POTIONS: won = true
```

**RECRUIT():**
```
- Validate: heroes.length < 3
- Validate: gold >= HERO_COST[heroes.length]
- Deduct gold
- Push new hero with full HP, idle status
```

**RESET():**
```
- New seed
- Regenerate recipes
- Reset all state to initial
```

---

## 17. Edge Cases & Rules

| Situation | Rule |
|-----------|------|
| Hero sent to zone they can't survive | UI prevents if hero.hp <= zone.dps * 2. If hero dies mid-expedition due to exact HP, they return empty-handed. |
| Same ingredient in multiple craft slots | Allowed if inventory has enough. E.g., 2x Moonpetal requires 2+ in stock. |
| Craft with 1 ingredient | Blocked. Button disabled. Minimum 2. |
| Craft with 0-qty ingredient | Dropdown only shows ingredients with qty > 0. |
| All heroes exploring | Player can only craft. Zone buttons disabled. |
| All heroes dead/cooldown | Player waits. Optional message: "All heroes recovering..." |
| Already-tested combo | Ingredients consumed. Fail message. No special "already tried" feedback in V0. |
| Gold goes negative | Never. All costs validated before deduction. |
| Inventory goes negative | Never. Craft validates before consuming. |
| Multiple heroes to same zone | Allowed. Each runs independently. |
| Hero dies on exact last tick of expedition | Death takes priority. No loot. |
| Session seed collision | Irrelevant for V0 (random per session). V1: managed by contract. |

---

## 18. Balancing Levers

All in constants.ts. These are the knobs to turn during playtesting.

| Lever | Current Value | Effect of Increase |
|-------|--------------|-------------------|
| Zone durations | [8, 15, 25, 40, 60]s | Slower game, more waiting |
| Zone DPS | [1.25, 2.0, 2.2, 1.875, 1.58] | More hero deaths, zones harder |
| Hero max HP | 100 | Can chain more zones before resting |
| Hero regen rate | 5 HP/s | Faster recovery between expeditions |
| Hero costs | [0, 80, 200]g | Delays multi-hero power spike |
| Total potions | 50 | Session length |
| 2-ingredient recipe count | ~32 | More easy recipes = faster start |
| 3-ingredient recipe count | ~13 | Mid-game complexity |
| 4-ingredient recipe count | ~5 | Endgame difficulty |
| Gold per potion discovery | 15g | Economy speed |
| Gold per expedition | 5-60g (by zone) | Economy speed |
| Cooldown duration | 10s | Death punishment severity |
| Ingredient drops per expedition | 2-4 | Ingredient abundance |
| Ingredient qty per drop | 1-3 | Ingredient abundance |
| Progressive chance exponent | 3 | How fast lucky discovery ramps |
| Progressive chance cap | 0.8 | Maximum lucky chance |

---

## 19. V2+ Features

Features discussed during design, deferred from V0/V1. Ordered by estimated impact.

### 19.1 PvP Exploration

Players encounter each other during expeditions. Same-zone presence creates loot contesting. Changes meta from pure optimization to strategic timing and risk management. The grimoire race gains a sabotage layer.

### 19.2 Hero Upgrades & Gear

Heroes gain stats, equipment, specialization. Tanky hero for zone S vs. fast hero for zone D farming. Creates gold sinks and strategic depth. Requires significant rebalancing of zone damage.

### 19.3 Multiple Cauldrons

Purchase additional cauldrons for parallel production. Meaningful if crafting gains production timers. Potential cap at 3 for UI simplicity.

### 19.4 Potion-to-Potion Crafting

Use potions as ingredients for higher-tier potions. Deepens the crafting tree. Deferred due to smart contract complexity.

### 19.5 Point-Based Scoring

7 Wonders-style scoring: points for gold, time, potions, heroes. Enables varied win strategies (rush vs. completionist) and evolving meta. Could run alongside or replace the "first to complete" model.

### 19.6 Zone-Based Hint System

Completing a zone grants a hint about an undiscovered potion — reveals one pinned ingredient. Rewards thorough exploration. Design considerations:
- Hints target undiscovered potions only
- Lower-tier zone completion hints at higher-tier potions
- Risk: luck-dependent if hint quality varies
- Could enable a larger ingredient pool (30+) without making discovery impossible

### 19.7 Advanced Economy

Additional sinks: housing upgrades (hero/cauldron cap expansion), zone access fees, ingredient trading between players. Goal: prevent gold accumulation from trivializing late game.

---

## 20. Open Design Questions

| # | Question | Context | Impact | Resolved by |
|---|----------|---------|--------|-------------|
| 1 | Exact potion count? | 50 target. Min 25 (1 per ingredient). | High | V0 playtesting |
| 2 | Hero HP variation? | All identical now. Varied HP = more strategy. | Medium | V0 playtesting |
| 3 | Death cooldown duration? | 10s now. Too harsh kills pacing, too lenient removes risk. | Medium | V0 playtesting |
| 4 | Gold cost curve? | Hero 2 at 80g, Hero 3 at 200g. | High | V0 playtesting |
| 5 | Progressive probability exponent? | 3 now. Higher = later ramp. | Medium | V0 playtesting |
| 6 | Pinned ingredients per recipe? | 1 per recipe now. More = stricter zone dependency. | High | V0 playtesting |
| 7 | Expedition durations? | [8, 15, 25, 40, 60]s. Zone S at 60s might be too long. | High | V0 playtesting |
| 8 | Gold drop rates? | Scaled by zone tier. Might be too fast or too slow. | Medium | V0 playtesting |
| 9 | Failed craft feedback? | Zero feedback now. "Warmth" indicator would reduce frustration. | Medium | V1 decision |
| 10 | Onchain info strategy? | Contract-readable seed. Acceptable asymmetry? | High | V1 decision |

---

## 21. Definition of Done

### V0 — Browser PoC

1. Player can start a session and play the full loop: explore, gather, craft, discover
2. All 50 potions are discoverable through experimentation
3. Grimoire fills correctly and triggers win condition
4. 3 heroes recruitable, exploring in parallel
5. HP, DPS damage, death, cooldown, regen all work correctly
6. Recipe generation is deterministic (same seed = same recipes)
7. Progressive probability prevents hard deadlocks
8. Session completable in 15-30 minutes by an efficient player
9. "New Session" generates fresh seed, full reset
10. No console errors, no stuck states, no negative resources

### V1 — Onchain PvE Race

1. All V0 gameplay ported to Starknet smart contracts
2. Player state fully onchain
3. Each action (expedition, craft, recruit) is a single transaction
4. Global seed shared across all players in a session
5. First-to-complete-grimoire win detection works
6. Leaderboard shows live grimoire progress for all players
7. Gas costs are reasonable for a full session (~50-100 transactions)
8. Client correctly reads and renders onchain state
9. Session lifecycle: creation, play, winner declaration, reset

### V2+ — PvP & Depth

1. PvP zone encounters functional and balanced
2. Hero upgrade/gear system integrated without breaking economy
3. At least 2 viable meta-strategies (rush vs. methodical)
4. Session replayability confirmed over 10+ sessions

---

*End of document.*
