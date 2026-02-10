#!/bin/bash
# Deploy Goldsky subgraph for AgentGuilds

set -e

echo "🔍 AgentGuilds Indexer Deployment"
echo "=================================="
echo ""

# Check if Goldsky CLI is installed
if ! command -v goldsky &> /dev/null; then
    echo "❌ Goldsky CLI not found!"
    echo "📦 Installing Goldsky CLI..."
    npm install -g @goldsky/cli
    echo "✅ Goldsky CLI installed"
    echo ""
fi

# Check if logged in
echo "🔐 Checking Goldsky authentication..."
if ! goldsky whoami &> /dev/null; then
    echo "❌ Not logged in to Goldsky"
    echo "🔑 Please login:"
    goldsky login
    echo ""
fi

# Check if contract ABI exists
ABI_PATH="../contracts/out/GuildRegistry.sol/GuildRegistry.json"
if [ ! -f "$ABI_PATH" ]; then
    echo "❌ Contract ABI not found at $ABI_PATH"
    echo "📝 Building contracts..."
    cd ../contracts
    forge build
    cd ../indexer
    echo "✅ Contracts built"
    echo ""
fi

# Deploy subgraph
echo "🚀 Deploying subgraph..."
echo "   Network: Monad Testnet"
echo "   Contract: 0x90f3608bfFae5D80F74F7070C670C6C3E3370098"
echo ""

goldsky subgraph deploy agentguilds/v3 --from-abi ./goldsky_config.json

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Copy the GraphQL endpoint URL from above"
echo "   2. Add to your .env file:"
echo "      GOLDSKY_ENDPOINT=<your-endpoint-url>"
echo "      NEXT_PUBLIC_GOLDSKY_ENDPOINT=<your-endpoint-url>"
echo "   3. Test the endpoint:"
echo "      curl -X POST <your-endpoint-url> \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"query\": \"{ guildCreateds(first: 1) { id name } }\"}'"
echo ""
