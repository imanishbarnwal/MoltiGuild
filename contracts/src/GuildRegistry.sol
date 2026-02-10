// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract GuildRegistry {

    // =========================
    // STRUCTS
    // =========================

    struct Agent {
        address wallet;
        string capability;
        uint256 priceWei;
        uint256 missionsCompleted;
        bool active;
    }

    struct Guild {
        string name;
        string category;
        address creator;
        uint256 totalMissions;
        uint256 totalRatingSum;
        uint256 ratingCount;
        bool active;
    }

    struct Mission {
        address client;
        uint256 guildId;
        bytes32 taskHash;
        uint256 budget;
        uint256 createdAt;
        uint256 completedAt;
        bool completed;
        bytes32[] resultHashes;
    }

    // =========================
    // STATE
    // =========================

    address public coordinator;

    mapping(address => Agent) public agents;
    address[] public agentList;

    mapping(uint256 => Guild) public guilds;
    uint256 public guildCount;

    Mission[] public missions;

    mapping(uint256 => uint8) public missionRatings;

    uint256 public totalFeesCollected;
    uint256 public totalMissionsCompleted;

    // =========================
    // EVENTS
    // =========================

    event AgentRegistered(address indexed agent, string capability, uint256 priceWei);
    event GuildCreated(uint256 indexed guildId, string name, string category, address creator);
    event MissionCreated(uint256 indexed missionId, uint256 indexed guildId, address indexed client, uint256 budget);
    event MissionCompleted(uint256 indexed missionId, uint256 indexed guildId, uint256 totalPaid);
    event MissionRated(uint256 indexed missionId, uint256 indexed guildId, uint8 score);
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
    // GUILD LOGIC
    // =========================

    function createGuild(
        string calldata name,
        string calldata category
    ) external returns (uint256 guildId) {
        require(bytes(name).length > 0, "Empty name");

        guildId = guildCount;

        guilds[guildId] = Guild({
            name: name,
            category: category,
            creator: msg.sender,
            totalMissions: 0,
            totalRatingSum: 0,
            ratingCount: 0,
            active: true
        });

        guildCount++;

        emit GuildCreated(guildId, name, category, msg.sender);
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

    function createMission(
        uint256 guildId,
        bytes32 taskHash
    ) external payable returns (uint256 missionId) {

        require(msg.value > 0, "Budget must be > 0");
        require(guildId < guildCount, "Invalid guild");
        require(guilds[guildId].active, "Guild inactive");

        missionId = missions.length;

        missions.push();
        Mission storage mission = missions[missionId];

        mission.client = msg.sender;
        mission.guildId = guildId;
        mission.taskHash = taskHash;
        mission.budget = msg.value;
        mission.createdAt = block.timestamp;
        mission.completed = false;

        guilds[guildId].totalMissions++;

        emit MissionCreated(missionId, guildId, msg.sender, msg.value);
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
            unchecked { totalSplit += splits[i]; }
        }

        require(totalSplit <= mission.budget, "Splits exceed budget");

        mission.completed = true;
        mission.completedAt = block.timestamp;
        mission.resultHashes = resultHashes;

        totalMissionsCompleted++;

        uint256 fee = mission.budget - totalSplit;
        if (fee > 0) {
            totalFeesCollected += fee;
        }

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

        emit MissionCompleted(missionId, mission.guildId, totalSplit);
    }

    // =========================
    // RATING LOGIC
    // =========================

    function rateMission(uint256 missionId, uint8 score) external {

        require(score >= 1 && score <= 5, "Invalid score");
        require(missionId < missions.length, "Invalid mission");

        Mission storage mission = missions[missionId];

        require(mission.completed, "Not completed");
        require(msg.sender == mission.client, "Not client");
        require(missionRatings[missionId] == 0, "Already rated");

        missionRatings[missionId] = score;

        Guild storage guild = guilds[mission.guildId];

        guild.totalRatingSum += score;
        guild.ratingCount += 1;

        emit MissionRated(missionId, mission.guildId, score);
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

    function getGuildReputation(uint256 guildId)
        external
        view
        returns (
            uint256 avgRatingScaled,
            uint256 totalMissions
        )
    {
        require(guildId < guildCount, "Invalid guild");

        Guild storage guild = guilds[guildId];

        if (guild.ratingCount == 0) {
            return (0, guild.totalMissions);
        }

        avgRatingScaled =
            (guild.totalRatingSum * 100) /
            guild.ratingCount;

        return (avgRatingScaled, guild.totalMissions);
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
