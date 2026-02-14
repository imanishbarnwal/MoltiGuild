'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSmartCreate, useRateMission, useMissionResult, useUser } from '@/lib/hooks';
import { useOpenClawConnection, useOpenClawChat, buildSessionKey } from '@/lib/openclaw-hooks';
import type { ChatMessage } from '@/lib/utils';

interface ChatBarProps {
  expanded: boolean;
  onToggle: () => void;
}

let nextId = 1;

export default function ChatBar({ expanded, onToggle }: ChatBarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [pendingMissionId, setPendingMissionId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // OpenClaw connection + chat
  const { userId } = useUser();
  const sessionKey = buildSessionKey(userId || 'anon');
  const { isConnected, state: connState } = useOpenClawConnection();
  const openClaw = useOpenClawChat(sessionKey);

  // REST fallback hooks (kept for when OpenClaw is unavailable)
  const smartCreate = useSmartCreate();
  const rateMission = useRateMission();
  const { data: missionResult } = useMissionResult(pendingMissionId);

  // Auto-scroll on new messages or streaming text
  useEffect(() => {
    if (expanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [expanded, messages, openClaw.streamText]);

  // When OpenClaw streaming finishes, commit to messages
  const prevStreamingRef = useRef(false);
  useEffect(() => {
    if (prevStreamingRef.current && !openClaw.isStreaming && openClaw.streamText) {
      addMessage({ role: 'assistant', text: openClaw.streamText });
    }
    prevStreamingRef.current = openClaw.isStreaming;
  }, [openClaw.isStreaming, openClaw.streamText]);

  // When OpenClaw has an error, show it
  useEffect(() => {
    if (openClaw.error) {
      addMessage({ role: 'system', text: `Scribe error: ${openClaw.error}` });
    }
  }, [openClaw.error]);

  // When mission result arrives (REST fallback path), display it
  useEffect(() => {
    if (!missionResult || !pendingMissionId) return;
    if (missionResult.result) {
      addMessage({
        role: 'system',
        text: `Quest #${pendingMissionId} complete.`,
      });
      addMessage({
        role: 'result',
        text: missionResult.result,
        missionId: pendingMissionId,
        rating: 0,
      });
      setPendingMissionId(null);
    }
  }, [missionResult, pendingMissionId]);

  const addMessage = useCallback((partial: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...partial, id: nextId++, timestamp: Date.now() }]);
  }, []);

  const isBusy = openClaw.isStreaming || smartCreate.isPending;

  const handleSend = useCallback(() => {
    const task = inputValue.trim();
    if (!task || isBusy) return;

    addMessage({ role: 'user', text: task });
    setInputValue('');

    if (isConnected) {
      // PRIMARY: OpenClaw streaming path
      openClaw.send(task);
    } else {
      // FALLBACK: Direct API quest dispatch
      addMessage({ role: 'system', text: 'Scribe offline \u2014 dispatching quest directly...' });

      smartCreate.mutate(
        { task },
        {
          onSuccess: (data) => {
            const mid = Number(data.missionId);
            addMessage({
              role: 'system',
              text: `Quest #${mid} dispatched. Agent working (~60s)`,
              txHash: data.txHash,
            });
            setPendingMissionId(mid);
          },
          onError: (err) => {
            addMessage({
              role: 'system',
              text: `Error: ${err instanceof Error ? err.message : 'Quest dispatch failed'}`,
            });
          },
        },
      );
    }
  }, [inputValue, isBusy, isConnected, openClaw, smartCreate, addMessage]);

  const handleRate = useCallback((messageId: number, star: number, missionId?: number) => {
    setRatings(prev => ({ ...prev, [messageId]: star }));
    if (missionId) {
      rateMission.mutate({ missionId, rating: star });
    }
  }, [rateMission]);

  // ── Collapsed bar ──
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
          background: 'rgba(26, 22, 16, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '2px solid rgba(196, 113, 59, 0.5)',
          boxShadow: '0 -2px 12px rgba(196, 113, 59, 0.12)',
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
          e.currentTarget.style.borderTopColor = 'rgba(196, 113, 59, 0.3)';
        }}
      >
        <span
          style={{
            fontFamily: "'Crimson Pro', serif",
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--parchment-dim)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ConnectionDot state={connState} />
          &#10022; Summon the Scribe...
        </span>
        <span style={{ color: 'var(--parchment-dim)', fontSize: 16 }}>&#8862;</span>
      </div>
    );
  }

  // ── Expanded chat panel ──
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
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <ConnectionDot state={connState} />
          &#10022; SCRIBE&apos;S DESK
        </span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {openClaw.isStreaming && (
            <button
              onClick={() => openClaw.abort()}
              style={{
                background: 'none',
                border: '1px solid rgba(196, 113, 59, 0.4)',
                color: 'var(--ember)',
                fontSize: 11,
                fontFamily: "'Cinzel', serif",
                cursor: 'pointer',
                padding: '2px 10px',
                borderRadius: 3,
                transition: 'all 150ms ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(196, 113, 59, 0.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none';
              }}
            >
              Stop
            </button>
          )}
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
        {messages.length === 0 && !openClaw.isStreaming && (
          <div
            style={{
              fontFamily: "'Crimson Pro', serif",
              fontStyle: 'italic',
              fontSize: 14,
              color: 'var(--parchment-dim)',
              textAlign: 'center',
              padding: '20px 0',
            }}
          >
            {isConnected
              ? 'The Scribe awaits your command...'
              : 'Write your quest below to dispatch an agent...'}
          </div>
        )}
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            rating={ratings[msg.id] ?? msg.rating ?? 0}
            hoveredStar={hoveredStar}
            onStarHover={setHoveredStar}
            onRate={star => handleRate(msg.id, star, msg.missionId)}
          />
        ))}

        {/* Live streaming bubble */}
        {openClaw.isStreaming && openClaw.streamText && (
          <div
            style={{
              borderLeft: '3px solid var(--indigo)',
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
              }}
            >
              {openClaw.streamText}
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 14,
                  background: 'var(--ember)',
                  marginLeft: 2,
                  verticalAlign: 'text-bottom',
                  animation: 'coinPulse 1s ease-in-out infinite',
                }}
              />
            </div>
          </div>
        )}

        {/* Streaming started but no text yet */}
        {openClaw.isStreaming && !openClaw.streamText && (
          <div
            style={{
              borderLeft: '2px solid var(--indigo)',
              paddingLeft: 12,
              marginLeft: 12,
            }}
          >
            <span
              style={{
                fontFamily: "'Crimson Pro', serif",
                fontSize: 13,
                color: 'var(--parchment-dim)',
                animation: 'coinPulse 2s ease-in-out infinite',
              }}
            >
              Scribe is thinking...
            </span>
          </div>
        )}

        {/* REST fallback: awaiting mission result */}
        {pendingMissionId && (
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
                animation: 'coinPulse 2s ease-in-out infinite',
              }}
            >
              Awaiting result...
            </span>
          </div>
        )}
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
          placeholder={isConnected ? 'Ask the Scribe anything...' : 'Write your quest here...'}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          style={{ flex: 1 }}
          disabled={isBusy}
        />
        <button
          className="btn-solid"
          style={{ flexShrink: 0, opacity: isBusy ? 0.5 : 1 }}
          onClick={handleSend}
          disabled={isBusy}
        >
          {isBusy ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

/* ── Connection status indicator ──────────────────────────────────── */

function ConnectionDot({ state }: { state: string }) {
  const colors: Record<string, string> = {
    connected: '#4ade80',   // green
    connecting: '#fbbf24',  // amber
    error: '#f87171',       // red
    disconnected: '#6b7280', // grey
  };
  const color = colors[state] ?? colors.disconnected;
  const pulse = state === 'connecting';

  return (
    <span
      title={state === 'connected' ? 'Scribe online' : state === 'connecting' ? 'Connecting...' : 'Scribe offline (fallback mode)'}
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color,
        boxShadow: state === 'connected' ? `0 0 6px ${color}` : 'none',
        animation: pulse ? 'coinPulse 1.5s ease-in-out infinite' : 'none',
        flexShrink: 0,
      }}
    />
  );
}

/* ── Message bubble ───────────────────────────────────────────────── */

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

  if (message.role === 'assistant') {
    return (
      <div
        style={{
          borderLeft: '3px solid var(--indigo)',
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
          }}
        >
          {message.text}
        </div>
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
