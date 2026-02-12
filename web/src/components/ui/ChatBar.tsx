'use client';

import { useState, useRef, useEffect } from 'react';
import { MOCK_CHAT, type ChatMessage } from '@/lib/mock-data';

interface ChatBarProps {
  expanded: boolean;
  onToggle: () => void;
}

export default function ChatBar({ expanded, onToggle }: ChatBarProps) {
  const [messages] = useState<ChatMessage[]>(MOCK_CHAT);
  const [inputValue, setInputValue] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [expanded, messages]);

  const handleRate = (messageId: number, star: number) => {
    setRatings(prev => ({ ...prev, [messageId]: star }));
  };

  if (!expanded) {
    return (
      <div
        onClick={onToggle}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 40,
          background: 'linear-gradient(90deg, var(--walnut), var(--walnut-light))',
          borderTop: '2px solid var(--ember)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          cursor: 'pointer',
          zIndex: 100,
          pointerEvents: 'auto',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderTopColor = 'var(--ember-glow)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderTopColor = 'var(--ember)';
        }}
      >
        <span
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--parchment-dim)',
          }}
        >
          &#10022; Summon the Scribe...
        </span>
        <span style={{ color: 'var(--parchment-dim)', fontSize: 16 }}>&#8862;</span>
      </div>
    );
  }

  return (
    <div
      className="panel"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxHeight: 380,
        zIndex: 100,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        animation: 'riseUp 350ms cubic-bezier(0.16, 1, 0.3, 1) both',
        borderTop: '2px solid var(--ember)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: '1px solid var(--walnut-border)',
          flexShrink: 0,
        }}
      >
        <span
          className="font-display"
          style={{
            fontSize: 12,
            letterSpacing: '0.15em',
            color: 'var(--ember)',
          }}
        >
          &#10022; SCRIBE&apos;S DESK
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--parchment-dim)',
              fontSize: 16,
              cursor: 'pointer',
              padding: 2,
              transition: 'color 150ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ember)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--parchment-dim)')}
            aria-label="Close chat"
          >
            &#10005;
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            rating={ratings[msg.id] ?? msg.rating ?? 0}
            hoveredStar={hoveredStar}
            onStarHover={setHoveredStar}
            onRate={star => handleRate(msg.id, star)}
          />
        ))}
      </div>

      {/* Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 20px',
          borderTop: '1px solid var(--walnut-border)',
          flexShrink: 0,
        }}
      >
        <input
          className="input-field"
          type="text"
          placeholder="Write your quest here..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn-solid" style={{ flexShrink: 0 }}>
          Send
        </button>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  rating,
  hoveredStar,
  onStarHover,
  onRate,
}: {
  message: ChatMessage;
  rating: number;
  hoveredStar: number;
  onStarHover: (star: number) => void;
  onRate: (star: number) => void;
}) {
  if (message.role === 'user') {
    return (
      <div style={{ textAlign: 'right' }}>
        <span
          style={{
            display: 'inline-block',
            fontFamily: "'Crimson Pro', serif",
            fontSize: 14,
            color: 'var(--parchment)',
            background: 'var(--walnut-light)',
            padding: '8px 14px',
            borderRadius: 2,
            maxWidth: '80%',
          }}
        >
          {message.text}
        </span>
      </div>
    );
  }

  if (message.role === 'result') {
    return (
      <div
        style={{
          borderLeft: '3px solid var(--verdigris)',
          background: 'var(--walnut-light)',
          padding: '12px 14px',
          borderRadius: 2,
          marginLeft: 12,
        }}
      >
        <div
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: 14,
            color: 'var(--parchment)',
            whiteSpace: 'pre-wrap',
            marginBottom: 10,
          }}
        >
          {message.text}
        </div>

        {/* Star Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span
            style={{
              fontFamily: "'Crimson Pro', serif",
              fontSize: 13,
              color: 'var(--parchment-dim)',
              marginRight: 4,
            }}
          >
            Rate this work:
          </span>
          {[1, 2, 3, 4, 5].map(star => {
            const filled = star <= (hoveredStar || rating);
            return (
              <span
                key={star}
                onClick={() => onRate(star)}
                onMouseEnter={() => onStarHover(star)}
                onMouseLeave={() => onStarHover(0)}
                style={{
                  cursor: 'pointer',
                  fontSize: 18,
                  color: filled ? 'var(--gold)' : 'var(--walnut-border)',
                  textShadow: filled ? '0 0 4px var(--glow-gold)' : 'none',
                  transition: 'all 100ms ease',
                  transform: hoveredStar === star ? 'scale(1.15)' : 'scale(1)',
                  display: 'inline-block',
                }}
              >
                {filled ? '\u2605' : '\u2606'}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // System message
  return (
    <div
      style={{
        borderLeft: '2px solid var(--ember)',
        paddingLeft: 12,
        marginLeft: 12,
      }}
    >
      <span
        style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: 13,
          color: 'var(--parchment-dim)',
        }}
      >
        {message.text}
      </span>
      {message.txHash && (
        <span
          className="font-mono"
          style={{
            display: 'block',
            fontSize: 12,
            color: 'var(--indigo)',
            marginTop: 2,
            cursor: 'pointer',
          }}
        >
          TX: {message.txHash}
        </span>
      )}
    </div>
  );
}
