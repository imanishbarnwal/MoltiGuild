'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  connect,
  getState,
  onStateChange,
  onChatEvent,
  sendChat,
  abortChat,
  buildSessionKey,
  type ConnectionState,
  type ChatEvent,
} from './openclaw-client';

/**
 * Track the OpenClaw WebSocket connection state.
 * Initiates connection on first mount; singleton persists across unmounts.
 */
export function useOpenClawConnection() {
  const [state, setState] = useState<ConnectionState>(getState);

  useEffect(() => {
    const unsub = onStateChange(setState);
    // Connect if not already connected
    if (getState() === 'disconnected' || getState() === 'error') {
      connect();
    }
    return unsub;
  }, []);

  return {
    state,
    isConnected: state === 'connected',
    isConnecting: state === 'connecting',
  };
}

/**
 * Chat with an OpenClaw agent via WebSocket.
 * Provides send/abort + streaming text state.
 */
export function useOpenClawChat(sessionKey: string) {
  const [streamText, setStreamText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runIdRef = useRef<string | null>(null);

  // Subscribe to chat events for this session
  useEffect(() => {
    const unsub = onChatEvent((event: ChatEvent) => {
      if (event.sessionKey !== sessionKey) return;

      switch (event.state) {
        case 'delta':
          setStreamText(event.content);
          break;
        case 'final':
          setStreamText(event.content);
          setIsStreaming(false);
          runIdRef.current = null;
          break;
        case 'aborted':
          setIsStreaming(false);
          runIdRef.current = null;
          break;
        case 'error':
          setError(event.errorMessage ?? 'Unknown error');
          setIsStreaming(false);
          runIdRef.current = null;
          break;
      }
    });
    return unsub;
  }, [sessionKey]);

  const send = useCallback(async (message: string) => {
    setStreamText('');
    setError(null);
    setIsStreaming(true);
    try {
      const runId = await sendChat(sessionKey, message);
      runIdRef.current = runId;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
      setIsStreaming(false);
    }
  }, [sessionKey]);

  const abort = useCallback(async () => {
    try {
      await abortChat(sessionKey, runIdRef.current ?? undefined);
    } catch {
      // ignore abort errors
    }
  }, [sessionKey]);

  return { send, abort, streamText, isStreaming, error };
}

export { buildSessionKey };
