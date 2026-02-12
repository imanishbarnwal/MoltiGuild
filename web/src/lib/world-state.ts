export interface WorldState {
  districts: District[];
  guilds: GuildVisual[];
  agents: AgentVisual[];
  feed: FeedEvent[];
  stats: GlobalStats;
}

export interface District {
  name: string;
  category: string;
  color: string;
  position: { x: number; y: number };
  width: number;
  height: number;
}

export interface GuildVisual {
  guildId: number;
  name: string;
  category: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  avgRating: number;
  totalMissions: number;
  position: { x: number; y: number };
  agents: AgentVisual[];
  isAnimating: boolean;
  animationType: 'none' | 'construction' | 'fireworks' | 'decay';
}

export interface AgentVisual {
  address: string;
  role: string;
  guildId: number;
  tier: 'tent' | 'shack' | 'house' | 'townhouse' | 'workshop' | 'tower' | 'landmark';
  rating: number;
  missions: number;
  position: { x: number; y: number };
}

export interface FeedEvent {
  type: 'mission_completed' | 'mission_rated' | 'guild_created' | 'agent_registered';
  guildId: number;
  missionId?: number;
  score?: number;
  timestamp: number;
  txHash: string;
}

export interface GlobalStats {
  totalGuilds: number;
  totalAgents: number;
  totalMissions: number;
  totalEarned: string;
  avgRating: number;
}

export function getGuildTier(missions: number, rating: number): GuildVisual['tier'] {
  if (missions >= 200 && rating >= 4.5) return 'diamond';
  if (missions >= 50 && rating >= 4.0) return 'gold';
  if (missions >= 10 && rating >= 3.5) return 'silver';
  return 'bronze';
}

export function getAgentTier(rating: number, missions: number): AgentVisual['tier'] {
  if (rating >= 4.8 && missions >= 100) return 'landmark';
  if (rating >= 4.5 && missions >= 50) return 'tower';
  if (rating >= 4.0 && missions >= 25) return 'workshop';
  if (rating >= 3.5 && missions >= 10) return 'townhouse';
  if (rating >= 3.0 && missions >= 5) return 'house';
  if (missions > 0) return 'shack';
  return 'tent';
}

export const DISTRICT_CENTERS: Record<string, { x: number; y: number; width: number }> = {
  meme:        { x: 100, y: 100, width: 8 },
  creative:    { x: 100, y: 100, width: 8 },
  translation: { x: 400, y: 100, width: 8 },
  code:        { x: 700, y: 100, width: 8 },
  defi:        { x: 100, y: 400, width: 8 },
  research:    { x: 400, y: 400, width: 8 },
};

export function getGuildPosition(guildId: number, category: string) {
  const district = DISTRICT_CENTERS[category] || DISTRICT_CENTERS['creative'];
  const col = (guildId * 3) % district.width;
  const row = Math.floor((guildId * 3) / district.width);
  return {
    x: district.x + col * 64,
    y: district.y + row * 64,
  };
}
