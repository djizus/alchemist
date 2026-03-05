import Phaser from 'phaser';
import type { ExplorationEvent, Hero } from '../../game/state';
import { COLORS } from '../utils/colors';
import { FONTS } from '../utils/layout';
import { EventEffect } from './EventEffect';

export const HERO_TINTS = [0x4080d0, 0x40c060, 0xa050d0];

const HERO_PORTRAIT_KEYS = ['hero-alaric', 'hero-brynn', 'hero-cassiel'];
const PORTRAIT_SIZE = 48;
const HERO_EXPLORE_RANGE = 220;
const HP_BAR_WIDTH = 40;

export class HeroSprite extends Phaser.GameObjects.Container {
  private readonly sceneRef: Phaser.Scene;
  private baseX: number;
  private baseY: number;
  private readonly heroTint: number;
  private readonly eventEffect: EventEffect;

  private readonly aura: Phaser.GameObjects.Arc;
  private readonly hpFill: Phaser.GameObjects.Rectangle;
  private readonly trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly nameLabel: Phaser.GameObjects.Text;

  private bobTween: Phaser.Tweens.Tween;
  private auraTween: Phaser.Tweens.Tween | null = null;
  private hpTween: Phaser.Tweens.Tween | null = null;
  private moveTween: Phaser.Tweens.Tween | null = null;

  private lastStatus: string = '';
  private lastHpRatio = -1;
  private lastTargetX = -1;
  private lastDefeated = false;
  private maskGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(
    scene: Phaser.Scene,
    hero: Hero,
    heroIndex: number,
    baseX: number,
    baseY: number,
    eventEffect: EventEffect,
  ) {
    super(scene, baseX, baseY);

    this.sceneRef = scene;
    this.baseX = baseX;
    this.baseY = baseY;
    this.heroTint = HERO_TINTS[heroIndex] ?? COLORS.white;
    this.eventEffect = eventEffect;

    this.aura = scene.add.circle(0, 6, 36, COLORS.white, 0.08);
    this.aura.setBlendMode(Phaser.BlendModes.ADD);

    const hpBg = scene.add.rectangle(-HP_BAR_WIDTH / 2, -44, HP_BAR_WIDTH, 4, COLORS.black, 0.6);
    hpBg.setOrigin(0, 0.5);
    hpBg.setStrokeStyle(1, 0xffffff, 0.2);

    this.hpFill = scene.add.rectangle(-HP_BAR_WIDTH / 2, -44, HP_BAR_WIDTH, 4, COLORS.hpGreen, 1);
    this.hpFill.setOrigin(0, 0.5);

    // Try to use portrait image; fall back to geometric shapes
    const portraitKey = HERO_PORTRAIT_KEYS[heroIndex];
    const hasPortrait = portraitKey && scene.textures.exists(portraitKey);

    const bodyParts: Phaser.GameObjects.GameObject[] = [];

    if (hasPortrait) {
      const portrait = scene.add.image(0, 8, portraitKey);
      portrait.setDisplaySize(PORTRAIT_SIZE, PORTRAIT_SIZE);
      portrait.setOrigin(0.5, 0.5);
      const maskShape = scene.make.graphics({ x: 0, y: 0 });
      maskShape.fillCircle(0, 0, PORTRAIT_SIZE / 2);
      portrait.setMask(new Phaser.Display.Masks.GeometryMask(scene, maskShape));
      this.maskGraphics = maskShape;
      this.sceneRef.events.on(Phaser.Scenes.Events.PRE_UPDATE, this.updateMaskPosition, this);
      bodyParts.push(portrait);
    } else {
      const head = scene.add.circle(0, -4, 24, this.heroTint, 1);
      const body = scene.add.triangle(0, 32, -16, -8, 16, -8, 0, 26, this.heroTint, 0.9);
      bodyParts.push(body, head);
    }

    this.nameLabel = scene.add.text(0, 60, hero.name, FONTS.bodySmall);
    this.nameLabel.setOrigin(0.5, 0);

    this.add([this.aura, hpBg, this.hpFill, ...bodyParts, this.nameLabel]);
    this.setAlpha(1);
    scene.add.existing(this);

    this.bobTween = scene.tweens.add({
      targets: this,
      y: baseY - 3,
      yoyo: true,
      repeat: -1,
      duration: 1000,
      ease: 'Sine.InOut',
    });

    this.trailEmitter = scene.add.particles(0, 0, 'particle-generic', {
      lifespan: 500,
      speed: { min: 8, max: 24 },
      frequency: 90,
      quantity: 1,
      scale: { start: 0.65, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: this.heroTint,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.trailEmitter.startFollow(this, -18, 14);

    this.syncToHero(hero);
  }

  private readonly updateMaskPosition = (): void => {
    if (this.maskGraphics) {
      this.maskGraphics.setPosition(this.x, this.y + 8);
    }
  };

  syncToHero(hero: Hero): void {
    const hpRatio = Phaser.Math.Clamp(hero.hp / hero.stats.maxHp, 0, 1);
    const defeated = hero.hp <= 0;
    const targetX = this.getTargetX(hero);

    if (Math.abs(hpRatio - this.lastHpRatio) > 0.001) {
      this.updateHpBar(hpRatio);
      this.lastHpRatio = hpRatio;
    }

    if (defeated && !this.lastDefeated) {
      this.stopAuras();
      this.trailEmitter.stop();
      if (!this.bobTween.isPaused()) {
        this.bobTween.pause();
      }
      this.moveTween?.stop();
      this.moveTween = null;
      this.setPosition(this.baseX, this.baseY);
      this.setAlpha(0.3);
      this.lastDefeated = true;
      this.lastStatus = hero.status;
      this.lastTargetX = this.baseX;
      return;
    }

    if (!defeated && this.lastDefeated) {
      this.setAlpha(1);
      this.lastDefeated = false;
    }

    if (defeated) return;

    if (hero.status !== this.lastStatus) {
      this.setAlpha(1);

      if (hero.status === 'idle') {
        if (this.bobTween.isPaused()) {
          this.bobTween.resume();
        }
        this.trailEmitter.stop();
        this.configureAura(COLORS.white, 0.08, 1.06, 1400);
      } else {
        if (!this.bobTween.isPaused()) {
          this.bobTween.pause();
        }
        this.y = this.baseY;

        if (hero.status === 'exploring') {
          this.trailEmitter.start();
          this.configureAura(COLORS.blue, 0.2, 1.18, 1000);
        } else {
          this.trailEmitter.stop();
          this.configureAura(COLORS.gold, 0.24, 1.2, 900);
        }
      }
      this.lastStatus = hero.status;
    }

    if (Math.abs(targetX - this.lastTargetX) > 1) {
      this.moveTween?.stop();
      this.moveTween = this.sceneRef.tweens.add({
        targets: this,
        x: targetX,
        duration: 250,
        ease: 'Sine.Out',
      });
      this.lastTargetX = targetX;
    }
  }

  setBasePosition(baseX: number, baseY: number): void {
    this.baseX = baseX;
    this.baseY = baseY;
  }

  playEventEffect(event: ExplorationEvent): void {
    this.eventEffect.playExploration(event, this.x, this.y, this);
  }

  override destroy(fromScene?: boolean): void {
    this.sceneRef.events.off(Phaser.Scenes.Events.PRE_UPDATE, this.updateMaskPosition, this);
    this.maskGraphics?.destroy();
    this.bobTween.stop();
    this.stopAuras();
    this.hpTween?.stop();
    this.moveTween?.stop();
    this.trailEmitter.destroy();
    super.destroy(fromScene);
  }

  private getTargetX(hero: Hero): number {
    if (hero.status === 'exploring') {
      return this.baseX + Math.min(HERO_EXPLORE_RANGE, hero.depth * 5);
    }

    if (hero.status === 'returning' && hero.returnTimerMax > 0) {
      const progress = hero.returnTimer / hero.returnTimerMax;
      return this.baseX + HERO_EXPLORE_RANGE * Phaser.Math.Clamp(progress, 0, 1);
    }

    return this.baseX;
  }

  private updateHpBar(hpRatio: number): void {
    const hpColor = hpRatio > 0.3 ? COLORS.hpGreen : COLORS.hpRed;
    this.hpFill.setFillStyle(hpColor, 1);

    this.hpTween?.stop();
    this.hpTween = this.sceneRef.tweens.add({
      targets: this.hpFill,
      scaleX: hpRatio,
      duration: 220,
      ease: 'Sine.Out',
    });
  }

  private configureAura(color: number, alpha: number, scale: number, duration: number): void {
    this.aura.setVisible(true);
    this.aura.setFillStyle(color, alpha);
    if (this.auraTween) {
      this.auraTween.stop();
    }
    this.aura.setScale(1);
    this.auraTween = this.sceneRef.tweens.add({
      targets: this.aura,
      scale: scale,
      alpha: alpha * 0.45,
      yoyo: true,
      repeat: -1,
      duration,
      ease: 'Sine.InOut',
    });
  }

  private stopAuras(): void {
    if (this.auraTween) {
      this.auraTween.stop();
      this.auraTween = null;
    }
    this.aura.setVisible(false);
  }
}
