# Alchemist

Fully onchain competitive grimoire race on Starknet. Send heroes on expeditions through dangerous zones, gather ingredients, craft potions, and discover hidden recipes through experimentation. First to complete the grimoire wins.

## V0 — Browser PoC

Playable browser prototype validating the core game loop before smart contract work.

- **Stack**: React 19 + TypeScript + Vite
- **Multiplayer**: None (solo play)
- **Goal**: Prove the loop is fun, tune balancing

### Core Loop

1. Send heroes on linear expeditions through increasingly dangerous zones
2. Survive traps, beasts, and hazards — hero retreats with loot when HP hits 0
3. Collect ingredients dropped during exploration
4. Craft potions by combining 2 ingredients (trial and error)
5. Give potions to heroes to permanently buff their stats (HP, Power, Regen)
6. Recruit more heroes (up to 3) for parallel expeditions
7. Discover all 30 recipes in the grimoire to win

### Quick Start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` to play.

### Build

```bash
pnpm build
```

### Project Structure

```
src/
├── game/           # Core game logic (pure functions, no UI)
│   ├── constants.ts    # All balancing levers (zones, events, hero stats)
│   ├── rng.ts          # Seeded RNG (mulberry32)
│   ├── recipes.ts      # Deterministic 30-recipe generation
│   ├── state.ts        # TypeScript interfaces
│   └── engine.ts       # Game reducer (tick, explore, craft, potions)
├── ui/             # React components (pure presentational)
│   ├── TopBar.tsx
│   ├── HeroPanel.tsx
│   ├── ExplorationPanel.tsx
│   ├── CraftPanel.tsx
│   ├── GrimoirePanel.tsx
│   ├── InventoryPanel.tsx
│   ├── EventLog.tsx
│   ├── Notifications.tsx
│   └── WinOverlay.tsx
├── hooks/          # React hooks
│   ├── useGameState.ts
│   └── useGameLoop.ts
├── App.tsx         # Root layout + wiring
├── main.tsx        # Entry point
└── styles.css      # Dark alchemist theme
```

### Architecture

React owns all game state via `useReducer`. UI is pure React (no game engine). Game tick runs every 100ms, exploration events fire every 1 second. State is persisted to localStorage.

```
React (state + logic) → UI (render only)
       |
       └── dispatch(action) -- TICK | SEND_EXPEDITION | RECALL_HERO | CLAIM_LOOT | CRAFT | APPLY_POTION | RECRUIT_HERO | RESET
```

### Key Design Decisions

- **Linear exploration**: Heroes auto-advance through zones (D → C → B → A → S) based on depth
- **Event-driven**: Every second, a random event fires (trap, gold, heal, beast, or nothing)
- **Deterministic**: Seeded RNG means same seed = same recipes, same event rolls
- **Beast combat**: Auto-resolved by hero power vs beast power
- **Consumable potions**: Craft a potion, then give it to a hero for permanent stat buffs
- **No hints**: Recipe discovery is pure experimentation
- **Progressive probability**: Safety net prevents hard deadlocks on last few recipes

### Version Roadmap

| Version | Description |
|---------|-------------|
| **V0** | Browser PoC (current) — validate the loop |
| **V1** | Onchain PvE race — Starknet smart contracts, competitive multiplayer |
| **V2+** | PvP exploration, hero upgrades, gear, scoring |

See [Alchemist_Consolidated.md](Alchemist_Consolidated.md) for the full design document.
