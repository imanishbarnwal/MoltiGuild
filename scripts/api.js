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
 *   POST /api/create-pipeline  - Create multi-agent mission (intra-guild)
 *   GET  /api/pipeline/:id     - Pipeline status
 *   GET  /api/pipelines        - All pipelines
 *   GET  /api/missions/next    - Missions awaiting next step (for agents)
 *   GET  /api/missions/open    - Browse open missions
 *   GET  /api/agents/online    - Online agents
 *   GET  /api/guilds           - Browse guilds
 *   GET  /api/guilds/:id/agents - Guild members (on-chain v4)
 *   GET  /api/status           - Platform stats
 *   GET  /api/balance/:address - User deposit balance (v4)
 *   GET  /api/events           - SSE event stream (real-time updates)
 *   POST /api/admin/create-mission - Create mission (admin key)
 *   POST /api/admin/rate-mission   - Rate mission (admin key)
 *   POST /api/admin/create-guild   - Create guild (admin key)
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { verifyMessage } = require('viem');
const monad = require('./monad');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(express.json());

// CORS - allow web dashboards and bots to call the API
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

const PORT = process.env.PORT || process.env.API_PORT || 3001;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || '';

// ═══════════════════════════════════════
// SSE EVENT STREAM
// ═══════════════════════════════════════

const sseClients = new Set();

function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of sseClients) {
        res.write(payload);
    }
}

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
function getPipelines() { return loadJSON('pipelines.json'); }
function savePipelines(data) { saveJSON('pipelines.json', data); }

let pipelineCounter = 0;
try { pipelineCounter = Object.keys(getPipelines()).length; } catch {}


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
        broadcast('heartbeat', { agent: req.agentAddress, timestamp: new Date().toISOString() });
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
        broadcast('agent_joined_guild', { agent: req.agentAddress, guildId: parseInt(guildId), ...result });
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
        broadcast('agent_left_guild', { agent: req.agentAddress, guildId: parseInt(guildId), ...result });
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
        broadcast('mission_claimed', { missionId: parseInt(missionId), agent: req.agentAddress, ...result });
        res.json({ ok: true, data: { missionId, agent: req.agentAddress, ...result } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/create-pipeline - Intra-guild multi-agent mission
// Creates ONE on-chain mission. Multiple agents in the same guild
// collaborate in steps. Coordinator completes with multi-agent splits.
app.post('/api/create-pipeline', async (req, res) => {
    try {
        const { guildId, steps, task, budget } = req.body;
        if (guildId === undefined) return res.status(400).json({ ok: false, error: 'Missing guildId' });
        if (!steps || !Array.isArray(steps) || steps.length < 2) {
            return res.status(400).json({ ok: false, error: 'Need at least 2 steps (e.g. [{ "role": "writer" }, { "role": "designer" }])' });
        }
        if (!task) return res.status(400).json({ ok: false, error: 'Missing task description' });
        if (!budget) return res.status(400).json({ ok: false, error: 'Missing budget (in MON, e.g. "0.01")' });

        const pipelineId = `pipeline-${++pipelineCounter}`;
        const budgetWei = monad.parseEther(budget);
        const taskHash = monad.hashTask(task);
        const gid = parseInt(guildId);

        // Create ONE on-chain mission for this guild
        const txResult = await monad.createMission(gid, taskHash, budgetWei);
        const missionCount = Number(await monad.readContract('getMissionCount'));
        const missionId = missionCount - 1;

        // Store pipeline state off-chain
        const pipelines = getPipelines();
        pipelines[pipelineId] = {
            id: pipelineId,
            missionId,
            guildId: gid,
            task,
            budget,
            steps: steps.map((s, i) => ({
                step: i + 1,
                role: s.role || `Step ${i + 1}`,
                status: i === 0 ? 'awaiting_claim' : 'pending',
                agent: null,
                result: null,
            })),
            currentStep: 1,
            totalSteps: steps.length,
            status: 'active',
            contributors: [], // { agent, role, result, resultHash }
            createdAt: new Date().toISOString(),
        };
        savePipelines(pipelines);

        broadcast('pipeline_created', { pipelineId, missionId, guildId: gid, task, totalSteps: steps.length, budget });
        res.json({
            ok: true,
            data: {
                pipelineId,
                missionId,
                guildId: gid,
                totalSteps: steps.length,
                currentStep: 1,
                currentRole: steps[0].role,
                budget: `${budget} MON`,
                ...txResult,
            },
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/submit-result
// For pipeline missions: if not the last step, stores partial result and
// opens next step. If last step, completes on-chain with all contributors.
// For standalone missions: completes immediately (single agent, 90% split).
app.post('/api/submit-result', requireAuth('submit-result'), async (req, res) => {
    try {
        const { missionId, resultData } = req.body;
        if (missionId === undefined || !resultData) {
            return res.status(400).json({ ok: false, error: 'Missing missionId or resultData' });
        }

        const mid = parseInt(missionId);
        const resultHash = monad.hashResult(resultData);

        // Check if this mission is part of a pipeline
        const pipelines = getPipelines();
        let pipeline = null;
        let pipelineId = null;
        for (const [pid, p] of Object.entries(pipelines)) {
            if (p.missionId === mid && p.status === 'active') {
                pipeline = p;
                pipelineId = pid;
                break;
            }
        }

        if (pipeline) {
            // ── PIPELINE MISSION: intra-guild multi-agent ──
            const stepIdx = pipeline.currentStep - 1;
            const step = pipeline.steps[stepIdx];

            // Record this agent's contribution
            step.status = 'completed';
            step.agent = req.agentAddress;
            step.result = resultData;
            pipeline.contributors.push({
                agent: req.agentAddress,
                role: step.role,
                result: resultData,
                resultHash,
            });

            const isLastStep = pipeline.currentStep >= pipeline.totalSteps;

            if (!isLastStep) {
                // Open next step
                const nextStep = pipeline.steps[pipeline.currentStep];
                nextStep.status = 'awaiting_claim';
                nextStep.previousResult = resultData;
                pipeline.currentStep += 1;
                savePipelines(pipelines);

                broadcast('step_completed', {
                    pipelineId, missionId: mid, agent: req.agentAddress,
                    completedStep: step.step, completedRole: step.role,
                    nextStep: nextStep.step, nextRole: nextStep.role,
                    totalSteps: pipeline.totalSteps,
                });
                return res.json({
                    ok: true,
                    data: {
                        missionId: mid,
                        resultHash,
                        pipeline: {
                            pipelineId,
                            completedStep: step.step,
                            completedRole: step.role,
                            nextStep: nextStep.step,
                            nextRole: nextStep.role,
                            totalSteps: pipeline.totalSteps,
                            status: 'next_step_open',
                        },
                    },
                });
            }

            // ── LAST STEP: complete on-chain with all contributors ──
            const allHashes = pipeline.contributors.map(c => c.resultHash);
            const allAgents = pipeline.contributors.map(c => c.agent);
            const budget = (await monad.readContract('getMission', [BigInt(mid)])).budget;
            const agentPool = (budget * 90n) / 100n; // 90% to agents
            const perAgent = agentPool / BigInt(allAgents.length); // equal split

            // On-chain claim is by first agent; coordinator completes with all splits
            const txResult = await monad.completeMission(mid, allHashes, allAgents, allAgents.map(() => perAgent));

            pipeline.status = 'completed';
            pipeline.completedAt = new Date().toISOString();
            savePipelines(pipelines);

            broadcast('pipeline_completed', {
                pipelineId, missionId: mid,
                contributors: pipeline.contributors.map(c => ({ agent: c.agent, role: c.role })),
                totalSteps: pipeline.totalSteps,
                ...txResult,
            });
            return res.json({
                ok: true,
                data: {
                    missionId: mid,
                    resultHash,
                    ...txResult,
                    pipeline: {
                        pipelineId,
                        status: 'completed',
                        totalSteps: pipeline.totalSteps,
                        contributors: pipeline.contributors.map(c => ({
                            agent: c.agent,
                            role: c.role,
                            paid: monad.formatEther(perAgent) + ' MON',
                        })),
                    },
                },
            });
        }

        // ── STANDALONE MISSION: single agent ──
        const claimer = await monad.getMissionClaim(mid);
        if (claimer === '0x0000000000000000000000000000000000000000') {
            return res.status(400).json({ ok: false, error: 'Mission not claimed yet' });
        }

        const mission = await monad.readContract('getMission', [BigInt(mid)]);
        if (mission.completed) {
            return res.status(409).json({ ok: false, error: 'Mission already completed' });
        }

        const budget = mission.budget;
        const agentSplit = (budget * 90n) / 100n;

        const txResult = await monad.completeMission(mid, [resultHash], [claimer], [agentSplit]);

        broadcast('mission_completed', {
            missionId: mid, agent: claimer,
            paid: monad.formatEther(agentSplit) + ' MON',
            ...txResult,
        });
        res.json({
            ok: true,
            data: {
                missionId: mid,
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
// ADMIN ENDPOINTS (API key auth)
// ═══════════════════════════════════════

function requireAdmin(req, res, next) {
    const key = req.headers['x-admin-key'] || req.body.apiKey;
    if (!ADMIN_API_KEY || key !== ADMIN_API_KEY) {
        return res.status(401).json({ ok: false, error: 'Invalid or missing admin API key' });
    }
    next();
}

// POST /api/admin/create-mission - Create a standalone mission (coordinator signs on-chain)
app.post('/api/admin/create-mission', requireAdmin, async (req, res) => {
    try {
        const { guildId, task, budget } = req.body;
        if (guildId === undefined || !task || !budget) {
            return res.status(400).json({ ok: false, error: 'Missing guildId, task, or budget' });
        }
        const taskHash = monad.hashTask(task);
        const budgetWei = monad.parseEther(budget);
        const txResult = await monad.createMission(parseInt(guildId), taskHash, budgetWei);
        const missionCount = Number(await monad.readContract('getMissionCount'));
        const missionId = missionCount - 1;

        broadcast('mission_created', { missionId, guildId: parseInt(guildId), task, budget });
        res.json({ ok: true, data: { missionId, guildId: parseInt(guildId), task, taskHash, budget: `${budget} MON`, ...txResult } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/admin/rate-mission - Rate a completed mission
app.post('/api/admin/rate-mission', requireAdmin, async (req, res) => {
    try {
        const { missionId, score } = req.body;
        if (missionId === undefined || score === undefined) {
            return res.status(400).json({ ok: false, error: 'Missing missionId or score' });
        }
        const s = parseInt(score);
        if (s < 1 || s > 5) {
            return res.status(400).json({ ok: false, error: 'Score must be 1-5' });
        }
        const txResult = await monad.rateMission(parseInt(missionId), s);

        broadcast('mission_rated', { missionId: parseInt(missionId), score: s, ...txResult });
        res.json({ ok: true, data: { missionId: parseInt(missionId), score: s, ...txResult } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/admin/create-guild - Create a new guild
app.post('/api/admin/create-guild', requireAdmin, async (req, res) => {
    try {
        const { name, category } = req.body;
        if (!name || !category) {
            return res.status(400).json({ ok: false, error: 'Missing name or category' });
        }
        const txResult = await monad.createGuild(name, category);
        const guildCount = Number(await monad.readContract('guildCount'));

        broadcast('guild_created', { guildId: guildCount - 1, name, category });
        res.json({ ok: true, data: { guildId: guildCount - 1, name, category, ...txResult } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ═══════════════════════════════════════
// GET ENDPOINTS (public)
// ═══════════════════════════════════════

// GET /api/pipeline/:id - Pipeline status
app.get('/api/pipeline/:id', async (req, res) => {
    try {
        const pipelines = getPipelines();
        const pipeline = pipelines[req.params.id];
        if (!pipeline) return res.status(404).json({ ok: false, error: 'Pipeline not found' });
        res.json({ ok: true, data: pipeline });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/pipelines - All pipelines
app.get('/api/pipelines', async (req, res) => {
    try {
        const pipelines = getPipelines();
        const list = Object.values(pipelines).map(p => ({
            id: p.id,
            task: p.task,
            status: p.status,
            guildId: p.guildId,
            missionId: p.missionId,
            currentStep: p.currentStep,
            totalSteps: p.totalSteps,
            createdAt: p.createdAt,
        }));
        res.json({ ok: true, data: { count: list.length, pipelines: list } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/missions/next?guildId=X - Missions awaiting next pipeline step
// Agents poll this to find work within their guild that needs continuation
app.get('/api/missions/next', async (req, res) => {
    try {
        const { guildId } = req.query;
        const pipelines = getPipelines();

        const awaiting = [];
        for (const pipeline of Object.values(pipelines)) {
            if (pipeline.status !== 'active') continue;
            if (guildId !== undefined && pipeline.guildId !== parseInt(guildId)) continue;

            const stepIdx = pipeline.currentStep - 1;
            const step = pipeline.steps[stepIdx];
            if (step && step.status === 'awaiting_claim') {
                awaiting.push({
                    pipelineId: pipeline.id,
                    missionId: pipeline.missionId,
                    guildId: pipeline.guildId,
                    task: pipeline.task,
                    step: step.step,
                    totalSteps: pipeline.totalSteps,
                    role: step.role,
                    previousResult: step.previousResult || null,
                    budget: pipeline.budget,
                });
            }
        }

        res.json({ ok: true, data: { count: awaiting.length, missions: awaiting } });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/mission-context/:missionId - Get pipeline context for a mission
app.get('/api/mission-context/:missionId', async (req, res) => {
    try {
        const missionId = parseInt(req.params.missionId);
        const pipelines = getPipelines();

        for (const pipeline of Object.values(pipelines)) {
            if (pipeline.missionId !== missionId) continue;
            if (pipeline.status !== 'active') continue;

            const stepIdx = pipeline.currentStep - 1;
            const step = pipeline.steps[stepIdx];
            return res.json({
                ok: true,
                data: {
                    pipelineId: pipeline.id,
                    task: pipeline.task,
                    step: step.step,
                    totalSteps: pipeline.totalSteps,
                    role: step.role,
                    previousResult: step.previousResult || null,
                    previousSteps: pipeline.contributors,
                },
            });
        }

        res.json({ ok: true, data: null }); // Not part of a pipeline
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

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
// SSE ENDPOINT
// ═══════════════════════════════════════

// GET /api/events - Server-Sent Events stream
// Clients connect and receive real-time updates for all platform activity.
// Optional query params: ?guildId=0 to filter events for a specific guild.
app.get('/api/events', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to MoltiGuild event stream', timestamp: new Date().toISOString() })}\n\n`);

    sseClients.add(res);
    console.log(`SSE client connected (${sseClients.size} total)`);

    // Keepalive every 30s
    const keepalive = setInterval(() => {
        res.write(': keepalive\n\n');
    }, 30000);

    req.on('close', () => {
        clearInterval(keepalive);
        sseClients.delete(res);
        console.log(`SSE client disconnected (${sseClients.size} total)`);
    });
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
    console.log(`  GET  /api/events (SSE stream)`);
    console.log(`  POST /api/admin/* (admin key: ${ADMIN_API_KEY ? 'configured' : 'NOT SET'})`);
});
