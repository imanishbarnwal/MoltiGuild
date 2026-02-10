# Docker Fix & Restart Guide

## Current Issue

Docker daemon is in a bad state (500 Internal Server Error). This happens sometimes and requires a restart.

## Steps to Fix

### 1. Restart Docker Desktop (Manual)

**Option A: Via System Tray**
1. Right-click Docker icon in system tray (bottom-right)
2. Click "Restart Docker Desktop"
3. Wait 1-2 minutes for Docker to fully start

**Option B: Via Task Manager**
1. Open Task Manager (Ctrl+Shift+Esc)
2. Find "Docker Desktop" processes
3. Right-click → End Task (all Docker processes)
4. Open Start Menu → Search "Docker Desktop" → Launch it
5. Wait 1-2 minutes

### 2. Verify Docker is Running

```powershell
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

If you see this (empty list is fine), Docker is working!

### 3. Start AgentGuilds Container

```powershell
docker-compose -f infra/docker-compose.yml up -d --build
```

**This will:**
- Build the container with the fixed OpenClaw config
- Start Ollama
- Pull Kimi K2.5 model
- Build OpenClaw (3-5 minutes first time)
- Start the gateway

### 4. Monitor Progress

```powershell
docker logs -f agentguilds
```

**Look for:**
```
✓ OpenClaw gateway started
✓ UI available at: http://localhost:18789/
```

Press Ctrl+C to stop watching logs (container keeps running).

### 5. Open UI

Open browser: **http://localhost:18789/**

You should see the OpenClaw dashboard!

---

## What Was Fixed

### 1. OpenClaw Config (`openclaw.config.json`)

**Before (broken):**
```json
{
  "channels": {
    "telegram": {
      "dmPolicy": "open",
      "allowFrom": ["*"]  // ❌ This caused the error
    }
  }
}
```

**After (fixed):**
```json
{
  "channels": {
    "telegram": {
      "dmPolicy": "open",
      "groups": {
        "*": {
          "requireMention": true
        }
      }
    }
  },
  "gateway": {
    "auth": {
      "mode": "none"  // ✅ No auth required
    }
  }
}
```

**Key changes:**
- Removed `allowFrom` (not needed with `dmPolicy: "open"`)
- Added `gateway.auth.mode: "none"` (no token required)
- Proper `groups` config for Telegram

### 2. Removed Foundry

Foundry was removed from Dockerfile since the contract is already deployed.

---

## Troubleshooting

### Docker won't start

1. Check if WSL 2 is running:
   ```powershell
   wsl --status
   ```

2. Restart WSL if needed:
   ```powershell
   wsl --shutdown
   ```
   Then restart Docker Desktop.

### Container keeps restarting

Check logs:
```powershell
docker logs agentguilds --tail 50
```

Common issues:
- **"Missing env var TELEGRAM_BOT_TOKEN"** → Check `.env` file has the token
- **"Config invalid"** → Config syntax error (should be fixed now)
- **"Gateway auth token required"** → Should be fixed with `auth.mode: "none"`

### Build takes too long

First build takes 3-5 minutes (installing OpenClaw dependencies). Subsequent starts are fast (~10 seconds).

### Port 18789 already in use

Stop other services:
```powershell
netstat -ano | findstr :18789
taskkill /PID <PID> /F
```

---

## Quick Commands Reference

```powershell
# Start container
docker-compose -f infra/docker-compose.yml up -d --build

# View logs
docker logs -f agentguilds

# Stop container
docker-compose -f infra/docker-compose.yml down

# Restart container
docker restart agentguilds

# Check if running
docker ps | findstr agentguilds

# Shell into container
docker exec -it agentguilds /bin/bash
```

---

## Next Steps After Container Starts

### 1. Verify UI is Accessible

Open: http://localhost:18789/

### 2. Test Telegram Bot (Optional)

Your bot token is already configured in `.env`:
```
TELEGRAM_BOT_TOKEN=7715256287:AAF1-cTTqsJpVCHwDQmHo93n1juQ1dJXcbY
```

**To test:**
1. Open Telegram
2. Search for your bot (the username you created with @BotFather)
3. Send a message: "Hello!"
4. Bot should respond

### 3. Check Agent Configs

Agent configurations are automatically copied to the container:
- `agents/coordinator/` → Orchestrator
- `agents/writer/` → Meme writer
- `agents/director/` → Creative director

---

**🦞 Once Docker restarts, just run `docker-compose -f infra/docker-compose.yml up -d --build` and you're good to go! 🚀**
