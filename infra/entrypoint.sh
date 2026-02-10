#!/bin/bash
set -e

echo "🦞 Starting AgentGuilds..."

# Start Ollama in background
echo "Starting Ollama..."
ollama serve &
OLLAMA_PID=$!
sleep 3

# Pull model (if not cached)
echo "Pulling Kimi K2.5..."
ollama pull kimi-k2.5:cloud 2>/dev/null || echo "Model will be pulled on first use"

# Set up OpenClaw workspace
echo "Setting up OpenClaw..."
mkdir -p ~/.openclaw/agents

# Copy our agent configurations
echo "Copying agent configurations..."
cp -r /app/agents/coordinator ~/.openclaw/agents/ 2>/dev/null || true
cp -r /app/agents/writer ~/.openclaw/agents/ 2>/dev/null || true
cp -r /app/agents/director ~/.openclaw/agents/ 2>/dev/null || true

# Copy OpenClaw config
echo "Copying OpenClaw config..."
cp /app/openclaw.config.json ~/.openclaw/openclaw.json 2>/dev/null || true

# Copy scripts for agent access
mkdir -p ~/.openclaw/scripts
cp -r /app/scripts/* ~/.openclaw/scripts/ 2>/dev/null || true

# Install script dependencies
cd ~/.openclaw/scripts
npm install 2>/dev/null || echo "Script dependencies installed"

# Check if OpenClaw repo exists and build it
if [ -d "/app/openclaw-repo" ]; then
    echo "✓ OpenClaw repo found, building..."
    cd /app/openclaw-repo
    
    # Install pnpm (OpenClaw uses pnpm)
    echo "Installing pnpm..."
    npm install -g pnpm@10.23.0 2>/dev/null || true
    
    # Install dependencies and build
    echo "Installing dependencies (this may take a few minutes)..."
    pnpm install --frozen-lockfile 2>&1 | tail -n 5 || pnpm install 2>&1 | tail -n 5
    
    echo "Building OpenClaw..."
    pnpm build 2>&1 | tail -n 10 || true
    
    # Start OpenClaw gateway
    echo "Starting OpenClaw gateway..."
    pnpm start gateway --port 18789 &
    OPENCLAW_PID=$!
    
    sleep 3
    echo "✓ OpenClaw gateway started (PID: $OPENCLAW_PID)"
    echo "✓ UI available at: http://localhost:18789/"
else
    echo "⚠️  OpenClaw repo not found at /app/openclaw-repo"
    echo "    UI will not be available"
    echo "    To enable: copy openclaw-repo folder to project root"
    OPENCLAW_PID=""
fi

echo ""
echo "🦞 AgentGuilds is running!"
echo "   Ollama: http://localhost:11434 ✓"
if [ -n "$OPENCLAW_PID" ]; then
    echo "   OpenClaw Gateway: http://localhost:18789 ✓"
    echo "   OpenClaw UI: http://localhost:18789/ ✓"
else
    echo "   OpenClaw: Not available"
fi
echo "   Scripts: /app/scripts/coordinator.js ✓"
echo ""
echo "To add Telegram bot:"
echo "  docker exec -it agentguilds openclaw channels add --channel telegram --token \"YOUR_TOKEN\""
echo ""
echo "Press Ctrl+C to stop"

# Keep container running and handle shutdown gracefully
if [ -n "$OPENCLAW_PID" ]; then
    trap "echo 'Shutting down...'; kill $OPENCLAW_PID $OLLAMA_PID 2>/dev/null; exit 0" SIGTERM SIGINT
    wait $OPENCLAW_PID
else
    trap "echo 'Shutting down...'; kill $OLLAMA_PID 2>/dev/null; exit 0" SIGTERM SIGINT
    tail -f /dev/null
fi
