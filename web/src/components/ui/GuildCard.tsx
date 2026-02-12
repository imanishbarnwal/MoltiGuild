'use client';

import type { GuildVisual } from '@/lib/world-state';
import { MOCK_MISSIONS, timeAgo, truncateAddress } from '@/lib/mock-data';

interface GuildCardProps {
  guild: GuildVisual;
  onClose: () => void;
  onNewQuest: () => void;
  onAddAgent: () => void;
}

export default function GuildCard({ guild, onClose, onNewQuest, onAddAgent }: GuildCardProps) {
  const missions = MOCK_MISSIONS.filter(m => m.guildId === guild.guildId).slice(0, 3);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(8,9,14,0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 109,
          pointerEvents: 'auto',
        }}
      />

      {/* Card */}
      <div
        className="panel"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 380,
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          zIndex: 110,
          pointerEvents: 'auto',
          animation: 'unfurl 300ms ease-out both',
          transformOrigin: 'top center',
          padding: '20px 24px',
        }}
      >
        {/* Title */}
        <div style={{ marginBottom: 4 }}>
          <h2
            className="font-display"
            style={{
              fontSize: 18,
              color: 'var(--parchment)',
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {guild.name}
          </h2>
          <span
            style={{
              fontFamily: "'Crimson Pro', serif",
              fontStyle: 'italic',
              fontSize: 13,
              color: 'var(--parchment-dim)',
            }}
          >
            {guild.category}
          </span>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '10px 0',
            fontSize: 14,
            fontFamily: "'Crimson Pro', serif",
          }}
        >
          <span style={{ color: 'var(--gold)' }}>
            {'★'.repeat(Math.floor(guild.avgRating))}
            {'☆'.repeat(5 - Math.floor(guild.avgRating))}
            {' '}
            <span className="font-mono" style={{ fontSize: 13 }}>{guild.avgRating.toFixed(1)}</span>
          </span>
          <span style={{ color: 'var(--parchment-dim)' }}>
            {guild.totalMissions} done
          </span>
          <span style={{ color: 'var(--parchment-dim)' }}>
            {guild.agents.length} agents
          </span>
        </div>

        {/* Divider */}
        <Divider />

        {/* Agents */}
        <div className="section-header">Agents</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {guild.agents.map(agent => (
            <div
              key={agent.address}
              style={{
                background: 'var(--walnut-light)',
                border: '1px solid var(--walnut-border)',
                borderRadius: 2,
                padding: '10px 12px',
              }}
            >
              <div
                className="font-mono"
                style={{ fontSize: 13, color: 'var(--parchment)', marginBottom: 4 }}
              >
                {truncateAddress(agent.address)}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  fontFamily: "'Crimson Pro', serif",
                  color: 'var(--parchment-dim)',
                }}
              >
                <span>
                  {agent.role} <span className="online-dot" style={{ marginLeft: 6 }} /> Online
                </span>
                <span>{agent.missions} missions</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Quests */}
        <Divider />
        <div className="section-header">Recent Quests</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {missions.map(m => (
            <div key={m.missionId}>
              <div
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 14,
                  color: 'var(--parchment)',
                }}
              >
                #{m.missionId} &ldquo;{m.prompt}&rdquo;
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                }}
              >
                <span style={{ color: 'var(--gold)', textShadow: '0 0 4px var(--glow-gold)' }}>
                  {'★'.repeat(m.rating)}{'☆'.repeat(5 - m.rating)}
                </span>
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--parchment-dim)' }}>
                  {timeAgo(m.completedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button className="btn-outline" style={{ flex: 1 }}>
            View Result
          </button>
          <button className="btn-outline" style={{ flex: 1 }} onClick={onNewQuest}>
            + New Quest
          </button>
          <button className="btn-outline" style={{ flex: '1 1 100%' }} onClick={onAddAgent}>
            + Add Agent
          </button>
        </div>
      </div>
    </>
  );
}

function Divider() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 0',
        color: 'var(--walnut-border)',
        fontSize: 12,
        userSelect: 'none',
      }}
    >
      <span style={{ flex: 1, height: 1, background: 'var(--walnut-border)' }} />
      <span>&#9670;</span>
      <span style={{ flex: 1, height: 1, background: 'var(--walnut-border)' }} />
    </div>
  );
}
