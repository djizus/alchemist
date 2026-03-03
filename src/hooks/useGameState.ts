// ═══════════════════════════════════════════════
// useGameState — Central state hook
// ═══════════════════════════════════════════════

import { useReducer, useRef, useCallback, type MutableRefObject } from 'react';
import { createInitialState, gameReducer } from '../game/engine';
import { randomSeed } from '../game/rng';
import type { GameAction, GameState } from '../game/state';

export interface GameStateHandle {
  state: GameState;
  dispatch: (action: GameAction) => void;
  stateRef: MutableRefObject<GameState>;
  reset: () => void;
}

export function useGameState(): GameStateHandle {
  const seed = useRef(randomSeed()).current;
  const [state, rawDispatch] = useReducer(gameReducer, seed, createInitialState);

  // Shared ref for Phaser (read-only access)
  const stateRef = useRef(state);
  stateRef.current = state;

  const dispatch = useCallback((action: GameAction) => {
    rawDispatch(action);
  }, []);

  const reset = useCallback(() => {
    rawDispatch({ type: 'RESET', seed: randomSeed() });
  }, []);

  return { state, dispatch, stateRef, reset };
}
