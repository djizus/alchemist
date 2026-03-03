// ═══════════════════════════════════════════════
// App — Root component, wires state → UI
// ═══════════════════════════════════════════════

import { useGameState } from './hooks/useGameState';
import { useGameLoop } from './hooks/useGameLoop';
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
  useGameLoop(dispatch);

  return (
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
          <GrimoirePanel state={state} />
        </div>
      </div>

      <Notifications state={state} dispatch={dispatch} />
      {state.gameOver && <WinOverlay state={state} onReset={reset} />}
    </div>
  );
}
