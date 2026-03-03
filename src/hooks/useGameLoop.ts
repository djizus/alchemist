// ═══════════════════════════════════════════════
// useGameLoop — 100ms game tick
// ═══════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { TICK_INTERVAL } from '../game/constants';

export function useGameLoop(onTick: (now: number) => void) {
  const tickRef = useRef(onTick);
  tickRef.current = onTick;

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current(Date.now());
    }, TICK_INTERVAL);

    return () => clearInterval(interval);
  }, []);
}
