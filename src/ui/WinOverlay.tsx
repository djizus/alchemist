import type { GameState } from '../game/state';

interface Props {
  state: GameState;
  onReset: () => void;
}

export function WinOverlay({ state, onReset }: Props) {
  const minutes = Math.floor(state.elapsedMs / 60000);
  const seconds = Math.floor((state.elapsedMs % 60000) / 1000);
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  const heroCount = state.heroes.length;
  const totalPower = state.heroes.reduce((s, h) => s + h.stats.power, 0);

  return (
    <div className="win-overlay">
      <div className="win-content">
        <h2 className="win-title">Grimoire Complete!</h2>
        <p className="win-time">Completed in {timeStr}</p>
        <p className="win-stats">
          {state.craftAttempts} brews · {heroCount} heroes · {totalPower} total power
        </p>
        <button className="btn btn-primary" onClick={onReset}>
          Play Again
        </button>
      </div>
    </div>
  );
}
