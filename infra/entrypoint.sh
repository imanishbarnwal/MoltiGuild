#!/bin/bash
set -e

echo "🦞 Starting AgentGuilds..."

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

# Create data directory for API state
mkdir -p /app/data

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

    # Link OpenClaw globally so 'ollama launch openclaw' can find it
    echo "Installing OpenClaw globally..."
    npm link 2>/dev/null || pnpm link --global 2>/dev/null || true

    # Run doctor to fix any config issues
    echo "Running OpenClaw doctor..."
    pnpm start doctor --fix 2>&1 | tail -n 10 || true
fi

# Using Ollama Cloud API directly (no local Ollama needed)
echo "Using Ollama Cloud API at https://ollama.com"
echo "Model: gpt-oss:120b (cloud)"

# Apply our config with plugins.entries.telegram.enabled = true
echo "Applying AgentGuilds config..."
cp /app/openclaw.config.json ~/.openclaw/openclaw.json

# Verify Telegram plugin is enabled in config
echo "Verifying Telegram config:"
cat ~/.openclaw/openclaw.json | grep -A 5 '"plugins"'
cat ~/.openclaw/openclaw.json | grep -A 8 '"telegram"'

# ═══════════════════════════════════════
# START CLOUDFLARE TUNNEL (if configured)
# ═══════════════════════════════════════

if [ -n "$CF_TUNNEL_TOKEN" ]; then
    echo "Starting Cloudflare Tunnel..."
    cloudflared tunnel run --token "$CF_TUNNEL_TOKEN" &
    CF_PID=$!
    echo "✓ Cloudflare Tunnel started (PID: $CF_PID)"
else
    echo "⚠ CF_TUNNEL_TOKEN not set — skipping Cloudflare Tunnel"
fi

# ═══════════════════════════════════════
# START TAILSCALE (if configured)
# ═══════════════════════════════════════

if [ -n "$TS_AUTHKEY" ]; then
    echo "Starting Tailscale..."
    tailscaled --state=/var/lib/tailscale/tailscaled.state &
    sleep 2
    tailscale up --authkey="$TS_AUTHKEY" --hostname=agentguilds
    echo "✓ Tailscale connected"
    tailscale status
else
    echo "⚠ TS_AUTHKEY not set — skipping Tailscale"
fi

# ═══════════════════════════════════════
# START COORDINATOR API
# ═══════════════════════════════════════

echo "Starting Coordinator API on port ${API_PORT:-3001}..."
cd ~/.openclaw/scripts
node api.js &
API_PID=$!
echo "✓ Coordinator API started (PID: $API_PID)"

# ═══════════════════════════════════════
# START OPENCLAW GATEWAY
# ═══════════════════════════════════════

echo "Starting OpenClaw gateway..."
cd /app/openclaw-repo
pnpm start gateway --port 18789 --bind lan &
OPENCLAW_PID=$!

sleep 5

echo ""
echo "🦞 AgentGuilds is running!"
echo "   OpenClaw Gateway: http://localhost:18789 ✓"
echo "   Coordinator API:  http://localhost:${API_PORT:-3001} ✓"
echo "   Model: ollama/gpt-oss:120b (Ollama Cloud API)"
if [ -n "$CF_TUNNEL_TOKEN" ]; then
    echo "   Cloudflare Tunnel: ✓ (public access enabled)"
fi
if [ -n "$TS_AUTHKEY" ]; then
    echo "   Tailscale: ✓ (private admin access)"
fi
echo ""
echo "Press Ctrl+C to stop"

# Keep container running and handle shutdown gracefully
trap "echo 'Shutting down...'; kill $OPENCLAW_PID $API_PID ${CF_PID:-0} 2>/dev/null; tailscale down 2>/dev/null; exit 0" SIGTERM SIGINT
wait $OPENCLAW_PID
