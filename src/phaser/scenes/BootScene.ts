import Phaser from 'phaser';
import { ZONES } from '../../game/constants';
import { COLORS } from '../utils/colors';
import { GAME_HEIGHT, GAME_WIDTH } from '../utils/layout';

const ZONE_BG_FILES: Record<number, string> = {
  0: 'zone-meadow',
  1: 'zone-marsh',
  2: 'zone-cavern',
  3: 'zone-volcanic',
  4: 'zone-spire',
};

const SFX_KEYS = [
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

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  async create(): Promise<void> {
    const graphics = this.add.graphics();

    this.generateFallbackBackgrounds(graphics);
    this.generateHeroSprite(graphics);
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

    graphics.destroy();

    await this.loadAssets();

    this.scene.start('MainScene');
  }

  private generateFallbackBackgrounds(graphics: Phaser.GameObjects.Graphics): void {
    this.generateGradientTexture(graphics, 'lab-bg', GAME_WIDTH, GAME_HEIGHT, COLORS.bgPrimary, COLORS.bgSecondary);

    for (const zone of ZONES) {
      const topColor = this.blend(zone.color, COLORS.black, 0.45);
      const bottomColor = this.blend(zone.color, COLORS.black, 0.2);
      this.generateGradientTexture(graphics, `zone-${zone.id}`, GAME_WIDTH, GAME_HEIGHT, topColor, bottomColor);
    }
  }

  private generateHeroSprite(graphics: Phaser.GameObjects.Graphics): void {
    graphics.clear();
    graphics.fillStyle(COLORS.white, 0.25);
    graphics.fillCircle(32, 32, 28);
    graphics.fillStyle(COLORS.white, 0.65);
    graphics.fillCircle(32, 32, 22);
    graphics.fillStyle(COLORS.white, 1);
    graphics.fillCircle(32, 32, 16);
    graphics.generateTexture('hero-sprite', 64, 64);
  }

  private async loadAssets(): Promise<void> {
    await this.queueBackgrounds();
    await this.queueSfx();

    if (this.load.list.size === 0) return;

    await new Promise<void>((resolve) => {
      this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      this.load.start();
    });
  }

  private async queueBackgrounds(): Promise<void> {
    const labUrl = '/assets/backgrounds/lab-bg.png';
    if (await this.urlExists(labUrl)) {
      this.textures.remove('lab-bg');
      this.load.image('lab-bg', labUrl);
    }

    for (const zone of ZONES) {
      const filename = ZONE_BG_FILES[zone.id];
      if (!filename) continue;
      const url = `/assets/backgrounds/${filename}.png`;
      if (await this.urlExists(url)) {
        this.textures.remove(`zone-${zone.id}`);
        this.load.image(`zone-${zone.id}`, url);
      }
    }
  }

  private async queueSfx(): Promise<void> {
    for (const key of SFX_KEYS) {
      const url = await this.findSoundUrl(key);
      if (url) {
        this.load.audio(key, url);
      }
    }
  }

  private async findSoundUrl(key: string): Promise<string | null> {
    const extensions = ['ogg', 'mp3', 'wav'];
    for (const ext of extensions) {
      const url = `/assets/sounds/effects/${key}.${ext}`;
      if (await this.urlExists(url)) return url;
    }
    return null;
  }

  private async urlExists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
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
