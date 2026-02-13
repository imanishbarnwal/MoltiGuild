/**
 * OpenClaw WebSocket client — singleton connection manager.
 *
 * Follows the same module-level singleton pattern as sse.ts:
 *   connect() / disconnect() / subscribe callbacks
 *
 * Protocol: challenge → connect (token auth) → hello-ok → chat.send / chat events
 */

import { OPENCLAW_WS_URL, OPENCLAW_TOKEN, OPENCLAW_AGENT_ID } from './constants';

/* ── Types ─────────────────────────────────────────────────────────── */

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type ChatEventState = 'delta' | 'final' | 'aborted' | 'error';

export interface ChatEvent {
  runId: string;
  sessionKey: string;
  state: ChatEventState;
  content: string;
  errorMessage?: string;
  usage?: { input: number; output: number };
}

type StateCallback = (state: ConnectionState) => void;
type ChatCallback = (event: ChatEvent) => void;

/* ── Protocol frame types ──────────────────────────────────────────── */

interface RequestFrame {
  type: 'req';
  id: string;
  method: string;
  params: Record<string, unknown>;
}

interface ResponseFrame {
  type: 'res';
  id: string;
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: { code: string; message: string };
}

interface EventFrame {
  type: 'event';
  event: string;
  payload?: Record<string, unknown>;
  seq?: number;
}

type Frame = RequestFrame | ResponseFrame | EventFrame;

/* ── Module-level singleton state ──────────────────────────────────── */

let ws: WebSocket | null = null;
let state: ConnectionState = 'disconnected';
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let reqCounter = 0;

const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

const stateListeners = new Set<StateCallback>();
const chatListeners = new Set<ChatCallback>();

// Pending request callbacks (for req/res pairing)
const pendingRequests = new Map<string, {
  resolve: (payload: Record<string, unknown>) => void;
  reject: (err: Error) => void;
}>();

/* ── Helpers ───────────────────────────────────────────────────────── */

function nextReqId(): string {
  return `req-${++reqCounter}`;
}

function setState(next: ConnectionState): void {
  if (next === state) return;
  state = next;
  for (const cb of stateListeners) cb(state);
}

function send(frame: RequestFrame): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error('WebSocket not connected');
  }
  ws.send(JSON.stringify(frame));
}

function sendRequest(method: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
  const id = nextReqId();
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    try {
      send({ type: 'req', id, method, params });
    } catch (err) {
      pendingRequests.delete(id);
      reject(err);
    }
    // Timeout after 30s
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error(`Request ${method} timed out`));
      }
    }, 30000);
  });
}

/* ── Handshake ─────────────────────────────────────────────────────── */

function handleChallenge(_nonce: string): void {
  sendRequest('connect', {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: 'webchat',
      version: '1.0.0',
      platform: 'web',
      mode: 'webchat',
    },
    role: 'operator',
    scopes: ['operator.read', 'operator.write'],
    auth: { token: OPENCLAW_TOKEN },
    locale: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'moltiguild-web/1.0',
  }).then(() => {
    setState('connected');
    reconnectAttempts = 0;
  }).catch((err) => {
    console.error('[openclaw] handshake failed:', err);
    setState('error');
    scheduleReconnect();
  });
}

/* ── Frame dispatcher ──────────────────────────────────────────────── */

function handleFrame(frame: Frame): void {
  switch (frame.type) {
    case 'res': {
      const pending = pendingRequests.get(frame.id);
      if (pending) {
        pendingRequests.delete(frame.id);
        if (frame.ok) {
          pending.resolve(frame.payload ?? {});
        } else {
          pending.reject(new Error(frame.error?.message ?? 'Unknown error'));
        }
      }
      break;
    }

    case 'event': {
      if (frame.event === 'connect.challenge') {
        const nonce = (frame.payload as { nonce?: string })?.nonce ?? '';
        handleChallenge(nonce);
      } else if (frame.event === 'chat') {
        handleChatEvent(frame.payload ?? {});
      }
      // tick events are just keepalives — no action needed
      break;
    }
  }
}

function handleChatEvent(payload: Record<string, unknown>): void {
  const msg = payload.message as Record<string, unknown> | undefined;
  // content is an array of content blocks: [{ type: "text", text: "..." }, ...]
  const contentBlocks = msg?.content as Array<{ type: string; text?: string }> | undefined;
  const text = contentBlocks
    ?.filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text)
    .join('') ?? '';

  const chatEvent: ChatEvent = {
    runId: String(payload.runId ?? ''),
    sessionKey: String(payload.sessionKey ?? ''),
    state: (payload.state as ChatEventState) ?? 'delta',
    content: text,
    errorMessage: payload.errorMessage as string | undefined,
    usage: payload.usage as { input: number; output: number } | undefined,
  };

  for (const cb of chatListeners) cb(chatEvent);
}

/* ── Reconnect ─────────────────────────────────────────────────────── */

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectAttempts++;
  const delay = Math.min(
    BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1),
    MAX_RECONNECT_DELAY,
  );
  console.log(`[openclaw] reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
}

/* ── Public API ────────────────────────────────────────────────────── */

export function connect(): void {
  if (ws) return;
  if (typeof window === 'undefined') return; // SSR guard

  setState('connecting');

  try {
    ws = new WebSocket(OPENCLAW_WS_URL);
  } catch (err) {
    console.error('[openclaw] WebSocket creation failed:', err);
    setState('error');
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    // Wait for connect.challenge event — don't set connected yet
  };

  ws.onmessage = (evt) => {
    try {
      const frame = JSON.parse(evt.data) as Frame;
      handleFrame(frame);
    } catch {
      // ignore malformed frames
    }
  };

  ws.onerror = () => {
    // onclose will fire after this — handle reconnect there
  };

  ws.onclose = () => {
    ws = null;
    // Reject all pending requests
    for (const [id, pending] of pendingRequests) {
      pending.reject(new Error('Connection closed'));
      pendingRequests.delete(id);
    }
    if (state !== 'disconnected') {
      setState('error');
      scheduleReconnect();
    }
  };
}

export function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
  if (ws) {
    setState('disconnected');
    ws.close();
    ws = null;
  }
}

export function getState(): ConnectionState {
  return state;
}

export function isConnected(): boolean {
  return state === 'connected';
}

/**
 * Send a chat message to an OpenClaw agent.
 * Returns the runId for tracking/aborting.
 */
export async function sendChat(sessionKey: string, message: string): Promise<string> {
  const idempotencyKey = `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = await sendRequest('chat.send', {
    sessionKey,
    message,
    deliver: false,
    idempotencyKey,
  });
  return String(payload.runId ?? idempotencyKey);
}

/**
 * Abort a running chat response.
 */
export async function abortChat(sessionKey: string, runId?: string): Promise<void> {
  await sendRequest('chat.abort', {
    sessionKey,
    ...(runId ? { runId } : {}),
  });
}

/**
 * Build the session key for a given user.
 * Format: agent:{agentId}:web-{userId}
 */
export function buildSessionKey(userId: string): string {
  return `agent:${OPENCLAW_AGENT_ID}:web-${userId}`;
}

/* ── Subscriptions ─────────────────────────────────────────────────── */

export function onStateChange(callback: StateCallback): () => void {
  stateListeners.add(callback);
  return () => { stateListeners.delete(callback); };
}

export function onChatEvent(callback: ChatCallback): () => void {
  chatListeners.add(callback);
  return () => { chatListeners.delete(callback); };
}
