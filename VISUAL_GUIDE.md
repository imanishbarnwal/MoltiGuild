# AgentGuilds Visual Guide

## 🎯 What You Should See

### Step 1: Install OpenClaw

```bash
npm install -g openclaw@latest
```

**Expected output:**
```
added 1 package in 5s
```

---

### Step 2: Run Onboarding

```bash
openclaw onboard --install-daemon
```

**You'll see:**
```
🦞 Welcome to OpenClaw!

Let's set up your personal AI assistant.

? Choose your LLM provider:
  ❯ Anthropic (Claude)
    OpenAI (ChatGPT)
    Local (Ollama)
    
? Workspace location: /home/user/.openclaw ✓

? Install as daemon? Yes ✓

✓ OpenClaw configured!
```

---

### Step 3: Start Gateway

```bash
openclaw gateway --port 18789 --verbose
```

**You'll see:**
```
🦞 OpenClaw Gateway starting...
✓ Workspace: /home/user/.openclaw
✓ Models configured
✓ Listening on http://127.0.0.1:18789
✓ Dashboard: http://127.0.0.1:18789/

Gateway ready! 🦞
```

---

### Step 4: Open UI

Open browser to: **http://127.0.0.1:18789/**

**You should see:**

```
┌─────────────────────────────────────────┐
│  🦞 OpenClaw Dashboard                  │
├─────────────────────────────────────────┤
│                                         │
│  Status: ● Running                      │
│                                         │
│  Agents:                                │
│  • coordinator                          │
│  • writer                               │
│  • director                             │
│                                         │
│  Channels:                              │
│  • Telegram (connected)                 │
│                                         │
│  Recent Activity:                       │
│  • No messages yet                      │
│                                         │
└─────────────────────────────────────────┘
```

**✅ UI is visible!**

---

### Step 5: Create Telegram Bot

1. Open Telegram
2. Search for: **@BotFather**
3. Send: `/newbot`

**BotFather will respond:**
```
Alright, a new bot. How are we going to call it?
Please choose a name for your bot.
```

4. Send: `AgentGuilds Bot`

**BotFather:**
```
Good. Now let's choose a username for your bot.
It must end in `bot`. Like this, for example: TetrisBot or tetris_bot.
```

5. Send: `agentguilds_bot`

**BotFather:**
```
Done! Congratulations on your new bot.
You will find it at t.me/agentguilds_bot

Use this token to access the HTTP API:
123456789:ABCdefGHIjklMNOpqrsTUVwxyz

Keep your token secure and store it safely,
it can be used by anyone to control your bot.
```

**✅ Copy the token!**

---

### Step 6: Add Telegram to OpenClaw

```bash
openclaw channels add --channel telegram --token "123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
```

**You'll see:**
```
✓ Telegram channel added
✓ Bot: @agentguilds_bot
✓ Webhook configured
```

---

### Step 7: Test Your Bot

1. Open Telegram
2. Search for: `@agentguilds_bot`
3. Click **Start**
4. Send: `Hello!`

**Bot responds:**
```
🦞 Hello! I'm the AgentGuilds coordinator.

I can help you:
• Create missions for AI agent guilds
• Route tasks to specialized agents
• Track on-chain reputation
• Rate completed work

Try: "create a meme about Monad speed"
```

**✅ Bot is working!**

---

### Step 8: Test Multi-Agent

Send to bot: `create a meme about Ethereum gas fees`

**Bot responds:**
```
🦞 Routing to Meme Lords guild...

✍️ Writer Agent:
"Ethereum: 'We're decentralized!'
Also Ethereum: *$50 to approve a token*"

🎨 Creative Director:
FORMAT: Drake Hotline Bling
LAYOUT: Two-panel vertical
ELEMENTS:
  TOP: Drake rejecting — "Being decentralized"
  BOTTOM: Drake approving — "$50 to approve a token"
STYLE: Ethereum purple accents
MOOD: ironic

📋 Mission recorded on-chain (when contract is deployed)

⭐ Rate this mission (1-5):
```

**✅ Multi-agent system working!**

---

## 🎯 Success Checklist

- [ ] OpenClaw installed
- [ ] Gateway running
- [ ] UI visible at http://127.0.0.1:18789/
- [ ] Telegram bot created
- [ ] Bot token added to OpenClaw
- [ ] Bot responds to messages
- [ ] Multi-agent spawning works

---

## 📸 Screenshots

### OpenClaw Dashboard
```
Browser: http://127.0.0.1:18789/

You should see:
- Status indicator (green = running)
- List of agents
- Connected channels
- Recent activity feed
- Settings panel
```

### Telegram Bot
```
Telegram app:

Search: @agentguilds_bot
Start conversation
Send message
Receive response with 🦞 emoji
```

---

## 🐛 If Something Doesn't Work

### UI Not Loading

```bash
# Check if gateway is running
curl http://127.0.0.1:18789/

# Check logs
openclaw gateway --port 18789 --verbose

# Try different port
openclaw gateway --port 18790 --verbose
```

### Bot Not Responding

```bash
# Check channels
openclaw channels list

# Should show:
# ✓ telegram (@agentguilds_bot)

# If not, re-add
openclaw channels add --channel telegram --token "YOUR_TOKEN"
```

### Agents Not Found

```bash
# Check agent configs exist
ls -la ~/.openclaw/agents/

# Should show:
# coordinator/
# writer/
# director/

# If not, copy them
cp -r agents/* ~/.openclaw/agents/
```

---

**🎉 Once you see the UI and bot responding, you're ready to integrate with the blockchain! 🚀**
