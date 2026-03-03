import { useEffect, useRef, type MutableRefObject } from 'react';
import Phaser from 'phaser';
import { AlchemistScene } from './AlchemistScene';
import type { GameState } from '../game/state';

interface Props {
  stateRef: MutableRefObject<GameState>;
}

export function PhaserContainer({ stateRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const scene = new AlchemistScene(stateRef);

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 600,
      height: 500,
      backgroundColor: '#1a1a2e',
      scene: [scene],
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      audio: { noAudio: true },
    });

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [stateRef]);

  return <div ref={containerRef} className="phaser-container" />;
}
