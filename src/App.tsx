import { useEffect, useRef, useState } from 'react';
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

type MobileTab = 'heroes' | 'explore' | 'craft' | 'grimoire' | 'inventory';

const MOBILE_TABS: { key: MobileTab; label: string; icon: string }[] = [
  { key: 'heroes', label: 'Heroes', icon: '⚔' },
  { key: 'explore', label: 'Explore', icon: '🗺' },
  { key: 'craft', label: 'Craft', icon: '⚗' },
  { key: 'grimoire', label: 'Grimoire', icon: '📖' },
  { key: 'inventory', label: 'Inventory', icon: '🎒' },
];

export function App() {
  const { state, dispatch, reset } = useGameState();
  const bridgeRef = useRef<PhaserBridge | null>(null);
  const gameRef = useRef<ReturnType<typeof createPhaserGame> | null>(null);
  const prevStateRef = useRef<GameState | null>(null);
  const [activeTab, setActiveTab] = useState<MobileTab>('heroes');
  const [focusedHeroId, setFocusedHeroId] = useState<number>(0);

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
    bridgeRef.current?.setFocusedHero(focusedHeroId);
  }, [focusedHeroId]);

  useEffect(() => {
    const bridge = bridgeRef.current;
    if (!bridge) return;
    bridge.updateState(state, prevStateRef.current);
    prevStateRef.current = state;
  }, [state]);

  return (
    <>
      <div id="game-container" />
      <div className="app">
        <TopBar state={state} onReset={reset} />

        <div className="panel-zone panel-zone-left">
          <HeroPanel state={state} dispatch={dispatch} focusedHeroId={focusedHeroId} onFocusHero={setFocusedHeroId} />
          <ExplorationPanel state={state} dispatch={dispatch} />
        </div>

        <div className="panel-zone panel-zone-right">
          <CraftPanel state={state} dispatch={dispatch} />
          <InventoryPanel state={state} dispatch={dispatch} />
          <GrimoirePanel state={state} dispatch={dispatch} />
        </div>

        <div className="panel-zone panel-zone-bottom">
          <EventLog state={state} />
        </div>

        <div className="mobile-drawer">
          <div className="mobile-drawer-content">
            {activeTab === 'heroes' && <HeroPanel state={state} dispatch={dispatch} focusedHeroId={focusedHeroId} onFocusHero={setFocusedHeroId} />}
            {activeTab === 'explore' && <ExplorationPanel state={state} dispatch={dispatch} />}
            {activeTab === 'craft' && <CraftPanel state={state} dispatch={dispatch} />}
            {activeTab === 'grimoire' && <GrimoirePanel state={state} dispatch={dispatch} />}
            {activeTab === 'inventory' && <InventoryPanel state={state} dispatch={dispatch} />}
          </div>
        </div>

        <nav className="mobile-tab-bar">
          {MOBILE_TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              className={`mobile-tab${activeTab === key ? ' active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              <span className="mobile-tab-icon">{icon}</span>
              <span className="mobile-tab-label">{label}</span>
            </button>
          ))}
        </nav>

        <Notifications state={state} dispatch={dispatch} />
        {state.gameOver && <WinOverlay state={state} onReset={reset} />}
      </div>
    </>
  );
}
