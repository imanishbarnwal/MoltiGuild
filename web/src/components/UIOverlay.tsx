'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/ui/Header';
import StatsSidebar from '@/components/ui/StatsSidebar';
import ChatBar from '@/components/ui/ChatBar';
import GuildCard from '@/components/ui/GuildCard';
import PlotDeed from '@/components/ui/PlotDeed';
import GuildCreateModal from '@/components/ui/GuildCreateModal';
import AgentRegisterModal from '@/components/ui/AgentRegisterModal';
import { MOCK_GUILDS, MOCK_PLOTS } from '@/lib/mock-data';

type ActiveModal = 'none' | 'guild-create' | 'agent-register';

export default function UIOverlay() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const [activeGuild, setActiveGuild] = useState<number | null>(null);
  const [activePlot, setActivePlot] = useState<number | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [inDistrict, setInDistrict] = useState(false);

  // Listen for Phaser events
  useEffect(() => {
    const handleDistrictClick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        setInDistrict(true);
        setSidebarOpen(true);
      }
    };

    const handleGuildClick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.guildId != null) {
        setActiveGuild(detail.guildId);
        setActivePlot(null);
      }
    };

    const handleEmptyLotClick = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.plotId != null) {
        setActivePlot(detail.plotId);
        setActiveGuild(null);
      }
    };

    window.addEventListener('district-clicked', handleDistrictClick);
    window.addEventListener('guild-clicked', handleGuildClick);
    window.addEventListener('empty-lot-clicked', handleEmptyLotClick);

    return () => {
      window.removeEventListener('district-clicked', handleDistrictClick);
      window.removeEventListener('guild-clicked', handleGuildClick);
      window.removeEventListener('empty-lot-clicked', handleEmptyLotClick);
    };
  }, []);

  const handleBack = useCallback(() => {
    setInDistrict(false);
    setSidebarOpen(false);
    setChatExpanded(false);
    setActiveGuild(null);
    setActivePlot(null);
    setActiveModal('none');
  }, []);

  const selectedGuild = activeGuild != null
    ? MOCK_GUILDS.find(g => g.guildId === activeGuild) ?? MOCK_GUILDS[0]
    : null;

  const selectedPlot = activePlot != null
    ? MOCK_PLOTS.find(p => p.plotId === activePlot) ?? MOCK_PLOTS[0]
    : null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {/* Header */}
      <Header
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        onBack={handleBack}
        showBack={inDistrict}
      />

      {/* Sidebar */}
      <StatsSidebar open={sidebarOpen} />

      {/* Chat Bar */}
      <ChatBar
        expanded={chatExpanded}
        onToggle={() => setChatExpanded(prev => !prev)}
      />

      {/* Guild Card */}
      {selectedGuild && activeModal === 'none' && (
        <GuildCard
          guild={selectedGuild}
          onClose={() => setActiveGuild(null)}
          onNewQuest={() => {
            setActiveGuild(null);
            setChatExpanded(true);
          }}
          onAddAgent={() => {
            setActiveGuild(null);
            setActiveModal('agent-register');
          }}
        />
      )}

      {/* Plot Deed */}
      {selectedPlot && activeModal === 'none' && !activeGuild && (
        <PlotDeed
          plot={selectedPlot}
          onClose={() => setActivePlot(null)}
          onClaim={() => {
            setActivePlot(null);
            setActiveModal('guild-create');
          }}
        />
      )}

      {/* Guild Create Modal */}
      {activeModal === 'guild-create' && (
        <GuildCreateModal
          plotId={selectedPlot?.plotId}
          district={selectedPlot?.district}
          price={selectedPlot?.price}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Agent Register Modal */}
      {activeModal === 'agent-register' && (
        <AgentRegisterModal
          onClose={() => setActiveModal('none')}
        />
      )}
    </div>
  );
}
