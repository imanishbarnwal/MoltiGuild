'use client';

import { useEffect, useRef } from 'react';
import type { WorldState } from '@/lib/world-state';

interface PhaserGameProps {
  worldState: WorldState | null;
  onGuildClick: (guildId: number) => void;
  onEmptyLotClick: (district: string) => void;
  onDistrictClick?: (info: { name: string; category: string }) => void;
}

export default function PhaserGame({ worldState, onGuildClick, onEmptyLotClick, onDistrictClick }: PhaserGameProps) {
  const gameRef = useRef<{ game: InstanceType<typeof import('phaser').Game> } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function initPhaser() {
      const Phaser = await import('phaser');
      const { WorldScene } = await import('@/game/WorldScene');

      if (!containerRef.current || gameRef.current) return;

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 1280,
        height: 720,
        backgroundColor: '#1a1a2a',
        parent: containerRef.current,
        pixelArt: true,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [WorldScene],
      };

      const game = new Phaser.Game(config);
      gameRef.current = { game };

      // Wire up event listeners
      game.events.on('district-clicked', (info: { name: string; category: string }) => {
        onDistrictClick?.(info);
      });

      game.events.on('ready', () => {
        const scene = game.scene.getScene('WorldScene');
        if (scene) {
          scene.events.on('guild-clicked', (guildId: number) => {
            onGuildClick(guildId);
          });
          scene.events.on('empty-lot-clicked', (district: string) => {
            onEmptyLotClick(district);
          });
        }
      });
    }

    initPhaser();

    return () => {
      if (gameRef.current) {
        gameRef.current.game.destroy(true);
        gameRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Forward worldState updates to the Phaser scene
  useEffect(() => {
    if (!worldState || !gameRef.current) return;
    const scene = gameRef.current.game.scene.getScene('WorldScene');
    if (scene && 'updateWorldState' in scene) {
      (scene as unknown as { updateWorldState: (ws: WorldState) => void }).updateWorldState(worldState);
    }
  }, [worldState]);

  return (
    <div
      ref={containerRef}
      id="phaser-container"
      style={{ width: '100%', height: '100vh' }}
    />
  );
}
