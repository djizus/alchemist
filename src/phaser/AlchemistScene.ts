import Phaser from 'phaser';
import type { MutableRefObject } from 'react';
import type { GameState, Hero } from '../game/state';
import { getCurrentZone } from '../game/engine';
import { ZONES } from '../game/constants';

/** Phaser scene — pure renderer, reads state from React ref. */
export class AlchemistScene extends Phaser.Scene {
  private stateRef: MutableRefObject<GameState>;
  private heroSprites: Map<number, Phaser.GameObjects.Container> = new Map();
  private zoneLabels: Phaser.GameObjects.Text[] = [];
  private depthLine!: Phaser.GameObjects.Graphics;

  constructor(stateRef: MutableRefObject<GameState>) {
    super({ key: 'AlchemistScene' });
    this.stateRef = stateRef;
  }

  create(): void {
    this.depthLine = this.add.graphics();
    this.drawZoneTrack();
  }

  update(): void {
    const state = this.stateRef.current;
    this.updateHeroes(state.heroes);
    this.drawDepthProgress(state.heroes);
  }

  private drawZoneTrack(): void {
    const trackY = 60;
    const trackWidth = 540;
    const trackX = 30;

    // Zone track background
    const bg = this.add.graphics();
    bg.fillStyle(0x2a2a4a, 0.6);
    bg.fillRoundedRect(trackX, trackY - 20, trackWidth, 40, 8);

    // Zone segments
    const maxDepth = 120; // max visible depth
    ZONES.forEach((zone, i) => {
      const startPct = zone.depthThreshold / maxDepth;
      const endPct = i < ZONES.length - 1
        ? ZONES[i + 1].depthThreshold / maxDepth
        : 1;

      const x = trackX + startPct * trackWidth;
      const width = (endPct - startPct) * trackWidth;

      const seg = this.add.graphics();
      seg.fillStyle(zone.color, 0.3);
      seg.fillRect(x, trackY - 15, width - 2, 30);

      // Zone label
      const label = this.add.text(x + width / 2, trackY + 30, `${zone.tier}`, {
        fontFamily: 'Cinzel',
        fontSize: '12px',
        color: zone.colorCSS,
      }).setOrigin(0.5);
      this.zoneLabels.push(label);

      // Zone name below
      this.add.text(x + width / 2, trackY + 45, zone.name, {
        fontFamily: 'Crimson Text',
        fontSize: '10px',
        color: '#888',
      }).setOrigin(0.5);
    });
  }

  private updateHeroes(heroes: readonly Hero[]): void {
    const trackY = 60;
    const trackX = 30;
    const trackWidth = 540;
    const maxDepth = 120;

    heroes.forEach((hero, idx) => {
      if (hero.status !== 'exploring') {
        // Remove sprite if not exploring
        const existing = this.heroSprites.get(hero.id);
        if (existing) {
          existing.destroy();
          this.heroSprites.delete(hero.id);
        }
        return;
      }

      let container = this.heroSprites.get(hero.id);
      if (!container) {
        // Create hero sprite
        container = this.add.container(trackX, trackY - 30);

        const circle = this.add.circle(0, 0, 8, getCurrentZone(hero.depth).color);
        const nameText = this.add.text(0, -16, hero.name, {
          fontFamily: 'Cinzel',
          fontSize: '10px',
          color: '#fff',
        }).setOrigin(0.5);

        container.add([circle, nameText]);
        this.heroSprites.set(hero.id, container);
      }

      // Update position along track
      const pct = Math.min(1, hero.depth / maxDepth);
      container.setX(trackX + pct * trackWidth);
      container.setY(trackY - 30 - idx * 25);
    });
  }

  private drawDepthProgress(heroes: readonly Hero[]): void {
    this.depthLine.clear();

    const infoY = 140;
    // Remove old texts from previous frame (simple approach: draw fresh each frame using graphics)
    // For a proper implementation, these would be cached text objects

    heroes.forEach((hero, idx) => {
      if (hero.status !== 'exploring') return;

      const y = infoY + idx * 120;

      // Hero info background
      this.depthLine.fillStyle(0x2a2a4a, 0.4);
      this.depthLine.fillRoundedRect(30, y, 540, 100, 8);

      // HP bar
      const hpPct = hero.hp / hero.stats.maxHp;
      this.depthLine.fillStyle(0x333355, 1);
      this.depthLine.fillRect(40, y + 30, 200, 12);
      this.depthLine.fillStyle(hpPct > 0.3 ? 0x44aa44 : 0xaa4444, 1);
      this.depthLine.fillRect(40, y + 30, 200 * hpPct, 12);

      // Loot display
      if (hero.pendingLoot.gold > 0) {
        this.depthLine.fillStyle(0xffd700, 0.8);
        this.depthLine.fillCircle(280, y + 36, 5);
      }
    });
  }
}
