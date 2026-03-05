// ═══════════════════════════════════════════════
// PhaserBridge — React state bridge for Phaser scenes
// ═══════════════════════════════════════════════

import Phaser from 'phaser';
import type { GameNotification, GameState, Hero } from '../game/state';

export interface HeroChangePayload {
  hero: Hero;
  previousHero: Hero | null;
}

export interface ExplorationTickPayload {
  heroId: number;
  eventIndex: number;
  event: Hero['eventLog'][number];
}

export interface CraftResultPayload {
  craftAttempts: number;
  previousCraftAttempts: number;
  discoveredCount: number;
  previousDiscoveredCount: number;
  potionDelta: number;
}

export interface NotificationPayload {
  notification: GameNotification;
}

export class PhaserBridge extends Phaser.Events.EventEmitter {
  private gameInstance: Phaser.Game | null = null;

  setGame(game: Phaser.Game | null): void {
    this.gameInstance = game;
  }

  getGame(): Phaser.Game | null {
    return this.gameInstance;
  }

  updateState(state: GameState, prevState: GameState | null): void {
    this.emit('stateChange', state);

    if (!prevState) {
      for (const hero of state.heroes) {
        this.emit('heroChange', { hero, previousHero: null } satisfies HeroChangePayload);
      }
      for (const notification of state.notifications) {
        this.emit('notification', { notification } satisfies NotificationPayload);
      }
      if (state.gameOver) {
        this.emit('gameOver', state);
      }
      return;
    }

    const previousHeroesById = new Map(prevState.heroes.map((hero) => [hero.id, hero]));
    for (const hero of state.heroes) {
      const previousHero = previousHeroesById.get(hero.id) ?? null;
      if (!previousHero || this.didHeroChange(previousHero, hero)) {
        this.emit('heroChange', { hero, previousHero } satisfies HeroChangePayload);
      }

      const previousEventCount = previousHero?.eventLog.length ?? 0;
      if (hero.eventLog.length > previousEventCount) {
        for (let idx = previousEventCount; idx < hero.eventLog.length; idx += 1) {
          this.emit('explorationTick', {
            heroId: hero.id,
            eventIndex: idx,
            event: hero.eventLog[idx],
          } satisfies ExplorationTickPayload);
        }
      }
    }

    if (state.craftAttempts !== prevState.craftAttempts) {
      this.emit('craftResult', {
        craftAttempts: state.craftAttempts,
        previousCraftAttempts: prevState.craftAttempts,
        discoveredCount: state.discoveredCount,
        previousDiscoveredCount: prevState.discoveredCount,
        potionDelta: state.inventory.potions.length - prevState.inventory.potions.length,
      } satisfies CraftResultPayload);
    }

    if (state.notifications.length > prevState.notifications.length) {
      const newNotifications = state.notifications.slice(prevState.notifications.length);
      for (const notification of newNotifications) {
        this.emit('notification', { notification } satisfies NotificationPayload);
      }
    }

    if (!prevState.gameOver && state.gameOver) {
      this.emit('gameOver', state);
    }
  }

  private didHeroChange(previousHero: Hero, nextHero: Hero): boolean {
    return (
      previousHero.status !== nextHero.status
      || previousHero.hp !== nextHero.hp
      || previousHero.depth !== nextHero.depth
      || previousHero.returnTimer !== nextHero.returnTimer
      || previousHero.eventLog.length !== nextHero.eventLog.length
    );
  }
}
