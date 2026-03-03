import { useEffect, useRef } from 'react';
import { TICK_INTERVAL } from '../game/constants';
import type { GameAction } from '../game/state';

const MAX_CATCHUP_TICKS = 600; // cap at 60s worth of catch-up (prevents freeze after long sleep)

export function useGameLoop(dispatch: (action: GameAction) => void): void {
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  useEffect(() => {
    let lastTime = performance.now();

    const id = setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastTime;
      lastTime = now;

      // Fire catch-up ticks for time lost while tab was in background
      const ticks = Math.min(
        Math.floor(elapsed / TICK_INTERVAL),
        MAX_CATCHUP_TICKS,
      );

      for (let i = 0; i < ticks; i++) {
        dispatchRef.current({ type: 'TICK', dt: TICK_INTERVAL });
      }
    }, TICK_INTERVAL);

    return () => clearInterval(id);
  }, []);
}
