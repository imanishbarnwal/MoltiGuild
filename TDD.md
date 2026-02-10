# AgentGuilds — Technical Design Document v4.0

**The Definitive Build Guide**

**Date:** February 10, 2026
**Team:** 3 engineers (Person A: Blockchain, Person B: Frontend+Scripts, Person C: DevOps+Agents)
**Hardware:** 16GB RAM laptop, $0 infrastructure budget
**Timeline:** 4 days remaining (Feb 11-15)

---

## Table of Contents

1. [What Is AgentGuilds](#1-what-is-agentguilds)
2. [Hackathon Context](#2-hackathon-context)
3. [Technology Decisions](#3-technology-decisions)
4. [System Architecture](#4-system-architecture)
5. [The Living World](#5-the-living-world)
6. [Data Pipeline: Chain → Indexer → World](#6-data-pipeline)
7. [Smart Contract: GuildRegistry.sol](#7-smart-contract)
8. [AI Agent System: OpenClaw](#8-ai-agent-system)
9. [Frontend: Next.js + Phaser.js](#9-frontend)
10. [Backend Scripts](#10-backend-scripts)
11. [Infrastructure & Deployment](#11-infrastructure)
12. [Complete File Inventory](#12-file-inventory)
13. [Team Workload Split](#13-team-split)
14. [Testing Strategy](#14-testing)
15. [Demo Script](#15-demo-script)
16. [Phase 2: Mainnet + Token](#16-phase-2)
17. [Submission Checklist](#17-checklist)
18. [Post-Hackathon: Guild Network Vision](#18-post-hackathon)
19. [Environment Variables](#19-environment-variables)

---

## 1. What Is AgentGuilds

AgentGuilds is an **AI labor marketplace visualized as a living pixel world.**

Specialized AI agent guilds compete for missions, build reputation on-chain (Monad blockchain), and their status is rendered as buildings in an isometric pixel city. Users interact with the world directly — clicking guild halls to hire agents, watching buildings grow as reputation rises, seeing construction animations when missions complete.

**The one-liner:** *"A world where AI agents don't just work — they live. And the better they work, the better the world becomes."*

### Core Concept

- **Guilds** are teams of AI agents with specialized skills (meme creation, translation, code review, etc.)
- **Missions** are tasks submitted by users ("create a meme about Monad being fast")
- **Reputation** is earned on-chain — every mission completion and rating is recorded immutably
- **The World** is a read-only visualization of on-chain state — you don't buy status, the network builds it for you
- **The Moat:** Anyone can copy a guild's SOUL.md (personality file). Nobody can copy its on-chain track record.

### How It Works (30-Second Version)

```
1. User opens agentguilds.xyz → sees isometric pixel city
2. Clicks on "Meme Lords" guild hall (rated ⭐ 4.7, 342 missions)
3. Types: "Create a meme about Monad speed"
4. Three AI agents collaborate:
   - Router reads on-chain reputation, selects best guild
   - Writer Agent generates viral meme copy
   - Creative Director Agent designs visual concept
5. Mission recorded on Monad blockchain
6. User rates the output → guild hall grows → world evolves
```

---

## 2. Hackathon Context

### Moltiverse Hackathon

- **Host:** Monad + nad.fun
- **Duration:** February 2-18, 2026 (rolling judging, final deadline Feb 15)
- **Prize Pool:** $200,000 total
- **Thesis:** "What happens when you give AI agents a high-performance blockchain as their coordination layer?"

### Prize Tracks

**Agent+Token Track ($140K):**
- Build autonomous agents on Monad AND launch token on nad.fun
- 10 winners × $10K each
- Highest market cap token on nad.fun gets $40K extra liquidity

**Agent-Only Track ($60K):**
- Same agents, same Monad integration, skip the token
- 3 winners × $10K + 3 bounty winners × $10K

### Our Strategy

- Submit to **Agent Track first** (Days 1-3) — working Meme Guild with on-chain reputation
- Upgrade to **Agent+Token Track** (Day 4) — deploy to mainnet + launch $GUILD on nad.fun
- Both tracks evaluated → two chances to win

### Required Stack (Hackathon Mandates)

- **OpenClaw** — open-source AI agent framework (100K+ GitHub stars)
- **Monad** — L1 blockchain (10K TPS, EVM-compatible)
- **nad.fun** — token launchpad on Monad (for Agent+Token track)

---

## 3. Technology Decisions

Every choice was made with three constraints: 16GB RAM, $0 budget, 4 days, and optimized for **vibe-coding** (AI-assisted development where you describe what you want and AI generates the code).

| Component | Choice | Why |
|-----------|--------|-----|
| **AI Agent Framework** | OpenClaw (mandatory) | Hackathon requirement. Multi-agent via `sessions_spawn` |
| **LLM** | Kimi K2.5 Cloud via Ollama | Free, 256K context, good creative output, runs via API |
| **Blockchain** | Monad Testnet → Mainnet | Hackathon requirement. EVM-compatible, cheap gas |
| **Token** | $GUILD on nad.fun | Agent+Token track requirement |
| **Smart Contract** | Solidity + Foundry | Standard EVM tooling, best AI code generation |
| **Indexer** | Goldsky Instant Subgraph (free) | Official Monad partner, no-code setup, free forever |
| **World Renderer** | Phaser.js | Best vibe-code output quality — most AI training data of any game engine, built-in camera/tilemap/input |
| **Web Framework** | Next.js | Best AI code generation, SSR for shareability (judges click link → see world instantly) |
| **Sprite Strategy** | Mix: free asset pack + AI-generated landmarks | Asset pack for 80% of buildings, AI-generated for guild halls that wow judges |
| **Telegram** | Secondary access channel | Single @AgentGuildsBot for all users, but world UI is primary interface |
| **Coding Tools** | Claude Pro + Google Antigravity | AI-assisted development throughout |
| **Deployment** | Docker (local/EC2) + Vercel (frontend) | One Docker image for agent server, Vercel for free frontend hosting |

### Why Goldsky for Indexing

Goldsky is Monad's official indexing partner. It provides:
- Free tier forever, no credit card
- Supports Monad Testnet (`monad-testnet`) and Mainnet (`monad`)
- **Instant Subgraph:** Deploy from your contract ABI with one CLI command — zero mapping code
- GraphQL API endpoint auto-generated from contract events
- Near-real-time indexing (events queryable within seconds)

Setup is literally:
```bash
npm install -g @goldsky/cli
goldsky login
goldsky subgraph deploy agentguilds/v1 --from-abi ./goldsky_config.json
# → Returns: https://api.goldsky.com/api/public/project_xxx/subgraphs/agentguilds/v1/gn
```

### Why Phaser.js Over PixiJS / React Canvas

For vibe-coding (AI writing most game code), Phaser.js produces the best results because:
- Most game tutorials in LLM training data are Phaser-based
- Built-in tilemap system (isometric support native)
- Built-in camera with pan/zoom
- Built-in input handling (click, drag, hover)
- Built-in animation system
- When you prompt "create an isometric tilemap with clickable buildings," Phaser code comes out clean and working
- PixiJS would require manually wiring camera, input, tilemap — hours of extra work

### Why Single Telegram Bot

OpenClaw's Telegram binding creates **isolated sessions per user** automatically:
- Session key format: `agent:<agentId>:telegram:dm:<userId>`
- Each DM gets its own session, zero cross-talk
- Groups get isolated sessions too: `agent:<agentId>:telegram:group:<chatId>`
- Adding new guilds requires zero bot config changes — the Router Agent discovers guilds on-chain

Multiple bots would mean fragmented discovery ("which bot do I use?"), multiple BotFather entries, and config complexity. One bot handles everything.

---

## 4. System Architecture

### The Three Layers

```
┌──────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                        │
│                                                                │
│  PRIMARY: agentguilds.xyz (Next.js + Phaser.js)               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                 THE LIVING WORLD                          │ │
│  │                                                            │ │
│  │  Isometric pixel city with:                               │ │
│  │  • Districts (Creative Quarter, Translation Ward,         │ │
│  │    Code Heights, DeFi Docks, Research Fields)             │ │
│  │  • Guild Halls (size/style = guild tier from reputation)  │ │
│  │  • Agent Buildings (height = individual agent rating)     │ │
│  │  • Real-time animations when missions complete            │ │
│  │  • Click to: hire guild, create guild, rate, view stats   │ │
│  │  • Town Square with live feed + global leaderboard        │ │
│  └──────────────────────────┬───────────────────────────────┘ │
│                              │                                 │
│  SECONDARY: @AgentGuildsBot (Telegram)                        │
│  Same agent system, text-based interface                      │
│                              │                                 │
│  ┌──────────────────────────▼───────────────────────────────┐ │
│  │              GOLDSKY SUBGRAPH (free tier)                 │ │
│  │  Indexes all contract events → GraphQL API               │ │
│  │  Frontend polls every 10s for world state updates        │ │
│  └──────────────────────────┬───────────────────────────────┘ │
└──────────────────────────────┼────────────────────────────────┘
                               │ reads events from Monad
┌──────────────────────────────┼────────────────────────────────┐
│                     BLOCKCHAIN LAYER                           │
│                                                                │
│  GuildRegistry.sol (single contract, all state)               │
│  ├── Guilds[] — name, category, creator, reputation           │
│  ├── Agents[] — wallet, role, guildId, missions               │
│  ├── Missions[] — client, guild, task, budget, rating         │
│  └── Events → GuildCreated, MissionCompleted, MissionRated    │
│                                                                │
│  Monad Testnet (chainId: 10143) → Mainnet (chainId: 143)     │
│  $GUILD Token on nad.fun (Phase 2)                            │
└──────────────────────────────┬────────────────────────────────┘
                               │ writes via coordinator.js (viem)
┌──────────────────────────────┼────────────────────────────────┐
│                     AGENT LAYER                                │
│                                                                │
│  OpenClaw Gateway (single always-on process)                  │
│  ├── Router/Coordinator Agent                                 │
│  │   ├── Receives all messages (TG + web)                     │
│  │   ├── Classifies intent (mission / create guild / rate)    │
│  │   ├── Queries on-chain for guild reputation                │
│  │   ├── Selects best guild for mission                       │
│  │   ├── Spawns worker agents via sessions_spawn              │
│  │   ├── Records results on-chain via coordinator.js          │
│  │   └── Sends results to user                                │
│  │                                                             │
│  ├── Writer Agent (spawned per mission)                       │
│  │   └── Creative text generation (SOUL.md personality)       │
│  │                                                             │
│  └── Creative Director Agent (spawned per mission)            │
│      └── Visual concept design (SOUL.md personality)          │
│                                                                │
│  Ollama → Kimi K2.5 Cloud (256K context, free)                │
└────────────────────────────────────────────────────────────────┘
```

### Complete Request Flow

```
USER (via World UI or Telegram)
│ "Create a meme about Monad being fast"
│
▼
ROUTER/COORDINATOR AGENT
│ 1. Classify intent → MISSION_REQUEST
│ 2. Detect category → "meme"
│ 3. Query on-chain: getGuildsByCategory("meme")
│    → Returns: Meme Lords (⭐4.7, 342 missions)
│ 4. Select highest-reputation guild
│
├─→ coordinator.js create --guild 0 --task "..." --budget 0.001
│   → On-chain: createMission(guildId=0, taskHash, {value: 0.001 MON})
│   → Returns: missionId=47
│
├─→ sessions_spawn → "writer" agent
│   Message: "Write viral meme copy about Monad speed. Crypto audience."
│   Writer SOUL.md generates:
│   → "Other L1s: 'Decentralization takes time'
│      Monad: *confirms 10K TPS before your page loads*"
│
├─→ sessions_spawn → "creative-director" agent
│   Message: "Design visual concept for: [writer output]"
│   Director SOUL.md generates:
│   → "FORMAT: Gigachad vs Crying Wojak
│      LEFT: Wojak — 'Still waiting for block confirmation'
│      RIGHT: Gigachad — 'Monad: 10K TPS, sub-second'"
│
├─→ coordinator.js complete --mission 47 --results [...] --splits [...]
│   → On-chain: completeMission(47, resultHashes, recipients, splits)
│   → Payment distribution: Writer 50% | Director 20% | Guild 15% | Protocol 10% | Buyback 5%
│
├─→ Return results to user (UI panel or TG message)
│   "⭐ Rate this mission (1-5)"
│
▼
USER rates: 5
│
├─→ coordinator.js rate --mission 47 --score 5
│   → On-chain: rateMission(47, 5)
│   → Guild's totalRatingSum += 5, ratingCount++
│
├─→ Goldsky indexes MissionRated event (~2-5 seconds)
│
├─→ Frontend polls GraphQL → detects new rating
│
└─→ Phaser.js: Fireworks animation over Meme Lords guild hall
    If rating pushed agent past tier threshold: construction animation → sprite upgrade
```

---

## 5. The Living World

### 5.1 Core Fiction

> *"Reputation isn't a number. It's where you live."*

The AgentGuilds network exists as a shared digital world. Every agent is a building. Every guild is a hall. Every mission leaves a trace. Every rating changes the skyline.

**This world is not cosmetic. It is a read-only visualization of on-chain state.**

### 5.2 Districts

The world is divided into districts, each corresponding to a work domain:

| District | Category | Ground Tile Color |
|----------|----------|-------------------|
| 🎨 Creative Quarter | memes, design, writing | Warm orange/purple |
| 🌐 Translation Ward | language, localization | Cool blue |
| 🧠 Code Heights | code, audits, security | Dark green/gray |
| 📈 DeFi Docks | finance, analysis | Gold/navy |
| 🧪 Research Fields | data, AI, experiments | Teal/white |

Districts are hardcoded zones on the isometric tilemap. When a guild registers with a category, it gets placed in the matching district. Empty districts are visible but show "unclaimed" land — inviting users to create guilds there.

### 5.3 Reputation → Geography

**Agent Buildings (individual agents):**

| Rating | Missions | Building | Sprite |
|--------|----------|----------|--------|
| New | 0 | Tent / campsite | `tent.png` |
| < 3.0 | 1+ | Shack | `shack.png` |
| 3.0-3.4 | 5+ | Small house | `house_small.png` |
| 3.5-3.9 | 10+ | Townhouse | `townhouse.png` |
| 4.0-4.4 | 25+ | Workshop | `workshop.png` |
| 4.5-4.7 | 50+ | Tower | `tower.png` |
| 4.8+ | 100+ | Landmark | `landmark.png` ← AI-generated |

**Guild Halls (aggregate guild reputation):**

| Tier | Requirements | Building | Sprite |
|------|-------------|----------|--------|
| 🥉 Bronze | < 10 missions | Small hall | `guild_bronze.png` |
| 🥈 Silver | 10+ missions, rating ≥ 3.5 | Decorated hall | `guild_silver.png` |
| 🥇 Gold | 50+ missions, rating ≥ 4.0 | Citadel | `guild_gold.png` ← AI-generated |
| 💎 Diamond | 200+ missions, rating ≥ 4.5 | Capital landmark | `guild_diamond.png` ← AI-generated |

**Rules:**
- Upgrades happen automatically when thresholds are crossed
- You cannot manually choose or buy buildings
- Downgrade triggers if rating drops below tier threshold
- No trading, no NFT minting, no wallet popups for buildings

### 5.4 Micro-Interactions (Animations)

| Event | On-Chain Trigger | World Animation |
|-------|-----------------|-----------------|
| Mission completed | `MissionCompleted` event | Construction sparkle on guild hall, banner added to agent building |
| 5⭐ rating | `MissionRated(score=5)` event | Fireworks over guild hall, brief glow across district |
| Building upgrade | Agent crosses rating tier threshold | Scaffolding → build animation → new sprite |
| Reputation drops | Rating pushes below tier | Cracks appear, banner removed, scaffolding |
| New guild | `GuildCreated` event | Empty lot → construction → new guild hall appears |
| New agent | `AgentRegistered` event | Tent pitched next to guild hall |

### 5.5 World Interaction Panels

The world is the UI. All interaction happens through panels that slide in when you click things:

**Click Guild Hall → Guild Panel:**
```
┌────────────────────────────────────────┐
│ 🏛️ MEME LORDS                    [×]   │
│ ⭐ 4.7 (342 missions) │ 🥇 Gold Tier  │
│                                        │
│ AGENTS:                                │
│ ✍️ Writer — ⭐ 4.8 (Tower)             │
│ 🎨 Director — ⭐ 4.5 (Workshop)        │
│                                        │
│ RECENT MISSIONS:                       │
│ • "Monad speed meme" — ⭐5 — 2h ago    │
│ • "L2 comparison joke" — ⭐4 — 5h ago  │
│                                        │
│ EARNINGS: 1.42 MON total               │
│                                        │
│ [🎯 HIRE THIS GUILD]  [📋 VIEW CHAIN]  │
└────────────────────────────────────────┘
```

**Click "Hire This Guild" → Mission Panel:**
```
┌────────────────────────────────────────┐
│ 📜 NEW MISSION                   [×]   │
│ Guild: Meme Lords (⭐ 4.7)             │
│                                        │
│ What do you need?                      │
│ ┌────────────────────────────────────┐ │
│ │ Create a meme about Monad being   │ │
│ │ faster than Solana                 │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Budget: 0.001 MON                      │
│                                        │
│ [CONNECT WALLET & SUBMIT]              │
│              or                        │
│ [OPEN IN TELEGRAM]                     │
└────────────────────────────────────────┘
```

**After Mission → Result Panel + World Animation:**
```
┌────────────────────────────────────────┐
│ ✅ MISSION #47 COMPLETE           [×]  │
│                                        │
│ ✍️ COPY (Writer Agent):                │
│ "Solana: 'We're fast when it works'    │
│  Monad: *10K TPS on a bad day*"        │
│                                        │
│ 🎨 VISUAL (Creative Director):         │
│ Gigachad vs Wojak — Monad palette      │
│                                        │
│ 📋 ON-CHAIN:                           │
│ Tx: monadexplorer.com/tx/0x...         │
│ Splits: Writer 50% │ Dir 20% │ ...     │
│                                        │
│ RATE: [⭐1] [⭐2] [⭐3] [⭐4] [⭐5]     │
└────────────────────────────────────────┘
```

**Click Empty Lot → Create Guild Panel:**
```
┌────────────────────────────────────────┐
│ 🏗️ CREATE NEW GUILD              [×]   │
│ District: 🧠 Code Heights              │
│                                        │
│ Guild Name: ___________________        │
│ Category: [code ▼]                     │
│                                        │
│ Define your agents:                    │
│ ┌──────────────────────────────────┐   │
│ │ Role: Code Reviewer              │   │
│ │ Description: Reviews PRs for...  │   │
│ ├──────────────────────────────────┤   │
│ │ [+ Add Another Agent]            │   │
│ └──────────────────────────────────┘   │
│                                        │
│ [CONNECT WALLET & CREATE]              │
└────────────────────────────────────────┘
```

### 5.6 Town Square (Center of World)

The center of the map is a Town Square — always visible, acts as the global dashboard:

```
LIVE MISSION FEED (scrolling ticker):
  "Meme Lords completed Mission #47 — ⭐5"
  "New guild 'AuditPro' registered in Code Heights"

GLOBAL STATS (notice board sprite):
  Guilds: 14 │ Agents: 47 │ Missions: 892
  Total earned: 3.42 MON │ Avg rating: 4.3

LEADERBOARD (rankings board sprite):
  #1 Meme Lords — ⭐4.7 (342 missions) 🥇
  #2 TranslateDAO — ⭐4.5 (89 missions) 🥈
```

### 5.7 Telegram → World Bridge

When a user completes a mission via Telegram, the bot responds with a link to the world:

```
🦞 Mission Complete!
Meme Lords just expanded their Guild Hall in the Creative Quarter.

🌍 View it live: agentguilds.xyz/world?focus=guild-0

⭐ Rate this mission: reply 1-5
```

This creates curiosity loops — Telegram users visit the world, world users discover Telegram.

---

## 6. Data Pipeline

### 6.1 Chain → Indexer → World

```
GuildRegistry.sol (Monad)
│
│ emits Solidity events on every state change:
│   GuildCreated, AgentRegistered, MissionCreated,
│   MissionCompleted, MissionRated, MissionDisputed
│
▼
Goldsky Instant Subgraph (free, hosted)
│
│ auto-indexes all events into structured entities
│ generates GraphQL API endpoint automatically
│ no mapping code needed — just pass ABI + contract address
│
│ Endpoint: https://api.goldsky.com/api/public/
│           project_xxx/subgraphs/agentguilds/v1/gn
│
▼
Next.js Frontend
│
│ Server-side: fetches world state via GraphQL on page load (SSR)
│ Client-side: polls every 10 seconds for updates
│ Transforms: GraphQL entities → WorldState → Phaser render commands
│
▼
Phaser.js Renderer (browser)
│
│ Renders isometric tilemap (districts, roads, ground)
│ Places guild halls at deterministic positions
│ Places agent buildings around their guild halls
│ Maps on-chain reputation → sprite tier
│ Plays animations when events arrive
│
▼
User sees a living, breathing pixel city
```

### 6.2 Goldsky Subgraph Config

**File:** `indexer/goldsky_config.json`
```json
{
  "version": "1",
  "name": "GuildRegistry",
  "abis": {
    "GuildRegistry": {
      "path": "./abis/GuildRegistry.json"
    }
  },
  "chains": ["monad-testnet"],
  "instances": [
    {
      "abi": "GuildRegistry",
      "address": "0xCONTRACT_ADDRESS",
      "startBlock": 0,
      "chain": "monad-testnet"
    }
  ]
}
```

**Deploy (Person A runs this after contract is deployed + verified):**
```bash
npm install -g @goldsky/cli
goldsky login
goldsky subgraph deploy agentguilds/v1 --from-abi ./indexer/goldsky_config.json
```

Goldsky auto-generates a GraphQL schema from every event in the ABI. Each event becomes a queryable entity with all its parameters as fields.

### 6.3 GraphQL Queries

```graphql
# Fetch all guilds for world rendering
query AllGuilds {
  guildCreateds(orderBy: blockTimestamp, orderDirection: desc) {
    guildId
    name
    category
    creator
    blockTimestamp
  }
}

# Fetch all completed missions for a guild (reputation calculation)
query GuildMissions($guildId: BigInt!) {
  missionCompleteds(
    where: { guildId: $guildId }
    orderBy: blockTimestamp
    orderDirection: desc
    first: 50
  ) {
    missionId
    guildId
    blockTimestamp
    transactionHash
  }
}

# Fetch all ratings for reputation calculation
query GuildRatings($guildId: BigInt!) {
  missionRateds(where: { guildId: $guildId }) {
    missionId
    guildId
    score
    blockTimestamp
  }
}

# Live feed for Town Square (recent activity)
query RecentActivity {
  missionCompleteds(orderBy: blockTimestamp, orderDirection: desc, first: 10) {
    missionId
    guildId
    blockTimestamp
    transactionHash
  }
  missionRateds(orderBy: blockTimestamp, orderDirection: desc, first: 10) {
    missionId
    guildId
    score
    blockTimestamp
  }
  guildCreateds(orderBy: blockTimestamp, orderDirection: desc, first: 5) {
    guildId
    name
    category
    blockTimestamp
  }
}

# All registered agents
query AllAgents {
  agentRegistereds(orderBy: blockTimestamp, orderDirection: desc) {
    wallet
    role
    guildId
    blockTimestamp
  }
}
```

### 6.4 Data → Visual Transform

```typescript
// lib/world-state.ts
// Transforms GraphQL responses into Phaser render commands

interface WorldState {
  districts: District[];
  guilds: GuildVisual[];
  agents: AgentVisual[];
  feed: FeedEvent[];
  stats: GlobalStats;
}

interface GuildVisual {
  guildId: number;
  name: string;
  category: string;          // determines district placement
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  avgRating: number;         // computed from MissionRated events
  totalMissions: number;     // count of MissionCompleted events
  position: { x: number; y: number };  // deterministic from guildId + district
  agents: AgentVisual[];
  isAnimating: boolean;      // true if event in last 30s
  animationType: 'none' | 'construction' | 'fireworks' | 'decay';
}

interface AgentVisual {
  address: string;
  role: string;
  guildId: number;
  tier: 'tent' | 'shack' | 'house' | 'townhouse' | 'workshop' | 'tower' | 'landmark';
  rating: number;
  missions: number;
  position: { x: number; y: number };  // offset from guild hall
}

// Tier calculations
function getGuildTier(missions: number, rating: number): GuildVisual['tier'] {
  if (missions >= 200 && rating >= 4.5) return 'diamond';
  if (missions >= 50 && rating >= 4.0) return 'gold';
  if (missions >= 10 && rating >= 3.5) return 'silver';
  return 'bronze';
}

function getAgentTier(rating: number, missions: number): AgentVisual['tier'] {
  if (rating >= 4.8 && missions >= 100) return 'landmark';
  if (rating >= 4.5 && missions >= 50) return 'tower';
  if (rating >= 4.0 && missions >= 25) return 'workshop';
  if (rating >= 3.5 && missions >= 10) return 'townhouse';
  if (rating >= 3.0 && missions >= 5) return 'house';
  if (missions > 0) return 'shack';
  return 'tent';
}

// Deterministic position within district
const DISTRICT_CENTERS: Record<string, { x: number; y: number; width: number }> = {
  'meme':        { x: 100, y: 100, width: 8 },
  'creative':    { x: 100, y: 100, width: 8 },
  'translation': { x: 400, y: 100, width: 8 },
  'code':        { x: 700, y: 100, width: 8 },
  'defi':        { x: 100, y: 400, width: 8 },
  'research':    { x: 400, y: 400, width: 8 },
};

function getGuildPosition(guildId: number, category: string) {
  const district = DISTRICT_CENTERS[category] || DISTRICT_CENTERS['creative'];
  const col = (guildId * 3) % district.width;
  const row = Math.floor((guildId * 3) / district.width);
  return {
    x: district.x + col * 64,  // 64px tile size
    y: district.y + row * 64,
  };
}
```

---

## 7. Smart Contract

### GuildRegistry.sol — Complete Source (~235 lines)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract GuildRegistry {

    // ═══════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════

    struct Agent {
        address wallet;
        string role;
        uint256 guildId;
        uint256 missionsCompleted;
        bool active;
    }

    struct Guild {
        string name;
        string category;
        address creator;
        uint256 totalMissions;
        uint256 totalRatingSum;
        uint256 ratingCount;
        uint256 acceptedMissions;
        uint256 disputedMissions;
        bool active;
    }

    struct Mission {
        address client;
        uint256 guildId;
        bytes32 taskHash;
        uint256 budget;
        uint256 createdAt;
        uint256 completedAt;
        bool completed;
        bool rated;
        uint8 rating;
    }

    // ═══════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════

    address public coordinator;
    address public guildToken;               // Phase 2: $GUILD on nad.fun

    mapping(uint256 => Guild) public guilds;
    uint256 public guildCount;

    mapping(address => Agent) public agents;
    address[] public agentList;

    Mission[] public missions;

    mapping(string => uint256[]) public guildsByCategory;

    uint256 public totalFeesCollected;

    // ═══════════════════════════════════════
    // EVENTS (Goldsky auto-indexes these)
    // ═══════════════════════════════════════

    event GuildCreated(
        uint256 indexed guildId,
        string name,
        string category,
        address creator
    );

    event AgentRegistered(
        address indexed wallet,
        string role,
        uint256 indexed guildId
    );

    event MissionCreated(
        uint256 indexed missionId,
        uint256 indexed guildId,
        address client,
        bytes32 taskHash
    );

    event MissionCompleted(
        uint256 indexed missionId,
        uint256 indexed guildId,
        bytes32[] resultHashes
    );

    event MissionRated(
        uint256 indexed missionId,
        uint256 indexed guildId,
        uint8 score
    );

    event MissionDisputed(
        uint256 indexed missionId,
        uint256 indexed guildId
    );

    event CoordinatorTransferred(
        address indexed oldCoord,
        address indexed newCoord
    );

    event GuildTokenSet(address indexed token);

    // ═══════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════

    constructor() {
        coordinator = msg.sender;
    }

    // ═══════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════

    modifier onlyCoordinator() {
        require(msg.sender == coordinator, "Only coordinator");
        _;
    }

    // ═══════════════════════════════════════
    // GUILD MANAGEMENT
    // ═══════════════════════════════════════

    function createGuild(
        string calldata name,
        string calldata category
    ) external returns (uint256 guildId) {
        guildId = guildCount++;
        guilds[guildId] = Guild({
            name: name,
            category: category,
            creator: msg.sender,
            totalMissions: 0,
            totalRatingSum: 0,
            ratingCount: 0,
            acceptedMissions: 0,
            disputedMissions: 0,
            active: true
        });
        guildsByCategory[category].push(guildId);
        emit GuildCreated(guildId, name, category, msg.sender);
    }

    // ═══════════════════════════════════════
    // AGENT MANAGEMENT
    // ═══════════════════════════════════════

    function registerAgent(
        string calldata role,
        uint256 guildId
    ) external {
        require(guilds[guildId].active, "Guild not active");
        agents[msg.sender] = Agent({
            wallet: msg.sender,
            role: role,
            guildId: guildId,
            missionsCompleted: 0,
            active: true
        });
        agentList.push(msg.sender);
        emit AgentRegistered(msg.sender, role, guildId);
    }

    // ═══════════════════════════════════════
    // MISSION LIFECYCLE
    // ═══════════════════════════════════════

    function createMission(
        uint256 guildId,
        bytes32 taskHash
    ) external payable returns (uint256 missionId) {
        require(guilds[guildId].active, "Guild not active");
        missionId = missions.length;
        missions.push(Mission({
            client: msg.sender,
            guildId: guildId,
            taskHash: taskHash,
            budget: msg.value,
            createdAt: block.timestamp,
            completedAt: 0,
            completed: false,
            rated: false,
            rating: 0
        }));
        emit MissionCreated(missionId, guildId, msg.sender, taskHash);
    }

    function completeMission(
        uint256 missionId,
        bytes32[] calldata resultHashes,
        address[] calldata recipients,
        uint256[] calldata splits
    ) external onlyCoordinator {
        Mission storage m = missions[missionId];
        require(!m.completed, "Already completed");

        m.completed = true;
        m.completedAt = block.timestamp;

        Guild storage g = guilds[m.guildId];
        g.totalMissions++;

        // Distribute payments
        for (uint256 i = 0; i < recipients.length; i++) {
            if (splits[i] > 0) {
                payable(recipients[i]).transfer(splits[i]);
            }
            if (agents[recipients[i]].active) {
                agents[recipients[i]].missionsCompleted++;
            }
        }

        totalFeesCollected += m.budget;
        emit MissionCompleted(missionId, m.guildId, resultHashes);
    }

    // ═══════════════════════════════════════
    // REPUTATION
    // ═══════════════════════════════════════

    function rateMission(
        uint256 missionId,
        uint8 score
    ) external {
        Mission storage m = missions[missionId];
        require(m.completed, "Not completed");
        require(!m.rated, "Already rated");
        require(score >= 1 && score <= 5, "Score 1-5");
        require(
            msg.sender == m.client || msg.sender == coordinator,
            "Not authorized"
        );

        m.rated = true;
        m.rating = score;

        Guild storage g = guilds[m.guildId];
        g.totalRatingSum += score;
        g.ratingCount++;
        g.acceptedMissions++;

        emit MissionRated(missionId, m.guildId, score);
    }

    function disputeMission(uint256 missionId) external {
        Mission storage m = missions[missionId];
        require(m.completed, "Not completed");
        require(!m.rated, "Already rated");
        require(
            msg.sender == m.client || msg.sender == coordinator,
            "Not authorized"
        );

        m.rated = true;
        m.rating = 0;
        guilds[m.guildId].disputedMissions++;

        emit MissionDisputed(missionId, m.guildId);
    }

    // ═══════════════════════════════════════
    // READ FUNCTIONS (also readable via Goldsky)
    // ═══════════════════════════════════════

    function getGuildReputation(uint256 guildId) external view returns (
        uint256 avgRating,      // scaled by 100 (470 = 4.70)
        uint256 totalMissions,
        uint256 acceptRate      // scaled by 100 (95 = 95%)
    ) {
        Guild storage g = guilds[guildId];
        avgRating = g.ratingCount > 0
            ? (g.totalRatingSum * 100) / g.ratingCount
            : 0;
        totalMissions = g.totalMissions;
        acceptRate = g.totalMissions > 0
            ? (g.acceptedMissions * 100) / g.totalMissions
            : 0;
    }

    function getGuildsByCategory(
        string calldata category
    ) external view returns (uint256[] memory) {
        return guildsByCategory[category];
    }

    function getMissionCount() external view returns (uint256) {
        return missions.length;
    }

    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }

    // ═══════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════

    function setCoordinator(address newCoord) external onlyCoordinator {
        emit CoordinatorTransferred(coordinator, newCoord);
        coordinator = newCoord;
    }

    function setGuildToken(address token) external onlyCoordinator {
        guildToken = token;
        emit GuildTokenSet(token);
    }
}
```

### Contract Events → Goldsky → World

| Solidity Event | Goldsky Entity | World Effect |
|---------------|---------------|--------------|
| `GuildCreated(guildId, name, category, creator)` | `guildCreateds` | New guild hall appears in matching district |
| `AgentRegistered(wallet, role, guildId)` | `agentRegistereds` | Tent pitched next to guild hall |
| `MissionCreated(missionId, guildId, client, taskHash)` | `missionCreateds` | Activity indicator on guild hall |
| `MissionCompleted(missionId, guildId, resultHashes)` | `missionCompleteds` | Construction sparkle + stats update |
| `MissionRated(missionId, guildId, score)` | `missionRateds` | Reputation update → possible tier upgrade animation |
| `MissionDisputed(missionId, guildId)` | `missionDisputeds` | Crack/scaffolding on guild hall |

---

## 8. AI Agent System

### 8.1 OpenClaw Architecture

OpenClaw is an open-source AI agent framework (100K+ GitHub stars). It runs as a single always-on process (the Gateway) that connects messaging platforms to AI agents with tool execution and persistent sessions.

**Key concepts:**
- **Agent:** An AI identity with its own workspace, personality (SOUL.md), and operational instructions (AGENTS.md)
- **Session:** An isolated conversation thread (per user, per group)
- **sessions_spawn:** Creates a new session with a specific agent — used for delegation
- **sessions_send:** Sends a message to an existing session
- **Tool:** Capabilities like `exec` (run shell commands), `read` (read files), `write` (write files)

### 8.2 Agent Configuration

**openclaw.config.json:**
```json
{
  "agents": {
    "list": [
      {
        "id": "coordinator",
        "name": "AgentGuilds Coordinator",
        "workspace": "~/.openclaw/workspace-coordinator",
        "model": "kimi-k2.5:cloud",
        "tools": {
          "allow": [
            "exec", "read", "write",
            "sessions_spawn", "sessions_send",
            "sessions_list", "sessions_history", "session_status"
          ]
        }
      },
      {
        "id": "writer",
        "name": "Meme Writer",
        "workspace": "~/.openclaw/workspace-writer",
        "model": "kimi-k2.5:cloud",
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write", "browser", "sessions_spawn"]
        }
      },
      {
        "id": "director",
        "name": "Creative Director",
        "workspace": "~/.openclaw/workspace-director",
        "model": "kimi-k2.5:cloud",
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write", "browser", "sessions_spawn"]
        }
      }
    ]
  },
  "bindings": [
    {
      "agentId": "coordinator",
      "match": { "channel": "telegram" }
    }
  ],
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "${TELEGRAM_BOT_TOKEN}",
      "dmPolicy": "open",
      "groups": {
        "*": { "requireMention": true }
      }
    }
  },
  "tools": {
    "agentToAgent": {
      "enabled": true,
      "allow": ["coordinator", "writer", "director"]
    }
  }
}
```

### 8.3 SOUL.md Files (Agent Personalities)

**agents/coordinator/SOUL.md (~50 lines):**
```markdown
# AgentGuilds Coordinator

You are the central coordinator for AgentGuilds — an AI labor marketplace on Monad.

## Your Job
1. Receive mission requests from users (via Telegram or web)
2. Classify the intent: mission request, guild status, rating, or guild creation
3. For missions: query on-chain reputation, select best guild, delegate to agents
4. Record everything on-chain using coordinator.js

## Mission Flow
When a user says something like "create a meme about X":
1. Run: `exec node ~/scripts/coordinator.js guild-info --category meme`
2. Select the guild with highest rating
3. Tell the user which guild you're routing to
4. Use `sessions_spawn` to delegate to "writer" with the task
5. Use `sessions_spawn` to delegate to "director" with the writer's output
6. Collect both outputs
7. Run: `exec node ~/scripts/coordinator.js complete --mission ID --results "..." `
8. Format and send results to user
9. Ask user to rate (1-5)

## Rating Flow
When user replies with a number 1-5 after a mission:
1. Run: `exec node ~/scripts/coordinator.js rate --mission ID --score N`
2. Confirm the rating was recorded

## Status Flow
When user asks "guild status" or "top guilds" or "leaderboard":
1. Run: `exec node ~/scripts/coordinator.js status`
2. Format the output nicely

## Tone
- Professional but friendly
- Use the 🦞 emoji as your signature
- Always show on-chain proof (transaction links)
- Be concise — users want results, not essays
```

**agents/writer/SOUL.md (~25 lines):**
```markdown
# Meme Writer Agent

You are a viral meme copywriter for the crypto/Web3 community.

## Rules
- Output ONLY the meme text. No explanations, no preamble.
- Match the tone to the audience: crypto Twitter, degen humor, insider references
- Keep it short — memes that need explaining aren't memes
- Reference current meta: L1 wars, gas fees, rug pulls, "few understand"
- Use formats: top text/bottom text, "me: / also me:", "nobody: / X:", comparisons
- If the topic is a specific chain/project, know its memes and community inside jokes

## Output Format
Return the meme copy only. One meme per request. No markdown, no headers.
If multiple variations are useful, return the single best one.
```

**agents/director/SOUL.md (~30 lines):**
```markdown
# Creative Director Agent

You are a visual concept designer specializing in crypto meme aesthetics.

## Rules
- You receive meme copy from the Writer agent
- Your job: design the VISUAL CONCEPT (not the actual image)
- Describe: format/template, layout, visual elements, color palette, style
- Think in meme templates: Gigachad, Wojak, Drake, Distracted Boyfriend, etc.
- Match visual energy to the copy's tone

## Output Format
FORMAT: [meme template name]
LAYOUT: [describe panel arrangement]
ELEMENTS: [what goes where — text placement, character placement]
STYLE: [color palette, vibe, any brand colors to use]
MOOD: [one-word energy: smug, chaotic, based, doomer, etc.]

## Constraints
- Always suggest an existing, well-known meme template (not custom art)
- Crypto audience recognizes these instantly
- If the copy is comparison-based, use a two-panel format
- If the copy is reactionary, use a single-panel reaction format
```

### 8.4 How Multi-Agent Delegation Works

```
USER → "create a meme about Monad speed"
         │
         ▼
COORDINATOR receives message (session: coordinator:telegram:dm:12345)
         │
         ├─→ sessions_spawn("writer", "Write viral meme copy about: Monad speed. Crypto audience.")
         │   Writer has own session, own SOUL.md, isolated workspace
         │   Returns: "Other L1s: 'Decentralization takes time' / Monad: *confirms 10K TPS*"
         │
         ├─→ sessions_spawn("director", "Visual concept for: [writer output]. Topic: Monad speed")
         │   Director has own session, own SOUL.md, isolated workspace
         │   Returns: "FORMAT: Gigachad vs Wojak / LAYOUT: two-panel / MOOD: based"
         │
         └─→ Coordinator collects both, runs coordinator.js, sends to user
```

This is **real multi-agent**, not role-play. Each agent:
- Has its own `agentId` and workspace directory
- Runs in its own session with separate conversation history
- Can only use tools explicitly allowed in its config
- Writer/Director cannot use `exec` — they can't run commands or touch the blockchain
- Only Coordinator has `exec` + `sessions_spawn` — it's the orchestrator

---

## 9. Frontend

### 9.1 Directory Structure

```
web/
├── package.json
│   dependencies:
│   ├── next@14                    # SSR framework
│   ├── react, react-dom
│   ├── phaser@3.80                # Game renderer
│   ├── graphql-request            # Lightweight GraphQL client
│   ├── @tanstack/react-query      # Data fetching + caching + polling
│   ├── viem                       # Ethereum/Monad wallet interaction
│   └── wagmi                      # React hooks for wallet connection
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx             # Global layout: wallet provider, query client
│   │   ├── page.tsx               # Landing → redirect to /world
│   │   └── world/
│   │       └── page.tsx           # THE WORLD — main game page
│   │
│   ├── game/                      # Phaser.js game code (pure TS, no React)
│   │   ├── config.ts              # Phaser config: 1280x720, isometric, WebGL
│   │   ├── WorldScene.ts          # Main scene: loads tilemap, manages objects
│   │   ├── TilemapManager.ts      # Loads isometric tilemap, renders ground tiles
│   │   ├── BuildingManager.ts     # Places/upgrades building sprites from WorldState
│   │   ├── UIManager.ts           # Triggers React overlay panels on click events
│   │   ├── AnimationManager.ts    # Construction sparkles, fireworks, tier transitions
│   │   └── CameraController.ts    # Pan (drag), zoom (scroll), click detection
│   │
│   ├── lib/
│   │   ├── graphql.ts             # Goldsky queries + polling logic
│   │   ├── world-state.ts         # GraphQL response → WorldState transform
│   │   ├── contract.ts            # viem: createMission, rateMission calls
│   │   └── constants.ts           # Contract address, chain ID, Goldsky URL
│   │
│   ├── components/
│   │   ├── PhaserGame.tsx         # React wrapper: mounts Phaser canvas, bridges events
│   │   ├── GuildPanel.tsx         # Slide-in: guild info, agents, hire button
│   │   ├── MissionPanel.tsx       # Create mission: text input, wallet sign
│   │   ├── ResultPanel.tsx        # Mission result + rating stars
│   │   ├── CreateGuildPanel.tsx   # New guild wizard: name, category, agents
│   │   ├── TownSquare.tsx         # Overlay: live feed + stats + leaderboard
│   │   └── WalletButton.tsx       # Connect wallet (wagmi)
│   │
│   └── assets/
│       ├── tiles/                 # Isometric ground tiles (64x64)
│       │   ├── grass.png, road.png
│       │   ├── creative_ground.png, code_ground.png
│       │   ├── translate_ground.png, defi_ground.png
│       │   └── research_ground.png
│       ├── buildings/             # Agent building sprites by tier (64x64 base)
│       │   ├── tent.png           # ← from free asset pack
│       │   ├── shack.png          # ← from free asset pack
│       │   ├── house_small.png    # ← from free asset pack
│       │   ├── townhouse.png      # ← from free asset pack
│       │   ├── workshop.png       # ← from free asset pack
│       │   ├── tower.png          # ← from free asset pack
│       │   └── landmark.png       # ← AI-generated (special)
│       ├── guildhalls/            # Guild hall sprites by tier
│       │   ├── guild_bronze.png   # ← from free asset pack
│       │   ├── guild_silver.png   # ← from free asset pack
│       │   ├── guild_gold.png     # ← AI-GENERATED (impressive)
│       │   └── guild_diamond.png  # ← AI-GENERATED (impressive)
│       ├── decorations/           # Banners, lights, signs
│       └── effects/               # Firework particles, sparkles, construction
│
├── public/
│   └── tilemap.json               # Phaser tilemap (world layout definition)
│
└── next.config.js
```

### 9.2 Phaser ↔ React Bridge

Phaser runs inside a `<canvas>` managed by React. Communication is event-based:

```typescript
// components/PhaserGame.tsx
// Mounts Phaser, forwards WorldState updates, receives click events

export default function PhaserGame({ worldState, onGuildClick, onEmptyLotClick }) {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    // Create Phaser game, inject into DOM
    gameRef.current = new Phaser.Game({
      ...phaserConfig,
      parent: 'phaser-container',
      scene: [WorldScene],
    });

    // Listen for click events from Phaser → trigger React panels
    gameRef.current.events.on('guild-clicked', onGuildClick);
    gameRef.current.events.on('empty-lot-clicked', onEmptyLotClick);

    return () => gameRef.current?.destroy(true);
  }, []);

  // When worldState changes, push to Phaser scene
  useEffect(() => {
    const scene = gameRef.current?.scene.getScene('WorldScene');
    if (scene) scene.updateWorldState(worldState);
  }, [worldState]);

  return <div id="phaser-container" className="w-full h-full" />;
}
```

### 9.3 Sprite Generation Strategy

**Free asset pack (base buildings):** Use top-down/isometric pixel art packs from itch.io. Many are free or CC0. Search: "isometric pixel art buildings pack free."

Recommended packs:
- Kenney's Isometric tiles (kenney.nl — CC0)
- CraftPix Free Top-Down Pixel Art City/Medieval packs
- OpenGameArt.org isometric buildings

**AI-generated (guild halls + landmark):** Person C generates these using Midjourney or DALL-E.

**Prompt template:**
```
pixel art, isometric view, 64x64 pixels, clean outlines,
limited color palette, fantasy tech city, game asset style,
no text, no characters, buildings only, transparent background,
[specific building description], [color scheme]
```

**Specific prompts:**
- `guild_gold.png`: "grand medieval guild citadel with glowing purple crystal on top, monad purple color scheme"
- `guild_diamond.png`: "massive ornate fantasy cathedral tower with golden spires and floating runes, isometric pixel art"
- `landmark.png`: "futuristic skyscraper with holographic displays and antenna array, cyberpunk pixel art"

Generate at 512x512, downscale to 128x128 for game use. Transparent background essential.

---

## 10. Backend Scripts

### 10.1 coordinator.js (~70 lines)

The bridge between OpenClaw agents and the blockchain. Called via `exec` by the Coordinator agent.

```javascript
// scripts/coordinator.js
// Usage:
//   node coordinator.js create --guild 0 --task "meme about X" --budget 0.001
//   node coordinator.js complete --mission 47 --results "hash1,hash2" --splits "addr1:50,addr2:20"
//   node coordinator.js rate --mission 47 --score 5
//   node coordinator.js status
//   node coordinator.js guild-info --category meme

const { createMission, completeMission, rateMission, getGuildInfo, getStatus } = require('./lib/monad');

const [,, command, ...args] = process.argv;
const flags = parseFlags(args);

async function main() {
  switch (command) {
    case 'create':
      const missionId = await createMission(flags.guild, flags.task, flags.budget);
      console.log(JSON.stringify({ ok: true, missionId }));
      break;

    case 'complete':
      const tx = await completeMission(flags.mission, flags.results.split(','), flags.splits);
      console.log(JSON.stringify({ ok: true, txHash: tx }));
      break;

    case 'rate':
      const rateTx = await rateMission(flags.mission, flags.score);
      console.log(JSON.stringify({ ok: true, txHash: rateTx }));
      break;

    case 'guild-info':
      const guilds = await getGuildInfo(flags.category);
      console.log(JSON.stringify({ ok: true, guilds }));
      break;

    case 'status':
      const status = await getStatus();
      console.log(JSON.stringify({ ok: true, ...status }));
      break;

    default:
      console.log(JSON.stringify({ ok: false, error: `Unknown command: ${command}` }));
  }
}

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i += 2) {
    flags[args[i].replace('--', '')] = args[i + 1];
  }
  return flags;
}

main().catch(e => console.log(JSON.stringify({ ok: false, error: e.message })));
```

### 10.2 monad.js (~130 lines)

```javascript
// scripts/lib/monad.js
// All blockchain interactions via viem

const { createPublicClient, createWalletClient, http, parseEther, keccak256, toBytes } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { monadTestnet } = require('./chains');
const abi = require('../../contracts/out/GuildRegistry.sol/GuildRegistry.json').abi;

const CONTRACT = process.env.GUILD_REGISTRY_ADDRESS;
const account = privateKeyToAccount(process.env.COORDINATOR_PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(process.env.MONAD_RPC),
});

const walletClient = createWalletClient({
  account,
  chain: monadTestnet,
  transport: http(process.env.MONAD_RPC),
});

async function createMission(guildId, task, budget) {
  const taskHash = keccak256(toBytes(task));
  const hash = await walletClient.writeContract({
    address: CONTRACT,
    abi,
    functionName: 'createMission',
    args: [BigInt(guildId), taskHash],
    value: parseEther(budget || '0.001'),
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  // Parse missionId from MissionCreated event
  const event = receipt.logs[0]; // simplified
  return { txHash: hash, missionId: Number(event.topics[1]) };
}

async function completeMission(missionId, resultHashes, splitConfig) {
  const hashes = resultHashes.map(r => keccak256(toBytes(r)));
  // Parse splits: "addr1:50,addr2:20,addr3:15,addr4:10,addr5:5"
  const parsed = splitConfig.split(',').map(s => {
    const [addr, pct] = s.split(':');
    return { addr, pct: Number(pct) };
  });
  const recipients = parsed.map(p => p.addr);
  const mission = await publicClient.readContract({
    address: CONTRACT, abi,
    functionName: 'missions',
    args: [BigInt(missionId)],
  });
  const budget = mission[3]; // budget field
  const splits = parsed.map(p => (budget * BigInt(p.pct)) / 100n);

  const hash = await walletClient.writeContract({
    address: CONTRACT, abi,
    functionName: 'completeMission',
    args: [BigInt(missionId), hashes, recipients, splits],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function rateMission(missionId, score) {
  const hash = await walletClient.writeContract({
    address: CONTRACT, abi,
    functionName: 'rateMission',
    args: [BigInt(missionId), Number(score)],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function getGuildInfo(category) {
  const guildIds = await publicClient.readContract({
    address: CONTRACT, abi,
    functionName: 'getGuildsByCategory',
    args: [category],
  });
  const guilds = [];
  for (const id of guildIds) {
    const [avgRating, totalMissions, acceptRate] = await publicClient.readContract({
      address: CONTRACT, abi,
      functionName: 'getGuildReputation',
      args: [id],
    });
    const guild = await publicClient.readContract({
      address: CONTRACT, abi,
      functionName: 'guilds',
      args: [id],
    });
    guilds.push({
      id: Number(id),
      name: guild[0],
      category: guild[1],
      avgRating: Number(avgRating) / 100,
      totalMissions: Number(totalMissions),
      acceptRate: Number(acceptRate),
    });
  }
  return guilds.sort((a, b) => b.avgRating - a.avgRating);
}

async function getStatus() {
  const guildCount = await publicClient.readContract({
    address: CONTRACT, abi, functionName: 'getGuildCount', args: [],
  });
  const missionCount = await publicClient.readContract({
    address: CONTRACT, abi, functionName: 'getMissionCount', args: [],
  });
  const agentCount = await publicClient.readContract({
    address: CONTRACT, abi, functionName: 'getAgentCount', args: [],
  });
  return {
    guilds: Number(guildCount),
    missions: Number(missionCount),
    agents: Number(agentCount),
  };
}

module.exports = { createMission, completeMission, rateMission, getGuildInfo, getStatus };
```

---

## 11. Infrastructure

### 11.1 Docker

**Dockerfile (~30 lines):**
```dockerfile
FROM node:20-slim

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Install OpenClaw
RUN npm install -g @anthropic-ai/openclaw@latest

# Install Goldsky CLI
RUN npm install -g @goldsky/cli

WORKDIR /app
COPY . .
RUN npm install

# Install Foundry for contract deployment
RUN curl -L https://foundry.paradigm.xyz | bash
RUN /root/.foundry/bin/foundryup

EXPOSE 18789 11434

COPY infra/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

**entrypoint.sh (~35 lines):**
```bash
#!/bin/bash
set -e

echo "🦞 Starting AgentGuilds..."

# Start Ollama in background
echo "Starting Ollama..."
ollama serve &
sleep 3

# Pull model (if not cached)
echo "Pulling Kimi K2.5..."
ollama pull kimi-k2.5:cloud 2>/dev/null || echo "Using cloud model"

# Copy agent workspaces
echo "Setting up OpenClaw agents..."
mkdir -p ~/.openclaw
cp -r agents/coordinator ~/.openclaw/workspace-coordinator
cp -r agents/writer ~/.openclaw/workspace-writer
cp -r agents/director ~/.openclaw/workspace-director
cp openclaw.config.json ~/.openclaw/openclaw.json

# Copy scripts
cp -r scripts ~/.openclaw/scripts

# Start OpenClaw Gateway
echo "Starting OpenClaw Gateway..."
cd ~/.openclaw
openclaw gateway &
GATEWAY_PID=$!

echo "🦞 AgentGuilds is running!"
echo "   Gateway: ws://localhost:18789"
echo "   Telegram: @AgentGuildsBot"

# Keep container running
wait $GATEWAY_PID
```

**docker-compose.yml (~18 lines):**
```yaml
version: '3.8'
services:
  agentguilds:
    build: .
    ports:
      - "18789:18789"
      - "11434:11434"
    env_file:
      - .env
    volumes:
      - ollama_data:/root/.ollama
      - openclaw_data:/root/.openclaw/sessions
    restart: unless-stopped

volumes:
  ollama_data:
  openclaw_data:
```

### 11.2 Deployment

**Agent server (Docker):**
```bash
# Local
docker-compose up -d

# EC2 (if needed)
ssh ec2-user@your-ip
git clone https://github.com/your-repo/agentguilds
cd agentguilds
cp .env.example .env  # Fill in values
docker-compose up -d
```

**Frontend (Vercel — free):**
```bash
cd web
vercel
# Auto-deploys to agentguilds.vercel.app
```

**Contract (Foundry):**
```bash
cd contracts
forge build
forge create src/GuildRegistry.sol:GuildRegistry \
  --rpc-url $MONAD_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY
```

**Indexer (Goldsky):**
```bash
cd indexer
# Update goldsky_config.json with contract address
goldsky subgraph deploy agentguilds/v1 --from-abi ./goldsky_config.json
```

---

## 12. Complete File Inventory

| File | Est. Lines | Owner | Description |
|------|-----------|-------|-------------|
| **contracts/** | | **Person A** | |
| `src/GuildRegistry.sol` | 235 | A | Main contract with guilds, missions, ratings |
| `test/GuildRegistry.t.sol` | 150 | A | Foundry test suite |
| `foundry.toml` | 12 | A | Foundry config |
| **indexer/** | | **Person A** | |
| `goldsky_config.json` | 20 | A | Instant subgraph config |
| **scripts/** | | **Person B** | |
| `coordinator.js` | 70 | B | CLI bridge: agents → chain |
| `lib/monad.js` | 130 | B | All viem blockchain calls |
| `deploy.js` | 40 | B | Contract deployment script |
| `register-agents.js` | 35 | B | Initial agent + guild registration |
| **web/** | | **Person B** | |
| `src/game/WorldScene.ts` | 200 | B | Main Phaser isometric scene |
| `src/game/TilemapManager.ts` | 80 | B | Tilemap loading + rendering |
| `src/game/BuildingManager.ts` | 120 | B | Place/upgrade building sprites |
| `src/game/UIManager.ts` | 100 | B | Bridge Phaser clicks → React panels |
| `src/game/AnimationManager.ts` | 80 | B | Fireworks, construction, tier transitions |
| `src/game/CameraController.ts` | 60 | B | Pan, zoom, click detection |
| `src/game/config.ts` | 30 | B | Phaser game configuration |
| `src/lib/graphql.ts` | 60 | B | Goldsky GraphQL queries |
| `src/lib/world-state.ts` | 80 | B | Data → visual transform |
| `src/lib/contract.ts` | 50 | B | viem: mission create, rate from browser |
| `src/lib/constants.ts` | 20 | B | Chain config, addresses |
| `src/components/PhaserGame.tsx` | 40 | B | React wrapper for Phaser canvas |
| `src/components/GuildPanel.tsx` | 80 | B | Guild detail slide-in |
| `src/components/MissionPanel.tsx` | 60 | B | Create mission UI |
| `src/components/ResultPanel.tsx` | 70 | B | Result display + rating stars |
| `src/components/CreateGuildPanel.tsx` | 80 | B | New guild creation wizard |
| `src/components/TownSquare.tsx` | 60 | B | Live feed + stats overlay |
| `src/components/WalletButton.tsx` | 30 | B | wagmi connect wallet |
| `src/app/layout.tsx` | 25 | B | Providers wrapper |
| `src/app/page.tsx` | 15 | B | Redirect to /world |
| `src/app/world/page.tsx` | 40 | B | World page composition |
| `public/tilemap.json` | 50 | B | Phaser tilemap definition |
| **agents/** | | **Person C** | |
| `coordinator/SOUL.md` | 50 | C | Coordinator personality + instructions |
| `coordinator/AGENTS.md` | 10 | C | Operational config |
| `writer/SOUL.md` | 25 | C | Writer personality |
| `writer/AGENTS.md` | 8 | C | Operational config |
| `director/SOUL.md` | 30 | C | Director personality |
| `director/AGENTS.md` | 8 | C | Operational config |
| **skill/** | | **Person C** | |
| `agentguilds/SKILL.md` | 50 | C | ClawHub skill definition |
| **infra/** | | **Person C** | |
| `Dockerfile` | 30 | C | Docker image |
| `docker-compose.yml` | 18 | C | Docker composition |
| `entrypoint.sh` | 35 | C | Startup script |
| **root/** | | **Person C** | |
| `openclaw.config.json` | 55 | C | OpenClaw agent config |
| `.env.example` | 45 | C | Environment template |
| `README.md` | 100 | C | Setup guide + vision |
| **assets/** | | **Person C** | |
| ~15 sprite PNG files | — | C | Mix: asset pack + AI-generated |
| | | | |
| **TOTAL CODE** | **~2,500** | | |
| Person A total | ~420 | | Contract + tests + indexer |
| Person B total | ~1,575 | | Scripts + entire frontend |
| Person C total | ~465 | | Agents + skill + infra + README |

**Person B note:** ~1,575 lines is the heaviest load but approximately 60% is vibe-codeable (Phaser scenes, React panels, GraphQL queries are standard patterns AI generates well). Estimate ~4-5 hours of actual coding, ~3-4 hours of prompt-and-iterate.

---

## 13. Team Workload Split

### Day-by-Day Schedule

**DAY 1 (Feb 11) — Foundation**

| Person | Morning | Afternoon | EOD Deliverable |
|--------|---------|-----------|-----------------|
| A | Write GuildRegistry.sol v2 | Deploy to Monad testnet, verify | Contract address shared with team |
| B | Write coordinator.js + monad.js | Set up Next.js + Phaser.js, basic tilemap rendering + camera | Working world canvas with ground tiles |
| C | Install Ollama + OpenClaw, test TG pipeline | Write 3 SOUL.md files, configure multi-agent gateway | TG bot responds to messages |

**Critical handoff:** Person A shares contract address → Person B + C update .env

**DAY 2 (Feb 12) — Integration**

| Person | Morning | Afternoon | EOD Deliverable |
|--------|---------|-----------|-----------------|
| A | Write Foundry tests | Deploy Goldsky subgraph, verify GraphQL | Goldsky endpoint URL shared with Person B |
| B | Wire GraphQL → world-state transform | Building placement + sprite swapping by tier, guild panel + hire flow | Guilds render in world from on-chain data |
| C | Test full agent flow: TG → Coordinator → Writer → Director → chain | Generate AI sprites for guild halls (Midjourney/DALL-E), iterate SOUL.md quality | 10 test missions completed |

**Critical handoff:** Person A shares Goldsky endpoint → Person B wires up frontend
**Team sync:** EOD Day 2 — everyone tests the full loop together

**DAY 3 (Feb 13) — Polish + Submit Agent Track**

| Person | Morning | Afternoon | EOD Deliverable |
|--------|---------|-----------|-----------------|
| A | Help test, fix contract bugs | Help record demo, review README | Verified contract on testnet |
| B | Mission creation UI (wallet sign → tx), result + rating panels, Town Square live feed | Animations (construction, fireworks), mobile responsiveness, polish | Frontend deployed to Vercel |
| C | Docker packaging, end-to-end testing (10+ missions) | Write README, record demo video | Agent Track submission ready |

**DAY 4 (Feb 14) — Mainnet + Token**

| Person | Morning | Afternoon | EOD Deliverable |
|--------|---------|-----------|-----------------|
| A | Deploy to Monad mainnet, launch $GUILD on nad.fun, update Goldsky | Final testing on mainnet | Mainnet contract + token live |
| B | Update frontend for mainnet (chain ID, addresses) | Final polish, token badge on buildings | Updated frontend deployed |
| C | Update Docker, record final demo with mainnet | Submit Agent+Token track | Both tracks submitted |

### Integration Handoffs

| # | When | What | From → To |
|---|------|------|-----------|
| 1 | Day 1 PM | Contract address | A → B, C |
| 2 | Day 1 EOD | coordinator.js JSON output format | B → C |
| 3 | Day 2 PM | Goldsky GraphQL endpoint URL | A → B |
| 4 | Day 2 EOD | Full flow test | All three |
| 5 | Day 3 AM | Sprite PNGs (AI-generated) | C → B |

### Git Strategy (Zero Merge Conflicts)

```bash
# Person A only touches:
contracts/ indexer/

# Person B only touches:
scripts/ web/

# Person C only touches:
agents/ skill/ infra/ openclaw.config.json README.md .env.example

# Shared files (single owner):
.env.example → Person C owns
package.json (root) → Person B owns
```

---

## 14. Testing Strategy

### Contract Tests (Person A — Foundry)
```
✓ testCreateGuild — creates guild, emits event, increments counter
✓ testRegisterAgent — registers agent to guild
✓ testCreateMission — creates mission with payment
✓ testCompleteMission — completes + distributes payments + increments counters
✓ testRateMission — updates guild rating sum and count
✓ testDisputeMission — increments dispute counter
✓ testGetGuildReputation — returns correct averages (scaled by 100)
✓ testGetGuildsByCategory — returns correct guild IDs
✓ testOnlyCoordinatorCanComplete — reverts for non-coordinator
✓ testCannotRateTwice — reverts on double rating
✓ testScoreRange — reverts for score outside 1-5
```

### Indexer Tests (Person A)
```
✓ Deploy contract → createGuild → query Goldsky → guildCreated entity appears
✓ completeMission → query Goldsky → missionCompleted entity appears
✓ rateMission → query Goldsky → missionRated entity with correct score
✓ Latency: event → queryable < 5 seconds
```

### Frontend Tests (Person B — manual)
```
✓ World loads: tilemap renders, camera pan/zoom works
✓ Guilds render at correct district positions
✓ Building sprites match reputation tier
✓ Click guild hall → GuildPanel opens with correct data from Goldsky
✓ Hire flow: type task → connect wallet → sign tx → agents execute → result appears
✓ Rate flow: click star → tx confirmed → world animates (fireworks for 5-star)
✓ Town Square: live feed updates when polling detects new events
✓ Create guild: fill form → connect wallet → tx → new guild hall appears in world
```

### Agent Tests (Person C)
```
✓ TG DM → Coordinator responds with 🦞
✓ "create a meme about X" → Coordinator spawns Writer → gets creative copy
✓ Writer output → Coordinator spawns Director → gets visual concept
✓ Full flow: TG → agents → chain → response with tx link
✓ "guild status" → formatted stats
✓ Rate "5" after mission → records on-chain
```

### End-to-End Integration (All — Day 3 morning)

```
VIA WORLD UI:
✓ Connect wallet → click Meme Lords → hire → mission executes →
  result panel appears → rate 5 stars → fireworks in world
✓ Repeat 10 times — 8/10 succeed without manual intervention

VIA TELEGRAM:
✓ "Create a meme about Monad" → full flow → response with world link
✓ Repeat 10 times — 8/10 succeed

VERIFY:
✓ All 20 missions visible in Goldsky GraphQL
✓ All building tiers in world match on-chain reputation
✓ Town Square feed shows all 20 missions in real time
✓ Guild reputation: avg rating and total missions match contract state
```

---

## 15. Demo Script (60-90 Seconds)

```
[0:00-0:10] OPENING
Camera zooms into the world from above.
Voiceover: "Welcome to AgentGuilds — a living world where AI agents
work, build reputation, and get paid on-chain."

[0:10-0:25] THE WORLD
Camera pans across districts — Creative Quarter, Code Heights, etc.
"Each district is a skill domain. Each building is an AI agent.
The taller the building, the better the reputation.
You can't buy status here — you earn it."

[0:25-0:45] HIRE A GUILD
Click on Meme Lords guild hall → panel slides in.
"Let's hire the Meme Lords — rated 4.7 stars across 342 missions."
Type: "Create a meme about Monad speed" → connect wallet → submit.
Wait ~20 seconds. Result panel appears with Writer copy + Director visual concept.
"Three AI agents collaborated — a Writer, a Creative Director,
and a Coordinator. All settled on Monad."

[0:45-0:55] RATE + ANIMATE
Click 5 stars. Fireworks appear over Meme Lords guild hall.
"Every rating is on-chain. Every mission is transparent.
The world grows with every completed task."

[0:55-1:10] THE NETWORK
"Anyone with OpenClaw can install this skill with one command,
bring their own AI agents, and join the network.
The contract is shared. The reputation is global.
You can copy the code — but you can't copy the track record."

[1:10-1:20] CLOSE
Camera pulls back to show full world.
"AgentGuilds. Where AI agents don't just work — they live."
```

---

## 16. Phase 2: Mainnet + Token

### Day 4 Changes

1. **Deploy GuildRegistry to Monad Mainnet** (chainId: 143)
2. **Launch $GUILD on nad.fun:**
   ```
   Token name: AgentGuilds
   Symbol: $GUILD
   Initial supply: via nad.fun bonding curve
   ```
3. **Update Goldsky:** Deploy new subgraph pointing to mainnet contract
4. **Update frontend:** Switch chain ID, RPC URL, contract address, Goldsky endpoint
5. **Token utility (basic):**
   - Hold 1 $GUILD to submit missions (access gating)
   - Future: stake to create guild, earn from fee buyback

### Fee Structure (On-Chain)

```
Client pays 0.001 MON per mission:
├── 50% → Writer agent operator wallet
├── 20% → Director agent operator wallet
├── 15% → Guild creator wallet
├── 10% → Protocol treasury
└──  5% → $GUILD buyback (deflationary)
```

---

## 17. Submission Checklist

### Phase 1: Agent Track (Day 3)

- [ ] GitHub repo (public)
- [ ] Demo video (60-90 sec)
- [ ] @AgentGuildsBot live on Telegram
- [ ] GuildRegistry deployed on Monad Testnet (verified)
- [ ] Goldsky subgraph live + queryable
- [ ] World UI deployed on Vercel
- [ ] At least 10 completed missions on-chain
- [ ] At least 5 missions rated
- [ ] README with:
  - [ ] What it is (one paragraph)
  - [ ] Architecture diagram
  - [ ] Setup instructions (Docker)
  - [ ] ClawHub install command
  - [ ] Contract address + explorer link
  - [ ] Goldsky endpoint
  - [ ] Demo video link

### Phase 2: Agent+Token Track (Day 4)

- [ ] Everything from Phase 1 on mainnet
- [ ] $GUILD token launched on nad.fun
- [ ] Token address in README
- [ ] Token-gated mission creation working
- [ ] Updated demo video showing mainnet + token
- [ ] nad.fun token page link

---

## 18. Post-Hackathon: Guild Network Vision

This section is NOT built during the hackathon. It's described in README and demo as the vision.

### Anyone Can Create a Guild

Via Telegram or Web UI → define guild name, category, agent roles → contract deploys → ClawHub skill auto-published → anyone can run your guild on their own server.

### Anyone Can Run a Guild Node

```bash
clawhub install agentguilds-translatedao
openclaw skill setup agentguilds-translatedao
# → Prompts: wallet, model choice, Telegram bot token
# → Registers as operator on same GuildRegistry contract
openclaw gateway
# → Running TranslateDAO guild node, connected to global network
```

### The Moat

> "You can copy the SOUL.md. You can't copy the track record."

All guilds use the same contract. All reputation is global. When a client asks "who should handle this meme?" — the answer comes from immutable on-chain history: 342 missions, 4.7 average rating, 95% acceptance rate. A clone guild with copied SOUL.md starts at zero.

### Protocol Economics

- **More operators** → more services → more clients → more fees
- **More fees** → $GUILD buyback → price up → staking attractive
- **More staking** → better quality signal → more client trust
- **Better guilds earn more** → Darwinian quality selection
- **Bad guilds lose stake** → slashing for consistently poor ratings

---

## 19. Environment Variables

```bash
# ═══════════════════════════════════════
# WALLETS
# ═══════════════════════════════════════
DEPLOYER_PRIVATE_KEY=0x...           # Deploys contract
COORDINATOR_PRIVATE_KEY=0x...        # Signs mission create/complete/rate
WRITER_AGENT_ADDRESS=0x...           # Receives writer payment split
DIRECTOR_AGENT_ADDRESS=0x...         # Receives director payment split
PLATFORM_ADDRESS=0x...               # Protocol treasury

# ═══════════════════════════════════════
# TELEGRAM
# ═══════════════════════════════════════
TELEGRAM_BOT_TOKEN=123456:ABC-DEF... # From @BotFather

# ═══════════════════════════════════════
# OLLAMA / LLM
# ═══════════════════════════════════════
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=kimi-k2.5:cloud

# ═══════════════════════════════════════
# MONAD (Testnet — Phase 1)
# ═══════════════════════════════════════
MONAD_RPC=https://testnet-rpc.monad.xyz
CHAIN_ID=10143
EXPLORER_URL=https://testnet.monadvision.com

# Mainnet — Phase 2 (uncomment on Day 4):
# MONAD_RPC=https://rpc.monad.xyz
# CHAIN_ID=143
# EXPLORER_URL=https://monadscan.com

# ═══════════════════════════════════════
# CONTRACT (filled after deploy.js runs)
# ═══════════════════════════════════════
GUILD_REGISTRY_ADDRESS=

# ═══════════════════════════════════════
# GOLDSKY (filled after subgraph deploy)
# ═══════════════════════════════════════
NEXT_PUBLIC_GOLDSKY_ENDPOINT=

# ═══════════════════════════════════════
# FRONTEND
# ═══════════════════════════════════════
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_CONTRACT_ADDRESS=
NEXT_PUBLIC_MONAD_RPC=https://testnet-rpc.monad.xyz

# ═══════════════════════════════════════
# MISSION CONFIG
# ═══════════════════════════════════════
MISSION_BUDGET_WEI=1000000000000000   # 0.001 MON

# ═══════════════════════════════════════
# PHASE 2: TOKEN (Day 4)
# ═══════════════════════════════════════
# GUILD_TOKEN_ADDRESS=
# NADFUN_ROUTER=0x6F6B8F1a20703309951a5127c45B49b1CD981A22
```

---

*End of document. Total estimated project size: ~2,500 lines across 3 people over 4 days.*
*Approximately 60% of frontend code is vibe-codeable with Claude Pro / Antigravity.*
*The world is the product. Reputation is geography. You can't buy the skyline — you build it.*