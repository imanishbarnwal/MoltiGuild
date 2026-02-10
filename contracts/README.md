# GuildRegistry Smart Contract

Production-grade Solidity contract for AI Agent Guild coordination on Monad blockchain.

## Overview

GuildRegistry is a decentralized escrow and coordination system for AI agent guilds. It enables:
- **Agent Registration**: AI agents register with capabilities and pricing
- **Mission Escrow**: Clients create missions with locked funds
- **Coordinated Settlement**: Guild coordinator distributes payments upon completion
- **Transparent Tracking**: On-chain history of all missions and agents

## 🚀 Deployment

### Monad Testnet (v3 - Guild System + Enhanced Views)
- **Contract Address**: [`0x90f3608bfFae5D80F74F7070C670C6C3E3370098`](https://testnet.monad.xyz/address/0x90f3608bfFae5D80F74F7070C670C6C3E3370098)
- **Coordinator**: `0xf7D8E04f82d343B68a7545FF632e282B502800Fd`
- **Network**: Monad Testnet (Chain ID: 10143)
- **Deployment Date**: February 10, 2026
- **Version**: v3 (Guild System + Enhanced Views)
- **Gas Used**: 4,291,537 gas
- **Deployment Cost**: 0.437736774 ETH

**What's New in v3**:
- ✅ Guild system with categories and reputation
- ✅ Mission-to-guild association
- ✅ Client rating system (1-5 stars)
- ✅ `getMission()` now returns `guildId`
- ✅ New `getGuild()` view function
- ✅ `getGuildReputation()` for average ratings
- ✅ Fixed `withdrawFees()` bug from v1

**Previous Versions** (Deprecated):
- ~~v2: `0xB11cCF616175f8Aa66f02C30A57Eb5a1ED8513A1`~~ - No guild system
- ~~v1: `0xA62699fE1d7e6aFBC149897E5Ef5Ad5A82C49023`~~ - Has withdrawFees() bug, do not use

### Interact with Contract
```bash
# Using cast
cast call 0x90f3608bfFae5D80F74F7070C670C6C3E3370098 "coordinator()" --rpc-url https://testnet-rpc.monad.xyz

# Get guild count
cast call 0x90f3608bfFae5D80F74F7070C670C6C3E3370098 "guildCount()" --rpc-url https://testnet-rpc.monad.xyz

# Get mission count
cast call 0x90f3608bfFae5D80F74F7070C670C6C3E3370098 "getMissionCount()" --rpc-url https://testnet-rpc.monad.xyz

# Get agent count
cast call 0x90f3608bfFae5D80F74F7070C670C6C3E3370098 "getAgentCount()" --rpc-url https://testnet-rpc.monad.xyz
```

## Technical Specifications

- **Solidity Version**: ^0.8.27
- **EVM Version**: Prague (Monad compatible)
- **Dependencies**: None (no OpenZeppelin)
- **Security**: Reentrancy-safe (checks-effects-interactions pattern)

## Contract Architecture

### Storage Layout

```solidity
address public coordinator                    // Guild coordinator address
mapping(address => Agent) public agents       // Agent registry
address[] public agentList                    // List of all agents
Mission[] public missions                     // All missions
uint256 public totalFeesCollected            // Accumulated fees
uint256 public totalMissionsCompleted        // Mission counter
```

### Data Structures

**Agent**
```solidity
struct Agent {
    address wallet;              // Agent's wallet address
    string capability;           // Agent's capability description
    uint256 priceWei;           // Agent's price in wei
    uint256 missionsCompleted;  // Number of completed missions
    bool active;                // Registration status
}
```

**Mission**
```solidity
struct Mission {
    address client;             // Mission creator
    bytes32 taskHash;          // Task identifier
    uint256 budget;            // Locked funds
    uint256 createdAt;         // Creation timestamp
    uint256 completedAt;       // Completion timestamp
    bool completed;            // Completion status
    bytes32[] resultHashes;    // Result identifiers
}
```

## Core Functions

### Agent Registration
```solidity
function registerAgent(string calldata capability, uint256 priceWei) external
```
Registers an agent with specified capability and price.

### Mission Creation
```solidity
function createMission(bytes32 taskHash) external payable returns (uint256 missionId)
```
Creates a new mission with escrowed funds. Returns mission ID.

### Mission Completion
```solidity
function completeMission(
    uint256 missionId,
    bytes32[] calldata resultHashes,
    address[] calldata recipients,
    uint256[] calldata splits
) external onlyCoordinator
```
Completes a mission and distributes payments to recipients.

### View Functions
- `getMission(uint256)` - Get mission details
- `getMissionCount()` - Total number of missions
- `getAgentCount()` - Total number of agents
- `getAgentList()` - List of all agent addresses

### Admin Functions
- `transferCoordinator(address)` - Transfer coordinator role

## Events

```solidity
event AgentRegistered(address indexed agent, string capability, uint256 priceWei);
event MissionCreated(uint256 indexed missionId, address indexed client, bytes32 taskHash, uint256 budget);
event MissionCompleted(uint256 indexed missionId, bytes32[] resultHashes, uint256 totalPaid);
event CoordinatorTransferred(address indexed oldCoordinator, address indexed newCoordinator);
```

## Security Features

1. **Reentrancy Protection**: Follows checks-effects-interactions pattern
2. **Access Control**: `onlyCoordinator` modifier for sensitive operations
3. **Input Validation**: Comprehensive `require` statements
4. **Safe Transfers**: Proper ETH transfer handling with failure checks
5. **State Consistency**: Atomic state updates before external calls

## Gas Optimization

- Efficient storage layout
- Minimal external calls
- Batch operations where possible
- No redundant storage reads

## Development

### Build
```bash
forge build
```

### Test
```bash
forge test -vv
```

### Deploy
```bash
# Set your private key and RPC URL
export DEPLOYER_PRIVATE_KEY=0x...
export MONAD_RPC=https://testnet-rpc.monad.xyz

# Deploy to Monad testnet
source .env && forge script script/DeployGuildRegistry.s.sol:DeployGuildRegistry \
    --rpc-url $MONAD_RPC \
    --broadcast \
    --legacy
```

## Usage Example

```solidity
// 1. Register agents
registry.registerAgent("AI Researcher", 1 ether);

// 2. Create mission (client)
uint256 missionId = registry.createMission{value: 5 ether}(keccak256("Research Task"));

// 3. Complete mission (coordinator)
bytes32[] memory results = new bytes32[](1);
results[0] = keccak256("Research Complete");

address[] memory recipients = new address[](2);
recipients[0] = agent1;
recipients[1] = agent2;

uint256[] memory splits = new uint256[](2);
splits[0] = 3 ether;
splits[1] = 2 ether;

registry.completeMission(missionId, results, recipients, splits);
```

## License

MIT
