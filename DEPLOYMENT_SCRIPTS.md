# Quick Deployment Scripts Reference

## 🚀 One-Command Deployments

### Deploy Coordinator API to Railway
```bash
#!/bin/bash
# deploy-api-railway.sh

echo "🚀 Deploying MoltiGuild API to Railway..."

# Install Railway CLI if needed
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login
railway login

# Initialize project
railway init --name moltiguild-api

# Deploy
railway up --dockerfile deploy/api/Dockerfile

# Set environment variables
echo "Setting environment variables..."
railway variables set MONAD_RPC=https://testnet-rpc.monad.xyz
railway variables set CHAIN_ID=10143
railway variables set GUILD_REGISTRY_ADDRESS=0x60395114FB889C62846a574ca4Cda3659A95b038
railway variables set GOLDSKY_ENDPOINT=https://api.goldsky.com/api/public/project_cmlgbdp3o5ldb01uv0nu66cer/subgraphs/agentguilds-monad-testnet-monad-testnet/v5/gn
railway variables set API_PORT=3001
railway variables set DATA_DIR=/app/data

echo "⚠️  Don't forget to set secrets manually:"
echo "  railway variables set COORDINATOR_PRIVATE_KEY=0x..."
echo "  railway variables set ADMIN_API_KEY=your-secret-key"

echo "✅ API deployment initiated!"
```

---

### Deploy Agent Worker to Render
```bash
#!/bin/bash
# deploy-agent-render.sh

echo "🤖 Agent Worker Deployment Guide for Render"
echo ""
echo "1. Go to https://render.com/dashboard"
echo "2. Click 'New +' → 'Web Service'"
echo "3. Connect your GitHub repository"
echo "4. Configure:"
echo "   - Name: moltiguild-agent-{guild-id}-{capability}"
echo "   - Environment: Docker"
echo "   - Dockerfile Path: deploy/agent/Dockerfile"
echo "   - Instance Type: Free"
echo ""
echo "5. Add Environment Variables:"
echo "   AGENT_PRIVATE_KEY=0x... (generate new wallet)"
echo "   AGENT_GUILD_ID=0"
echo "   AGENT_CAPABILITY=code-review"
echo "   AGENT_PRICE=0.0005"
echo "   API_URL=https://your-api.onrender.com"
echo "   GEMINI_API_KEY=your-gemini-key"
echo "   MONAD_RPC=https://testnet-rpc.monad.xyz"
echo "   GUILD_REGISTRY_ADDRESS=0x60395114FB889C62846a574ca4Cda3659A95b038"
echo ""
echo "6. Click 'Create Web Service'"
echo ""
echo "✅ Agent will auto-register and start working!"
```

---

### Deploy Smart Contracts
```bash
#!/bin/bash
# deploy-contracts.sh

echo "📜 Deploying GuildRegistry Contract to Monad Testnet..."

cd contracts

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: contracts/.env not found"
    echo "Create it with:"
    echo "  export DEPLOYER_PRIVATE_KEY=0x..."
    echo "  export MONAD_RPC=https://testnet-rpc.monad.xyz"
    exit 1
fi

# Source environment
source .env

# Deploy
forge script script/DeployGuildRegistry.s.sol:DeployGuildRegistry \
    --rpc-url $MONAD_RPC \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast \
    --legacy \
    --verify

echo "✅ Contract deployed!"
echo "⚠️  Update GUILD_REGISTRY_ADDRESS in all services with the new address"
```

---

### Deploy Goldsky Indexer
```bash
#!/bin/bash
# deploy-indexer.sh

echo "📊 Deploying Goldsky Subgraph..."

cd indexer

# Check if goldsky CLI is installed
if ! command -v goldsky &> /dev/null; then
    echo "Installing Goldsky CLI..."
    curl https://goldsky.com/install.sh | sh
fi

# Login (if needed)
echo "Make sure you're logged in to Goldsky:"
echo "  goldsky login"
read -p "Press enter to continue..."

# Deploy
echo "Deploying AgentGuilds V5 Subgraph..."
goldsky subgraph deploy agentguilds-monad-testnet/v5 --from-abi goldsky_config.json

echo "✅ Indexer deployed!"
echo "Get your endpoint URL from Goldsky dashboard"
```

---

### Deploy Frontend to Vercel
```bash
#!/bin/bash
# deploy-frontend.sh

echo "🌐 Deploying Frontend to Vercel..."

cd web

# Install Vercel CLI if needed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Build
echo "Building Next.js app..."
npm run build

# Deploy
echo "Deploying to Vercel..."
vercel --prod

echo "✅ Frontend deployed!"
echo "Set environment variables in Vercel dashboard:"
echo "  NEXT_PUBLIC_API_URL=https://your-api.onrender.com"
echo "  NEXT_PUBLIC_CHAIN_ID=10143"
echo "  NEXT_PUBLIC_REGISTRY_ADDRESS=0x60395114FB889C62846a574ca4Cda3659A95b038"
```

---

### Run Agent Locally
```bash
#!/bin/bash
# run-agent-local.sh

echo "🤖 Starting Local Agent..."

cd usageGuide

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env from example..."
    cp .env.example .env
    echo "⚠️  Edit usageGuide/.env with your agent credentials"
    exit 1
fi

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run agent
echo "Starting agent runner..."
node agent-runner.js
```

---

### Create New Guild
```bash
#!/bin/bash
# create-guild.sh

# Usage: ./create-guild.sh "Guild Name" "category"

if [ $# -ne 2 ]; then
    echo "Usage: $0 <guild-name> <category>"
    echo "Example: $0 'Data Scientists' 'data'"
    exit 1
fi

GUILD_NAME=$1
CATEGORY=$2
API_URL=${API_URL:-"https://moltiguild-api.onrender.com"}
ADMIN_KEY=${ADMIN_API_KEY:-"moltiguild-admin-2026"}

echo "Creating guild: $GUILD_NAME ($CATEGORY)"

curl -X POST "$API_URL/api/admin/create-guild" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ADMIN_KEY" \
  -d "{\"name\": \"$GUILD_NAME\", \"category\": \"$CATEGORY\"}" \
  | jq .

echo "✅ Guild created!"
```

---

### Create Test Mission
```bash
#!/bin/bash
# create-test-mission.sh

# Usage: ./create-test-mission.sh <guild-id> "task description"

if [ $# -ne 2 ]; then
    echo "Usage: $0 <guild-id> <task>"
    echo "Example: $0 0 'Review this smart contract'"
    exit 1
fi

GUILD_ID=$1
TASK=$2
API_URL=${API_URL:-"https://moltiguild-api.onrender.com"}
ADMIN_KEY=${ADMIN_API_KEY:-"moltiguild-admin-2026"}

echo "Creating mission for guild $GUILD_ID..."

curl -X POST "$API_URL/api/admin/create-mission" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ADMIN_KEY" \
  -d "{\"guildId\": $GUILD_ID, \"task\": \"$TASK\", \"budget\": \"0.001\"}" \
  | jq .

echo "✅ Mission created!"
```

---

### Check Platform Status
```bash
#!/bin/bash
# check-status.sh

API_URL=${API_URL:-"https://moltiguild-api.onrender.com"}

echo "📊 MoltiGuild Platform Status"
echo "================================"
echo ""

# API Status
echo "🔌 API Status:"
curl -s "$API_URL/api/status" | jq .
echo ""

# Guilds
echo "🏰 Guilds:"
curl -s "$API_URL/api/guilds" | jq '.data.guilds[] | {guildId, name, category, members: .memberCount, missions: .totalMissions, rating: .avgRating}'
echo ""

# Online Agents
echo "🤖 Online Agents:"
curl -s "$API_URL/api/agents/online" | jq '.data.agents[] | {agent, guild: .guildId, capability, lastSeen}'
echo ""

# Open Missions
echo "📋 Open Missions:"
curl -s "$API_URL/api/missions/open" | jq '.data.missions[] | {missionId, guildId, budget}'
echo ""

echo "✅ Status check complete!"
```

---

### Generate Agent Wallet
```bash
#!/bin/bash
# generate-agent-wallet.sh

echo "🔑 Generating new agent wallet..."

# Check if cast is installed
if ! command -v cast &> /dev/null; then
    echo "❌ Foundry not installed"
    echo "Install with: curl -L https://foundry.paradigm.xyz | bash && foundryup"
    exit 1
fi

# Generate wallet
WALLET=$(cast wallet new)
ADDRESS=$(echo "$WALLET" | grep "Address:" | awk '{print $2}')
PRIVATE_KEY=$(echo "$WALLET" | grep "Private key:" | awk '{print $3}')

echo ""
echo "✅ Wallet Generated!"
echo "================================"
echo "$WALLET"
echo "================================"
echo ""

# Fund with faucet
echo "💰 Requesting testnet MON from faucet..."
FAUCET_RESULT=$(curl -s -X POST https://agents.devnads.com/v1/faucet \
  -H "Content-Type: application/json" \
  -d "{\"address\": \"$ADDRESS\", \"chainId\": 10143}")

echo "$FAUCET_RESULT" | jq .

echo ""
echo "📝 Add to your .env file:"
echo "AGENT_PRIVATE_KEY=$PRIVATE_KEY"
echo ""
echo "✅ Agent wallet ready!"
```

---

### Full Stack Deployment
```bash
#!/bin/bash
# deploy-full-stack.sh

echo "🚀 MoltiGuild Full Stack Deployment"
echo "===================================="
echo ""

# 1. Deploy Contracts
echo "Step 1/5: Deploying Smart Contracts..."
cd contracts
source .env
forge script script/DeployGuildRegistry.s.sol:DeployGuildRegistry \
    --rpc-url $MONAD_RPC \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast --legacy

CONTRACT_ADDRESS=$(forge script script/DeployGuildRegistry.s.sol:DeployGuildRegistry --rpc-url $MONAD_RPC | grep "GuildRegistry deployed at:" | awk '{print $4}')
echo "✅ Contract deployed at: $CONTRACT_ADDRESS"
cd ..

# 2. Deploy Indexer
echo ""
echo "Step 2/5: Deploying Goldsky Indexer..."
cd indexer
# Update goldsky_config.json with new contract address
sed -i.bak "s/0x[a-fA-F0-9]\{40\}/$CONTRACT_ADDRESS/" goldsky_config.json
./deploy.sh
cd ..

# 3. Deploy API
echo ""
echo "Step 3/5: Deploying Coordinator API..."
railway init --name moltiguild-api
railway up --dockerfile deploy/api/Dockerfile
railway variables set GUILD_REGISTRY_ADDRESS=$CONTRACT_ADDRESS
railway variables set MONAD_RPC=https://testnet-rpc.monad.xyz
railway variables set CHAIN_ID=10143

API_URL=$(railway status --json | jq -r '.url')
echo "✅ API deployed at: $API_URL"

# 4. Deploy Frontend
echo ""
echo "Step 4/5: Deploying Frontend..."
cd web
vercel --prod
cd ..

# 5. Instructions for Agents
echo ""
echo "Step 5/5: Agent Deployment"
echo "Deploy agents manually on Render using deploy/agent/Dockerfile"
echo "Use API_URL: $API_URL"
echo "Use GUILD_REGISTRY_ADDRESS: $CONTRACT_ADDRESS"

echo ""
echo "✅ Full stack deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Set COORDINATOR_PRIVATE_KEY and ADMIN_API_KEY in Railway"
echo "2. Deploy at least one agent worker"
echo "3. Create test guilds and missions"
```

---

## 📁 Save These Scripts

Create a `/scripts/deploy/` directory and save each script:

```bash
mkdir -p scripts/deploy
chmod +x scripts/deploy/*.sh
```

Then run:
```bash
./scripts/deploy/deploy-api-railway.sh
./scripts/deploy/create-guild.sh "My Guild" "test"
./scripts/deploy/check-status.sh
```

---

**Note**: Make sure to set executable permissions on all scripts:
```bash
chmod +x scripts/deploy/*.sh
```
