'use client';

import { useStats, useCredits, useSSEFeed, useOnlineAgents } from '@/lib/hooks';
import { timeAgo } from '@/lib/mock-data';

interface StatsSidebarProps {
  open: boolean;
}

const FEED_COLORS: Record<string, string> = {
  mission_completed: 'var(--verdigris)',
  mission_rated: 'var(--gold)',
  mission_created: 'var(--ember)',
  guild_created: 'var(--plum)',
  agent_registered: 'var(--indigo)',
};

const FEED_LABELS: Record<string, (e: { missionId?: number; guildId: number; score?: number }) => string> = {
  mission_completed: e => `Mission #${e.missionId} done`,
  mission_rated: e => `Rating ${'★'.repeat(e.score || 0)} #${e.missionId}`,
  mission_created: e => `Mission #${e.missionId} created`,
  guild_created: e => `Guild #${e.guildId} founded`,
  agent_registered: e => `Agent joined guild #${e.guildId}`,
};

export default function StatsSidebar({ open }: StatsSidebarProps) {
  const { data: stats } = useStats();
  const { data: credits } = useCredits();
  const { data: onlineAgents } = useOnlineAgents();
  const feed = useSSEFeed();

  const onlineCount = onlineAgents?.length ?? 0;
  const balance = credits ? credits.raw.toFixed(4) : '0.0000';
  const missionsRemaining = credits ? Math.floor(credits.raw / 0.001) : 0;

  return (
    <div
      className="panel"
      style={{
        position: 'fixed',
        top: 52,
        left: 0,
        bottom: 0,
        width: 280,
        zIndex: 90,
        pointerEvents: 'auto',
        transform: open ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      {/* PLATFORM STATS */}
      <div className="section-header">Platform</div>

      <StatRow label="Guilds" value={String(stats?.guilds ?? 0)} />
      <StatRow label="Missions" value={String(stats?.missionsCreated ?? 0)} />
      <StatRow label="Completed" value={String(stats?.missionsCompleted ?? 0)} />
      <StatRow label="Agents" value={String(stats?.agents ?? 0)} />
      <StatRow label="Online" value={String(onlineCount)} showDot={onlineCount > 0} />

      {/* ACTIVITY FEED */}
      <div className="section-header" style={{ marginTop: 8 }}>Activity</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {feed.map((event, i) => {
          const color = FEED_COLORS[event.type] || 'var(--parchment-dim)';
          const labelFn = FEED_LABELS[event.type];
          const label = labelFn ? labelFn(event) : event.type;

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 0 6px 10px',
                borderLeft: `2px solid ${color}`,
                animation: `feedSlide 200ms ease ${i * 50}ms both`,
              }}
            >
              <span
                style={{
                  fontFamily: "'Crimson Pro', serif",
                  fontSize: 13,
                  color: 'var(--parchment)',
                }}
              >
                {label}
              </span>
              <span
                className="font-mono"
                style={{
                  fontSize: 11,
                  color: 'var(--parchment-dim)',
                  flexShrink: 0,
                  marginLeft: 8,
                }}
              >
                {timeAgo(event.timestamp)}
              </span>
            </div>
          );
        })}
      </div>

      {/* YOUR PURSE */}
      <div className="section-header" style={{ marginTop: 8 }}>Your Purse</div>

      <div
        className="font-mono"
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: 'var(--gold)',
          textShadow: '0 0 8px var(--glow-gold)',
          padding: '4px 0',
        }}
      >
        &#x2B21; {balance} MON
      </div>
      <div
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: 13,
          color: 'var(--parchment-dim)',
          fontStyle: 'italic',
        }}
      >
        ~{missionsRemaining} missions remaining
      </div>
    </div>
  );
}

function StatRow({ label, value, showDot }: { label: string; value: string; showDot?: boolean }) {
  return (
    <div className="dot-leader">
      <span>{label}</span>
      <span className="dot-leader-value">
        {value}
        {showDot && (
          <>
            {' '}
            <span className="online-dot" />
          </>
        )}
      </span>
    </div>
  );
}
