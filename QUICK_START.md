# AgentGuilds Quick Start Guide

**Get up and running in 5 minutes.**

---

## 🚀 For Developers

### Prerequisites Check

```bash
node -v    # Need 20+
docker -v  # Need Docker
forge -v   # Need Foundry (for contracts)
```

### One-Command Setup

```bash
# Clone
git clone https://github.com/agentguilds/agentguilds
cd agentguilds

# Configure
cp .env.example .env
# Edit .env with your values (see below)

# Start everything
docker-compose -f infra/docker-compose.yml up -d
cd web && npm install && npm run dev
```

Visit: `http://localhost:3000`

---

## 🔑 Required Environment Variables

Minimum to get started:

```bash
# .env
MONAD_RPC=https://testnet-rpc.monad.xyz
CHAIN_ID=10143
GUILD_REGISTRY_ADDRESS=0x...  # Get from Person A
COORDINATOR_PRIVATE_KEY=0x...  # Your wallet
GOLDSKY_ENDPOINT=https://...   # Get from Person A
TELEGRAM_BOT_TOKEN=...         # Optional, from @BotFather
```

---

## 👥 For Team Members

### Person A (Blockchain)

**Your folders:**
- `contracts/` — Smart contracts
- `indexer/` — Goldsky config

**Your commands:**
```bash
# Build & test
cd contracts
forge build
forge test -vvv

# Deploy
forge create src/GuildRegistry.sol:GuildRegistry \
  --rpc-url $MONAD_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

# Deploy indexer
cd ../indexer
goldsky subgraph deploy agentguilds/v1 --from-abi ./goldsky_config.json
```

**Share with team:**
- Contract address
- Goldsky GraphQL endpoint

---

### Person B (Frontend + Scripts)

**Your folders:**
- `scripts/` — Backend scripts
- `web/` — Frontend

**Your commands:**
```bash
# Test scripts
node scripts/coordinator.js status

# Run frontend
cd web
npm install
npm run dev

# Deploy frontend
vercel
```

**Dependencies:**
- Contract address from Person A
- Goldsky endpoint from Person A

---

### Person C (DevOps + Agents)

**Your folders:**
- `agents/` — Agent configs
- `infra/` — Docker
- `assets/` — Sprites
- Root config files

**Your commands:**
```bash
# Test agents locally
openclaw gateway

# Build Docker
docker-compose -f infra/docker-compose.yml build

# Start Docker
docker-compose -f infra/docker-compose.yml up -d

# Check logs
docker logs -f agentguilds
```

**Generate sprites:**
- Use Midjourney/DALL-E
- See `assets/README.md` for prompts

---

## 🧪 Testing

### Quick Test (All)

```bash
# 1. Check contract
cast call $GUILD_REGISTRY_ADDRESS "guildCount()" --rpc-url $MONAD_RPC

# 2. Check indexer
curl -X POST $GOLDSKY_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{"query": "{ guildCreateds { guildId name } }"}'

# 3. Check agents
docker logs agentguilds | grep "AgentGuilds is running"

# 4. Check frontend
curl http://localhost:3000
```

### Full Integration Test

```bash
# Via Telegram
# Message @AgentGuildsBot: "create a meme about Monad"

# Via Scripts
node scripts/coordinator.js create --guild 0 --task "test" --budget 0.001

# Via Frontend
# Open http://localhost:3000/world
# Click guild → hire → submit mission
```

---

## 🐛 Common Issues

### "Contract not found"

```bash
# Check contract is deployed
cast code $GUILD_REGISTRY_ADDRESS --rpc-url $MONAD_RPC

# Should return bytecode, not 0x
```

### "Goldsky endpoint not responding"

```bash
# Check endpoint URL
echo $GOLDSKY_ENDPOINT

# Test query
curl -X POST $GOLDSKY_ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{"query": "{ _meta { block { number } } }"}'
```

### "Agent server not starting"

```bash
# Check logs
docker logs agentguilds

# Common fixes:
# - Wait 10s for Ollama to start
# - Check TELEGRAM_BOT_TOKEN is valid
# - Restart: docker-compose restart
```

### "Frontend shows no guilds"

```bash
# Check environment variables
cat web/.env.local

# Should have:
# NEXT_PUBLIC_GOLDSKY_ENDPOINT=...
# NEXT_PUBLIC_GUILD_REGISTRY_ADDRESS=...

# Restart dev server
cd web
npm run dev
```

---

## 📚 Documentation

- **Full README:** `README.md`
- **Deployment Guide:** `DEPLOYMENT.md`
- **Contributing:** `CONTRIBUTING.md`
- **TDD:** `TDD.md` (technical design document)

---

## 🔗 Useful Links

### Monad
- Testnet RPC: https://testnet-rpc.monad.xyz
- Mainnet RPC: https://rpc.monad.xyz
- Explorer: https://testnet.monadexplorer.com
- Faucet: https://faucet.monad.xyz

### Tools
- Goldsky: https://goldsky.com
- OpenClaw: https://github.com/anthropics/openclaw
- Foundry: https://book.getfoundry.sh
- Vercel: https://vercel.com

### Telegram
- BotFather: @BotFather (create bot)
- AgentGuilds Bot: @AgentGuildsBot (production)

---

## 💬 Communication

### Daily Sync (5 minutes)

**Person A:** Contract status, indexer status  
**Person B:** Frontend progress, blockers  
**Person C:** Agent quality, Docker status

### Critical Handoffs

1. **Day 1 PM:** Person A → Contract address → Person B, C
2. **Day 2 AM:** Person A → Goldsky endpoint → Person B
3. **Day 2 PM:** Person C → Sprites → Person B
4. **Day 3 AM:** All → Integration test together

---

## 🎯 Success Metrics

### Day 1 EOD
- [ ] Contract deployed to testnet
- [ ] Agents respond on Telegram
- [ ] Frontend shows empty world

### Day 2 EOD
- [ ] Goldsky indexing events
- [ ] Guilds render in world
- [ ] 10 test missions completed

### Day 3 EOD
- [ ] Full mission flow works end-to-end
- [ ] Demo video recorded
- [ ] Agent Track submitted

### Day 4 EOD
- [ ] Mainnet contract deployed
- [ ] $GUILD token launched
- [ ] Agent+Token Track submitted

---

## 🦞 Need Help?

- **GitHub Issues:** github.com/agentguilds/agentguilds/issues
- **Team Chat:** [Your team communication channel]
- **Emergency:** [Team lead contact]

---

**Let's build something amazing! 🚀**
