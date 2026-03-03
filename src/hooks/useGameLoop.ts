// ═══════════════════════════════════════════════
// useGameLoop — 100ms tick interval
// ═══════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { TICK_INTERVAL } from '../game/constants';
import type { GameAction } from '../game/state';

export function useGameLoop(dispatch: (action: GameAction) => void): void {
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    const id = setInterval(() => {
      dispatchRef.current({ type: 'TICK', dt: TICK_INTERVAL });
    }, TICK_INTERVAL);

    return () => clearInterval(id);
  }, []);
}
