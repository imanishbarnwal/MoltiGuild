#!/bin/bash
set -e

echo "═══════════════════════════════════════"
echo "  MoltiGuild OpenClaw — Starting"
echo "═══════════════════════════════════════"

# ── SETUP OPENCLAW WORKSPACE ─────────────

mkdir -p ~/.openclaw/agents

cp -r /app/agents/coordinator ~/.openclaw/agents/ 2>/dev/null || true
cp -r /app/agents/writer ~/.openclaw/agents/ 2>/dev/null || true
cp -r /app/agents/director ~/.openclaw/agents/ 2>/dev/null || true
cp /app/openclaw.config.json ~/.openclaw/openclaw.json 2>/dev/null || true

# Also update workspace SOUL.md (OpenClaw reads from workspace, not agents dir)
for agent_dir in /app/agents/*/; do
    agent_name=$(basename "$agent_dir")
    ws_dir="$HOME/.openclaw/workspace-${agent_name}"
    if [ -d "$ws_dir" ] && [ -f "${agent_dir}SOUL.md" ]; then
        cp "${agent_dir}SOUL.md" "${ws_dir}/SOUL.md"
        echo "[agents] Updated ${agent_name} workspace SOUL.md"
    fi
done

# ── VERIFY OPENCLAW REPO ─────────────────

if [ ! -d "/app/openclaw-repo" ]; then
    echo "ERROR: openclaw-repo not mounted at /app/openclaw-repo"
    echo "Mount it in docker-compose.yml or run: docker compose up api (API-only mode)"
    exit 1
fi

cd /app/openclaw-repo

# ── INSTALL DEPENDENCIES ─────────────────
# node_modules is on a named Docker volume — persists across restarts.
# pnpm store is also on a named volume — downloads persist even if node_modules is wiped.

if [ -d "node_modules/.pnpm" ]; then
    echo "[deps] Cached in volume, skipping install."
else
    echo "[deps] Installing (first run — caching in volume for next time)..."
    START_TIME=$(date +%s)
    pnpm install --frozen-lockfile 2>&1 || pnpm install 2>&1
    ELAPSED=$(( $(date +%s) - START_TIME ))
    echo "[deps] Done in ${ELAPSED}s. Next restart will skip this step."
fi

# ── BUILD ─────────────────────────────────
# dist/ lives on the bind mount — persists on host across restarts.
# Only rebuild if dist/ is missing or empty.

if [ -d "dist" ] && [ "$(ls -A dist 2>/dev/null)" ]; then
    echo "[build] dist/ exists, skipping build."
else
    echo "[build] Building OpenClaw..."
    START_TIME=$(date +%s)
    pnpm build 2>&1 || true
    ELAPSED=$(( $(date +%s) - START_TIME ))
    echo "[build] Done in ${ELAPSED}s."
fi

# ── INSTALL CLAWHUB SKILLS ────────────────

if command -v clawhub &>/dev/null; then
    echo "[skills] clawhub already installed."
else
    echo "[skills] Installing clawhub..."
    npm i -g clawhub 2>/dev/null || true
fi
clawhub install monad-development --force 2>/dev/null || true

# ── CLOUDFLARE TUNNEL (if configured) ────

if [ -n "$CF_TUNNEL_TOKEN" ]; then
    echo "[tunnel] Starting Cloudflare Tunnel..."
    cloudflared tunnel run --token "$CF_TUNNEL_TOKEN" &
    echo "[tunnel] Cloudflare Tunnel started (PID: $!)"
else
    echo "[tunnel] CF_TUNNEL_TOKEN not set, skipping."
fi

# ── START GATEWAY ─────────────────────────

echo ""
echo "═══════════════════════════════════════"
echo "  OpenClaw Gateway: http://0.0.0.0:18789"
echo "═══════════════════════════════════════"
echo ""

exec pnpm start gateway --port 18789 --bind lan
