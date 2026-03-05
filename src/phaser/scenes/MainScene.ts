import Phaser from 'phaser';
import { getCurrentZone } from '../../game/engine';
import type { GameState, Hero } from '../../game/state';
import {
  PhaserBridge,
  type CraftResultPayload,
  type ExplorationTickPayload,
} from '../PhaserBridge';
import { EventEffect } from '../objects/EventEffect';
import { HeroSprite } from '../objects/HeroSprite';
import { ZoneBackground } from '../objects/ZoneBackground';
import { GAME_WIDTH } from '../utils/layout';

const HERO_Y = 500;

export class MainScene extends Phaser.Scene {
  private bridge: PhaserBridge | null = null;

  private zoneBackground: ZoneBackground | null = null;
  private eventEffect: EventEffect | null = null;

  private heroContainer!: Phaser.GameObjects.Container;
  private heroSprites = new Map<number, HeroSprite>();

  private readonly onStateChange = (state: GameState): void => {
    this.syncToState(state);
  };

  private readonly onExplorationTick = (payload: ExplorationTickPayload): void => {
    const sprite = this.heroSprites.get(payload.heroId);
    if (!sprite) {
      return;
    }
    sprite.playEventEffect(payload.event);
    this.playExplorationSound(payload.event.kind);
  };

  private readonly onCraftResult = (payload: CraftResultPayload): void => {
    if (!this.eventEffect) {
      return;
    }

    if (payload.potionDelta > 0) {
      if (payload.discoveredCount > payload.previousDiscoveredCount) {
        this.eventEffect.playDiscovery();
        this.tryPlaySound('discovery', 0.6);
      } else {
        this.eventEffect.playCraftSuccess();
        this.tryPlaySound('brew-success', 0.4);
      }
      return;
    }

    this.eventEffect.playCraftFail();
    this.tryPlaySound('brew-fail', 0.3);
  };

  private readonly onNotification = (): void => {
    this.tryPlaySound('notification', 0.2);
  };

  private readonly onGameOver = (): void => {
    this.eventEffect?.playGameOver();
    this.tryPlaySound('victory', 0.7);
  };

  constructor() {
    super('MainScene');
  }

  create(): void {
    const bridge = this.registry.get('bridge');
    if (!(bridge instanceof PhaserBridge)) {
      return;
    }
    this.bridge = bridge;

    this.zoneBackground = new ZoneBackground(this);
    this.eventEffect = new EventEffect(this);
    this.heroContainer = this.add.container(0, 0);
    this.heroContainer.setDepth(12);

    this.bridge.on('stateChange', this.onStateChange);
    this.bridge.on('explorationTick', this.onExplorationTick);
    this.bridge.on('craftResult', this.onCraftResult);
    this.bridge.on('notification', this.onNotification);
    this.bridge.on('gameOver', this.onGameOver);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  private syncToState(state: GameState): void {
    const zoneId = this.getDeepestExploringZone(state);
    this.zoneBackground?.setActiveZone(zoneId);
    this.syncHeroes(state.heroes);
  }

  private syncHeroes(heroes: Hero[]): void {
    const activeHeroIds = new Set(heroes.map((hero) => hero.id));

    for (const [heroId, sprite] of this.heroSprites.entries()) {
      if (activeHeroIds.has(heroId)) {
        continue;
      }
      sprite.destroy();
      this.heroSprites.delete(heroId);
    }

    const slotSpacing = 190;
    const centerX = GAME_WIDTH / 2;
    const startX = centerX - ((heroes.length - 1) * slotSpacing) / 2;

    heroes.forEach((hero, index) => {
      const baseX = startX + index * slotSpacing;
      const sprite = this.getOrCreateHeroSprite(hero, index, baseX, HERO_Y);
      sprite.setBasePosition(baseX, HERO_Y);
      sprite.syncToHero(hero);
    });
  }

  private getOrCreateHeroSprite(hero: Hero, heroIndex: number, baseX: number, baseY: number): HeroSprite {
    const existing = this.heroSprites.get(hero.id);
    if (existing) {
      return existing;
    }

    if (!this.eventEffect) {
      throw new Error('EventEffect must exist before creating hero sprites.');
    }

    const sprite = new HeroSprite(this, hero, heroIndex, baseX, baseY, this.eventEffect);
    this.heroContainer.add(sprite);
    this.heroSprites.set(hero.id, sprite);
    return sprite;
  }

  private getDeepestExploringZone(state: GameState): number | null {
    const exploringHeroes = state.heroes.filter((hero) => hero.status === 'exploring');
    if (exploringHeroes.length === 0) {
      return null;
    }

    let deepestZoneId = 0;
    for (const hero of exploringHeroes) {
      const zone = getCurrentZone(hero.depth);
      deepestZoneId = Math.max(deepestZoneId, zone.id);
    }

    return deepestZoneId;
  }

  private playExplorationSound(kind: ExplorationTickPayload['event']['kind']): void {
    if (kind === 'trap') {
      this.tryPlaySound('trap', 0.4);
      return;
    }
    if (kind === 'gold') {
      this.tryPlaySound('gold-find', 0.3);
      return;
    }
    if (kind === 'heal') {
      this.tryPlaySound('heal', 0.3);
      return;
    }
    if (kind === 'beast_win') {
      this.tryPlaySound('beast-win', 0.5);
      return;
    }
    if (kind === 'beast_lose') {
      this.tryPlaySound('beast-lose', 0.5);
    }
  }

  private tryPlaySound(key: string, volume = 0.5): void {
    if (!this.cache.audio.exists(key)) {
      return;
    }
    this.sound.play(key, { volume });
  }

  private shutdown(): void {
    if (this.bridge) {
      this.bridge.off('stateChange', this.onStateChange);
      this.bridge.off('explorationTick', this.onExplorationTick);
      this.bridge.off('craftResult', this.onCraftResult);
      this.bridge.off('notification', this.onNotification);
      this.bridge.off('gameOver', this.onGameOver);
    }

    for (const sprite of this.heroSprites.values()) {
      sprite.destroy();
    }
    this.heroSprites.clear();

    this.zoneBackground?.destroy();
    this.zoneBackground = null;
    this.eventEffect = null;
  }
}
