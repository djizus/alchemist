// ═══════════════════════════════════════════════
// useGameState — React state management via useReducer
// ═══════════════════════════════════════════════

import { useReducer, useCallback } from 'react';
import { gameReducer, createInitialState } from '../game/engine';

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, () => createInitialState());

  const tick = useCallback((now: number) => {
    dispatch({ type: 'TICK', now });
  }, []);

  const sendExpedition = useCallback((heroId: number, zoneId: number) => {
    dispatch({ type: 'SEND_EXPEDITION', heroId, zoneId });
  }, []);


  const craftWithSlots = useCallback((slots: string[]) => {
    dispatch({ type: 'CRAFT', selectedIngredients: slots });
  }, []);

  const recruit = useCallback(() => {
    dispatch({ type: 'RECRUIT' });
  }, []);

  const setCraftSlot = useCallback((slotIdx: number, value: string) => {
    dispatch({ type: 'SET_CRAFT_SLOT', slotIdx, value });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    dispatch,
    tick,
    sendExpedition,
    craftWithSlots,
    recruit,
    setCraftSlot,
    reset,
  };
}

export type GameActions = ReturnType<typeof useGameState>;
