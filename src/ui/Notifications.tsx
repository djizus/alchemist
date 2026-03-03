import type { GameState, GameAction } from '../game/state';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export function Notifications({ state, dispatch }: Props) {
  if (state.notifications.length === 0) return null;

  return (
    <div className="notifications">
      {state.notifications.slice(-5).map(n => (
        <div
          key={n.id}
          className={`notification notification-${n.type}`}
          onClick={() => dispatch({ type: 'DISMISS_NOTIFICATION', id: n.id })}
        >
          {n.message}
        </div>
      ))}
    </div>
  );
}
