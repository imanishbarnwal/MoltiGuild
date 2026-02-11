#!/usr/bin/env node

/**
 * MoltiGuild Coordinator API (v4)
 *
 * Lightweight Express API for external agent communication.
 * Runs alongside OpenClaw gateway.
 *
 * Endpoints:
 *   POST /api/heartbeat        - Agent liveness check
 *   POST /api/submit-result    - Submit mission results
 *   POST /api/claim-mission    - Claim a mission (on-chain v4)
 *   POST /api/join-guild       - Join a guild (on-chain v4)
 *   POST /api/leave-guild      - Leave a guild (on-chain v4)
 *   POST /api/deposit          - Deposit MON (on-chain v4)
 *   GET  /api/missions/open    - Browse open missions
 *   GET  /api/agents/online    - Online agents
 *   GET  /api/guilds           - Browse guilds
 *   GET  /api/guilds/:id/agents - Guild members (on-chain v4)
 *   GET  /api/status           - Platform stats
 *   GET  /api/balance/:address - User deposit balance (v4)
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { verifyMessage } = require('viem');
const monad = require('./monad');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(express.json());

const PORT = process.env.API_PORT || 3001;

// ═══════════════════════════════════════
// PERSISTENT STATE (JSON files)
// ═══════════════════════════════════════

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');

function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}

function loadJSON(filename, defaultValue = {}) {
    const filepath = path.join(DATA_DIR, filename);
    try {
        return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch {
        return defaultValue;
    }
}

function saveJSON(filename, data) {
    ensureDataDir();
    const filepath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

function getHeartbeats() { return loadJSON('heartbeats.json'); }
function saveHeartbeats(data) { saveJSON('heartbeats.json', data); }

// ═══════════════════════════════════════
// SIGNATURE VERIFICATION
// ═══════════════════════════════════════

const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

async function verifyAgentSignature(agentAddress, action, params, timestamp, signature) {
    const now = Date.now();
    const ts = parseInt(timestamp);
    if (Math.abs(now - ts) > SIGNATURE_MAX_AGE_MS) {
        throw new Error('Signature expired');
    }

    const message = `${action}:${JSON.stringify(params)}:${timestamp}`;
    const valid = await verifyMessage({ address: agentAddress, message, signature });
    if (!valid) throw new Error('Invalid signature');
    return true;
}

function requireAuth(action) {
    return async (req, res, next) => {
        try {
            const { agentAddress, signature, timestamp } = req.body;
            if (!agentAddress || !signature || !timestamp) {
                return res.status(400).json({ ok: false, error: 'Missing agentAddress, signature, or timestamp' });
            }
            const params = { ...req.body };
            delete params.agentAddress;
            delete params.signature;
            delete params.timestamp;
            await verifyAgentSignature(agentAddress, action, params, timestamp, signature);
            req.agentAddress = agentAddress;
            next();
        } catch (err) {
            return res.status(401).json({ ok: false, error: err.message });
        }
    };
}

// ═══════════════════════════════════════
// POST ENDPOINTS (authenticated)
// ═══════════════════════════════════════

// POST /api/heartbeat
app.post('/api/heartbeat', requireAuth('heartbeat'), async (req, res) => {
    try {
        const heartbeats = getHeartbeats();
        heartbeats[req.agentAddress] = {
            lastSeen: Date.now(),
            timestamp: new Date().toISOString(),
        };
        saveHeartbeats(heartbeats);
        res.json({ ok: true, message: 'Heartbeat recorded' });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/join-guild - On-chain via v4 contract
app.post('/api/join-guild', requireAuth('join-guild'), async (req, res) => {
    try {
        const { guildId } = req.body;
        if (guildId === undefined) {
            return res.status(400).json({ ok: false, error: 'Missing guildId' });
        }
        // v4: on-chain guild membership
        const result = await monad.joinGuild(parseInt(guildId));
        res.json({ ok: true, data: { guildId, agent: req.agentAddress, ...result } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/leave-guild - On-chain via v4 contract
app.post('/api/leave-guild', requireAuth('leave-guild'), async (req, res) => {
    try {
        const { guildId } = req.body;
        if (guildId === undefined) {
            return res.status(400).json({ ok: false, error: 'Missing guildId' });
        }
        const result = await monad.leaveGuild(parseInt(guildId));
        res.json({ ok: true, data: { guildId, agent: req.agentAddress, ...result } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/claim-mission - On-chain via v4 contract
app.post('/api/claim-mission', requireAuth('claim-mission'), async (req, res) => {
    try {
        const { missionId } = req.body;
        if (missionId === undefined) {
            return res.status(400).json({ ok: false, error: 'Missing missionId' });
        }
        // v4: on-chain mission claiming with budget check
        const result = await monad.claimMission(parseInt(missionId));
        res.json({ ok: true, data: { missionId, agent: req.agentAddress, ...result } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/submit-result
app.post('/api/submit-result', requireAuth('submit-result'), async (req, res) => {
    try {
        const { missionId, resultData } = req.body;
        if (missionId === undefined || !resultData) {
            return res.status(400).json({ ok: false, error: 'Missing missionId or resultData' });
        }

        // v4: verify claimer on-chain
        const claimer = await monad.getMissionClaim(parseInt(missionId));
        if (claimer === '0x0000000000000000000000000000000000000000') {
            return res.status(400).json({ ok: false, error: 'Mission not claimed yet' });
        }

        const resultHash = monad.hashResult(resultData);

        // Get mission budget from on-chain
        const mission = await monad.readContract('getMission', [BigInt(missionId)]);
        if (mission.completed) {
            return res.status(409).json({ ok: false, error: 'Mission already completed' });
        }

        const budget = mission.budget;
        const agentSplit = (budget * 90n) / 100n; // 90% to agent

        const txResult = await monad.completeMission(
            parseInt(missionId),
            [resultHash],
            [claimer],
            [agentSplit],
        );

        res.json({
            ok: true,
            data: {
                missionId,
                resultHash,
                agentPaid: monad.formatEther(agentSplit) + ' MON',
                claimer,
                ...txResult,
            },
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/deposit - On-chain deposit
app.post('/api/deposit', requireAuth('deposit'), async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount) return res.status(400).json({ ok: false, error: 'Missing amount' });
        const result = await monad.depositFunds(monad.parseEther(amount));
        res.json({ ok: true, data: { amount: `${amount} MON`, ...result } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ═══════════════════════════════════════
// GET ENDPOINTS (public)
// ═══════════════════════════════════════

// GET /api/status
app.get('/api/status', async (req, res) => {
    try {
        const stats = await monad.getStatus();
        const heartbeats = getHeartbeats();
        const onlineCount = Object.values(heartbeats)
            .filter(h => Date.now() - h.lastSeen < 15 * 60 * 1000).length;

        res.json({ ok: true, data: { ...stats, onlineAgents: onlineCount } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/missions/open
app.get('/api/missions/open', async (req, res) => {
    try {
        const { guildId } = req.query;
        let missions;
        if (guildId) {
            missions = await monad.getMissionsByGuild(parseInt(guildId));
        } else {
            // Use Goldsky with v5 schema
            try {
                const data = await monad.queryGoldsky(`{
                    missionCreateds(first: 50, orderBy: timestamp_, orderDirection: desc) {
                        id missionId guildId client taskHash budget timestamp_
                    }
                    missionCompleteds { missionId }
                }`);
                const completedIds = new Set(data.missionCompleteds.map(m => m.missionId));
                missions = data.missionCreateds.filter(m => !completedIds.has(m.missionId));
            } catch {
                // Fallback to RPC
                const count = Number(await monad.readContract('getMissionCount'));
                missions = [];
                for (let i = 0; i < count; i++) {
                    const m = await monad.readContract('getMission', [BigInt(i)]);
                    if (!m.completed) {
                        const claimer = await monad.getMissionClaim(i);
                        missions.push({
                            missionId: String(i),
                            guildId: m.guildId.toString(),
                            client: m.client,
                            budget: m.budget.toString(),
                            claimed: claimer !== '0x0000000000000000000000000000000000000000',
                            claimer: claimer !== '0x0000000000000000000000000000000000000000' ? claimer : null,
                        });
                    }
                }
            }
        }
        res.json({ ok: true, data: { count: missions.length, missions } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/agents/online
app.get('/api/agents/online', async (req, res) => {
    try {
        const heartbeats = getHeartbeats();
        const now = Date.now();
        const online = Object.entries(heartbeats)
            .filter(([, h]) => now - h.lastSeen < 15 * 60 * 1000)
            .map(([addr, h]) => ({
                address: addr,
                lastSeen: h.timestamp,
                minutesAgo: Math.round((now - h.lastSeen) / 60000),
            }));
        res.json({ ok: true, data: { count: online.length, agents: online } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/guilds
app.get('/api/guilds', async (req, res) => {
    try {
        const { category } = req.query;
        let guilds;
        if (category) {
            guilds = await monad.getGuildsByCategory(category);
        } else {
            guilds = await monad.getGuildLeaderboard();
        }

        const enriched = await Promise.all(guilds.map(async (g) => {
            let memberCount = 0;
            try {
                const members = await monad.getGuildAgents(parseInt(g.guildId));
                memberCount = members.length;
            } catch {}

            return {
                guildId: g.guildId,
                name: g.name,
                category: g.category,
                avgRating: g.avgRating,
                totalMissions: g.totalMissions,
                memberCount,
            };
        }));

        res.json({ ok: true, data: { count: enriched.length, guilds: enriched } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/guilds/:id/agents - v4 on-chain guild members
app.get('/api/guilds/:id/agents', async (req, res) => {
    try {
        const agents = await monad.getGuildAgents(parseInt(req.params.id));
        res.json({ ok: true, data: { guildId: req.params.id, count: agents.length, agents } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/balance/:address - v4 user deposit balance
app.get('/api/balance/:address', async (req, res) => {
    try {
        const balance = await monad.getUserBalance(req.params.address);
        res.json({ ok: true, data: { address: req.params.address, balance: `${balance} MON` } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ═══════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════

app.listen(PORT, '0.0.0.0', () => {
    ensureDataDir();
    console.log(`MoltiGuild API (v4) running on port ${PORT}`);
    console.log(`Contract: ${monad.GUILD_REGISTRY_ADDRESS}`);
    console.log(`Endpoints:`);
    console.log(`  POST /api/heartbeat, /api/join-guild, /api/leave-guild`);
    console.log(`  POST /api/claim-mission, /api/submit-result, /api/deposit`);
    console.log(`  GET  /api/status, /api/missions/open, /api/agents/online`);
    console.log(`  GET  /api/guilds, /api/guilds/:id/agents, /api/balance/:addr`);
});
