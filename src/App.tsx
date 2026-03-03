// ═══════════════════════════════════════════════
// App — Root component, grid layout, state wiring
// ═══════════════════════════════════════════════

import { useRef, useState, useCallback, useMemo } from 'react';
import { useGameState } from './hooks/useGameState';
import { useGameLoop } from './hooks/useGameLoop';
import { ZONES, HERO_COSTS, MAX_HEROES, TOTAL_POTIONS } from './game/constants';
import type { GameState } from './game/state';
import { PhaserContainer } from './phaser/PhaserContainer';
import { TopBar } from './ui/TopBar';
import { GrimoirePanel } from './ui/GrimoirePanel';
import { CraftPanel } from './ui/CraftPanel';
import { HeroBar } from './ui/HeroBar';
// ZoneTooltip will be wired when Phaser exposes hover events
import { Notifications } from './ui/Notifications';
import { WinOverlay } from './ui/WinOverlay';

export default function App() {
  const { state, tick, sendExpedition, craftWithSlots, recruit, setCraftSlot, reset } =
    useGameState();

  const [now, setNow] = useState(Date.now());

  // Shared ref for Phaser to read game state
  const gameStateRef = useRef<GameState>(state);
  gameStateRef.current = state;

  // Game tick
  useGameLoop((t) => {
    setNow(t);
    tick(t);
  });

  // Compute derived values
  const elapsed = Math.floor((now - state.sessionStart) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;


  const lastDiscoveredId = useMemo(() => {
    if (state.discovered.length === 0) return null;
    return state.discovered[state.discovered.length - 1];
  }, [state.discovered]);

  // Zone click handler
  const handleZoneClick = useCallback(
    (zoneId: number) => {
      const zone = ZONES[zoneId];
      const idle = state.heroes.filter((h) => h.status === 'idle');
      const bestHero = idle.find((h) => h.hp > zone.dps * 2) || idle[0];
      if (bestHero && bestHero.hp > zone.dps * 2) {
        sendExpedition(bestHero.id, zoneId);
      }
    },
    [state.heroes, sendExpedition]
  );

  const handleBrew = useCallback(() => {
    craftWithSlots(state.craftSlots);
  }, [state.craftSlots, craftWithSlots]);

  // Available ingredients for crafting
  const availableIngredients = useMemo(
    () =>
      Object.entries(state.inventory)
        .filter(([, count]) => count > 0)
        .sort(([a], [b]) => a.localeCompare(b)),
    [state.inventory]
  );

  return (
    <div id="app">
      <TopBar
        gold={state.gold}
        discoveredCount={state.discovered.length}
        totalPotions={TOTAL_POTIONS}
        elapsedSeconds={elapsed}
      />

      <GrimoirePanel
        recipes={state.recipes}
        discovered={state.discovered}
        lastDiscoveredId={lastDiscoveredId}
      />

      <div className="center-area">
        <PhaserContainer
          gameStateRef={gameStateRef}
          onZoneClick={handleZoneClick}
        />

        {state.won && (
          <WinOverlay
            totalPotions={TOTAL_POTIONS}
            elapsedMinutes={minutes}
            elapsedSeconds={seconds}
            goldEarned={Math.floor(state.gold)}
            onNewSession={reset}
          />
        )}
      </div>

      <CraftPanel
        craftSlots={state.craftSlots}
        craftResult={state.craftResult}
        inventory={availableIngredients}
        testedCount={state.testedCombos.size}
        onSetSlot={setCraftSlot}
        onBrew={handleBrew}
      />

      <HeroBar
        heroes={state.heroes}
        gold={state.gold}
        zones={ZONES}
        now={now}
        onSendExpedition={sendExpedition}
        onRecruit={recruit}
        heroCosts={HERO_COSTS}
        maxHeroes={MAX_HEROES}
      />

      <Notifications notifications={state.notifications} now={now} />
    </div>
  );
}
