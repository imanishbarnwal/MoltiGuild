# AgentGuilds - Comprehensive Testing Guide

Complete testing instructions for all components.

**Last Updated:** February 10, 2026  
**Status:** See STATUS.md for current state

---

## 🚀 Quick Test (5 minutes)

Test that the basic structure and configs are valid:

### Windows:
```cmd
test-docker.bat
```

### Linux/Mac:
```bash
chmod +x test-docker.sh
./test-docker.sh
```

This will:
- ✅ Check Docker is installed
- ✅ Check .env file exists
- ✅ Test Docker build
- ✅ Verify all files are in place

---

## 🧪 Test Levels

### Level 1: File Structure ✅ (Already Done)

Verify all files and folders exist:

```bash
# Check folder structure
ls -la agents/
ls -la infra/
ls -la assets/

# Check key files
cat openclaw.config.json
cat .env.example
cat agents/coordinator/SOUL.md
```

**Expected:** All files present, no errors

---

### Level 2: Configuration Validation ✅ (Can Do Now)

Test that config files are valid JSON:

```bash
# Test JSON validity
node -e "console.log(JSON.parse(require('fs').readFileSync('openclaw.config.json')))"
node -e "console.log(JSON.parse(require('fs').readFileSync('package.json')))"

# Should output the JSON without errors
```

**Expected:** JSON parses successfully

---

### Level 3: Docker Build ⏳ (Can Do Now, But Will Take Time)

Build the Docker image:

```bash
# Build (takes 5-10 minutes first time)
docker-compose -f infra/docker-compose.yml build

# Check image was created
docker images | grep agentguilds
```

**Expected:** Image builds successfully

**Note:** Build will succeed even without Person A/B's work because we have placeholder scripts.

---

### Level 4: Docker Run ⏳ (Needs .env Setup)

Start the container:

```bash
# Make sure .env is configured
cp .env.example .env
# Edit .env with dummy values for testing

# Start container
docker-compose -f infra/docker-compose.yml up -d

# Check logs
docker logs -f agentguilds
```

**Expected output:**
```
🦞 Starting AgentGuilds...
Starting Ollama...
Pulling Kimi K2.5...
Setting up OpenClaw agents...
Starting OpenClaw Gateway...
🦞 AgentGuilds is running!
   Gateway: ws://localhost:18789
   Telegram: @AgentGuildsBot
```

**Note:** Will work partially. Telegram won't work without valid bot token.

---

### Level 5: Agent Testing ⏳ (Needs OpenClaw Installed)

Test agents locally without Docker:

```bash
# Install OpenClaw
npm install -g @anthropic-ai/openclaw@latest

# Set up workspaces
mkdir -p ~/.openclaw
cp -r agents/coordinator ~/.openclaw/workspace-coordinator
cp -r agents/writer ~/.openclaw/workspace-writer
cp -r agents/director ~/.openclaw/workspace-director
cp openclaw.config.json ~/.openclaw/openclaw.json

# Start gateway
cd ~/.openclaw
openclaw gateway
```

**Expected:** Gateway starts, agents load

**Test agents:**
```bash
# In another terminal
openclaw chat coordinator "What can you do?"
openclaw chat writer "Write a meme about Ethereum"
openclaw chat director "Design a visual for a meme"
```

**Expected:** Agents respond according to their SOUL.md personalities

---

### Level 6: Integration Testing ❌ (Needs Person A & B)

Full system test requires:
- ✅ Person C: Agents, Docker, configs (DONE)
- ❌ Person A: Contract deployed, Goldsky endpoint
- ❌ Person B: Scripts implemented, frontend built

**Can't test until:**
- Contract address in .env
- Goldsky endpoint in .env
- coordinator.js fully implemented
- Frontend deployed

---

## 🎯 What You Can Test Right Now

### Option A: Quick Validation (2 minutes)

```bash
# Windows
test-docker.bat

# Linux/Mac
chmod +x test-docker.sh
./test-docker.sh
```

This validates:
- Docker is installed
- All files are present
- Docker build works
- Configs are valid

---

### Option B: Full Docker Test (15 minutes)

```bash
# 1. Create minimal .env
cp .env.example .env

# 2. Edit .env with dummy values (just for testing)
# You can use fake values since we're not connecting to blockchain yet

# 3. Build Docker image
docker-compose -f infra/docker-compose.yml build

# 4. Start container
docker-compose -f infra/docker-compose.yml up -d

# 5. Watch logs
docker logs -f agentguilds

# 6. Test coordinator script
docker exec -it agentguilds node /app/scripts/coordinator.js status

# Expected output:
# {"ok":true,"guilds":0,"missions":0,"agents":0,"message":"Contract not deployed yet"}

# 7. Stop container
docker-compose -f infra/docker-compose.yml down
```

---

### Option C: Agent Quality Test (30 minutes)

Test if agent personalities produce good outputs:

```bash
# Install OpenClaw
npm install -g @anthropic-ai/openclaw@latest

# Set up
mkdir -p ~/.openclaw
cp -r agents/* ~/.openclaw/
cp openclaw.config.json ~/.openclaw/openclaw.json

# Start gateway
cd ~/.openclaw
openclaw gateway &

# Test writer agent
openclaw chat writer "Write a meme about Solana downtime"
# Should return: Short, funny meme copy (no explanations)

# Test director agent  
openclaw chat director "Design visual for: 'Solana: down again'"
# Should return: FORMAT, LAYOUT, ELEMENTS, STYLE, MOOD

# Test coordinator
openclaw chat coordinator "What guilds are available?"
# Should return: Professional response with 🦞 emoji
```

---

## 🐛 Troubleshooting

### "Docker build failed"

**Check:**
```bash
# Is Docker running?
docker ps

# Is Docker Compose installed?
docker-compose --version

# Check Dockerfile syntax
cat infra/Dockerfile
```

**Common fixes:**
- Start Docker Desktop (Windows/Mac)
- Update Docker to latest version
- Check disk space (build needs ~2GB)

---

### "OpenClaw not found"

**Fix:**
```bash
# Install globally
npm install -g @anthropic-ai/openclaw@latest

# Verify
openclaw --version

# If still not found, check PATH
echo $PATH  # Linux/Mac
echo %PATH%  # Windows
```

---

### "Agent not responding"

**Check:**
```bash
# Is gateway running?
ps aux | grep openclaw  # Linux/Mac
tasklist | findstr openclaw  # Windows

# Check logs
cat ~/.openclaw/logs/gateway.log

# Restart gateway
pkill openclaw
openclaw gateway
```

---

### "Container exits immediately"

**Check logs:**
```bash
docker logs agentguilds

# Common issues:
# - Ollama failed to start (wait 10s)
# - Invalid .env values (check syntax)
# - Port already in use (change ports in docker-compose.yml)
```

---

## ✅ Success Criteria

### Person C's work is testable when:

**Level 1: Structure** ✅
- [x] All folders created
- [x] All config files present
- [x] All agent SOUL.md files exist

**Level 2: Validity** ✅
- [x] JSON configs parse correctly
- [x] Markdown files are well-formed
- [x] Shell scripts have correct syntax

**Level 3: Docker** ⏳ (Can test now)
- [ ] Docker image builds
- [ ] Container starts
- [ ] Ollama initializes
- [ ] OpenClaw gateway starts

**Level 4: Agents** ⏳ (Can test now)
- [ ] Agents load successfully
- [ ] Coordinator responds
- [ ] Writer produces meme copy
- [ ] Director produces visual concepts

**Level 5: Integration** ❌ (Needs Person A & B)
- [ ] Coordinator can call blockchain scripts
- [ ] Telegram bot works
- [ ] Full mission flow completes

---

## 📊 Current Test Status

| Test Level | Status | Can Test Now? | Blockers |
|-----------|--------|---------------|----------|
| File Structure | ✅ Pass | Yes | None |
| Config Validity | ✅ Pass | Yes | None |
| Docker Build | ⏳ Ready | Yes | None |
| Docker Run | ⏳ Ready | Yes | Need .env values |
| Agent Quality | ⏳ Ready | Yes | Need OpenClaw installed |
| Integration | ❌ Blocked | No | Need Person A & B |

---

## 🚀 Recommended Testing Order

### Today (Person C Solo)

1. **Run quick test** (2 min)
   ```bash
   test-docker.bat  # or test-docker.sh
   ```

2. **Test Docker build** (10 min)
   ```bash
   docker-compose -f infra/docker-compose.yml build
   ```

3. **Test with dummy .env** (5 min)
   ```bash
   cp .env.example .env
   docker-compose -f infra/docker-compose.yml up -d
   docker logs agentguilds
   ```

### Tomorrow (With Person A)

4. **Get contract address** from Person A
5. **Get Goldsky endpoint** from Person A
6. **Update .env** with real values
7. **Test coordinator script** with real blockchain

### Day 3 (Full Team)

8. **Integration test** with Person B's frontend
9. **End-to-end mission flow**
10. **Record demo video**

---

## 💡 Pro Tips

### Fast Iteration

```bash
# Rebuild only changed layers
docker-compose -f infra/docker-compose.yml build --no-cache agentguilds

# View live logs
docker-compose -f infra/docker-compose.yml logs -f

# Restart without rebuilding
docker-compose -f infra/docker-compose.yml restart
```

### Debug Mode

```bash
# Run container interactively
docker run -it --rm \
  --env-file .env \
  agentguilds-agentguilds \
  /bin/bash

# Then manually run commands inside container
ollama serve &
openclaw gateway
```

### Clean Slate

```bash
# Remove everything and start fresh
docker-compose -f infra/docker-compose.yml down -v
docker system prune -a
docker-compose -f infra/docker-compose.yml build --no-cache
```

---

## 📞 Need Help?

- **Docker issues:** Check Docker Desktop is running
- **OpenClaw issues:** Check `~/.openclaw/logs/`
- **Agent issues:** Review SOUL.md files
- **Integration issues:** Wait for Person A & B

---

**Start with the quick test, then work your way up! 🦞**


---

## 🦞 OpenClaw Installation & Testing

### Install OpenClaw from GitHub

```bash
# 1. Clone OpenClaw repository
git clone https://github.com/openclaw/openclaw
cd openclaw

# 2. Run their Docker setup script
./docker-setup.sh

# This will:
# - Build the gateway image
# - Run onboarding wizard
# - Start gateway via Docker Compose
# - Generate gateway token
# - Open dashboard at http://127.0.0.1:18789/
```

### Copy AgentGuilds Configurations

```bash
# 3. Copy our agent configs
cp -r /path/to/agentguilds/agents/* ~/.openclaw/agents/

# 4. Copy our OpenClaw config
cp /path/to/agentguilds/openclaw.config.json ~/.openclaw/openclaw.json

# 5. Copy our scripts
cp -r /path/to/agentguilds/scripts ~/.openclaw/scripts
cd ~/.openclaw/scripts && npm install
```

### Test OpenClaw Gateway

```bash
# Check gateway status
docker compose ps

# View logs
docker compose logs -f openclaw-gateway

# Test coordinator agent
openclaw chat coordinator "What can you do?"

# Expected: Response about routing missions and selecting guilds
```

### Configure Telegram Bot

```bash
# Add Telegram channel
openclaw channels add --channel telegram --token "<YOUR_BOT_TOKEN>"

# Test by messaging your bot
# Expected: Bot responds using coordinator agent
```

### Test Multi-Agent Spawning

```bash
# Test writer agent
openclaw chat writer "Write a meme about Ethereum gas fees"

# Expected: Short, funny meme copy (no explanations)

# Test director agent
openclaw chat director "Design visual for: 'Ethereum: expensive but worth it'"

# Expected: FORMAT, LAYOUT, ELEMENTS, STYLE, MOOD
```

### Test Full Mission Flow

```bash
# Via Telegram bot, send:
"create a meme about Monad speed"

# Expected flow:
# 1. Coordinator receives message
# 2. Queries on-chain for guilds (returns empty for now)
# 3. Spawns writer agent
# 4. Spawns director agent
# 5. Returns combined results
```

---

## 🔗 OpenClaw Resources

- **Repository:** https://github.com/openclaw/openclaw
- **Documentation:** Check repo README
- **Docker Guide:** See repo docs/docker.md
- **Our Config:** `openclaw.config.json`
- **Our Agents:** `agents/*/SOUL.md`

---

## 📊 Complete Test Checklist

### Infrastructure Tests ✅
- [x] File structure validated
- [x] JSON configs valid
- [x] Docker build successful
- [x] Container running
- [x] Ollama operational
- [x] Scripts executable

### OpenClaw Tests ⏳
- [ ] OpenClaw installed from GitHub
- [ ] Gateway running
- [ ] Agents loaded
- [ ] Multi-agent spawning works
- [ ] Telegram bot responds

### Integration Tests ❌ (Blocked)
- [ ] Contract deployed (Person A)
- [ ] Goldsky endpoint available (Person A)
- [ ] Blockchain calls working (Person B)
- [ ] Frontend integrated (Person B)
- [ ] Full mission flow end-to-end

---

**For current status, see STATUS.md**
