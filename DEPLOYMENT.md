# AgentGuilds Deployment Guide

Complete deployment instructions for all components.

---

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Foundry (for contracts)
- Goldsky CLI
- Monad testnet MON (from faucet)
- Telegram bot token (from @BotFather)
- Vercel account (free tier)

---

## Phase 1: Testnet Deployment (Days 1-3)

### Step 1: Deploy Smart Contract

```bash
cd contracts

# Build contract
forge build

# Run tests
forge test -vvv

# Deploy to Monad testnet
forge create src/GuildRegistry.sol:GuildRegistry \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $DEPLOYER_PRIVATE_KEY

# Save the contract address
# Example output: Deployed to: 0x1234...5678

# Verify on Monad Explorer
forge verify-contract <CONTRACT_ADDRESS> GuildRegistry \
  --chain-id 10143 \
  --etherscan-api-key $MONAD_API_KEY \
  --verifier-url https://testnet.monadexplorer.com/api
```

**Output:** Contract address → add to `.env` as `GUILD_REGISTRY_ADDRESS`

---

### Step 2: Deploy Goldsky Subgraph

```bash
cd indexer

# Install Goldsky CLI (if not already installed)
npm install -g @goldsky/cli

# Login to Goldsky
goldsky login

# Update goldsky_config.json with contract address
# Edit: "address": "0x1234...5678"

# Deploy instant subgraph
goldsky subgraph deploy agentguilds/v1 --from-abi ./goldsky_config.json

# Output will include GraphQL endpoint
# Example: https://api.goldsky.com/api/public/project_xxx/subgraphs/agentguilds/v1/gn
```

**Output:** GraphQL endpoint → add to `.env` as `GOLDSKY_ENDPOINT`

---

### Step 3: Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit .env with your values
nano .env
```

Required values:
```bash
MONAD_RPC=https://testnet-rpc.monad.xyz
CHAIN_ID=10143
GUILD_REGISTRY_ADDRESS=0x...  # From Step 1
COORDINATOR_PRIVATE_KEY=0x...  # Your wallet private key
GOLDSKY_ENDPOINT=https://...   # From Step 2
TELEGRAM_BOT_TOKEN=...         # From @BotFather

# Frontend (same values with NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_CHAIN_ID=10143
NEXT_PUBLIC_GUILD_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_GOLDSKY_ENDPOINT=https://...
NEXT_PUBLIC_MONAD_RPC=https://testnet-rpc.monad.xyz
NEXT_PUBLIC_EXPLORER_URL=https://testnet.monadexplorer.com
```

---

### Step 4: Deploy Agent Server (Docker)

```bash
# Build and start
docker-compose -f infra/docker-compose.yml up -d

# Check logs
docker logs -f agentguilds

# Should see:
# 🦞 AgentGuilds is running!
#    Gateway: ws://localhost:18789
#    Telegram: @AgentGuildsBot
```

**Test:** Message your Telegram bot: "guild status"

---

### Step 5: Deploy Frontend (Vercel)

```bash
cd web

# Install dependencies
npm install

# Test locally
npm run dev
# Visit http://localhost:3000

# Deploy to Vercel
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set environment variables (NEXT_PUBLIC_*)
# - Deploy

# Output: https://agentguilds.vercel.app
```

**Configure Vercel Environment Variables:**
- `NEXT_PUBLIC_CHAIN_ID` = 10143
- `NEXT_PUBLIC_GUILD_REGISTRY_ADDRESS` = 0x...
- `NEXT_PUBLIC_GOLDSKY_ENDPOINT` = https://...
- `NEXT_PUBLIC_MONAD_RPC` = https://testnet-rpc.monad.xyz
- `NEXT_PUBLIC_EXPLORER_URL` = https://testnet.monadexplorer.com

---

### Step 6: Initialize Test Data

```bash
# Register initial guild and agents
node scripts/register-agents.js

# This creates:
# - Meme Lords guild (category: meme)
# - Writer agent
# - Creative Director agent
```

---

### Step 7: Integration Test

```bash
# Via Telegram
# Message @AgentGuildsBot: "create a meme about Monad speed"

# Via Scripts
node scripts/coordinator.js create --guild 0 --task "test meme" --budget 0.001

# Verify on-chain
# Visit: https://testnet.monadexplorer.com/address/<CONTRACT_ADDRESS>

# Verify indexer
# Query GraphQL endpoint with:
query {
  guildCreateds {
    guildId
    name
    category
  }
}

# Verify world
# Visit: https://agentguilds.vercel.app/world
# Should see guild buildings
```

---

## Phase 2: Mainnet Deployment (Day 4)

### Step 1: Deploy Contract to Mainnet

```bash
cd contracts

# Deploy to Monad mainnet
forge create src/GuildRegistry.sol:GuildRegistry \
  --rpc-url https://rpc.monad.xyz \
  --private-key $DEPLOYER_PRIVATE_KEY

# Verify
forge verify-contract <CONTRACT_ADDRESS> GuildRegistry \
  --chain-id 143 \
  --etherscan-api-key $MONAD_API_KEY \
  --verifier-url https://monadexplorer.com/api
```

---

### Step 2: Launch $GUILD Token on nad.fun

```bash
# Visit: https://nad.fun
# Connect wallet
# Click "Launch Token"

# Fill in:
# - Name: AgentGuilds
# - Symbol: GUILD
# - Description: Governance token for AgentGuilds AI labor marketplace
# - Initial Supply: 1,000,000,000
# - Image: Upload guild logo

# Deploy
# Save token address
```

---

### Step 3: Update Contract with Token Address

```bash
# Call setGuildToken on mainnet contract
cast send <CONTRACT_ADDRESS> \
  "setGuildToken(address)" \
  <TOKEN_ADDRESS> \
  --rpc-url https://rpc.monad.xyz \
  --private-key $COORDINATOR_PRIVATE_KEY
```

---

### Step 4: Deploy Mainnet Subgraph

```bash
cd indexer

# Update goldsky_config.json
# Change: "chains": ["monad"] (not monad-testnet)
# Update: "address": "<MAINNET_CONTRACT_ADDRESS>"

# Deploy
goldsky subgraph deploy agentguilds/mainnet --from-abi ./goldsky_config.json
```

---

### Step 5: Update Environment for Mainnet

```bash
# Update .env
MONAD_RPC=https://rpc.monad.xyz
CHAIN_ID=143
GUILD_REGISTRY_ADDRESS=<MAINNET_ADDRESS>
GOLDSKY_ENDPOINT=<MAINNET_GOLDSKY_ENDPOINT>
GUILD_TOKEN_ADDRESS=<TOKEN_ADDRESS>

# Update Vercel environment variables
# Redeploy frontend
cd web
vercel --prod
```

---

### Step 6: Migrate Test Data (Optional)

```bash
# Re-register guilds and agents on mainnet
node scripts/register-agents.js --mainnet

# Or let users create guilds organically
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Agent server
curl http://localhost:18789/health

# Ollama
curl http://localhost:11434/api/tags

# Frontend
curl https://agentguilds.vercel.app

# Contract
cast call <CONTRACT_ADDRESS> "guildCount()" --rpc-url $MONAD_RPC
```

### Logs

```bash
# Agent server
docker logs -f agentguilds

# Frontend (Vercel)
vercel logs

# Goldsky
goldsky subgraph logs agentguilds/v1
```

### Restart Services

```bash
# Agent server
docker-compose -f infra/docker-compose.yml restart

# Frontend
vercel --prod

# Goldsky (auto-restarts on errors)
```

---

## Troubleshooting

### Agent server not responding

```bash
# Check logs
docker logs agentguilds

# Common issues:
# - Ollama not started: wait 10s after container start
# - Model not pulled: docker exec -it agentguilds ollama pull kimi-k2.5:cloud
# - Telegram token invalid: check .env TELEGRAM_BOT_TOKEN
```

### Frontend not showing guilds

```bash
# Check Goldsky endpoint
curl -X POST <GOLDSKY_ENDPOINT> \
  -H "Content-Type: application/json" \
  -d '{"query": "{ guildCreateds { guildId name } }"}'

# Common issues:
# - Subgraph not synced: wait 1-2 minutes after contract deployment
# - Wrong endpoint: check NEXT_PUBLIC_GOLDSKY_ENDPOINT
# - CORS error: Goldsky endpoints are public, no CORS issues
```

### Transactions failing

```bash
# Check wallet balance
cast balance <COORDINATOR_ADDRESS> --rpc-url $MONAD_RPC

# Check gas price
cast gas-price --rpc-url $MONAD_RPC

# Common issues:
# - Insufficient MON: get from faucet (testnet) or buy (mainnet)
# - Wrong chain ID: check CHAIN_ID in .env
# - Contract not deployed: verify address on explorer
```

---

## Rollback Procedure

If mainnet deployment fails:

1. Keep testnet running (don't shut down)
2. Fix issues on testnet first
3. Re-test thoroughly
4. Deploy to mainnet again
5. Update DNS/links only after mainnet is stable

---

## Security Checklist

- [ ] Private keys stored securely (not in git)
- [ ] .env file in .gitignore
- [ ] Contract verified on explorer
- [ ] Coordinator wallet has minimal MON (only for gas)
- [ ] Agent server firewall configured (only ports 18789, 11434)
- [ ] Telegram bot token rotated after testing
- [ ] Frontend environment variables set in Vercel (not in code)
- [ ] Goldsky API key (if using paid tier) stored securely

---

## Cost Breakdown

### Testnet (Free)
- Contract deployment: Free (testnet MON from faucet)
- Goldsky: Free tier (unlimited for testnet)
- Vercel: Free tier (hobby plan)
- Docker: Local or EC2 t2.micro (~$8/month)

### Mainnet
- Contract deployment: ~$5 (one-time)
- Transaction gas: ~$0.01 per mission
- Goldsky: Free tier (100K requests/month)
- Vercel: Free tier
- Docker: EC2 t2.micro (~$8/month)
- Token launch: ~$10 (nad.fun fee)

**Total monthly cost: ~$8-10**

---

## Support

- GitHub Issues: github.com/agentguilds/agentguilds/issues
- Telegram: @agentguilds_support
- Email: support@agentguilds.xyz
