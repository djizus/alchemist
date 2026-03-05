const POTION_EFFECT_TO_ICON: Record<string, string> = {
  max_hp: 'potion-hp',
  power: 'potion-power',
  regen_speed: 'potion-regen',
};

function toKebab(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export function ingredientIconUrl(name: string): string {
  return `/assets/ingredients/${toKebab(name)}.png`;
}

export function potionIconUrl(effectType: string): string {
  const icon = POTION_EFFECT_TO_ICON[effectType] ?? 'potion-soup';
  return `/assets/potions/${icon}.png`;
}

export function soupIconUrl(): string {
  return '/assets/potions/potion-soup.png';
}
