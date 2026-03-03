# Alchemist

Fully onchain competitive grimoire race on Starknet. Explore zones, gather ingredients, craft potions, discover hidden recipes through experimentation. First to complete the grimoire wins.

## V0 — Browser PoC

Playable browser prototype validating the core game loop before smart contract work.

- **Stack**: React 18 + Phaser 3 + TypeScript + Vite
- **Multiplayer**: None (solo play)
- **Goal**: Prove the loop is fun, tune balancing

### Core Loop

1. Send heroes on expeditions to gather ingredients
2. Craft potions by combining ingredients (trial and error)
3. Discover recipes — no hints, pure experimentation
4. Recruit more heroes (up to 3) for parallel expeditions
5. Complete all 50 potions in the grimoire to win

### Quick Start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` and click zone nodes to send your hero exploring.

### Build

```bash
pnpm build
```

### Project Structure

```
src/
├── game/           # Core game logic (pure functions, no UI)
│   ├── constants.ts    # All balancing levers
│   ├── rng.ts          # Seeded RNG (mulberry32)
│   ├── recipes.ts      # Deterministic recipe generation
│   ├── state.ts        # TypeScript interfaces
│   └── engine.ts       # Game reducer (tick, craft, recruit)
├── phaser/         # Phaser 3 rendering (read-only, no state mutation)
│   ├── AlchemistScene.ts
│   ├── PhaserContainer.tsx
│   └── config.ts
├── ui/             # React components (pure presentational)
│   ├── TopBar.tsx
│   ├── GrimoirePanel.tsx
│   ├── CraftPanel.tsx
│   ├── HeroBar.tsx
│   ├── ZoneTooltip.tsx
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

React owns all game state via `useReducer`. Phaser is a pure renderer — reads state from a shared ref, never mutates it. Game tick runs every 100ms.

```
React (state + logic) --ref--> Phaser (render only)
       |
       └── dispatch(action) -- TICK | SEND_EXPEDITION | CRAFT | RECRUIT | RESET
```

### Key Design Decisions

- **Deterministic**: Seeded RNG means same seed = same recipes, same loot
- **Continuous DPS**: Heroes take damage every tick during expeditions (not flat cost)
- **No hints**: Recipe discovery is pure experimentation
- **Progressive probability**: Safety net prevents hard deadlocks on last few recipes
- **All zones accessible**: No unlock gates — difficulty is expressed through HP cost

### Version Roadmap

| Version | Description |
|---------|-------------|
| **V0** | Browser PoC (current) — validate the loop |
| **V1** | Onchain PvE race — Starknet smart contracts, competitive multiplayer |
| **V2+** | PvP exploration, hero upgrades, gear, scoring |

See [Alchemist_Consolidated.md](Alchemist_Consolidated.md) for the full design document.
