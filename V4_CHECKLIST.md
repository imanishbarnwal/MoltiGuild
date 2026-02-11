# V4 Implementation Checklist

## ✅ Contract Implementation (COMPLETE)

### Structs
- [x] Agent: Added `owner`, changed `role` → `capability`, added `priceWei`
- [x] Mission: No changes (as specified)
- [x] Guild: No changes (as specified)

### State Variables (7 new)
- [x] `_guildAgents` mapping
- [x] `_agentGuilds` mapping
- [x] `isAgentInGuild` mapping
- [x] `_agentInGuildCheck` mapping
- [x] `missionClaims` mapping
- [x] `userBalances` mapping
- [x] `missionTimeout` uint256

### Functions (11 new)
- [x] `joinGuild(uint256 guildId)`
- [x] `leaveGuild(uint256 guildId)`
- [x] `getGuildAgents(uint256 guildId)`
- [x] `getAgentGuilds(address agent)`
- [x] `claimMission(uint256 missionId)`
- [x] `cancelMission(uint256 missionId)`
- [x] `depositFunds()`
- [x] `withdrawFunds(uint256 amount)`
- [x] `createMissionFromBalance(...)`
- [x] `registerAgentWithWallet(...)`
- [x] `updateAgent(...)`

### Modified Functions (2)
- [x] `completeMission` - Added claimer check
- [x] `registerAgent` - Sets owner = msg.sender

### Events (6 new)
- [x] `AgentJoinedGuild`
- [x] `AgentLeftGuild`
- [x] `MissionCancelled`
- [x] `MissionClaimed`
- [x] `FundsDeposited`
- [x] `FundsWithdrawn`

### Modified Events (2)
- [x] `AgentRegistered` - Now `(wallet, capability, priceWei)`
- [x] `MissionCreated` - Now includes `budget`

### Constructor
- [x] Accepts `_coordinator` parameter
- [x] Sets `missionTimeout = 1800`

### Compilation
- [x] Compiles with `forge build --via-ir`
- [x] 629 lines of code
- [x] 24 functions total
- [x] 15 events total

## ✅ Deployment Script (COMPLETE)
- [x] Created `script/DeployGuildRegistryV4.s.sol`
- [x] Uses coordinator: `0xf7D8E04f82d343B68a7545FF632e282B502800Fd`
- [x] Follows V4 spec pattern

## ✅ Documentation (COMPLETE)
- [x] `V4_IMPLEMENTATION.md` - Implementation details
- [x] `V4_IMPLEMENTATION_SUMMARY.md` - Complete summary
- [x] `indexer/USAGE.md` - Updated with V4 queries

## ✅ Indexer Documentation (COMPLETE)
- [x] Documented 6 new event entities
- [x] Provided example queries for all new features
- [x] Documented breaking changes
- [x] Added migration notes

## ⏳ Not Done (Per User Request)

### Testing
- [ ] Create `test/GuildRegistryV4.t.sol`
- [ ] Implement 53 tests from specification
- [ ] Run full test suite

### Deployment
- [ ] Deploy to Monad Testnet
- [ ] Verify on block explorer
- [ ] Record deployed address

### Indexer Update
- [ ] Update `goldsky_config.json` with new address
- [ ] Deploy v5 subgraph
- [ ] Update `.env` with v5 endpoint
- [ ] Validate queries against live indexer

### Migration
- [ ] Re-register agents from V3
- [ ] Re-create guilds
- [ ] Have agents join guilds
- [ ] Update bot configuration

## 📊 Statistics

**Contract**: `src/GuildRegistryV4.sol`
- Lines of code: 629
- Functions: 24
- Events: 15
- State variables: 16 (9 from V3 + 7 new)
- New features: 11 functions, 6 events, 7 state variables

**Compliance**: 100% adherence to V4_REQUIREMENTS.md

**Status**: ✅ Ready for testing and deployment
