// ═══════════════════════════════════════════════
// useGameState — Central state hook + localStorage
// ═══════════════════════════════════════════════

import { useReducer, useRef, useCallback, useEffect } from 'react';
import { createInitialState, gameReducer } from '../game/engine';
import { randomSeed } from '../game/rng';
import type { GameAction, GameState } from '../game/state';

const STORAGE_KEY = 'alchemist-save';
const SAVE_INTERVAL_MS = 2000; // Auto-save every 2 seconds

export interface GameStateHandle {
  state: GameState;
  dispatch: (action: GameAction) => void;
  reset: () => void;
}

/** Try to load saved state from localStorage. */
function loadSavedState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    // Basic validation: check required fields exist
    if (
      typeof parsed.seed !== 'number' ||
      !Array.isArray(parsed.heroes) ||
      !Array.isArray(parsed.recipes) ||
      typeof parsed.inventory !== 'object'
    ) {
      return null;
    }
    // Migrate: add missing fields from old saves
    return {
      ...parsed,
      failedCombos: Array.isArray(parsed.failedCombos) ? parsed.failedCombos : [],
      hintedRecipeIds: Array.isArray(parsed.hintedRecipeIds) ? parsed.hintedRecipeIds : [],
    };
  } catch {
    return null;
  }
}

/** Save state to localStorage. */
function saveState(state: GameState): void {
  try {
    // Strip transient data before saving
    const toSave: GameState = {
      ...state,
      notifications: [], // Don't persist notifications
      nextNotificationId: state.nextNotificationId,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Initialize state: load from save or create fresh. */
function initState(seed: number): GameState {
  const saved = loadSavedState();
  if (saved) return saved;
  return createInitialState(seed);
}

export function useGameState(): GameStateHandle {
  const seed = useRef(randomSeed()).current;
  const [state, rawDispatch] = useReducer(gameReducer, seed, initState);

  const dispatch = useCallback((action: GameAction) => {
    rawDispatch(action);
  }, []);

  const reset = useCallback(() => {
    clearSave();
    rawDispatch({ type: 'RESET', seed: randomSeed() });
  }, []);

  // Auto-save periodically
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const id = setInterval(() => {
      saveState(stateRef.current);
    }, SAVE_INTERVAL_MS);

    // Also save on unload
    const handleUnload = () => saveState(stateRef.current);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(id);
      window.removeEventListener('beforeunload', handleUnload);
      saveState(stateRef.current); // Final save on unmount
    };
  }, []);

  return { state, dispatch, reset };
}
