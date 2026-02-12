'use client';

import { MOCK_WALLET } from '@/lib/mock-data';

interface HeaderProps {
  onToggleSidebar: () => void;
  onBack?: () => void;
  showBack?: boolean;
}

export default function Header({ onToggleSidebar, onBack, showBack }: HeaderProps) {
  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 52,
        background: 'linear-gradient(180deg, rgba(42, 63, 95, 0.95), rgba(42, 63, 95, 0.85))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(196, 113, 59, 0.3)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 100,
        pointerEvents: 'auto',
      }}
    >
      {/* Left: Brand + Back */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontWeight: 900,
            fontSize: 16,
            letterSpacing: '0.2em',
            color: 'var(--ember)',
            cursor: 'default',
            userSelect: 'none',
          }}
        >
          MOLTIGUILD
        </span>

        {showBack && (
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--parchment-dim)',
              fontFamily: "'Crimson Pro', serif",
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'color 150ms ease',
              padding: '4px 8px',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ember-glow)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--parchment-dim)')}
          >
            &#9664; Overview
          </button>
        )}
      </div>

      {/* Right: Sidebar toggle + Wallet + Balance */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Wallet Address */}
        <span
          className="font-mono"
          style={{
            fontSize: 13,
            color: 'var(--parchment-dim)',
          }}
        >
          &#9670; {MOCK_WALLET.address.slice(0, 6)}...{MOCK_WALLET.address.slice(-3)}
        </span>

        {/* MON Balance */}
        <span
          className="font-mono"
          style={{
            fontSize: 14,
            color: 'var(--gold)',
            animation: 'coinPulse 3s ease-in-out infinite',
            fontWeight: 500,
          }}
        >
          &#x2B21; {MOCK_WALLET.balance} MON
        </span>

        {/* Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          style={{
            background: 'transparent',
            border: '1px solid var(--walnut-border)',
            color: 'var(--parchment-dim)',
            fontSize: 18,
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: 2,
            transition: 'all 150ms ease',
            lineHeight: 1,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--ember)';
            e.currentTarget.style.color = 'var(--ember)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--walnut-border)';
            e.currentTarget.style.color = 'var(--parchment-dim)';
          }}
          aria-label="Toggle sidebar"
        >
          &#9776;
        </button>
      </div>
    </header>
  );
}
