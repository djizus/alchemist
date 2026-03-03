import Phaser from 'phaser';
import { ZONES, HERO_NAMES } from '../game/constants';
import type { GameState } from '../game/state';
import type { GameStateWithEvents, GameEvent } from '../game/engine';

interface ZoneNode {
  x: number;
  y: number;
  radius: number;
  circle: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  progressArc: Phaser.GameObjects.Graphics;
  zoneId: number;
}

interface HeroSprite {
  sprite: Phaser.GameObjects.Arc;
  nameLabel: Phaser.GameObjects.Text;
  homeX: number;
  homeY: number;
  targetX: number;
  targetY: number;
}

const HERO_COLORS = [0x80d0e0, 0xe0c080, 0xe080a0];

export class AlchemistScene extends Phaser.Scene {
  zoneNodes: ZoneNode[] = [];
  heroSprites: HeroSprite[] = [];
  gameStateRef: React.RefObject<GameState | null> | null = null;
  onZoneClick: ((zoneId: number) => void) | null = null;

  constructor() {
    super({ key: 'AlchemistScene' });
  }

  create(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    // ─── Starfield ───
    for (let i = 0; i < 60; i++) {
      const star = this.add.circle(
        Math.random() * w,
        Math.random() * h,
        Math.random() * 1.5 + 0.3,
        0xffffff,
        Math.random() * 0.4 + 0.1
      );
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: star.alpha * 0.3 },
        duration: 2000 + Math.random() * 3000,
        yoyo: true,
        repeat: -1,
      });
    }

    // ─── Zone positions (arc formation) ───
    const cx = w / 2;
    const cy = h / 2 + 20;
    const rx = w * 0.35;
    const ry = h * 0.35;
    const zonePositions = [
      { x: cx - rx * 0.8, y: cy + ry * 0.5 },
      { x: cx - rx * 0.5, y: cy - ry * 0.15 },
      { x: cx, y: cy - ry * 0.6 },
      { x: cx + rx * 0.5, y: cy - ry * 0.15 },
      { x: cx + rx * 0.8, y: cy + ry * 0.5 },
    ];

    // ─── Connection lines ───
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x1e1a30, 0.5);
    for (let i = 0; i < 4; i++) {
      gfx.lineBetween(
        zonePositions[i].x,
        zonePositions[i].y,
        zonePositions[i + 1].x,
        zonePositions[i + 1].y
      );
    }

    // ─── Zone nodes ───
    ZONES.forEach((zone, i) => {
      const pos = zonePositions[i];
      const radius = 32;

      // Glow
      const glow = this.add.circle(pos.x, pos.y, radius + 8, zone.color, 0.08);
      this.tweens.add({
        targets: glow,
        scaleX: 1.15,
        scaleY: 1.15,
        alpha: 0.03,
        duration: 2000 + i * 300,
        yoyo: true,
        repeat: -1,
      });

      // Main circle
      const circle = this.add.circle(pos.x, pos.y, radius, 0x13101e, 1);
      circle.setStrokeStyle(2, zone.color, 0.7);

      // Tier label
      this.add
        .text(pos.x, pos.y - 6, zone.tier, {
          fontFamily: 'Cinzel',
          fontSize: '18px',
          color: '#' + zone.color.toString(16).padStart(6, '0'),
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      // Zone name
      this.add
        .text(pos.x, pos.y + 14, zone.name, {
          fontFamily: 'Crimson Text',
          fontSize: '10px',
          color: '#6a6280',
        })
        .setOrigin(0.5);

      // Duration
      this.add
        .text(pos.x, pos.y + radius + 16, zone.duration + 's', {
          fontFamily: 'Crimson Text',
          fontSize: '10px',
          color: '#4a4560',
        })
        .setOrigin(0.5);

      // Progress arc graphics (updated each frame)
      const progressArc = this.add.graphics();

      // Click zone
      const hitArea = this.add.circle(pos.x, pos.y, radius + 4, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        if (this.onZoneClick) this.onZoneClick(i);
      });

      this.zoneNodes.push({
        x: pos.x,
        y: pos.y,
        radius,
        circle,
        glow,
        progressArc,
        zoneId: i,
      });
    });
  }

  update(): void {
    if (!this.gameStateRef?.current) return;
    const state = this.gameStateRef.current;
    const now = Date.now();

    // ─── Consume events for particles ───
    const events = (state as GameStateWithEvents).__events;
    if (events && events.length > 0) {
      for (const event of events) {
        this.handleEvent(event);
      }
      delete (state as GameStateWithEvents).__events;
    }

    // ─── Create hero sprites dynamically ───
    while (this.heroSprites.length < state.heroes.length) {
      const idx = this.heroSprites.length;
      const homeX = 60 + idx * 50;
      const homeY = this.scale.height - 30;
      const sprite = this.add.circle(homeX, homeY, 8, HERO_COLORS[idx], 0.9);
      sprite.setStrokeStyle(2, 0xffffff, 0.3);
      const nameLabel = this.add
        .text(homeX, homeY - 14, HERO_NAMES[idx], {
          fontFamily: 'Cinzel',
          fontSize: '8px',
          color: '#8888aa',
        })
        .setOrigin(0.5);
      this.heroSprites.push({
        sprite,
        nameLabel,
        homeX,
        homeY,
        targetX: homeX,
        targetY: homeY,
      });
    }

    // ─── Update hero positions and progress arcs ───
    // First, track which zones have active explorers
    const activeZones = new Set<number>();

    state.heroes.forEach((hero, i) => {
      const hs = this.heroSprites[i];
      if (!hs) return;

      if (hero.status === 'exploring' && hero.zoneId !== null) {
        const zn = this.zoneNodes[hero.zoneId];
        hs.targetX = zn.x + (i - 1) * 12;
        hs.targetY = zn.y + zn.radius + 6;
        activeZones.add(hero.zoneId);

        // Draw progress arc
        const progress = Math.min(
          1,
          (now - hero.expStart) / (hero.expEnd - hero.expStart)
        );
        zn.progressArc.clear();
        zn.progressArc.lineStyle(3, ZONES[hero.zoneId].color, 0.6);
        zn.progressArc.beginPath();
        zn.progressArc.arc(
          zn.x,
          zn.y,
          zn.radius + 4,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * progress,
          false
        );
        zn.progressArc.strokePath();
      } else {
        hs.targetX = hs.homeX;
        hs.targetY = hs.homeY;
      }

      // Smooth lerp movement
      hs.sprite.x += (hs.targetX - hs.sprite.x) * 0.08;
      hs.sprite.y += (hs.targetY - hs.sprite.y) * 0.08;
      hs.nameLabel.x = hs.sprite.x;
      hs.nameLabel.y = hs.sprite.y - 14;

      // Opacity by status
      hs.sprite.setAlpha(
        hero.status === 'cooldown'
          ? 0.5
          : hero.hp <= 0
            ? 0.3
            : 0.9
      );
    });

    // Clear progress arcs for zones without active explorers
    this.zoneNodes.forEach((zn) => {
      if (!activeZones.has(zn.zoneId)) {
        zn.progressArc.clear();
      }
    });
  }

  private handleEvent(event: GameEvent): void {
    switch (event.type) {
      case 'expedition-complete':
        if (event.zoneId !== undefined) {
          const zn = this.zoneNodes[event.zoneId];
          this.burstParticles(zn.x, zn.y, ZONES[event.zoneId].color, 15);
        }
        break;
      case 'hero-died':
        if (event.zoneId !== undefined) {
          const zn = this.zoneNodes[event.zoneId];
          this.burstParticles(zn.x, zn.y, 0xff4444, 15);
        }
        break;
      case 'potion-discovered': {
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;
        this.burstParticles(cx, cy, 0xc4a44a, 25);
        break;
      }
    }
  }

  burstParticles(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.add.circle(x, y, 3, color, 0.8);
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * 40;
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.1,
        duration: 600 + Math.random() * 400,
        onComplete: () => p.destroy(),
      });
    }
  }
}
