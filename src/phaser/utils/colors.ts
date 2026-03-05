// ═══════════════════════════════════════════════
// Color constants — matching the dark alchemist theme
// ═══════════════════════════════════════════════

export const COLORS = {
  // Backgrounds
  bgPrimary: 0x080810,
  bgSecondary: 0x111122,
  bgPanel: 0x13152a,
  bgCard: 0x1a1d38,
  bgHover: 0x222548,

  // Text
  textPrimary: 0xe4e4f0,
  textSecondary: 0x9090b0,
  textMuted: 0x5a5a7a,

  // Accents
  gold: 0xf0c040,
  goldDim: 0xa08020,
  green: 0x40c060,
  greenDim: 0x2a6a3a,
  red: 0xd04050,
  redDim: 0x6a2030,
  blue: 0x4080d0,
  blueDim: 0x203a6a,
  purple: 0xa050d0,
  purpleDim: 0x4a2060,

  // Borders
  border: 0x252848,
  borderGlow: 0x353868,

  // Zones
  zoneMeadow: 0x4a9e4a,
  zoneMarsh: 0x4a7a9e,
  zoneCavern: 0xb8860b,
  zoneVolcanic: 0x9e4a4a,
  zoneSpire: 0x9e4a9e,

  // HP bar states
  hpGreen: 0x50c040,
  hpGreenDark: 0x30802a,
  hpRed: 0xd04040,
  hpRedDark: 0x802020,

  // Utility
  white: 0xffffff,
  black: 0x000000,
  overlay: 0x000000, // with alpha
} as const;

/** Convert hex number to CSS string */
export function hexToCSS(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0');
}

/** Zone colors indexed by zone id */
export const ZONE_COLORS: readonly number[] = [
  COLORS.zoneMeadow,
  COLORS.zoneMarsh,
  COLORS.zoneCavern,
  COLORS.zoneVolcanic,
  COLORS.zoneSpire,
];
