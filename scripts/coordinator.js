#!/usr/bin/env node

/**
 * AgentGuilds Coordinator CLI
 *
 * Usage:
 *   node coordinator.js status
 *   node coordinator.js guild-info --category meme
 *   node coordinator.js create --guild 0 --task "..." --budget 0.001
 *   node coordinator.js complete --mission 0 --results "..." --recipients "0x...,0x..." --splits "0.001,0.001"
 *   node coordinator.js rate --mission 0 --score 5
 *   node coordinator.js create-guild --name "..." --category "..."
 *   node coordinator.js register --capability "..." --price 0.001
 *   node coordinator.js faucet --address 0x...
 */

const monad = require('./monad');

const [, , command, ...args] = process.argv;

function parseFlags(args) {
    const flags = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].replace('--', '');
            flags[key] = args[i + 1] || '';
            i++;
        }
    }
    return flags;
}

const flags = parseFlags(args);

function output(data) {
    console.log(JSON.stringify(data, null, 2));
}

async function main() {
    switch (command) {
        case 'status': {
            const stats = await monad.getStatus();
            const onChain = await monad.getOnChainStatus();
            output({
                ok: true,
                data: {
                    ...stats,
                    onChain,
                },
            });
            break;
        }

        case 'guild-info': {
            if (!flags.category) {
                output({ ok: false, error: 'Missing --category flag' });
                return;
            }
            const guilds = await monad.getGuildsByCategory(flags.category);
            output({
                ok: true,
                data: {
                    category: flags.category,
                    count: guilds.length,
                    guilds: guilds.map(g => ({
                        guildId: g.guildId,
                        name: g.name,
                        category: g.category,
                        totalMissions: g.totalMissions,
                        completedMissions: g.completedMissions,
                        avgRating: g.avgRating,
                    })),
                },
            });
            break;
        }

        case 'create': {
            if (!flags.guild || !flags.task) {
                output({ ok: false, error: 'Missing --guild and/or --task flags' });
                return;
            }
            const budget = flags.budget || '0.001';
            const taskHash = monad.hashTask(flags.task);
            const budgetWei = monad.parseEther(budget);
            const result = await monad.createMission(parseInt(flags.guild), taskHash, budgetWei);
            output({
                ok: true,
                data: {
                    task: flags.task,
                    taskHash,
                    guildId: flags.guild,
                    budget: `${budget} MON`,
                    ...result,
                },
            });
            break;
        }

        case 'complete': {
            if (!flags.mission || !flags.results || !flags.recipients || !flags.splits) {
                output({ ok: false, error: 'Missing required flags: --mission, --results, --recipients, --splits' });
                return;
            }
            const resultHashes = flags.results.split(',').map(r => monad.hashResult(r.trim()));
            const recipients = flags.recipients.split(',').map(r => r.trim());
            const splits = flags.splits.split(',').map(s => monad.parseEther(s.trim()));
            const result = await monad.completeMission(
                parseInt(flags.mission),
                resultHashes,
                recipients,
                splits,
            );
            output({
                ok: true,
                data: {
                    missionId: flags.mission,
                    recipients,
                    ...result,
                },
            });
            break;
        }

        case 'rate': {
            if (!flags.mission || !flags.score) {
                output({ ok: false, error: 'Missing --mission and/or --score flags' });
                return;
            }
            const score = parseInt(flags.score);
            if (score < 1 || score > 5) {
                output({ ok: false, error: 'Score must be between 1 and 5' });
                return;
            }
            const result = await monad.rateMission(parseInt(flags.mission), score);
            output({
                ok: true,
                data: {
                    missionId: flags.mission,
                    score,
                    ...result,
                },
            });
            break;
        }

        case 'create-guild': {
            if (!flags.name || !flags.category) {
                output({ ok: false, error: 'Missing --name and/or --category flags' });
                return;
            }
            const result = await monad.createGuild(flags.name, flags.category);
            output({
                ok: true,
                data: {
                    name: flags.name,
                    category: flags.category,
                    ...result,
                },
            });
            break;
        }

        case 'register': {
            if (!flags.capability) {
                output({ ok: false, error: 'Missing --capability flag' });
                return;
            }
            const price = flags.price || '0';
            const priceWei = monad.parseEther(price);
            const result = await monad.registerAgent(flags.capability, priceWei);
            output({
                ok: true,
                data: {
                    capability: flags.capability,
                    price: `${price} MON`,
                    ...result,
                },
            });
            break;
        }

        case 'faucet': {
            if (!flags.address) {
                output({ ok: false, error: 'Missing --address flag' });
                return;
            }
            const result = await monad.requestFaucet(flags.address);
            output({
                ok: true,
                data: result,
            });
            break;
        }

        case 'leaderboard': {
            const guilds = await monad.getGuildLeaderboard();
            output({
                ok: true,
                data: {
                    count: guilds.length,
                    guilds: guilds.map((g, i) => ({
                        rank: i + 1,
                        guildId: g.guildId,
                        name: g.name,
                        category: g.category,
                        avgRating: g.avgRating,
                        totalMissions: g.totalMissions,
                    })),
                },
            });
            break;
        }

        case 'mission': {
            if (!flags.id) {
                output({ ok: false, error: 'Missing --id flag' });
                return;
            }
            const mission = await monad.getMissionDetails(parseInt(flags.id));
            output({
                ok: true,
                data: mission,
            });
            break;
        }

        case 'agents': {
            const agents = await monad.getAgents();
            output({
                ok: true,
                data: {
                    count: agents.length,
                    agents,
                },
            });
            break;
        }

        case 'activity': {
            const activity = await monad.getRecentActivity();
            output({
                ok: true,
                data: activity,
            });
            break;
        }

        // ─── V4 Commands ───

        case 'join-guild': {
            if (!flags.guild) { output({ ok: false, error: 'Missing --guild flag' }); return; }
            const result = await monad.joinGuild(parseInt(flags.guild));
            output({ ok: true, data: { guildId: flags.guild, action: 'joined', ...result } });
            break;
        }

        case 'leave-guild': {
            if (!flags.guild) { output({ ok: false, error: 'Missing --guild flag' }); return; }
            const result = await monad.leaveGuild(parseInt(flags.guild));
            output({ ok: true, data: { guildId: flags.guild, action: 'left', ...result } });
            break;
        }

        case 'claim': {
            if (!flags.mission) { output({ ok: false, error: 'Missing --mission flag' }); return; }
            const result = await monad.claimMission(parseInt(flags.mission));
            output({ ok: true, data: { missionId: flags.mission, action: 'claimed', ...result } });
            break;
        }

        case 'cancel': {
            if (!flags.mission) { output({ ok: false, error: 'Missing --mission flag' }); return; }
            const result = await monad.cancelMission(parseInt(flags.mission));
            output({ ok: true, data: { missionId: flags.mission, action: 'cancelled', ...result } });
            break;
        }

        case 'deposit': {
            if (!flags.amount) { output({ ok: false, error: 'Missing --amount flag' }); return; }
            const result = await monad.depositFunds(monad.parseEther(flags.amount));
            output({ ok: true, data: { amount: `${flags.amount} MON`, action: 'deposited', ...result } });
            break;
        }

        case 'balance': {
            if (!flags.address) { output({ ok: false, error: 'Missing --address flag' }); return; }
            const balance = await monad.getUserBalance(flags.address);
            output({ ok: true, data: { address: flags.address, balance: `${balance} MON` } });
            break;
        }

        case 'guild-agents': {
            if (!flags.guild) { output({ ok: false, error: 'Missing --guild flag' }); return; }
            const agents = await monad.getGuildAgents(parseInt(flags.guild));
            output({ ok: true, data: { guildId: flags.guild, count: agents.length, agents } });
            break;
        }

        case 'create-from-balance': {
            if (!flags.guild || !flags.task || !flags.budget) {
                output({ ok: false, error: 'Missing --guild, --task, and/or --budget flags' }); return;
            }
            const taskHash = monad.hashTask(flags.task);
            const result = await monad.createMissionFromBalance(
                parseInt(flags.guild), taskHash, monad.parseEther(flags.budget)
            );
            output({ ok: true, data: { task: flags.task, taskHash, guildId: flags.guild, budget: `${flags.budget} MON`, ...result } });
            break;
        }

        default:
            output({
                ok: false,
                error: `Unknown command: ${command}`,
                usage: [
                    'status', 'guild-info --category X', 'leaderboard',
                    'create --guild 0 --task "..." --budget 0.001',
                    'complete --mission 0 --results "..." --recipients "0x..." --splits "0.001"',
                    'rate --mission 0 --score 5',
                    'create-guild --name "..." --category "..."',
                    'register --capability "..." --price 0.001',
                    'join-guild --guild 0', 'leave-guild --guild 0',
                    'claim --mission 0', 'cancel --mission 0',
                    'deposit --amount 0.01', 'balance --address 0x...',
                    'guild-agents --guild 0', 'create-from-balance --guild 0 --task "..." --budget 0.001',
                    'faucet --address 0x...', 'mission --id 0', 'agents', 'activity',
                ],
            });
    }
}

main().catch(e => {
    output({ ok: false, error: e.message });
    process.exit(1);
});
