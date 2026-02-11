#!/bin/bash
cd "$(dirname "$0")"
echo "Deploying AgentGuilds V5 Subgraph..."
goldsky subgraph deploy agentguilds-monad-testnet/v5 --from-abi goldsky_config.json
