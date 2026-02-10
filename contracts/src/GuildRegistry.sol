// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract GuildRegistry {
    struct Agent {
        address wallet;
        string capability;
        uint256 priceWei;
        uint256 missionsCompleted;
        bool active;
    }

    struct Mission {
        address client;
        bytes32 taskHash;
        uint256 budget;
        uint256 createdAt;
        uint256 completedAt;
        bool completed;
        bytes32[] resultHashes;
    }

    address public coordinator;

    mapping(address => Agent) public agents;
    address[] public agentList;
    Mission[] public missions;

    uint256 public totalFeesCollected;
    uint256 public totalMissionsCompleted;

    event AgentRegistered(address indexed agent, string capability, uint256 priceWei);
    event MissionCreated(uint256 indexed missionId, address indexed client, bytes32 taskHash, uint256 budget);
    event MissionCompleted(uint256 indexed missionId, bytes32[] resultHashes, uint256 totalPaid);
    event CoordinatorTransferred(address indexed oldCoordinator, address indexed newCoordinator);
    event FeesWithdrawn(address indexed to, uint256 amount);

    modifier onlyCoordinator() {
        require(msg.sender == coordinator, "Not coordinator");
        _;
    }

    constructor() {
        coordinator = msg.sender;
    }

    // =========================
    // AGENT LOGIC
    // =========================

    function registerAgent(string calldata capability, uint256 priceWei) external {
        require(bytes(capability).length > 0, "Empty capability");

        if (!agents[msg.sender].active) {
            agentList.push(msg.sender);
        }

        agents[msg.sender] = Agent({
            wallet: msg.sender,
            capability: capability,
            priceWei: priceWei,
            missionsCompleted: agents[msg.sender].missionsCompleted,
            active: true
        });

        emit AgentRegistered(msg.sender, capability, priceWei);
    }

    // =========================
    // MISSION LOGIC
    // =========================

    function createMission(bytes32 taskHash) external payable returns (uint256 missionId) {
        require(msg.value > 0, "Budget must be > 0");

        missionId = missions.length;

        missions.push();
        Mission storage mission = missions[missionId];

        mission.client = msg.sender;
        mission.taskHash = taskHash;
        mission.budget = msg.value;
        mission.createdAt = block.timestamp;
        mission.completed = false;

        emit MissionCreated(missionId, msg.sender, taskHash, msg.value);
    }

    function completeMission(
        uint256 missionId,
        bytes32[] calldata resultHashes,
        address[] calldata recipients,
        uint256[] calldata splits
    ) external onlyCoordinator {
        require(missionId < missions.length, "Invalid mission ID");

        Mission storage mission = missions[missionId];

        require(!mission.completed, "Mission already completed");
        require(recipients.length == splits.length, "Length mismatch");
        require(recipients.length > 0, "No recipients");

        uint256 totalSplit = 0;

        for (uint256 i = 0; i < splits.length; i++) {
            require(recipients[i] != address(0), "Zero recipient");

            unchecked {
                totalSplit += splits[i];
            }
        }

        require(totalSplit <= mission.budget, "Splits exceed budget");

        // Effects
        mission.completed = true;
        mission.completedAt = block.timestamp;
        mission.resultHashes = resultHashes;

        totalMissionsCompleted++;

        uint256 fee = mission.budget - totalSplit;
        if (fee > 0) {
            totalFeesCollected += fee;
        }

        // Interactions
        for (uint256 i = 0; i < recipients.length; i++) {
            uint256 amount = splits[i];

            if (agents[recipients[i]].active) {
                agents[recipients[i]].missionsCompleted++;
            }

            if (amount > 0) {
                (bool success, ) = recipients[i].call{value: amount}("");
                require(success, "Transfer failed");
            }
        }

        emit MissionCompleted(missionId, resultHashes, totalSplit);
    }

    // =========================
    // ADMIN
    // =========================

    function withdrawFees(address payable to) external onlyCoordinator {
        require(to != address(0), "Invalid address");
        require(totalFeesCollected > 0, "No fees");

        uint256 amount = totalFeesCollected;
        totalFeesCollected = 0;

        (bool success, ) = to.call{value: amount}("");
        require(success, "Withdraw failed");

        emit FeesWithdrawn(to, amount);
    }

    function transferCoordinator(address newCoordinator) external onlyCoordinator {
        require(newCoordinator != address(0), "Invalid address");

        address oldCoordinator = coordinator;
        coordinator = newCoordinator;

        emit CoordinatorTransferred(oldCoordinator, newCoordinator);
    }

    // =========================
    // VIEWS
    // =========================

    function getMission(uint256 missionId)
        external
        view
        returns (
            address client,
            bytes32 taskHash,
            uint256 budget,
            uint256 createdAt,
            uint256 completedAt,
            bool completed,
            bytes32[] memory resultHashes
        )
    {
        require(missionId < missions.length, "Invalid mission ID");

        Mission storage mission = missions[missionId];

        return (
            mission.client,
            mission.taskHash,
            mission.budget,
            mission.createdAt,
            mission.completedAt,
            mission.completed,
            mission.resultHashes
        );
    }

    function getMissionCount() external view returns (uint256) {
        return missions.length;
    }

    function getAgentCount() external view returns (uint256) {
        return agentList.length;
    }

    function getAgentList() external view returns (address[] memory) {
        return agentList;
    }
}
