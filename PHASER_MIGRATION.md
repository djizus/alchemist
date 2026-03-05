# Alchemist — Phaser 3 Hybrid Migration Plan

## 1. Overview

Add a Phaser 3 game canvas behind the existing React UI to provide immersive visual richness (zone backgrounds, hero sprites, particle effects, SFX) while keeping the polished React panels intact. AI-generated assets (via fal.ai Flux 2 Pro + ElevenLabs SFX) replace the CSS-only aesthetic with painted game art.

### What Changes
- **New**: Full-viewport Phaser canvas renders behind React UI
- **New**: AI-generated zone backgrounds, ingredient icons, hero sprites, SFX
- **New**: Particle effects for game events (trap flash, gold sparkle, discovery fanfare)
- **Modified**: React UI panels get `position: absolute` overlay styling on top of canvas
- **Modified**: `App.tsx` initializes Phaser game and passes state via bridge

### What Stays
- `src/game/` — Pure game logic — **untouched**
- `src/ui/` — All 9 React UI components — **kept intact**
- `src/hooks/useGameState.ts` — React owns state via `useReducer` — **unchanged**
- `src/hooks/useGameLoop.ts` — React drives the tick loop — **unchanged**
- `styles.css` — Existing dark alchemist theme — **preserved**
- localStorage persistence — **same approach**

---

## 2. Architecture: Layered Hybrid

```
┌──────────────────────────────────────────────┐
│  Z-INDEX LAYERS (bottom to top)              │
│                                              │
│  Layer 0: PHASER CANVAS (full viewport)      │
│  ├─ Zone backgrounds (parallax)              │
│  ├─ Hero sprites with animations             │
│  ├─ Exploration events (particles/effects)   │
│  ├─ Crafting cauldron animation              │
│  └─ Ambient effects (zone-specific)          │
│                                              │
│  Layer 1: REACT UI OVERLAY (CSS positioned)  │
│  ├─ TopBar (HUD: gold, timer, progress)      │
│  ├─ HeroPanel (cards with stats/buttons)     │
│  ├─ ExplorationPanel (zone/depth/events)     │
│  ├─ CraftPanel (dropdown + brew button)      │
│  ├─ GrimoirePanel (scrollable recipe list)   │
│  ├─ InventoryPanel (potions + ingredients)   │
│  ├─ EventLog (scrollable events)             │
│  ├─ Notifications (toast overlay)            │
│  └─ WinOverlay (modal)                       │
│                                              │
│  STATE OWNER: React useReducer (unchanged)   │
│  ├─ dispatch() from React UI clicks          │
│  └─ state → Phaser via PhaserBridge          │
└──────────────────────────────────────────────┘
```

### Why Hybrid

1. **React keeps what it excels at**: Scrollable lists (grimoire), dropdowns (craft), filtered grids, text-heavy panels, responsive layout, CSS animations
2. **Phaser adds what's missing**: Painted environments, animated sprites, particle systems, camera effects, SFX — the things that make it feel like a *game* rather than a dashboard
3. **No throwaway work**: 1,377 lines of polished CSS + 9 React components stay intact
4. **Incremental delivery**: Ship Phaser with just zone backgrounds as MVP, then layer on sprites, particles, SFX
5. **V1 ready**: When V1 goes to Starknet, game logic gets replaced with Cairo — the rendering layer stays identical

### State Flow

```
React useReducer (source of truth)
    │
    ├── dispatch() ← React UI clicks
    ├── state → React UI props (existing)
    └── state → PhaserBridge → MainScene (new)
                                  │
                                  ├── updates zone background
                                  ├── updates hero sprites
                                  └── triggers particle effects
```

React's tick loop (`useGameLoop`) remains the state driver. Phaser's `update()` handles only visual interpolation (smooth bar fills, sprite positions between game ticks).

---

## 3. Phaser Scene Architecture

Single scene — no multi-scene complexity needed.

```
MainScene
├── BackgroundContainer
│   ├── ZoneBackground (swaps based on deepest hero's zone)
│   └── AmbientParticles (zone-specific)
├── ExplorationContainer (per active hero)
│   ├── HeroSprite (animated: idle/walking/fighting/returning)
│   ├── HPBarGraphic (smooth tween-based fills)
│   └── EventEffects (particle bursts for trap/gold/heal/beast)
├── CraftingContainer (visible during crafting)
│   ├── CauldronSprite
│   └── ResultEffect (success glow / soup poof)
└── UIEffectsContainer
    ├── DiscoveryFanfare (particles on new recipe)
    ├── GoldParticles (when loot claimed)
    └── LevelUpEffect (when potion applied)
```

---

## 4. Asset Requirements

### Tier 1: AI-Generated (Flux 2 Pro) — High Impact

| Asset | Count | Dimensions | Description |
|-------|-------|-----------|-------------|
| Zone backgrounds | 5 | 2048×1024 | Painted zone environments (meadow, marsh, cavern, volcanic, spire) |
| Lab background | 1 | 1280×720 | Alchemist's laboratory — default backdrop |
| Ingredient icons | 25 | 128×128 | Fantasy item icons on dark bg, zone-tinted |
| Potion bottles | 4 | 128×128 | HP (red), Power (blue), Regen (green), Soup (brown) |
| Hero portraits | 3 | 128×128 | Alaric, Brynn, Cassiel — fantasy RPG style |

### Tier 2: AI-Generated (ElevenLabs) — SFX

| ID | Filename | Duration | Description |
|----|----------|----------|-------------|
| `click` | `click.mp3` | 0.3s | Crisp glass tap |
| `brew-success` | `brew-success.mp3` | 1.5s | Bubbling cauldron + bright chime |
| `brew-fail` | `brew-fail.mp3` | 1.0s | Flat bubbling + dull thud |
| `discovery` | `discovery.mp3` | 2.0s | Crystal chime cascade + sparkle |
| `trap` | `trap.mp3` | 0.8s | Stone snap + metallic clang |
| `gold-find` | `gold-find.mp3` | 0.5s | Coin clink + shimmer |
| `heal` | `heal.mp3` | 1.0s | Gentle water flow + warm tone |
| `beast-win` | `beast-win.mp3` | 1.0s | Sword clash + triumphant horn |
| `beast-lose` | `beast-lose.mp3` | 1.0s | Heavy impact + groan |
| `expedition-start` | `expedition-start.mp3` | 1.0s | Door creak + footsteps |
| `claim-loot` | `claim-loot.mp3` | 1.0s | Chest open + coins |
| `recruit` | `recruit.mp3` | 1.5s | Tavern door + greeting |
| `potion-apply` | `potion-apply.mp3` | 1.0s | Gulp + magical aura |
| `victory` | `victory.mp3` | 4.0s | Grand fanfare |
| `notification` | `notification.mp3` | 0.3s | Soft bell chime |
| `ambient-lab` | `ambient-lab.mp3` | 15.0s | Crackling fire + bubbling (loopable) |

### Tier 3: Programmatic (Phaser Graphics/Tweens) — Better Than AI

| Asset | Why Programmatic |
|-------|-----------------|
| Hero "sprites" | AI can't maintain character consistency across poses. Colored silhouettes + particle trails + tweens. |
| HP/progress bars | Phaser Graphics handles gradient-filled bars natively. |
| Particle effects | Phaser's ParticleEmitter: gold sparkles, healing glow, trap flash, ingredient drops. |
| Floating damage/gold numbers | Phaser Text + tween (rise and fade). |
| Zone transition effects | Shader-based or tween-based fades between zone backgrounds. |

---

## 5. Asset Generation Pipeline

Adapts the zkube-assets pattern.

### Directory Structure

```
scripts/
  generate-assets/
    generate-images.ts         # Image generation entry point
    generate-sfx.ts            # SFX generation entry point
    lib/
      prompts.ts               # Prompt builder functions
      fal-client.ts            # fal.ai API wrapper + sharp post-processing
      types.ts                 # TypeScript interfaces
      env.ts                   # Config, rate limiting, retry
    data/
      assets.json              # All image asset definitions
      sfx.json                 # SFX definitions with prompts
public/
  assets/
    backgrounds/               # Lab + 5 zone backgrounds
    heroes/                    # 3 hero portraits
    ingredients/               # 25 ingredient icons
    potions/                   # 4 potion type icons
    sounds/effects/            # 16 SFX files
```

### CLI

```bash
npx tsx scripts/generate-assets/generate-images.ts              # All images
npx tsx scripts/generate-assets/generate-images.ts --dry-run    # Plan only
npx tsx scripts/generate-assets/generate-images.ts --asset backgrounds
npx tsx scripts/generate-assets/generate-images.ts --asset ingredients
npx tsx scripts/generate-assets/generate-sfx.ts                 # All SFX
npx tsx scripts/generate-assets/generate-sfx.ts --only click,discovery
```

### Development Without API Key

Phaser generates **programmatic placeholder assets** at boot time:
- Colored rectangles with text labels for backgrounds
- Colored circles for ingredient/potion icons
- Simple shapes for hero sprites

Game is fully playable with placeholders. AI assets are a visual upgrade, not a dependency.

---

## 6. File Structure

```
src/
├── game/                      # UNCHANGED
│   ├── constants.ts
│   ├── engine.ts
│   ├── recipes.ts
│   ├── rng.ts
│   └── state.ts
├── phaser/                    # NEW — Phaser game layer
│   ├── main.ts                # Phaser.Game config + launch
│   ├── PhaserBridge.ts        # React↔Phaser state bridge (EventEmitter)
│   ├── scenes/
│   │   ├── BootScene.ts       # Asset loading + placeholder generation
│   │   └── MainScene.ts       # Zone backgrounds, hero sprites, particles
│   ├── objects/
│   │   ├── HeroSprite.ts      # Programmatic hero visualization
│   │   ├── ZoneBackground.ts  # Zone bg management + transitions
│   │   └── EventEffect.ts     # Particle/tween effects for game events
│   └── utils/
│       ├── colors.ts          # Color constants
│       └── layout.ts          # Layout helpers
├── ui/                        # UNCHANGED — React UI components
├── hooks/                     # UNCHANGED — React state + game loop
├── App.tsx                    # MODIFIED — initializes Phaser, passes state to bridge
├── main.tsx                   # UNCHANGED
└── styles.css                 # MODIFIED — adds canvas positioning styles
```

---

## 7. Implementation Phases

### Phase 1: Phaser Bootstrap
1. Install `phaser` (done)
2. Create `PhaserBridge` (React↔Phaser communication)
3. Create `BootScene` with placeholder textures
4. Create minimal `MainScene` (lab background)
5. Modify `App.tsx` to mount Phaser canvas + React overlay
6. Modify `styles.css` for layered positioning
7. Verify: React UI works on top of Phaser canvas

### Phase 2: Zone Backgrounds
1. Wire PhaserBridge to observe hero exploration state
2. MainScene swaps zone background based on deepest exploring hero
3. Smooth crossfade transitions between zones
4. Ambient zone particles (fireflies in meadow, mist in marsh, crystals in cavern, embers in volcanic, magic in spire)

### Phase 3: Hero Visualization
1. Create `HeroSprite` — programmatic colored shapes + particle trails
2. Display hero sprites in MainScene (idle pose, walking animation, fighting, returning)
3. Smooth HP bar overlays on hero sprites
4. Event reaction effects (flash red on damage, sparkle on gold, glow on heal)

### Phase 4: Asset Pipeline
1. Set up `scripts/generate-assets/` following zkube pattern
2. Create asset data JSONs + prompt builders
3. Create generation scripts (images + SFX)
4. Replace placeholders with AI-generated assets (when FAL_KEY available)

### Phase 5: SFX + Polish
1. Wire SFX to game events (craft, discovery, combat, loot, recruit)
2. Add crafting cauldron animation
3. Discovery fanfare particles
4. Camera effects (shake on damage, flash on discovery)
5. Ambient background sound loop

---

## 8. Key Technical Details

### React↔Phaser Communication

```typescript
// PhaserBridge.ts — EventEmitter pattern
class PhaserBridge extends Phaser.Events.EventEmitter {
  updateState(state: GameState): void {
    this.emit('stateChange', state);
  }
}

// In App.tsx:
const bridge = useRef(new PhaserBridge());
useEffect(() => bridge.current.updateState(state), [state]);

// In MainScene:
bridge.on('stateChange', (state) => this.syncToState(state));
```

### CSS Layering (NOT Phaser DOM elements)

```css
#game-container { position: absolute; inset: 0; z-index: 0; }
.app { position: relative; z-index: 1; pointer-events: none; }
.app * { pointer-events: auto; }
```

React panels get `pointer-events: auto` so they intercept clicks. The Phaser canvas behind receives clicks that pass through transparent React areas.

### Hero Sprites (Programmatic)

AI can't generate consistent multi-pose sprite sheets. Instead:
- Colored geometric silhouettes (circle head, triangle body)
- Particle trail in hero's zone color
- Tween animations: bob idle, walk cycle, flash on hit, fade on return
- Status aura: blue glow (exploring), gold glow (returning), green glow (regen)

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Phaser canvas interferes with React pointer events | Medium | High | CSS `pointer-events: none/auto` layering; test early |
| Asset generation quality inconsistent | Low | Medium | Placeholders are the default; iterate on prompts |
| Phaser bundle size (~800KB gz) | Low | Medium | Tree-shaking via Vite; acceptable for a game |
| Visual desync between React state and Phaser sprites | Medium | Medium | PhaserBridge emits on every state change; Phaser lerps |
| fal.ai API unavailable | Low | Low | Programmatic placeholders work fine |

---

## 10. Success Criteria

- [ ] Phaser canvas renders behind React UI without errors
- [ ] React UI panels remain fully functional (all 13 actions work)
- [ ] Zone background changes based on exploring hero's current zone
- [ ] Hero sprites animate in Phaser (idle, exploring, returning states)
- [ ] Particle effects fire on exploration events (trap, gold, heal, beast)
- [ ] Asset generation pipeline produces zone backgrounds and ingredient icons
- [ ] SFX play on key game events (craft, discovery, combat)
- [ ] `pnpm build` succeeds with zero type errors
- [ ] localStorage persistence works across refreshes
- [ ] Game is playable with placeholder assets (no API key required)
