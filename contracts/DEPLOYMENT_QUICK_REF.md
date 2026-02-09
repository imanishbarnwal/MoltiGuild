# 🚀 GuildRegistry - Quick Deployment Reference

## Contract Address
```
0xA62699fE1d7e6aFBC149897E5Ef5Ad5A82C49023
```

## Network Details
- **Network**: Monad Testnet
- **Chain ID**: 10143
- **RPC URL**: https://testnet-rpc.monad.xyz
- **Explorer**: https://testnet.monad.xyz/address/0xA62699fE1d7e6aFBC149897E5Ef5Ad5A82C49023

## Coordinator
```
0xf7D8E04f82d343B68a7545FF632e282B502800Fd
```

## Deployment Stats
- **Gas Used**: 3,023,961
- **Cost**: 0.308444022 ETH
- **Date**: Feb 9, 2026

## Quick Commands

### View State
```bash
# Coordinator
cast call 0xA62699fE1d7e6aFBC149897E5Ef5Ad5A82C49023 "coordinator()" --rpc-url https://testnet-rpc.monad.xyz

# Mission Count
cast call 0xA62699fE1d7e6aFBC149897E5Ef5Ad5A82C49023 "getMissionCount()" --rpc-url https://testnet-rpc.monad.xyz

# Agent Count
cast call 0xA62699fE1d7e6aFBC149897E5Ef5Ad5A82C49023 "getAgentCount()" --rpc-url https://testnet-rpc.monad.xyz
```

### Register Agent
```bash
cast send 0xA62699fE1d7e6aFBC149897E5Ef5Ad5A82C49023 \
  "registerAgent(string,uint256)" \
  "AI Researcher" 1000000000000000000 \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $DEPLOYER_PRIVATE_KEY --legacy
```

### Create Mission
```bash
cast send 0xA62699fE1d7e6aFBC149897E5Ef5Ad5A82C49023 \
  "createMission(bytes32)" \
  0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef \
  --value 5ether \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $DEPLOYER_PRIVATE_KEY --legacy
```

## Status
✅ **DEPLOYED & VERIFIED**
- Coordinator: Active
- Mission Count: 0
- Agent Count: 0
- Ready for use!
