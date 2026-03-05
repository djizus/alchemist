// ═══════════════════════════════════════════════
// BootScene — programmatic placeholder textures
// ═══════════════════════════════════════════════

import Phaser from 'phaser';
import { ZONES } from '../../game/constants';
import { COLORS } from '../utils/colors';
import { GAME_HEIGHT, GAME_WIDTH } from '../utils/layout';

export class BootScene extends Phaser.Scene {
  private readonly optionalSfxKeys = [
    'click',
    'brew-success',
    'brew-fail',
    'discovery',
    'trap',
    'gold-find',
    'heal',
    'beast-win',
    'beast-lose',
    'expedition-start',
    'claim-loot',
    'recruit',
    'potion-apply',
    'victory',
    'notification',
    'ambient-lab',
  ] as const;

  constructor() {
    super('BootScene');
  }

  async create(): Promise<void> {
    const graphics = this.add.graphics();

    this.generateGradientTexture(graphics, 'lab-bg', GAME_WIDTH, GAME_HEIGHT, COLORS.bgPrimary, COLORS.bgSecondary);

    for (const zone of ZONES) {
      const topColor = this.blend(zone.color, COLORS.black, 0.45);
      const bottomColor = this.blend(zone.color, COLORS.black, 0.2);
      this.generateGradientTexture(graphics, `zone-${zone.id}`, GAME_WIDTH, GAME_HEIGHT, topColor, bottomColor);
    }

    graphics.clear();
    graphics.fillStyle(COLORS.white, 0.25);
    graphics.fillCircle(32, 32, 28);
    graphics.fillStyle(COLORS.white, 0.65);
    graphics.fillCircle(32, 32, 22);
    graphics.fillStyle(COLORS.white, 1);
    graphics.fillCircle(32, 32, 16);
    graphics.generateTexture('hero-sprite', 64, 64);

    this.generateParticleTexture(graphics, 'particle-gold', 8, COLORS.gold);
    this.generateParticleTexture(graphics, 'particle-heal', 8, COLORS.green);
    this.generateParticleTexture(graphics, 'particle-damage', 8, COLORS.red);
    this.generateParticleTexture(graphics, 'particle-generic', 4, COLORS.white);
    this.generateParticleTexture(graphics, 'particle-ember', 8, 0xff7a3a);
    this.generateParticleTexture(graphics, 'particle-arcane', 8, COLORS.purple);
    this.generateParticleTexture(graphics, 'particle-spark', 6, 0xffd68a);
    this.generateParticleTexture(graphics, 'particle-dust', 4, COLORS.white);
    this.generateParticleTexture(graphics, 'particle-smoke', 14, 0x6e6258);
    this.generateParticleTexture(graphics, 'particle-fog', 24, 0x9eb2c4);

    await this.loadOptionalSfx();

    graphics.destroy();
    this.scene.start('MainScene');
  }

  private async loadOptionalSfx(): Promise<void> {
    const queuedKeys: string[] = [];

    for (const key of this.optionalSfxKeys) {
      const url = await this.findExistingSoundUrl(key);
      if (!url) {
        continue;
      }
      this.load.audio(key, url);
      queuedKeys.push(key);
    }

    if (queuedKeys.length === 0) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      this.load.start();
    });
  }

  private async findExistingSoundUrl(key: string): Promise<string | null> {
    const extensions = ['ogg', 'mp3', 'wav'];
    for (const ext of extensions) {
      const url = `/assets/sounds/effects/${key}.${ext}`;
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          return url;
        }
      } catch {
        return null;
      }
    }
    return null;
  }

  private generateGradientTexture(
    graphics: Phaser.GameObjects.Graphics,
    key: string,
    width: number,
    height: number,
    topColor: number,
    bottomColor: number,
  ): void {
    graphics.clear();
    graphics.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.generateTexture(key, width, height);
  }

  private generateParticleTexture(
    graphics: Phaser.GameObjects.Graphics,
    key: string,
    size: number,
    color: number,
  ): void {
    graphics.clear();
    graphics.fillStyle(color, 1);
    graphics.fillCircle(size / 2, size / 2, size / 2);
    graphics.generateTexture(key, size, size);
  }

  private blend(colorA: number, colorB: number, ratio: number): number {
    const rgbA = Phaser.Display.Color.IntegerToRGB(colorA);
    const rgbB = Phaser.Display.Color.IntegerToRGB(colorB);
    const blendChannel = (from: number, to: number) => Math.round(from + (to - from) * ratio);
    return Phaser.Display.Color.GetColor(
      blendChannel(rgbA.r, rgbB.r),
      blendChannel(rgbA.g, rgbB.g),
      blendChannel(rgbA.b, rgbB.b),
    );
  }
}
