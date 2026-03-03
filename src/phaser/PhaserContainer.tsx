import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { createPhaserConfig } from './config';
import { AlchemistScene } from './AlchemistScene';
import type { GameState } from '../game/state';

interface PhaserContainerProps {
  gameStateRef: React.RefObject<GameState | null>;
  onZoneClick: (zoneId: number) => void;
}

export const PhaserContainer: React.FC<PhaserContainerProps> = ({
  gameStateRef,
  onZoneClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const scene = new AlchemistScene();
    scene.gameStateRef = gameStateRef;
    scene.onZoneClick = onZoneClick;

    const config = createPhaserConfig(containerRef.current, scene);
    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  // Update scene callbacks when they change
  useEffect(() => {
    if (!gameRef.current) return;
    const scene = gameRef.current.scene.getScene('AlchemistScene') as AlchemistScene;
    if (scene) {
      scene.gameStateRef = gameStateRef;
      scene.onZoneClick = onZoneClick;
    }
  }, [gameStateRef, onZoneClick]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
};
