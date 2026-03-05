import Phaser from 'phaser';
import type { ExplorationEvent } from '../../game/state';
import { COLORS } from '../utils/colors';
import { GAME_HEIGHT, GAME_WIDTH } from '../utils/layout';

export class EventEffect {
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  playExploration(
    event: ExplorationEvent,
    x: number,
    y: number,
    heroTarget?: Phaser.GameObjects.Container,
  ): void {
    if (event.kind === 'trap') {
      this.playTrap(x, y);
      return;
    }
    if (event.kind === 'gold') {
      this.playGold(x, y, event.value);
      return;
    }
    if (event.kind === 'heal') {
      this.playHeal(x, y, heroTarget);
      return;
    }
    if (event.kind === 'beast_win') {
      this.playBeastWin(x, y, heroTarget);
      return;
    }
    if (event.kind === 'beast_lose') {
      this.playBeastLose(x, y);
      return;
    }
    if (event.kind === 'ingredient_drop') {
      this.playIngredientDrop(x, y, heroTarget);
    }
  }

  playTrap(x: number, y: number): void {
    this.scene.cameras.main.shake(120, 0.005);
    this.scene.cameras.main.flash(120, 180, 50, 70, false);
    this.emitBurst('particle-damage', x, y, {
      quantity: 18,
      speedMin: 60,
      speedMax: 170,
      lifespan: 420,
      scaleStart: 1,
    });
  }

  playGold(x: number, y: number, value: number): void {
    this.emitBurst('particle-gold', x, y, {
      quantity: 16,
      speedMin: 40,
      speedMax: 100,
      lifespan: 780,
      gravityY: -30,
      scaleStart: 0.85,
    });

    const text = this.scene.add.text(x, y - 24, `+${value}`, {
      fontFamily: 'Cinzel, serif',
      fontSize: '18px',
      color: '#f0c040',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    this.scene.tweens.add({
      targets: text,
      y: y - 56,
      alpha: 0,
      duration: 750,
      ease: 'Sine.Out',
      onComplete: () => text.destroy(),
    });
  }

  playHeal(x: number, y: number, heroTarget?: Phaser.GameObjects.Container): void {
    const particles = this.scene.add.particles(x, y + 8, 'particle-heal', {
      quantity: 2,
      frequency: 45,
      lifespan: 680,
      speed: { min: 18, max: 48 },
      angle: { min: 0, max: 360 },
      rotate: { min: -200, max: 200 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.8, end: 0 },
      gravityY: -28,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.scene.time.delayedCall(300, () => particles.stop());
    this.scene.time.delayedCall(780, () => particles.destroy());

    if (heroTarget) {
      this.flashTarget(heroTarget, COLORS.green);
    }
  }

  playBeastWin(x: number, y: number, heroTarget?: Phaser.GameObjects.Container): void {
    this.emitBurst('particle-gold', x, y, {
      quantity: 22,
      speedMin: 55,
      speedMax: 140,
      lifespan: 600,
      scaleStart: 1,
    });
    if (heroTarget) {
      this.flashTarget(heroTarget, COLORS.white);
    }
  }

  playBeastLose(x: number, y: number): void {
    this.scene.cameras.main.shake(200, 0.008);
    this.emitBurst('particle-damage', x, y, {
      quantity: 28,
      speedMin: 80,
      speedMax: 220,
      lifespan: 540,
      scaleStart: 1.1,
    });
  }

  playIngredientDrop(x: number, y: number, heroTarget?: Phaser.GameObjects.Container): void {
    this.emitBurst('particle-generic', x, y, {
      quantity: 10,
      speedMin: 24,
      speedMax: 72,
      lifespan: 360,
      scaleStart: 0.7,
    });
    if (heroTarget) {
      this.scene.tweens.add({
        targets: heroTarget,
        scaleX: 1.06,
        scaleY: 1.06,
        yoyo: true,
        duration: 100,
        ease: 'Quad.Out',
      });
    }
  }

  playCraftSuccess(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    const emitter = this.scene.add.particles(centerX, GAME_HEIGHT - 80, 'particle-arcane', {
      quantity: 4,
      frequency: 35,
      lifespan: 900,
      speedY: { min: -260, max: -140 },
      speedX: { min: -140, max: 140 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [COLORS.purple, 0xce95ff],
      blendMode: Phaser.BlendModes.ADD,
    });
    this.scene.time.delayedCall(380, () => emitter.stop());
    this.scene.time.delayedCall(1100, () => emitter.destroy());
    this.scene.cameras.main.flash(200, 136, 70, 170, false);
    this.emitBurst('particle-arcane', centerX, centerY, {
      quantity: 24,
      speedMin: 80,
      speedMax: 180,
      lifespan: 620,
      scaleStart: 0.9,
    });
  }

  playCraftFail(): void {
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - 120;
    const particles = this.scene.add.particles(x, y, 'particle-smoke', {
      quantity: 3,
      frequency: 50,
      lifespan: 620,
      speedY: { min: -70, max: -25 },
      speedX: { min: -40, max: 40 },
      scale: { start: 0.85, end: 1.3 },
      alpha: { start: 0.32, end: 0 },
      tint: [0x7b6755, 0x5d5750],
    });
    this.scene.time.delayedCall(180, () => particles.stop());
    this.scene.time.delayedCall(900, () => particles.destroy());
  }

  playDiscovery(): void {
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT / 2;

    this.emitBurst('particle-gold', x, y, {
      quantity: 64,
      speedMin: 120,
      speedMax: 280,
      lifespan: 980,
      scaleStart: 1,
    });
    this.scene.time.delayedCall(120, () => {
      this.emitBurst('particle-arcane', x, y, {
        quantity: 52,
        speedMin: 100,
        speedMax: 240,
        lifespan: 980,
        scaleStart: 0.9,
      });
    });
    this.scene.time.delayedCall(240, () => {
      this.emitBurst('particle-gold', x, y, {
        quantity: 48,
        speedMin: 140,
        speedMax: 300,
        lifespan: 900,
        scaleStart: 0.85,
      });
    });

    this.scene.cameras.main.flash(300, 240, 190, 70, false);
    this.scene.cameras.main.shake(400, 0.003);
  }

  playGameOver(): void {
    const rain = this.scene.add.particles(0, -20, 'particle-gold', {
      x: { min: 0, max: GAME_WIDTH },
      quantity: 6,
      frequency: 35,
      lifespan: 2400,
      speedY: { min: 140, max: 260 },
      speedX: { min: -25, max: 25 },
      scale: { start: 0.9, end: 0.35 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    });
    this.scene.time.delayedCall(3000, () => rain.stop());
    this.scene.time.delayedCall(5600, () => rain.destroy());
  }

  private emitBurst(
    texture: string,
    x: number,
    y: number,
    config: {
      quantity: number;
      speedMin: number;
      speedMax: number;
      lifespan: number;
      scaleStart: number;
      gravityY?: number;
    },
  ): void {
    const emitter = this.scene.add.particles(x, y, texture, {
      quantity: config.quantity,
      lifespan: config.lifespan,
      speed: { min: config.speedMin, max: config.speedMax },
      alpha: { start: 1, end: 0 },
      scale: { start: config.scaleStart, end: 0 },
      angle: { min: 0, max: 360 },
      gravityY: config.gravityY ?? 0,
      blendMode: Phaser.BlendModes.ADD,
    });
    this.scene.time.delayedCall(config.lifespan + 80, () => emitter.destroy());
  }

  private flashTarget(target: Phaser.GameObjects.Container, color: number): void {
    const halo = this.scene.add.circle(0, 0, 40, color, 0.45);
    halo.setBlendMode(Phaser.BlendModes.ADD);
    target.add(halo);
    this.scene.tweens.add({
      targets: halo,
      alpha: 0,
      scale: 1.4,
      duration: 200,
      ease: 'Sine.Out',
      onComplete: () => {
        target.remove(halo);
        halo.destroy();
      },
    });
  }
}
