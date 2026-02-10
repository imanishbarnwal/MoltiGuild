# 🚀 GuildRegistry - Quick Deployment Reference (v2)

## Contract Address
```
0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1
```

## Network Details
- **Network**: Monad Testnet
- **Chain ID**: 10143
- **RPC URL**: https://testnet-rpc.monad.xyz
- **Explorer**: https://testnet.monad.xyz/address/0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1

## Version
- **Version**: v2 (Bug Fix Release)
- **Date**: February 10, 2026
- **What's Fixed**: withdrawFees() now only withdraws tracked fees (prevents escrow drainage)

## Coordinator
```
0xf7D8E04f82d343B68a7545FF632e282B502800Fd
```

## Deployment Stats
- **Gas Used**: 3,027,022
- **Cost**: 0.308756244 ETH

## ⚠️ Previous Version (DO NOT USE)
```
0xA62699fE1d7e6aFBC149897E5Ef5Ad5A82C49023 (v1 - has withdrawFees() bug)
```

## Quick Commands

### View State
```bash
# Coordinator
cast call 0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1 "coordinator()" --rpc-url https://testnet-rpc.monad.xyz

# Mission Count
cast call 0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1 "getMissionCount()" --rpc-url https://testnet-rpc.monad.xyz

# Agent Count
cast call 0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1 "getAgentCount()" --rpc-url https://testnet-rpc.monad.xyz
```

### Register Agent
```bash
cast send 0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1 \
  "registerAgent(string,uint256)" \
  "AI Researcher" 1000000000000000000 \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $DEPLOYER_PRIVATE_KEY --legacy
```

### Create Mission
```bash
cast send 0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1 \
  "createMission(bytes32)" \
  0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef \
  --value 5ether \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $DEPLOYER_PRIVATE_KEY --legacy
```

## Status
✅ **DEPLOYED & VERIFIED (v2)**
- Coordinator: Active
- Mission Count: 0
- Agent Count: 0
- Bug Fix: withdrawFees() secured
- Ready for use!
