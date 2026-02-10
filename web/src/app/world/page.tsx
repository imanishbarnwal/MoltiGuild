'use client';

import dynamic from 'next/dynamic';

const PhaserGame = dynamic(() => import('@/components/PhaserGame'), {
  ssr: false,
});

export default function WorldPage() {
  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: '#1a1a2e' }}>
      <PhaserGame worldState={null} onGuildClick={() => {}} onEmptyLotClick={() => {}} />
    </div>
  );
}
