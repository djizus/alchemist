// ═══════════════════════════════════════════════
// App — Root component, wires state → UI
// ═══════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import type { GameState } from './game/state';
import { useGameState } from './hooks/useGameState';
import { useGameLoop } from './hooks/useGameLoop';
import { PhaserBridge } from './phaser/PhaserBridge';
import { createPhaserGame } from './phaser/main';
import { TopBar } from './ui/TopBar';
import { HeroPanel } from './ui/HeroPanel';
import { ExplorationPanel } from './ui/ExplorationPanel';
import { CraftPanel } from './ui/CraftPanel';
import { GrimoirePanel } from './ui/GrimoirePanel';
import { InventoryPanel } from './ui/InventoryPanel';
import { EventLog } from './ui/EventLog';
import { Notifications } from './ui/Notifications';
import { WinOverlay } from './ui/WinOverlay';

export function App() {
  const { state, dispatch, reset } = useGameState();
  const bridgeRef = useRef<PhaserBridge | null>(null);
  const gameRef = useRef<ReturnType<typeof createPhaserGame> | null>(null);
  const prevStateRef = useRef<GameState | null>(null);

  useGameLoop(dispatch);

  useEffect(() => {
    const bridge = new PhaserBridge();
    const game = createPhaserGame('game-container', bridge);

    bridgeRef.current = bridge;
    gameRef.current = game;

    return () => {
      bridge.removeAllListeners();
      bridge.setGame(null);
      game.destroy(true);

      bridgeRef.current = null;
      gameRef.current = null;
      prevStateRef.current = null;
    };
  }, []);

  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge) {
      return;
    }

    bridge.updateState(state, prevStateRef.current);
    prevStateRef.current = state;
  }, [state]);

  return (
    <>
      <div id="game-container" />
      <div className="app">
        <TopBar state={state} onReset={reset} />

        <div className="main-layout">
          <div className="column column-left">
            <HeroPanel state={state} dispatch={dispatch} />
            <ExplorationPanel state={state} dispatch={dispatch} />
            <EventLog state={state} />
          </div>

          <div className="column column-right">
            <CraftPanel state={state} dispatch={dispatch} />
            <InventoryPanel state={state} dispatch={dispatch} />
            <GrimoirePanel state={state} dispatch={dispatch} />
          </div>
        </div>

        <Notifications state={state} dispatch={dispatch} />
        {state.gameOver && <WinOverlay state={state} onReset={reset} />}
      </div>
    </>
  );
}
