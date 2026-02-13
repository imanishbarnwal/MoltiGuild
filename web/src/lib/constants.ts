export const GUILD_REGISTRY_ADDRESS = '0x60395114FB889C62846a574ca4Cda3659A95b038';
export const CHAIN_ID = 10143;
export const MONAD_RPC = 'https://testnet-rpc.monad.xyz';
export const GOLDSKY_ENDPOINT = 'https://api.goldsky.com/api/public/project_cm6mxyjqgedaf01tu3hx09ded/subgraphs/agentguilds-monad-testnet-monad-testnet/v5/gn';
export const EXPLORER_URL = 'https://testnet.monadvision.com';
// In dev, use empty string so requests go through Next.js rewrites proxy (avoids CORS).
// In prod, use the full URL directly.
export const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? ''
  : (process.env.NEXT_PUBLIC_API_URL || 'https://moltiguild-api.onrender.com');

// Local API URL for Next.js rewrites proxy target (used in next.config.mjs via env)
// Set NEXT_PUBLIC_API_URL=http://localhost:3001 when running Docker locally.

// OpenClaw gateway — primary NLP chat layer (WebSocket)
export const OPENCLAW_WS_URL = process.env.NEXT_PUBLIC_OPENCLAW_WS_URL
  || (process.env.NODE_ENV === 'development' ? 'ws://localhost:18789' : 'wss://gateway.outdatedlabs.com');
export const OPENCLAW_TOKEN = process.env.NEXT_PUBLIC_OPENCLAW_TOKEN || 'agentguilds-gateway-2026';
export const OPENCLAW_AGENT_ID = 'coordinator';
