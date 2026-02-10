# Ultra-Simple Guide

## 🎯 Everything is Automatic in Docker!

### ✅ One Command

```bash
docker-compose -f infra/docker-compose.yml up -d --build
```

**Wait 1-2 minutes, then open:** http://localhost:18789/

**✅ UI appears automatically!**

---

## 👆 Only Manual: Create Telegram Bot

1. Open Telegram
2. Message **@BotFather**
3. Send: `/newbot`
4. Name: `AgentGuilds Bot`
5. Username: `agentguilds_bot`
6. Copy token

```bash
docker exec -it agentguilds openclaw channels add --channel telegram --token "PASTE_TOKEN"
```

**✅ Bot works!**

---

## 🎉 That's It!

**Automatic:**
- ✅ Everything in Docker
- ✅ Ollama starts
- ✅ OpenClaw installs
- ✅ Gateway starts
- ✅ UI appears
- ✅ Agents configured

**Manual:**
- 👆 Create bot with @BotFather (2 minutes)
- 👆 Open browser to see UI

---

**See START_HERE.md for detailed instructions! 🚀**
