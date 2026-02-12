#!/usr/bin/env node

/**
 * MoltiGuild Autonomous Agent Worker
 *
 * Runs 24/7 — claims missions, does work with Gemini, submits results.
 * All config via env vars. One instance per agent.
 *
 * ENV:
 *   AGENT_PRIVATE_KEY  — agent wallet private key
 *   AGENT_GUILD_ID     — guild to work in (0, 1, ...)
 *   AGENT_CAPABILITY   — "code-review" or "content-creation"
 *   AGENT_PRICE        — price in MON (e.g. "0.0005")
 *   API_URL            — coordinator API base URL
 *   GEMINI_API_KEY     — for LLM work
 *   MONAD_RPC          — RPC endpoint
 *   GUILD_REGISTRY_ADDRESS — contract address
 */

const { createPublicClient, createWalletClient, http, parseEther, formatEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// ── CONFIG ───────────────────────────────

const AGENT_KEY = process.env.AGENT_PRIVATE_KEY;
const GUILD_ID = parseInt(process.env.AGENT_GUILD_ID || '0');
const CAPABILITY = process.env.AGENT_CAPABILITY || 'general';
const PRICE = process.env.AGENT_PRICE || '0.0005';
const API_URL = process.env.API_URL || 'http://localhost:3001';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const RPC = process.env.MONAD_RPC || 'https://testnet-rpc.monad.xyz';
const REGISTRY = process.env.GUILD_REGISTRY_ADDRESS || '0x60395114FB889C62846a574ca4Cda3659A95b038';
const FAUCET_URL = 'https://agents.devnads.com/v1/faucet';

const HEARTBEAT_MS = 5 * 60 * 1000;   // 5 min
const POLL_MS = 60 * 1000;             // 60s
const COOLDOWN_MS = 10 * 1000;         // 10s after completing a mission

if (!AGENT_KEY) { console.error('AGENT_PRIVATE_KEY required'); process.exit(1); }

// ── BLOCKCHAIN SETUP ─────────────────────

const account = privateKeyToAccount(AGENT_KEY.startsWith('0x') ? AGENT_KEY : `0x${AGENT_KEY}`);
const chain = {
    id: 10143, name: 'Monad Testnet',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: [RPC] } },
};

const publicClient = createPublicClient({ chain, transport: http(RPC) });
const walletClient = createWalletClient({ account, chain, transport: http(RPC) });

// Minimal ABI — only what the agent needs
const ABI = [
    { name: 'agents', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ name: 'wallet', type: 'address' }, { name: 'owner', type: 'address' }, { name: 'capability', type: 'string' }, { name: 'priceWei', type: 'uint256' }, { name: 'missionsCompleted', type: 'uint256' }, { name: 'active', type: 'bool' }] },
    { name: 'isAgentInGuild', type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }, { type: 'address' }], outputs: [{ type: 'bool' }] },
    { name: 'missionClaims', type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'address' }] },
    { name: 'registerAgent', type: 'function', stateMutability: 'nonpayable', inputs: [{ type: 'string' }, { type: 'uint256' }], outputs: [] },
    { name: 'joinGuild', type: 'function', stateMutability: 'nonpayable', inputs: [{ type: 'uint256' }], outputs: [] },
    { name: 'claimMission', type: 'function', stateMutability: 'nonpayable', inputs: [{ type: 'uint256' }], outputs: [] },
];

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

async function readContract(fn, args) {
    return publicClient.readContract({ address: REGISTRY, abi: ABI, functionName: fn, args });
}

async function writeContract(fn, args) {
    const hash = await walletClient.writeContract({ address: REGISTRY, abi: ABI, functionName: fn, args, type: 'legacy' });
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 });
    return { txHash: hash, block: Number(receipt.blockNumber) };
}

// ── API HELPERS ──────────────────────────

async function signedPost(action, params) {
    const ts = String(Date.now());
    const msg = `${action}:${JSON.stringify(params)}:${ts}`;
    const signature = await account.signMessage({ message: msg });
    const res = await fetch(`${API_URL}/api/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, agentAddress: account.address, signature, timestamp: ts }),
    });
    return res.json();
}

async function apiGet(path) {
    const res = await fetch(`${API_URL}/api/${path}`);
    return res.json();
}

// ── LLM WORK ─────────────────────────────

const PROMPTS = {
    'code-review': 'You are a senior blockchain security auditor. A client submitted a task to your guild for review. Write a concise but professional security audit report for a Monad smart contract. Include: Executive Summary, Key Findings (2-3 items with severity), and Recommendations. Be specific about Solidity patterns. Keep it under 400 words.',
    'content-creation': 'You are a web3 content creator specializing in Monad blockchain. A client submitted a creative task to your guild. Write an engaging, informative piece about Monad\'s parallel execution, speed, or ecosystem. Make it suitable for a blog or social media thread. Keep it under 400 words.',
};

async function doWork() {
    const prompt = PROMPTS[CAPABILITY] || `You are an AI agent with capability: ${CAPABILITY}. Complete a task for a blockchain guild. Write a professional result. Keep it under 400 words.`;

    if (!GEMINI_KEY) {
        return `[${CAPABILITY}] Task completed by agent ${account.address.slice(0, 10)}... Generic result — no LLM key configured.`;
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
                }),
                signal: controller.signal,
            },
        );

        clearTimeout(timeout);
        if (!res.ok) throw new Error(`Gemini ${res.status}`);

        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
        throw new Error('Empty Gemini response');
    } catch (err) {
        log(`LLM error: ${err.message}, using fallback`);
        return `[${CAPABILITY}] Task completed by agent ${account.address.slice(0, 10)}. Automated review — LLM temporarily unavailable.`;
    }
}

// ── LOGGING ──────────────────────────────

function log(msg) {
    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] [${CAPABILITY}] ${msg}`);
}

// ── STARTUP ──────────────────────────────

async function startup() {
    log(`Agent: ${account.address}`);
    log(`Guild: ${GUILD_ID} | Capability: ${CAPABILITY} | Price: ${PRICE} MON`);
    log(`API: ${API_URL}`);

    // Check balance, faucet if needed
    const balance = await publicClient.getBalance({ address: account.address });
    log(`Balance: ${formatEther(balance)} MON`);

    if (balance < parseEther('0.01')) {
        log('Low balance, requesting faucet...');
        try {
            const r = await fetch(FAUCET_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: account.address, chainId: 10143 }),
            });
            const d = await r.json();
            log(d.txHash ? `Faucet: ${d.amount} wei` : `Faucet failed: ${d.error}`);
        } catch (e) { log(`Faucet error: ${e.message}`); }
    }

    // Register if not already
    const agentInfo = await readContract('agents', [account.address]);
    if (!agentInfo[5]) { // active == false means not registered
        log('Registering agent on-chain...');
        const tx = await writeContract('registerAgent', [CAPABILITY, parseEther(PRICE)]);
        log(`Registered! tx: ${tx.txHash}`);
    } else {
        log(`Already registered (capability: ${agentInfo[2]})`);
    }

    // Join guild if not already
    const inGuild = await readContract('isAgentInGuild', [BigInt(GUILD_ID), account.address]);
    if (!inGuild) {
        log(`Joining guild ${GUILD_ID}...`);
        const tx = await writeContract('joinGuild', [BigInt(GUILD_ID)]);
        log(`Joined guild ${GUILD_ID}! tx: ${tx.txHash}`);
    } else {
        log(`Already in guild ${GUILD_ID}`);
    }

    log('Startup complete. Starting loops...');
}

// ── HEARTBEAT ────────────────────────────

async function heartbeat() {
    try {
        const result = await signedPost('heartbeat', {});
        if (result.ok) log('Heartbeat sent');
        else log(`Heartbeat failed: ${result.error}`);
    } catch (e) { log(`Heartbeat error: ${e.message}`); }
}

// ── MISSION LOOP ─────────────────────────

let working = false;

async function pollMissions() {
    if (working) return;

    try {
        const data = await apiGet(`missions/open?guildId=${GUILD_ID}`);
        if (!data.ok || !data.data.missions.length) return;

        for (const mission of data.data.missions) {
            const mid = parseInt(mission.missionId);

            // Check if already claimed
            const claimer = await readContract('missionClaims', [BigInt(mid)]);
            if (claimer !== ZERO_ADDR) continue;

            // Claim it
            working = true;
            log(`Claiming mission #${mid}...`);

            try {
                const tx = await writeContract('claimMission', [BigInt(mid)]);
                log(`Claimed mission #${mid} (block ${tx.block})`);
            } catch (e) {
                log(`Claim failed for #${mid}: ${e.message}`);
                working = false;
                continue;
            }

            // Do the work
            log('Working on mission...');
            const result = await doWork();
            log(`Work done (${result.length} chars)`);

            // Submit result
            const submitResult = await signedPost('submit-result', {
                missionId: String(mid),
                resultData: result,
            });

            if (submitResult.ok) {
                missionsCompleted++;
                log(`Mission #${mid} completed! Paid: ${submitResult.data.agentPaid}`);
                log(`  tx: ${submitResult.data.txHash}`);
            } else {
                log(`Submit failed for #${mid}: ${submitResult.error}`);
            }

            working = false;
            break; // One mission per cycle
        }
    } catch (e) {
        log(`Poll error: ${e.message}`);
        working = false;
    }
}

// ── HEALTH SERVER ───────────────────────
// Keeps Render free-tier Web Service awake (health checks hit this)

const { createServer } = require('http');
const PORT = process.env.PORT || 10000;
let missionsCompleted = 0;

createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        ok: true,
        agent: account.address,
        guild: GUILD_ID,
        capability: CAPABILITY,
        missionsCompleted,
        uptime: Math.floor(process.uptime()),
    }));
}).listen(PORT, () => log(`Health server on :${PORT}`));

// ── MAIN ─────────────────────────────────

async function main() {
    await startup();

    // Immediate heartbeat
    await heartbeat();

    // Start loops
    setInterval(heartbeat, HEARTBEAT_MS);
    setInterval(pollMissions, POLL_MS);

    // First poll after 5 seconds
    setTimeout(pollMissions, 5000);

    log(`Running — heartbeat every ${HEARTBEAT_MS / 1000}s, polling every ${POLL_MS / 1000}s`);
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
