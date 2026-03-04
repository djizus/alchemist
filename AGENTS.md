# AGENTS.md — Alchemist Project Knowledge Base

## Project Overview

Alchemist is a competitive grimoire-completion race game. Players send heroes on linear expeditions through increasingly dangerous zones, gather ingredients, and craft potions through experimentation. Currently in V0 (browser PoC), targeting V1 on Starknet.

## Tech Stack

- **Runtime**: TypeScript, React 19, Vite
- **Package Manager**: pnpm
- **Target**: V1 will be Starknet (Cairo smart contracts) + client

## Architecture

### State Ownership

React owns all game state via `useReducer` in `src/hooks/useGameState.ts`. UI is pure React — reads state, dispatches actions. State is persisted to localStorage.

```
React (state + logic) → UI (render only)
       |
       └── dispatch(action)
```

### Directory Layout

| Directory | Purpose | Rules |
|-----------|---------|-------|
| `src/game/` | Pure game logic | No React, no DOM. Pure functions + types. |
| `src/ui/` | React UI components | Pure presentational. Props in, JSX out. No state hooks. |
| `src/hooks/` | React hooks | State management + game loop. |

### Key Files

| File | What it does |
|------|-------------|
| `src/game/constants.ts` | All balancing levers: zones, event probabilities, hero stats, crafting params |
| `src/game/engine.ts` | Core reducer: tick (100ms), exploration events, crafting, potion application, hero management |
| `src/game/recipes.ts` | Deterministic 30-recipe generation from seed (all 2-ingredient) |
| `src/game/rng.ts` | Mulberry32 seeded RNG + helpers (randInt, randPick, shuffle) |
| `src/game/state.ts` | All TypeScript interfaces (GameState, Hero, Recipe, ExplorationEvent, etc.) |
| `src/App.tsx` | Root component, wires state to UI |

## Game Mechanics (Quick Reference)

### Exploration (Linear Zone Progression)

Heroes auto-advance through zones continuously. Depth = seconds explored. The hero cannot choose which zone to visit — they progress linearly until HP runs out, then retreat with all accumulated loot.

| Zone | Tier | Depth Threshold | Key Danger |
|------|------|----------------|------------|
| Verdant Meadow | D | 0s | Low traps, weak beasts |
| Misty Marsh | C | 15s | Moderate traps + beasts |
| Crystal Cavern | B | 35s | Higher trap damage, stronger beasts |
| Volcanic Ridge | A | 60s | Heavy damage, powerful beasts |
| Aether Spire | S | 90s | Maximum danger, best loot |

### Exploration Events (every 1 second)

Each second, a random event rolls against the current zone's probabilities:
- **Trap** — Hero loses HP (zone-scaled damage)
- **Gold** — Hero finds gold
- **Heal** — Hero recovers HP
- **Beast** — Auto-resolved by power. Win = gold loot + minor damage. Lose = heavy damage.
- **Nothing** — No event (remainder probability)
- **Ingredient Drop** — Independent roll; hero collects zone-specific ingredients

### Heroes

- Max 3, costs [0, 80, 200] gold
- Base stats: 100 HP, 5 Power, 1 HP/s regen when idle
- Stats are permanently buffed by consuming potions
- At 0 HP: hero retreats home with ALL accumulated loot
- Regen: 1 HP/s base (improved by regen potions)

### Recipes & Crafting

- **30 recipes total**, ALL 2-ingredient combinations
- Generated deterministically from session seed
- Pinned ingredients guarantee all zones must be explored
- **Crafting**: Select 1 ingredient → Brew Untried cycles through partners
  - **Match** → Recipe discovered (or re-brewed), potion added to inventory
  - **No match** → Mysterious Soup (sells for 1 gold)
- Grimoire panel for re-brewing known recipes (Brew xN)
- Hint system: spend gold (10 x 3^n) to reveal one ingredient of an undiscovered recipe
- Progressive probability prevents deadlocks on late-game recipes

### Potions

- **Consumable**: Crafting produces a potion item in inventory
- **Application**: Give potion to a hero → consumed, permanently buffs their stats
- **Effect types**: `max_hp` (+5–20), `power` (+1–5), `regen_speed` (+1–3 HP/s)

### Win Condition

Discover all 30 recipes in the grimoire.

## Coding Conventions

- **No `as any`** or `@ts-ignore`. Strict TypeScript.
- **Game logic in `src/game/`** — keep it framework-agnostic for V1 Cairo port.
- **UI components are stateless** — props in, JSX out.
- **All constants in `constants.ts`** — single source for balancing levers.
- **Seeded RNG everywhere** — `createRng(seed)` for determinism.

## Build & Run

```bash
pnpm install
pnpm dev          # Dev server at localhost:5173
pnpm build        # Production build
```

## Design Document

Full spec at [Alchemist_POC.md](Alchemist_POC.md) — detailed system-by-system breakdown of the current V0 implementation.
