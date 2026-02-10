# OpenClaw Quick Start for AgentGuilds

## 🚀 Fast Setup (Get UI Running in 10 Minutes)

### Step 1: Install OpenClaw

```bash
# Install globally
npm install -g openclaw@latest

# Or use pnpm
pnpm add -g openclaw@latest
```

### Step 2: Run Onboarding

```bash
openclaw onboard --install-daemon
```

**During onboarding:**
1. Choose **Anthropic** or **OpenAI** (or local Ollama)
2. For Ollama: Select "Local" → Enter `http://localhost:11434`
3. Set up workspace (default: `~/.openclaw/`)
4. Skip channels for now (we'll add Telegram later)

### Step 3: Start Gateway

```bash
openclaw gateway --port 18789 --verbose
```

**Expected output:**
```
🦞 OpenClaw Gateway starting...
✓ Workspace: /home/user/.openclaw
✓ Listening on http://127.0.0.1:18789
✓ Dashboard: http://127.0.0.1:18789/
```

### Step 4: Open UI

Open your browser to: **http://127.0.0.1:18789/**

You should see the OpenClaw dashboard! 🎉

---

## 📱 Telegram Bot Setup

### Step 1: Create Bot with BotFather

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Choose a name: `AgentGuilds Bot`
4. Choose a username: `agentguilds_bot` (must end with `_bot`)
5. Copy the bot token (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Step 2: Add Telegram Channel to OpenClaw

```bash
openclaw channels add --channel telegram --token "YOUR_BOT_TOKEN_HERE"
```

### Step 3: Test Your Bot

1. Open Telegram
2. Search for your bot: `@agentguilds_bot`
3. Send a message: `Hello!`
4. Bot should respond! 🦞

---

## 🔧 Copy AgentGuilds Configurations

### Step 1: Copy Agent Configs

```bash
# Copy our agent SOUL.md files
cp -r agents/coordinator ~/.openclaw/agents/
cp -r agents/writer ~/.openclaw/agents/
cp -r agents/director ~/.openclaw/agents/
```

### Step 2: Update OpenClaw Config

```bash
# Backup existing config
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup

# Copy our config
cp openclaw.config.json ~/.openclaw/openclaw.json
```

### Step 3: Restart Gateway

```bash
# Stop gateway (Ctrl+C)
# Start again
openclaw gateway --port 18789 --verbose
```

---

## 🧪 Test Multi-Agent System

### Test Coordinator Agent

```bash
openclaw agent --message "What can you do?" --agent coordinator
```

**Expected:** Response about routing missions and selecting guilds

### Test Writer Agent

```bash
openclaw agent --message "Write a meme about Ethereum gas fees" --agent writer
```

**Expected:** Short, funny meme copy (no explanations)

### Test Director Agent

```bash
openclaw agent --message "Design visual for: 'Ethereum: expensive but worth it'" --agent director
```

**Expected:** FORMAT, LAYOUT, ELEMENTS, STYLE, MOOD

---

## 🎯 Test Full Mission Flow via Telegram

1. Message your bot: `create a meme about Monad speed`
2. Coordinator should:
   - Receive message
   - Query on-chain (returns empty for now - expected)
   - Spawn writer agent
   - Spawn director agent
   - Return combined results

---

## 🐛 Troubleshooting

### Gateway Won't Start

```bash
# Check if port is in use
netstat -an | grep 18789

# Try different port
openclaw gateway --port 18790 --verbose
```

### Telegram Bot Not Responding

```bash
# Check channels
openclaw channels list

# Re-add Telegram
openclaw channels remove --channel telegram
openclaw channels add --channel telegram --token "YOUR_TOKEN"
```

### Agents Not Loading

```bash
# Check agent configs
ls -la ~/.openclaw/agents/

# Verify SOUL.md files exist
cat ~/.openclaw/agents/coordinator/SOUL.md
```

### UI Not Loading

```bash
# Check gateway logs
openclaw gateway --port 18789 --verbose

# Try accessing directly
curl http://127.0.0.1:18789/
```

---

## 📊 Verify Everything Works

### Checklist

- [ ] OpenClaw installed (`openclaw --version`)
- [ ] Gateway running (http://127.0.0.1:18789/)
- [ ] UI accessible in browser
- [ ] Telegram bot created
- [ ] Telegram channel added
- [ ] Bot responds to messages
- [ ] Agent configs copied
- [ ] Multi-agent spawning works

---

## 🔗 Next Steps

### 1. Connect to Blockchain (Person A)

Once Person A provides:
- Contract address
- Goldsky endpoint

Update `scripts/lib/monad.js` to query real on-chain data.

### 2. Implement Full Scripts (Person B)

Complete `scripts/coordinator.js` with:
- Real blockchain calls
- Mission creation
- Rating system

### 3. Build Frontend (Person B)

Create the Phaser.js world that visualizes on-chain state.

---

## 📚 Resources

- **OpenClaw Docs:** https://docs.openclaw.ai
- **Getting Started:** https://docs.openclaw.ai/start/getting-started
- **Channels:** https://docs.openclaw.ai/concepts/channels
- **Multi-Agent:** https://docs.openclaw.ai/concepts/multi-agent
- **Our Config:** `openclaw.config.json`
- **Our Agents:** `agents/*/SOUL.md`

---

## 🦞 Quick Commands Reference

```bash
# Start gateway
openclaw gateway --port 18789 --verbose

# Stop gateway
# Press Ctrl+C

# Check status
openclaw doctor

# List channels
openclaw channels list

# Add Telegram
openclaw channels add --channel telegram --token "TOKEN"

# Test agent
openclaw agent --message "Hello" --agent coordinator

# View logs
tail -f ~/.openclaw/logs/gateway.log

# Update OpenClaw
openclaw update --channel stable
```

---

**🎉 You should now have OpenClaw running with UI visible and Telegram bot working! 🚀**
