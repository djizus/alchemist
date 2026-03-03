# AGENTS.md — Alchemist Project Knowledge Base

## Project Overview

Alchemist is a competitive grimoire-completion race game. Players explore zones, gather ingredients, and craft potions through experimentation. Currently in V0 (browser PoC), targeting V1 on Starknet.

## Tech Stack

- **Runtime**: TypeScript, React 18, Phaser 3, Vite
- **Package Manager**: pnpm
- **Target**: V1 will be Starknet (Cairo smart contracts) + client

## Architecture

### State Ownership

React owns all game state via `useReducer` in `src/hooks/useGameState.ts`. Phaser is a **pure renderer** — reads state from a shared ref, never mutates it.

```
React (state + logic) --ref--> Phaser (render only)
       |
       └── dispatch(action)
```

### Directory Layout

| Directory | Purpose | Rules |
|-----------|---------|-------|
| `src/game/` | Pure game logic | No React, no Phaser, no DOM. Pure functions + types. |
| `src/phaser/` | Rendering layer | Read-only. Never mutate game state. |
| `src/ui/` | React UI components | Pure presentational. Props in, JSX out. No state hooks. |
| `src/hooks/` | React hooks | State management + game loop. |

### Key Files

| File | What it does |
|------|-------------|
| `src/game/constants.ts` | All balancing levers. Change game tuning here. |
| `src/game/engine.ts` | Core reducer: tick (100ms), craft, recruit, expedition logic |
| `src/game/recipes.ts` | Deterministic recipe generation (4-phase algorithm) |
| `src/game/rng.ts` | Mulberry32 seeded RNG |
| `src/game/state.ts` | All TypeScript interfaces (GameState, Hero, Recipe, etc.) |
| `src/phaser/AlchemistScene.ts` | Zone nodes, hero sprites, particles, progress arcs |
| `src/App.tsx` | Root component, wires state to Phaser + UI |

## Game Mechanics (Quick Reference)

### Zones (5 total, all accessible from start)

| Zone | Tier | Duration | DPS | HP Cost | Gold |
|------|------|----------|-----|---------|------|
| Verdant Meadow | D | 8s | 1.25 | 10 | 5+0 |
| Misty Marsh | C | 15s | 2.0 | 30 | 10+5 |
| Crystal Cavern | B | 25s | 2.2 | 55 | 18+10 |
| Volcanic Ridge | A | 40s | 1.875 | 75 | 28+15 |
| Aether Spire | S | 60s | 1.58 | 95 | 40+20 |

### Heroes

- Max 3, costs [0, 80, 200] gold
- 100 HP, 5 HP/s regen when idle
- 10s cooldown on death, revive at full HP
- Continuous DPS: hero loses `zone.dps * 0.1` HP per tick (100ms)

### Recipes

- 50 total: ~32 two-ingredient, ~13 three-ingredient, ~5 four-ingredient
- Generated deterministically from session seed
- Pinned ingredients guarantee all zones must be explored
- Progressive probability prevents deadlocks (exponential ramp)

### Crafting

- Instant, no timers
- Ingredients consumed even on failure
- No proximity feedback — pure experimentation
- Win condition: discover all 50 potions

## Coding Conventions

- **No `as any`** or `@ts-ignore`. Strict TypeScript.
- **Game logic in `src/game/`** — keep it framework-agnostic for V1 Cairo port.
- **Phaser is render-only** — never dispatch actions from Phaser scene.
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

Full spec at [Alchemist_Consolidated.md](Alchemist_Consolidated.md) — covers all game systems, balancing levers, V1 onchain architecture, and open design questions.
