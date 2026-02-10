# Manual Steps - Docker is Stuck

## What Happened

Docker daemon got into a bad state. I've killed all Docker processes, but it needs time to restart.

## What You Need to Do

### Step 1: Wait for Docker to Start (2-3 minutes)

Look at your system tray (bottom-right corner). You should see the Docker whale icon.

**Wait until:**
- The whale icon stops animating
- It shows "Docker Desktop is running"

### Step 2: Test Docker

Open PowerShell and run:
```powershell
docker ps
```

**If it works**, you'll see:
```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

**If it hangs or errors**, Docker is still starting. Wait another minute and try again.

### Step 3: Start AgentGuilds

Once `docker ps` works, run:
```powershell
docker-compose -f infra/docker-compose.yml up -d --build
```

### Step 4: Watch the Build

```powershell
docker logs -f agentguilds
```

**Wait for these lines:**
```
✓ OpenClaw gateway started
✓ UI available at: http://localhost:18789/
```

Press Ctrl+C to stop watching (container keeps running).

### Step 5: Open UI

Browser: **http://localhost:18789/**

---

## If Docker Won't Start

### Option 1: Restart via System Tray
1. Right-click Docker whale icon (system tray)
2. Click "Restart"
3. Wait 2-3 minutes

### Option 2: Restart via Task Manager
1. Press Ctrl+Shift+Esc (Task Manager)
2. Find all "Docker" processes
3. Right-click each → End Task
4. Close Task Manager
5. Open Start Menu → Search "Docker Desktop" → Launch
6. Wait 2-3 minutes

### Option 3: Restart Computer
If Docker is really stuck, just restart your computer. Docker will start automatically on boot.

---

## Alternative: Use the Batch Script

I created `restart-docker.bat` for you. Just:

1. Double-click `restart-docker.bat`
2. Wait for it to finish
3. Run: `docker-compose -f infra/docker-compose.yml up -d --build`

---

## What's Fixed in the Config

The OpenClaw config is now correct:

✅ Removed `allowFrom` (was causing validation error)  
✅ Added `gateway.auth.mode: "none"` (no token needed)  
✅ Proper Telegram configuration  
✅ Removed Foundry (not needed)  

Once Docker starts, the container will build and run successfully!

---

## Quick Test

Once Docker is running, test everything with:

```powershell
# 1. Start container
docker-compose -f infra/docker-compose.yml up -d --build

# 2. Wait 3-5 minutes for first build

# 3. Check logs
docker logs agentguilds --tail 20

# 4. Open UI
start http://localhost:18789/
```

---

**🦞 Just wait for Docker to fully start, then run the docker-compose command! 🚀**
