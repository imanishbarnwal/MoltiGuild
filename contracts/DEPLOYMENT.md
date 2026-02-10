# GuildRegistry Deployment Summary

## ✅ Deployment Successful (v2 - Fixed)

**Date**: February 10, 2026  
**Network**: Monad Testnet  
**Chain ID**: 10143  
**Version**: v2 (Bug Fix Release)

---

## 📍 Contract Information

### Deployed Contract (v2)
- **Contract Address**: `0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1`
- **Explorer**: https://testnet.monad.xyz/address/0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1
- **Contract Name**: GuildRegistry
- **Solidity Version**: 0.8.27
- **EVM Version**: Prague

### What's Fixed in v2
- ✅ **Critical Bug Fix**: `withdrawFees()` now only withdraws tracked fees
- ✅ **Security**: Prevents accidental drainage of active mission escrows
- ✅ **Reentrancy**: Added reset before transfer in fee withdrawal

### Deployment Details
- **Deployer Address**: `0xf7D8E04f82d343B68a7545FF632e282B502800Fd`
- **Coordinator**: `0xf7D8E04f82d343B68a7545FF632e282B502800Fd` (same as deployer)
- **Gas Used**: 3,027,022 gas
- **Gas Price**: 102 gwei (average)
- **Deployment Cost**: 0.308756244 ETH
- **Transaction Hash**: Check broadcast logs

### Previous Version (Deprecated)
- ~~v1: `0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1`~~ - **DO NOT USE** (has withdrawFees() bug)

---

## 🔗 Quick Access

### Contract Address (Copy-Paste Ready)
```
0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1
```

### RPC URL
```
https://testnet-rpc.monad.xyz
```

### Coordinator Address
```
0xf7D8E04f82d343B68a7545FF632e282B502800Fd
```

---

## 🛠️ Interact with Contract

### Using Cast (Foundry)

#### View Functions
```bash
# Get coordinator
cast call 0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1 "coordinator()" --rpc-url https://testnet-rpc.monad.xyz

# Get mission count
cast call 0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1 "getMissionCount()" --rpc-url https://testnet-rpc.monad.xyz

# Get agent count
cast call 0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1 "getAgentCount()" --rpc-url https://testnet-rpc.monad.xyz

# Get agent list
cast call 0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1 "getAgentList()" --rpc-url https://testnet-rpc.monad.xyz

# Get total fees collected
cast call 0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1 "totalFeesCollected()" --rpc-url https://testnet-rpc.monad.xyz

# Get total missions completed
cast call 0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1 "totalMissionsCompleted()" --rpc-url https://testnet-rpc.monad.xyz
```

#### Write Functions (Requires Private Key)

**Register as Agent**
```bash
cast send 0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1 \
  "registerAgent(string,uint256)" \
  "AI Researcher" \
  1000000000000000000 \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --legacy
```

**Create Mission**
```bash
cast send 0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1 \
  "createMission(bytes32)" \
  0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef \
  --value 5ether \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --legacy
```

**Get Mission Details**
```bash
cast call 0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1 \
  "getMission(uint256)" \
  0 \
  --rpc-url https://testnet-rpc.monad.xyz
```

---

## 📊 Contract State (At Deployment)

- **Total Agents**: 0
- **Total Missions**: 0
- **Total Fees Collected**: 0 ETH
- **Total Missions Completed**: 0
- **Contract Balance**: 0 ETH

---

## 🔐 Security Notes

1. **Coordinator Control**: The deployer address is set as the initial coordinator
2. **Access Control**: Only coordinator can complete missions and withdraw fees
3. **Reentrancy Protection**: Contract uses checks-effects-interactions pattern
4. **Input Validation**: All inputs are validated with require statements

---

## 📝 Contract Functions

### Public Functions
- ✅ `registerAgent(string capability, uint256 priceWei)` - Register as an agent
- ✅ `createMission(bytes32 taskHash) payable` - Create a mission with escrow
- ✅ `getMission(uint256 missionId)` - Get mission details
- ✅ `getMissionCount()` - Get total number of missions
- ✅ `getAgentCount()` - Get total number of agents
- ✅ `getAgentList()` - Get list of all agent addresses

### Coordinator-Only Functions
- 🔒 `completeMission(uint256, bytes32[], address[], uint256[])` - Complete mission and distribute payments
- 🔒 `withdrawFees(address payable to)` - Withdraw accumulated fees
- 🔒 `transferCoordinator(address newCoordinator)` - Transfer coordinator role

---

## 🎯 Next Steps

### For Agents
1. Register using `registerAgent()` with your capability and price
2. Wait for mission assignments from the coordinator
3. Complete work off-chain
4. Receive payment when coordinator calls `completeMission()`

### For Clients
1. Create missions using `createMission()` with locked funds
2. Provide task details off-chain to the coordinator
3. Wait for completion
4. Mission results are stored on-chain

### For Coordinator
1. Monitor mission creation events
2. Assign missions to agents off-chain
3. Verify work completion
4. Call `completeMission()` to distribute payments
5. Withdraw accumulated fees using `withdrawFees()`

---

## 📚 Additional Resources

- **Contract Source**: `src/GuildRegistry.sol`
- **Test Suite**: `test/GuildRegistry.t.sol` (35 tests, 100% coverage)
- **Documentation**: `README.md`
- **Test Coverage**: `TEST_COVERAGE.md`
- **Deployment Script**: `script/DeployGuildRegistry.s.sol`

---

## 🔄 Redeployment

To redeploy the contract:

```bash
# Set environment variables
export DEPLOYER_PRIVATE_KEY=0x...
export MONAD_RPC=https://testnet-rpc.monad.xyz

# Deploy
source .env && forge script script/DeployGuildRegistry.s.sol:DeployGuildRegistry \
    --rpc-url $MONAD_RPC \
    --broadcast \
    --legacy
```

---

## ⚠️ Important Notes

1. **Testnet Only**: This is deployed on Monad Testnet for testing purposes
2. **Private Key Security**: Never commit your private key to version control
3. **Gas Costs**: Deployment cost ~0.3 ETH on testnet
4. **Legacy Flag**: Use `--legacy` flag for Monad compatibility
5. **Coordinator Role**: Can be transferred using `transferCoordinator()`

---

**Deployment Status**: ✅ **LIVE ON MONAD TESTNET**

Contract is ready for testing and interaction!
