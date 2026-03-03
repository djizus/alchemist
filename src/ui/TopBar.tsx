import type { GameState } from '../game/state';
import { TOTAL_POTIONS } from '../game/constants';

interface Props {
  state: GameState;
  onReset: () => void;
}

export function TopBar({ state, onReset }: Props) {
  const minutes = Math.floor(state.elapsedMs / 60000);
  const seconds = Math.floor((state.elapsedMs % 60000) / 1000);
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const progressPct = (state.discoveredCount / TOTAL_POTIONS) * 100;

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        <h1 className="game-title">Alchemist</h1>
        <span className="timer">{timeStr}</span>
      </div>
      <div className="top-bar-center">
        <span className="gold-display">{state.inventory.gold} Gold</span>
        <span className="grimoire-progress">
          {state.discoveredCount}/{TOTAL_POTIONS}
          <span className="grimoire-progress-bar">
            <span
              className="grimoire-progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </span>
        </span>
      </div>
      <div className="top-bar-right">
        <button className="btn btn-danger" onClick={onReset}>New Game</button>
      </div>
    </header>
  );
}
