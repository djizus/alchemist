// ═══════════════════════════════════════════════
// Layout constants and helpers
// ═══════════════════════════════════════════════

/** Game canvas dimensions */
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Layout regions */
export const LAYOUT = {
  // HUD bar (top)
  hud: {
    x: 0,
    y: 0,
    width: GAME_WIDTH,
    height: 48,
  },

  // Hero panel (left column)
  heroPanel: {
    x: 16,
    y: 60,
    width: 340,
    height: 420,
  },

  // Exploration panel (center-right)
  explorationPanel: {
    x: 372,
    y: 60,
    width: GAME_WIDTH - 372 - 16,
    height: 320,
  },

  // Event log (below exploration)
  eventLog: {
    x: 372,
    y: 392,
    width: GAME_WIDTH - 372 - 16,
    height: 88,
  },

  // Action bar (bottom)
  actionBar: {
    x: 16,
    y: GAME_HEIGHT - 120,
    width: GAME_WIDTH - 32,
    height: 104,
  },

  // Modal overlay
  modal: {
    x: GAME_WIDTH * 0.1,
    y: GAME_HEIGHT * 0.08,
    width: GAME_WIDTH * 0.8,
    height: GAME_HEIGHT * 0.84,
  },
} as const;

/** Padding values */
export const PAD = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** Font styles matching the alchemist theme */
export const FONTS = {
  title: {
    fontFamily: 'Cinzel, serif',
    fontSize: '18px',
    color: '#f0c040',
    fontStyle: 'bold',
  },
  titleSmall: {
    fontFamily: 'Cinzel, serif',
    fontSize: '13px',
    color: '#a08020',
    fontStyle: 'bold',
  },
  body: {
    fontFamily: 'Crimson Text, serif',
    fontSize: '15px',
    color: '#e4e4f0',
  },
  bodySmall: {
    fontFamily: 'Crimson Text, serif',
    fontSize: '13px',
    color: '#9090b0',
  },
  stat: {
    fontFamily: 'Crimson Text, serif',
    fontSize: '12px',
    color: '#9090b0',
  },
  muted: {
    fontFamily: 'Crimson Text, serif',
    fontSize: '12px',
    color: '#5a5a7a',
  },
  gold: {
    fontFamily: 'Cinzel, serif',
    fontSize: '16px',
    color: '#f0c040',
    fontStyle: 'bold',
  },
  hud: {
    fontFamily: 'Crimson Text, serif',
    fontSize: '14px',
    color: '#e4e4f0',
  },
  button: {
    fontFamily: 'Cinzel, serif',
    fontSize: '13px',
    color: '#e4e4f0',
    fontStyle: 'bold',
  },
} as const;
