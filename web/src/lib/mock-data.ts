import type { GuildVisual, AgentVisual, FeedEvent, GlobalStats } from './world-state';

// ── Mock Agents ──
export const MOCK_AGENTS: AgentVisual[] = [
  {
    address: '0x9E91c4f3B4D72CC34a2bFA053E49dDfa',
    role: 'Content Creator',
    guildId: 1,
    tier: 'house',
    rating: 4.2,
    missions: 12,
    position: { x: 164, y: 164 },
  },
  {
    address: '0xe83C9b2A0d1155c3bFaE9c7B04a00158',
    role: 'Content Creator',
    guildId: 1,
    tier: 'shack',
    rating: 3.8,
    missions: 8,
    position: { x: 228, y: 164 },
  },
  {
    address: '0xa4F2D3e891bC5041f27Ae3D9c0108c1D',
    role: 'Meme Specialist',
    guildId: 2,
    tier: 'workshop',
    rating: 4.6,
    missions: 28,
    position: { x: 164, y: 464 },
  },
  {
    address: '0x3Bf19A20c5D847aE093120eFd431b72C',
    role: 'Meme Specialist',
    guildId: 2,
    tier: 'townhouse',
    rating: 4.1,
    missions: 15,
    position: { x: 228, y: 464 },
  },
];

// ── Mock Guilds ──
export const MOCK_GUILDS: GuildVisual[] = [
  {
    guildId: 1,
    name: 'Visual Design Guild',
    category: 'creative',
    tier: 'silver',
    avgRating: 4.0,
    totalMissions: 20,
    position: { x: 164, y: 164 },
    agents: MOCK_AGENTS.filter(a => a.guildId === 1),
    isAnimating: false,
    animationType: 'none',
  },
  {
    guildId: 2,
    name: 'Meme Factory',
    category: 'meme',
    tier: 'gold',
    avgRating: 4.5,
    totalMissions: 43,
    position: { x: 164, y: 464 },
    agents: MOCK_AGENTS.filter(a => a.guildId === 2),
    isAnimating: false,
    animationType: 'none',
  },
];

// ── Mock Missions ──
export interface MockMission {
  missionId: number;
  guildId: number;
  prompt: string;
  result: string;
  rating: number;
  completedAt: number;
}

export const MOCK_MISSIONS: MockMission[] = [
  {
    missionId: 42,
    guildId: 1,
    prompt: 'Write a haiku about Monad',
    result: 'Speed beyond compare\nParallel chains weave moonlight\nConsensus blooms fast',
    rating: 5,
    completedAt: Date.now() - 10 * 60 * 1000,
  },
  {
    missionId: 41,
    guildId: 1,
    prompt: 'Create a tagline for DeFi summer',
    result: 'DeFi Summer: Where your yield farms actually grow.',
    rating: 4,
    completedAt: Date.now() - 30 * 60 * 1000,
  },
  {
    missionId: 38,
    guildId: 1,
    prompt: 'Create a meme about DeFi',
    result: 'When the APY is 10000% but you only put in $5...',
    rating: 4,
    completedAt: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    missionId: 43,
    guildId: 2,
    prompt: 'Make me a meme about Monad speed',
    result: 'Monad: Speed Reimagined. When other chains crawl at 15 TPS, Monad goes brrr at 10,000.',
    rating: 5,
    completedAt: Date.now() - 5 * 60 * 1000,
  },
  {
    missionId: 40,
    guildId: 2,
    prompt: 'Meme about gas fees',
    result: 'Me: *does one swap*\nEthereum: That will be $47\nMonad: That will be $0.001\nMe: *moves everything*',
    rating: 5,
    completedAt: Date.now() - 45 * 60 * 1000,
  },
  {
    missionId: 37,
    guildId: 2,
    prompt: 'Solana vs Monad meme',
    result: 'Solana: "I am speed"\nMonad: "Hold my parallel execution"',
    rating: 3,
    completedAt: Date.now() - 3 * 60 * 60 * 1000,
  },
];

// ── Mock Feed Events ──
export const MOCK_FEED: FeedEvent[] = [
  {
    type: 'mission_completed',
    guildId: 1,
    missionId: 42,
    timestamp: Date.now() - 3 * 1000,
    txHash: '0x5d2b7a1c8e3f4d9b6a0c2e1f7d8b3c4a5e6f7890123456789abcdef0000312b',
  },
  {
    type: 'mission_rated',
    guildId: 1,
    missionId: 42,
    score: 5,
    timestamp: Date.now() - 8 * 1000,
    txHash: '0x8a3c4d5e6f7890123456789abcdef0123456789abcdef0123456789abcdef01',
  },
  {
    type: 'mission_completed',
    guildId: 2,
    missionId: 43,
    timestamp: Date.now() - 15 * 1000,
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  },
  {
    type: 'guild_created',
    guildId: 2,
    timestamp: Date.now() - 5 * 60 * 1000,
    txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  },
  {
    type: 'agent_registered',
    guildId: 1,
    timestamp: Date.now() - 12 * 60 * 1000,
    txHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
  },
  {
    type: 'mission_rated',
    guildId: 2,
    missionId: 40,
    score: 5,
    timestamp: Date.now() - 45 * 60 * 1000,
    txHash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
  },
];

// ── Mock Stats ──
export const MOCK_STATS: GlobalStats = {
  totalGuilds: 2,
  totalAgents: 4,
  totalMissions: 43,
  totalEarned: '0.0215',
  avgRating: 4.3,
};

// ── Mock Wallet / Purse ──
export const MOCK_WALLET = {
  address: '0x9E91c4f3B4D72CC34a2bFA053E49dDfa',
  balance: '0.049',
  missionsRemaining: 49,
};

// ── Mock Plot ──
export interface MockPlot {
  plotId: number;
  district: string;
  positionTier: 'center' | 'near-road' | 'mid-ring' | 'edge';
  price: number;
  status: 'available' | 'claimed';
  owner?: string;
}

export const MOCK_PLOTS: MockPlot[] = [
  { plotId: 6, district: 'Creative Quarter', positionTier: 'mid-ring', price: 3, status: 'available' },
  { plotId: 7, district: 'Creative Quarter', positionTier: 'edge', price: 2, status: 'available' },
  { plotId: 12, district: 'DeFi Docks', positionTier: 'near-road', price: 4, status: 'claimed', owner: '0x9E91...Dfa' },
];

// ── Mock Chat Messages ──
export interface ChatMessage {
  id: number;
  role: 'user' | 'system' | 'result';
  text: string;
  txHash?: string;
  rating?: number;
  timestamp: number;
}

export const MOCK_CHAT: ChatMessage[] = [
  {
    id: 1,
    role: 'user',
    text: 'make me a meme about Monad speed',
    timestamp: Date.now() - 90 * 1000,
  },
  {
    id: 2,
    role: 'system',
    text: 'Creating quest... Routed to Meme Factory.',
    timestamp: Date.now() - 88 * 1000,
  },
  {
    id: 3,
    role: 'system',
    text: 'Quest #44 dispatched. Agent working (~60s)',
    txHash: '0x5d2b...312b',
    timestamp: Date.now() - 85 * 1000,
  },
  {
    id: 4,
    role: 'system',
    text: 'Quest #44 complete.',
    timestamp: Date.now() - 30 * 1000,
  },
  {
    id: 5,
    role: 'result',
    text: 'Monad: Speed Reimagined\nWhen other chains crawl at 15 TPS, Monad goes brrr at 10,000 TPS. Not all heroes wear capes \u2014 some just parallelize.',
    rating: 0,
    timestamp: Date.now() - 28 * 1000,
  },
];

// ── Helpers ──
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function renderStars(rating: number, max = 5): string {
  const full = Math.floor(rating);
  const empty = max - full;
  return '\u2605'.repeat(full) + '\u2606'.repeat(empty);
}
