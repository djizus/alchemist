import Phaser from 'phaser';
import { COLORS, ZONE_COLORS } from '../utils/colors';
import { GAME_HEIGHT, GAME_WIDTH } from '../utils/layout';

interface AmbientLayer {
  emitter: Phaser.GameObjects.Particles.ParticleEmitter;
  activeZone: number | null;
}

export class ZoneBackground {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly currentBackground: Phaser.GameObjects.Image;
  private readonly transitionBackground: Phaser.GameObjects.Image;
  private currentBackgroundKey = 'lab-bg';
  private readonly ambientLayers: AmbientLayer[] = [];

  constructor(scene: Phaser.Scene, container?: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.container = container ?? scene.add.container(0, 0);

    this.currentBackground = this.scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'lab-bg');
    this.currentBackground.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.transitionBackground = this.scene.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'lab-bg');
    this.transitionBackground.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.transitionBackground.setAlpha(0);

    this.container.add([this.currentBackground, this.transitionBackground]);
    this.createAmbientEmitters();
    this.setActiveZone(null);
  }

  setActiveZone(zoneId: number | null): void {
    const nextBackground = zoneId === null ? 'lab-bg' : `zone-${zoneId}`;
    this.crossfadeBackground(nextBackground);

    for (const layer of this.ambientLayers) {
      const shouldEmit = layer.activeZone === zoneId;
      if (shouldEmit) {
        layer.emitter.start();
      } else {
        layer.emitter.stop();
      }
      layer.emitter.setVisible(shouldEmit);
    }
  }

  destroy(): void {
    this.scene.tweens.killTweensOf(this.currentBackground);
    this.scene.tweens.killTweensOf(this.transitionBackground);
    for (const layer of this.ambientLayers) {
      layer.emitter.destroy();
    }
    this.currentBackground.destroy();
    this.transitionBackground.destroy();
    this.container.destroy();
  }

  private crossfadeBackground(nextKey: string): void {
    if (this.currentBackgroundKey === nextKey) {
      return;
    }

    this.scene.tweens.killTweensOf(this.currentBackground);
    this.scene.tweens.killTweensOf(this.transitionBackground);

    this.transitionBackground.setTexture(nextKey);
    this.transitionBackground.setAlpha(0);

    this.scene.tweens.add({
      targets: this.currentBackground,
      alpha: 0,
      duration: 500,
      ease: 'Sine.Out',
    });

    this.scene.tweens.add({
      targets: this.transitionBackground,
      alpha: 1,
      duration: 500,
      ease: 'Sine.Out',
      onComplete: () => {
        this.currentBackground.setTexture(nextKey);
        this.currentBackground.setAlpha(1);
        this.transitionBackground.setAlpha(0);
        this.currentBackgroundKey = nextKey;
      },
    });
  }

  private createAmbientEmitters(): void {
    this.ambientLayers.push(this.createLabDustLayer());
    this.ambientLayers.push(this.createMeadowLayer());
    this.ambientLayers.push(this.createMarshLayer());
    this.ambientLayers.push(this.createCavernLayer());
    this.ambientLayers.push(this.createVolcanicLayer());
    this.ambientLayers.push(this.createSpireLayer());
  }

  private createLabDustLayer(): AmbientLayer {
    const emitter = this.scene.add.particles(0, 0, 'particle-dust', {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: 0, max: GAME_HEIGHT },
      quantity: 1,
      frequency: 420,
      lifespan: 8000,
      speedX: { min: -4, max: 4 },
      speedY: { min: -8, max: -2 },
      scale: { start: 0.55, end: 0.1 },
      alpha: { start: 0.2, end: 0 },
      tint: COLORS.white,
    });
    emitter.setDepth(2);
    this.container.add(emitter);
    return { emitter, activeZone: null };
  }

  private createMeadowLayer(): AmbientLayer {
    const emitter = this.scene.add.particles(0, 0, 'particle-gold', {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: GAME_HEIGHT * 0.3, max: GAME_HEIGHT * 0.95 },
      quantity: 1,
      frequency: 180,
      lifespan: 4200,
      speedY: { min: -20, max: -8 },
      speedX: { min: -12, max: 12 },
      scale: { start: 0.45, end: 0.12 },
      alpha: { start: 0.55, end: 0 },
      tint: 0xf6d77f,
      blendMode: Phaser.BlendModes.ADD,
    });
    emitter.setDepth(2);
    this.container.add(emitter);
    return { emitter, activeZone: 0 };
  }

  private createMarshLayer(): AmbientLayer {
    const emitter = this.scene.add.particles(0, 0, 'particle-fog', {
      x: { min: -40, max: GAME_WIDTH + 40 },
      y: { min: GAME_HEIGHT * 0.22, max: GAME_HEIGHT * 0.84 },
      quantity: 1,
      frequency: 260,
      lifespan: 8500,
      speedX: { min: -14, max: 14 },
      speedY: { min: -2, max: 2 },
      scale: { start: 0.9, end: 1.35 },
      alpha: { start: 0.2, end: 0 },
      tint: 0x8aa4be,
    });
    emitter.setDepth(2);
    this.container.add(emitter);
    return { emitter, activeZone: 1 };
  }

  private createCavernLayer(): AmbientLayer {
    const emitter = this.scene.add.particles(0, 0, 'particle-spark', {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: 0, max: GAME_HEIGHT * 0.85 },
      quantity: 1,
      frequency: 120,
      lifespan: 1700,
      speed: { min: 2, max: 10 },
      scale: { start: 0.22, end: 0.02 },
      alpha: { start: 0.95, end: 0 },
      tint: [ZONE_COLORS[2], COLORS.gold],
      blendMode: Phaser.BlendModes.ADD,
    });
    emitter.setDepth(2);
    this.container.add(emitter);
    return { emitter, activeZone: 2 };
  }

  private createVolcanicLayer(): AmbientLayer {
    const emitter = this.scene.add.particles(0, GAME_HEIGHT + 8, 'particle-ember', {
      x: { min: 0, max: GAME_WIDTH },
      quantity: 2,
      frequency: 80,
      lifespan: 1100,
      speedY: { min: -140, max: -80 },
      speedX: { min: -28, max: 28 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: [0xff7a3a, 0xffc15a, COLORS.red],
      blendMode: Phaser.BlendModes.ADD,
    });
    emitter.setDepth(2);
    this.container.add(emitter);
    return { emitter, activeZone: 3 };
  }

  private createSpireLayer(): AmbientLayer {
    const emitter = this.scene.add.particles(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'particle-arcane', {
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, 180),
        quantity: 32,
      },
      quantity: 1,
      frequency: 90,
      lifespan: 2600,
      speed: { min: 16, max: 36 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.35, end: 0 },
      alpha: { start: 0.8, end: 0 },
      rotate: { min: -180, max: 180 },
      tint: [COLORS.purple, 0xd59dff],
      blendMode: Phaser.BlendModes.ADD,
    });
    emitter.setDepth(2);
    this.container.add(emitter);
    return { emitter, activeZone: 4 };
  }
}
