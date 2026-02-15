'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import { useGuildVisuals, useStats, useSSEFeed } from '@/lib/hooks';
import type { WorldState } from '@/lib/world-state';

const PhaserGame = dynamic(() => import('@/components/PhaserGame'), {
  ssr: false,
});

const UIOverlay = dynamic(() => import('@/components/UIOverlay'), {
  ssr: false,
});

export default function WorldPage() {
  const guilds = useGuildVisuals();
  const { data: stats } = useStats();
  const feed = useSSEFeed();

  // Separate worldState from feed — feed changes shouldn't trigger Phaser re-renders
  const worldState: WorldState | null = useMemo(() => {
    if (!guilds.length && !stats) return null;
    return {
      districts: [],
      guilds,
      agents: [],
      feed: [], // feed passed separately to UIOverlay, not through Phaser
      stats: stats
        ? {
            totalGuilds: stats.guilds,
            totalAgents: stats.agents,
            totalMissions: stats.missionsCreated,
            totalEarned: stats.totalFeesCollected ?? '0',
            avgRating: 0,
          }
        : { totalGuilds: 0, totalAgents: 0, totalMissions: 0, totalEarned: '0', avgRating: 0 },
    };
  }, [guilds, stats]);

  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: '#08090e' }}>
      <PhaserGame
        worldState={worldState}
        onGuildClick={(guildId) => {
          window.dispatchEvent(new CustomEvent('guild-clicked', { detail: { guildId } }));
        }}
        onEmptyLotClick={(district) => {
          window.dispatchEvent(new CustomEvent('empty-lot-clicked', { detail: { plotId: 6, district } }));
        }}
        onDistrictClick={(info) => {
          window.dispatchEvent(new CustomEvent('district-clicked', { detail: info }));
        }}
      />
      <UIOverlay />
    </div>
  );
}
