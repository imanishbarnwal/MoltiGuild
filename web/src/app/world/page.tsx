'use client';

import dynamic from 'next/dynamic';

const PhaserGame = dynamic(() => import('@/components/PhaserGame'), {
  ssr: false,
});

const UIOverlay = dynamic(() => import('@/components/UIOverlay'), {
  ssr: false,
});

export default function WorldPage() {
  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: '#2a3f5f' }}>
      <PhaserGame
        worldState={null}
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
