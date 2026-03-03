import Phaser from 'phaser';

export function createPhaserConfig(
  parent: HTMLElement,
  scene: Phaser.Types.Scenes.SceneType
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth,
    height: parent.clientHeight,
    backgroundColor: '#08070f',
    scene,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
  };
}
