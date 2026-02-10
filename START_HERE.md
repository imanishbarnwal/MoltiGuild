# 🚀 START HERE - Everything Runs Automatically in Docker!

## ⚡ ONE Command - UI Appears!

```bash
docker-compose -f infra/docker-compose.yml up -d --build
```

**That's it!** Everything happens automatically:
- ✅ Ollama starts
- ✅ Kimi K2.5 downloads
- ✅ OpenClaw installs
- ✅ Gateway starts
- ✅ Agents configured
- ✅ **UI available at http://localhost:18789/** 🎉

---

## 🎯 What Happens Automatically

### Docker Container Does Everything

When you run `docker-compose up`, the container automatically:

1. **Starts Ollama** (LLM runtime)
2. **Downloads Kimi K2.5 model**
3. **Installs OpenClaw**
4. **Copies agent configs** (coordinator, writer, director)
5. **Starts OpenClaw gateway** on port 18789
6. **Makes UI available** at http://localhost:18789/

**No manual steps needed!** Just start the container.

---

## 📱 Only Manual Step: Telegram Bot (2 minutes)

### 1. Create Bot with @BotFather

1. Open Telegram
2. Message **@BotFather**
3. Send: `/newbot`
4. Name: `AgentGuilds Bot`
5. Username: `agentguilds_bot`
6. **Copy the token**

### 2. Add Bot to OpenClaw (Automatic)

```bash
docker exec -it agentguilds openclaw channels add --channel telegram --token "YOUR_TOKEN_HERE"
```

**Done!** Bot is connected.

---

## ✅ Verify Everything Works

### Check Container Logs

```bash
docker logs -f agentguilds
```

**You should see:**
```
🦞 Starting AgentGuilds...
Starting Ollama...
Pulling Kimi K2.5...
Setting up OpenClaw...
✓ OpenClaw found
Starting OpenClaw gateway...
✓ OpenClaw gateway started
✓ UI available at: http://localhost:18789/

🦞 AgentGuilds is running!
   Ollama: http://localhost:11434 ✓
   OpenClaw Gateway: http://localhost:18789 ✓
   OpenClaw UI: http://localhost:18789/ ✓
```

### Open UI in Browser

**http://localhost:18789/**

You should see the OpenClaw dashboard with:
- Status: Running
- Agents: coordinator, writer, director
- Channels: (empty until you add Telegram)

### Test Telegram Bot

1. Search for `@agentguilds_bot` in Telegram
2. Send: `Hello!`
3. Bot responds: "🦞 Hello! I'm the AgentGuilds coordinator..."

---

## 🎯 Complete Flow

### Step 1: Start Container (Automatic)

```bash
docker-compose -f infra/docker-compose.yml up -d --build
```

**Wait 1-2 minutes for everything to start.**

### Step 2: Check UI (Automatic)

Open browser: **http://localhost:18789/**

**✅ UI should be visible!**

### Step 3: Create Telegram Bot (Manual - 2 minutes)

1. Message @BotFather on Telegram
2. Create bot
3. Copy token

### Step 4: Connect Bot (Automatic)

```bash
docker exec -it agentguilds openclaw channels add --channel telegram --token "YOUR_TOKEN"
```

### Step 5: Test (Manual)

Message your bot: `create a meme about Monad speed`

**✅ Bot responds with multi-agent output!**

---

## 🐛 Troubleshooting

### Container Won't Start

```bash
# Check Docker is running
docker ps

# Check logs
docker logs agentguilds

# Rebuild
docker-compose -f infra/docker-compose.yml up -d --build --force-recreate
```

### UI Not Loading

```bash
# Check if gateway is running
docker exec agentguilds ps aux | grep openclaw

# Check port is exposed
docker port agentguilds

# Should show: 18789/tcp -> 0.0.0.0:18789
```

### Bot Not Responding

```bash
# Check channels
docker exec agentguilds openclaw channels list

# Re-add if needed
docker exec -it agentguilds openclaw channels add --channel telegram --token "YOUR_TOKEN"
```

---

## 📊 What's Automatic vs Manual

| Step | Type | Command |
|------|------|---------|
| Start container | ✅ Automatic | `docker-compose up -d --build` |
| Install Ollama | ✅ Automatic | (in container) |
| Download model | ✅ Automatic | (in container) |
| Install OpenClaw | ✅ Automatic | (in container) |
| Start gateway | ✅ Automatic | (in container) |
| Copy agent configs | ✅ Automatic | (in container) |
| **UI appears** | ✅ **Automatic** | **http://localhost:18789/** |
| Create Telegram bot | 👆 Manual | Talk to @BotFather |
| Add bot to OpenClaw | ✅ Automatic | One command |
| Test bot | 👆 Manual | Send message |

---

## 🎉 Success Checklist

- [ ] Ran `docker-compose up -d --build`
- [ ] Waited 1-2 minutes
- [ ] Checked logs: `docker logs agentguilds`
- [ ] Opened http://localhost:18789/ (UI visible)
- [ ] Created bot with @BotFather
- [ ] Ran `docker exec -it agentguilds openclaw channels add...`
- [ ] Tested bot (sent message, got response)

---

## 🚀 Quick Commands

```bash
# Start everything
docker-compose -f infra/docker-compose.yml up -d --build

# Check logs
docker logs -f agentguilds

# Add Telegram bot
docker exec -it agentguilds openclaw channels add --channel telegram --token "TOKEN"

# Test coordinator script
docker exec agentguilds node /app/scripts/coordinator.js status

# Stop everything
docker-compose -f infra/docker-compose.yml down
```

---

**🦞 Everything runs automatically in Docker! Just start the container and open http://localhost:18789/! 🚀**
