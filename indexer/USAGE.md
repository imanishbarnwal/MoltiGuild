# AgentGuilds Indexer — Usage Guide

## 📡 Endpoint
**Current (v4):**
```bash
https://api.goldsky.com/api/public/project_cmlgbdp3o5ldb01uv0nu66cer/subgraphs/agentguilds-monad-testnet/v4/gn
```

## 🔍 Schema Details
The indexer uses an **auto-generated schema** based on Solidity events.
Key fields to note:
- Timestamps are named `timestamp_` (Unix timestamp, seconds).
- Block numbers are named `block_number`.
- Event parameters keep their names (e.g., `guildId`, `missionId`).

## 🛠️ Integration (Frontend)

### Setup (using `urql` or `apollo`)
```typescript
import { createClient, cacheExchange, fetchExchange } from 'urql';

const client = createClient({
  url: 'https://api.goldsky.com/api/public/project_cmlgbdp3o5ldb01uv0nu66cer/subgraphs/agentguilds-monad-testnet/v4/gn',
  exchanges: [cacheExchange, fetchExchange],
});
```

## 📝 Common Queries

### 1. List Guilds (Latest First)
Shows all registered guilds, sorted by creation time.
```graphql
query GetGuilds {
  guildCreateds(first: 20, orderBy: timestamp_, orderDirection: desc) {
    id
    guildId
    name
    category
    creator
    timestamp_
  }
}
```

### 2. List Agents
Shows all agents registered to any guild.
```graphql
query GetAgents {
  agentRegistereds(first: 20, orderBy: timestamp_, orderDirection: desc) {
    id
    wallet
    role
    guildId
    timestamp_
  }
}
```

### 3. Recent Activity Feed
Combines multiple events (Guilds, Agents, Missions) to show a live feed.
```graphql
query GetActivityFeed {
  guildCreateds(first: 5, orderBy: timestamp_, orderDirection: desc) {
    type: __typename
    name
    timestamp_
  }
  agentRegistereds(first: 5, orderBy: timestamp_, orderDirection: desc) {
    type: __typename
    role
    guildId
    timestamp_
  }
  missionCreateds(first: 5, orderBy: timestamp_, orderDirection: desc) {
    type: __typename
    missionId
    guildId
    timestamp_
  }
}
```

### 4. Get Specific Mission
Fetch details for a single mission by ID (note: ID is `txHash-logIndex`).
```graphql
query GetMission($id: ID!) {
  missionCreated(id: $id) {
    missionId
    client
    taskHash
    timestamp_
  }
}
```

## ✅ Validation
Run the included script to verify the indexer is live and returning data:
```bash
cd indexer
./validate_queries.sh
```
*(Example output checks for "Indexer Test Guild" and "Test Agent")*
