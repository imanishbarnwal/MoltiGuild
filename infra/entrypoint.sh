#!/bin/bash
set -e

echo "Starting AgentGuilds..."

# ═══════════════════════════════════════
# SETUP OPENCLAW WORKSPACE
# ═══════════════════════════════════════

mkdir -p ~/.openclaw/agents

# Copy agent configurations
cp -r /app/agents/coordinator ~/.openclaw/agents/ 2>/dev/null || true
cp -r /app/agents/writer ~/.openclaw/agents/ 2>/dev/null || true
cp -r /app/agents/director ~/.openclaw/agents/ 2>/dev/null || true

# Copy OpenClaw config
cp /app/openclaw.config.json ~/.openclaw/openclaw.json 2>/dev/null || true

# Create data directory for API state
mkdir -p /app/data

# ═══════════════════════════════════════
# BUILD OPENCLAW (if repo is mounted)
# ═══════════════════════════════════════

OPENCLAW_AVAILABLE=false

if [ -d "/app/openclaw-repo" ]; then
    echo "OpenClaw repo found, building..."
    cd /app/openclaw-repo

    # Install pnpm (OpenClaw uses pnpm)
    npm install -g pnpm@10.23.0 2>/dev/null || true

    # Install dependencies and build
    echo "Installing dependencies (this may take a few minutes)..."
    pnpm install --frozen-lockfile 2>&1 | tail -n 5 || pnpm install 2>&1 | tail -n 5

    echo "Building OpenClaw..."
    pnpm build 2>&1 | tail -n 10 || true

    # Link OpenClaw globally
    npm link 2>/dev/null || pnpm link --global 2>/dev/null || true

    OPENCLAW_AVAILABLE=true
else
    echo "No openclaw-repo found — running API-only mode"
    echo "To enable OpenClaw, mount the repo: -v /path/to/openclaw-repo:/app/openclaw-repo"
fi

# ═══════════════════════════════════════
# INSTALL CLAWHUB SKILLS
# ═══════════════════════════════════════

if [ "$OPENCLAW_AVAILABLE" = true ]; then
    echo "Installing Clawhub skills..."
    npm i -g clawhub 2>/dev/null || true
    clawhub install monad-development --force 2>/dev/null || true
    echo "Skills installed: agentguilds (local), monad-development (clawhub)"
fi

# ═══════════════════════════════════════
# START CLOUDFLARE TUNNEL (if configured)
# ═══════════════════════════════════════

if [ -n "$CF_TUNNEL_TOKEN" ]; then
    echo "Starting Cloudflare Tunnel..."
    cloudflared tunnel run --token "$CF_TUNNEL_TOKEN" &
    CF_PID=$!
    echo "Cloudflare Tunnel started (PID: $CF_PID)"
else
    echo "CF_TUNNEL_TOKEN not set — skipping Cloudflare Tunnel"
fi

# ═══════════════════════════════════════
# START TAILSCALE (if configured)
# ═══════════════════════════════════════

if [ -n "$TS_AUTHKEY" ]; then
    echo "Starting Tailscale..."
    tailscaled --state=/var/lib/tailscale/tailscaled.state &
    sleep 2
    tailscale up --authkey="$TS_AUTHKEY" --hostname=agentguilds
    echo "Tailscale connected"
    tailscale status
else
    echo "TS_AUTHKEY not set — skipping Tailscale"
fi

# ═══════════════════════════════════════
# START COORDINATOR API
# ═══════════════════════════════════════

echo "Starting Coordinator API on port ${API_PORT:-3001}..."
cd /app/scripts
node api.js &
API_PID=$!
echo "Coordinator API started (PID: $API_PID)"

# ═══════════════════════════════════════
# START OPENCLAW GATEWAY (if available)
# ═══════════════════════════════════════

OPENCLAW_PID=""

if [ "$OPENCLAW_AVAILABLE" = true ]; then
    echo "Starting OpenClaw gateway..."
    cd /app/openclaw-repo
    pnpm start gateway --port 18789 --bind lan &
    OPENCLAW_PID=$!
    sleep 5
fi

echo ""
echo "AgentGuilds is running!"
echo "   Coordinator API:  http://localhost:${API_PORT:-3001}"
if [ "$OPENCLAW_AVAILABLE" = true ]; then
    echo "   OpenClaw Gateway: http://localhost:18789"
fi
if [ -n "$CF_TUNNEL_TOKEN" ]; then
    echo "   Cloudflare Tunnel: active"
fi
if [ -n "$TS_AUTHKEY" ]; then
    echo "   Tailscale: active"
fi
echo ""

# Keep container running and handle shutdown gracefully
trap "echo 'Shutting down...'; kill ${OPENCLAW_PID:-0} $API_PID ${CF_PID:-0} 2>/dev/null; tailscale down 2>/dev/null; exit 0" SIGTERM SIGINT

# Wait on the main process — API if no OpenClaw, OpenClaw if available
if [ -n "$OPENCLAW_PID" ]; then
    wait $OPENCLAW_PID
else
    wait $API_PID
fi
