// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test, console} from "forge-std/Test.sol";
import {GuildRegistry} from "../src/GuildRegistry.sol";

contract GuildRegistryTest is Test {
    GuildRegistry public registry;
    
    address public coordinator;
    address public agent1;
    address public agent2;
    address public agent3;
    address public client;
    address public feeRecipient;
    
    event AgentRegistered(address indexed agent, string capability, uint256 priceWei);
    event MissionCreated(uint256 indexed missionId, address indexed client, bytes32 taskHash, uint256 budget);
    event MissionCompleted(uint256 indexed missionId, bytes32[] resultHashes, uint256 totalPaid);
    event CoordinatorTransferred(address indexed oldCoordinator, address indexed newCoordinator);
    event FeesWithdrawn(address indexed to, uint256 amount);

    function setUp() public {
        coordinator = address(this);
        agent1 = makeAddr("agent1");
        agent2 = makeAddr("agent2");
        agent3 = makeAddr("agent3");
        client = makeAddr("client");
        feeRecipient = makeAddr("feeRecipient");
        
        registry = new GuildRegistry();
    }

    // =========================
    // AGENT REGISTRATION TESTS
    // =========================

    function test_RegisterAgent_Success() public {
        vm.prank(agent1);
        vm.expectEmit(true, false, false, true);
        emit AgentRegistered(agent1, "AI Researcher", 1 ether);
        registry.registerAgent("AI Researcher", 1 ether);
        
        (address wallet, string memory capability, uint256 price, uint256 missions, bool active) = 
            registry.agents(agent1);
        
        assertEq(wallet, agent1);
        assertEq(capability, "AI Researcher");
        assertEq(price, 1 ether);
        assertEq(missions, 0);
        assertTrue(active);
        assertEq(registry.getAgentCount(), 1);
        
        address[] memory agentList = registry.getAgentList();
        assertEq(agentList.length, 1);
        assertEq(agentList[0], agent1);
    }

    function test_RegisterAgent_MultipleAgents() public {
        vm.prank(agent1);
        registry.registerAgent("AI Researcher", 1 ether);
        
        vm.prank(agent2);
        registry.registerAgent("Data Analyst", 0.5 ether);
        
        vm.prank(agent3);
        registry.registerAgent("Smart Contract Dev", 2 ether);
        
        assertEq(registry.getAgentCount(), 3);
        
        address[] memory agentList = registry.getAgentList();
        assertEq(agentList.length, 3);
        assertEq(agentList[0], agent1);
        assertEq(agentList[1], agent2);
        assertEq(agentList[2], agent3);
    }

    function test_RegisterAgent_UpdateExisting() public {
        // First registration
        vm.prank(agent1);
        registry.registerAgent("AI Researcher", 1 ether);
        
        (, , , uint256 missionsBefore, ) = registry.agents(agent1);
        assertEq(missionsBefore, 0);
        
        // Update registration (change capability and price)
        vm.prank(agent1);
        vm.expectEmit(true, false, false, true);
        emit AgentRegistered(agent1, "Senior AI Researcher", 2 ether);
        registry.registerAgent("Senior AI Researcher", 2 ether);
        
        (address wallet, string memory capability, uint256 price, uint256 missionsAfter, bool active) = 
            registry.agents(agent1);
        
        assertEq(wallet, agent1);
        assertEq(capability, "Senior AI Researcher");
        assertEq(price, 2 ether);
        assertEq(missionsAfter, 0); // Missions preserved
        assertTrue(active);
        
        // Should not add duplicate to agentList
        assertEq(registry.getAgentCount(), 1);
    }

    function test_RegisterAgent_PreservesMissionCount() public {
        // Register agent
        vm.prank(agent1);
        registry.registerAgent("AI Researcher", 1 ether);
        
        // Create and complete a mission to increment mission count
        vm.deal(client, 10 ether);
        vm.prank(client);
        uint256 missionId = registry.createMission{value: 5 ether}(keccak256("Task 1"));
        
        bytes32[] memory results = new bytes32[](1);
        results[0] = keccak256("Result");
        
        address[] memory recipients = new address[](1);
        recipients[0] = agent1;
        
        uint256[] memory splits = new uint256[](1);
        splits[0] = 5 ether;
        
        registry.completeMission(missionId, results, recipients, splits);
        
        (, , , uint256 missionsBefore, ) = registry.agents(agent1);
        assertEq(missionsBefore, 1);
        
        // Update agent registration
        vm.prank(agent1);
        registry.registerAgent("Senior AI Researcher", 2 ether);
        
        // Mission count should be preserved
        (, , , uint256 missionsAfter, ) = registry.agents(agent1);
        assertEq(missionsAfter, 1);
    }

    function test_RevertWhen_RegisterAgentWithEmptyCapability() public {
        vm.prank(agent1);
        vm.expectRevert("Empty capability");
        registry.registerAgent("", 1 ether);
    }

    // =========================
    // MISSION CREATION TESTS
    // =========================

    function test_CreateMission_Success() public {
        vm.deal(client, 10 ether);
        
        bytes32 taskHash = keccak256("Research blockchain scalability");
        
        vm.prank(client);
        vm.expectEmit(true, true, false, true);
        emit MissionCreated(0, client, taskHash, 5 ether);
        uint256 missionId = registry.createMission{value: 5 ether}(taskHash);
        
        assertEq(missionId, 0);
        assertEq(registry.getMissionCount(), 1);
        assertEq(address(registry).balance, 5 ether);
        
        (address missionClient, bytes32 storedTaskHash, uint256 budget, uint256 createdAt, 
         uint256 completedAt, bool completed, bytes32[] memory resultHashes) = registry.getMission(0);
        
        assertEq(missionClient, client);
        assertEq(storedTaskHash, taskHash);
        assertEq(budget, 5 ether);
        assertEq(createdAt, block.timestamp);
        assertEq(completedAt, 0);
        assertFalse(completed);
        assertEq(resultHashes.length, 0);
    }

    function test_CreateMission_MultipleMissions() public {
        vm.deal(client, 20 ether);
        
        vm.startPrank(client);
        uint256 mission1 = registry.createMission{value: 5 ether}(keccak256("Task 1"));
        uint256 mission2 = registry.createMission{value: 3 ether}(keccak256("Task 2"));
        uint256 mission3 = registry.createMission{value: 7 ether}(keccak256("Task 3"));
        vm.stopPrank();
        
        assertEq(mission1, 0);
        assertEq(mission2, 1);
        assertEq(mission3, 2);
        assertEq(registry.getMissionCount(), 3);
        assertEq(address(registry).balance, 15 ether);
    }

    function test_RevertWhen_CreateMissionWithZeroValue() public {
        vm.prank(client);
        vm.expectRevert("Budget must be > 0");
        registry.createMission{value: 0}(keccak256("Task 1"));
    }

    function test_RevertWhen_GetMissionInvalidId() public {
        vm.expectRevert("Invalid mission ID");
        registry.getMission(0);
        
        vm.deal(client, 5 ether);
        vm.prank(client);
        registry.createMission{value: 5 ether}(keccak256("Task"));
        
        vm.expectRevert("Invalid mission ID");
        registry.getMission(1);
    }

    // =========================
    // MISSION COMPLETION TESTS
    // =========================

    function test_CompleteMission_Success() public {
        // Register agents
        vm.prank(agent1);
        registry.registerAgent("AI Researcher", 1 ether);
        
        vm.prank(agent2);
        registry.registerAgent("Data Analyst", 0.5 ether);
        
        // Create mission
        vm.deal(client, 10 ether);
        vm.prank(client);
        uint256 missionId = registry.createMission{value: 5 ether}(keccak256("Task 1"));
        
        // Complete mission
        bytes32[] memory results = new bytes32[](2);
        results[0] = keccak256("Result 1");
        results[1] = keccak256("Result 2");
        
        address[] memory recipients = new address[](2);
        recipients[0] = agent1;
        recipients[1] = agent2;
        
        uint256[] memory splits = new uint256[](2);
        splits[0] = 3 ether;
        splits[1] = 2 ether;
        
        vm.expectEmit(true, false, false, true);
        emit MissionCompleted(missionId, results, 5 ether);
        registry.completeMission(missionId, results, recipients, splits);
        
        // Verify payments
        assertEq(agent1.balance, 3 ether);
        assertEq(agent2.balance, 2 ether);
        
        // Verify mission state
        (, , , , uint256 completedAt, bool completed, bytes32[] memory storedResults) = 
            registry.getMission(missionId);
        assertTrue(completed);
        assertEq(completedAt, block.timestamp);
        assertEq(storedResults.length, 2);
        assertEq(storedResults[0], results[0]);
        assertEq(storedResults[1], results[1]);
        
        // Verify agent mission counts
        (, , , uint256 agent1Missions, ) = registry.agents(agent1);
        (, , , uint256 agent2Missions, ) = registry.agents(agent2);
        assertEq(agent1Missions, 1);
        assertEq(agent2Missions, 1);
        
        // Verify global counters
        assertEq(registry.totalMissionsCompleted(), 1);
        assertEq(registry.totalFeesCollected(), 0); // No fees (splits = budget)
    }

    function test_CompleteMission_WithFees() public {
        vm.prank(agent1);
        registry.registerAgent("AI Researcher", 1 ether);
        
        vm.deal(client, 10 ether);
        vm.prank(client);
        uint256 missionId = registry.createMission{value: 5 ether}(keccak256("Task"));
        
        bytes32[] memory results = new bytes32[](1);
        results[0] = keccak256("Result");
        
        address[] memory recipients = new address[](1);
        recipients[0] = agent1;
        
        uint256[] memory splits = new uint256[](1);
        splits[0] = 3 ether; // 2 ether fee
        
        registry.completeMission(missionId, results, recipients, splits);
        
        assertEq(agent1.balance, 3 ether);
        assertEq(registry.totalFeesCollected(), 2 ether);
        assertEq(address(registry).balance, 2 ether);
    }

    function test_CompleteMission_NonRegisteredRecipient() public {
        vm.deal(client, 10 ether);
        vm.prank(client);
        uint256 missionId = registry.createMission{value: 5 ether}(keccak256("Task"));
        
        bytes32[] memory results = new bytes32[](1);
        address[] memory recipients = new address[](1);
        recipients[0] = agent1; // Not registered
        
        uint256[] memory splits = new uint256[](1);
        splits[0] = 5 ether;
        
        registry.completeMission(missionId, results, recipients, splits);
        
        // Payment should succeed
        assertEq(agent1.balance, 5 ether);
        
        // But mission count should not increment for non-registered agent
        (, , , uint256 missions, bool active) = registry.agents(agent1);
        assertEq(missions, 0);
        assertFalse(active);
    }

    function test_CompleteMission_ZeroAmountSplit() public {
        vm.prank(agent1);
        registry.registerAgent("AI Researcher", 1 ether);
        
        vm.deal(client, 10 ether);
        vm.prank(client);
        uint256 missionId = registry.createMission{value: 5 ether}(keccak256("Task"));
        
        bytes32[] memory results = new bytes32[](1);
        address[] memory recipients = new address[](1);
        recipients[0] = agent1;
        
        uint256[] memory splits = new uint256[](1);
        splits[0] = 0; // Zero payment
        
        registry.completeMission(missionId, results, recipients, splits);
        
        assertEq(agent1.balance, 0);
        assertEq(registry.totalFeesCollected(), 5 ether);
        
        // Mission count should still increment
        (, , , uint256 missions, ) = registry.agents(agent1);
        assertEq(missions, 1);
    }

    function test_CompleteMission_ExactBudgetMatch() public {
        vm.prank(agent1);
        registry.registerAgent("AI Researcher", 1 ether);
        
        vm.deal(client, 10 ether);
        vm.prank(client);
        uint256 missionId = registry.createMission{value: 5 ether}(keccak256("Task"));
        
        bytes32[] memory results = new bytes32[](1);
        address[] memory recipients = new address[](1);
        recipients[0] = agent1;
        
        uint256[] memory splits = new uint256[](1);
        splits[0] = 5 ether; // Exact match
        
        registry.completeMission(missionId, results, recipients, splits);
        
        assertEq(agent1.balance, 5 ether);
        assertEq(registry.totalFeesCollected(), 0);
        assertEq(address(registry).balance, 0);
    }

    function test_RevertWhen_CompleteMissionInvalidId() public {
        bytes32[] memory results = new bytes32[](1);
        address[] memory recipients = new address[](1);
        recipients[0] = agent1;
        uint256[] memory splits = new uint256[](1);
        splits[0] = 1 ether;
        
        vm.expectRevert("Invalid mission ID");
        registry.completeMission(999, results, recipients, splits);
    }

    function test_RevertWhen_CompleteMissionTwice() public {
        vm.deal(client, 10 ether);
        vm.prank(client);
        uint256 missionId = registry.createMission{value: 5 ether}(keccak256("Task 1"));
        
        bytes32[] memory results = new bytes32[](1);
        results[0] = keccak256("Result");
        
        address[] memory recipients = new address[](1);
        recipients[0] = agent1;
        
        uint256[] memory splits = new uint256[](1);
        splits[0] = 5 ether;
        
        registry.completeMission(missionId, results, recipients, splits);
        
        vm.expectRevert("Mission already completed");
        registry.completeMission(missionId, results, recipients, splits);
    }

    function test_RevertWhen_CompleteMissionLengthMismatch() public {
        vm.deal(client, 10 ether);
        vm.prank(client);
        uint256 missionId = registry.createMission{value: 5 ether}(keccak256("Task"));
        
        bytes32[] memory results = new bytes32[](1);
        address[] memory recipients = new address[](2);
        recipients[0] = agent1;
        recipients[1] = agent2;
        
        uint256[] memory splits = new uint256[](1);
        splits[0] = 5 ether;
        
        vm.expectRevert("Length mismatch");
        registry.completeMission(missionId, results, recipients, splits);
    }

    function test_RevertWhen_CompleteMissionNoRecipients() public {
        vm.deal(client, 10 ether);
        vm.prank(client);
        uint256 missionId = registry.createMission{value: 5 ether}(keccak256("Task"));
        
        bytes32[] memory results = new bytes32[](0);
        address[] memory recipients = new address[](0);
        uint256[] memory splits = new uint256[](0);
        
        vm.expectRevert("No recipients");
        registry.completeMission(missionId, results, recipients, splits);
    }

    function test_RevertWhen_CompleteMissionZeroRecipient() public {
        vm.deal(client, 10 ether);
        vm.prank(client);
        uint256 missionId = registry.createMission{value: 5 ether}(keccak256("Task"));
        
        bytes32[] memory results = new bytes32[](1);
        address[] memory recipients = new address[](1);
        recipients[0] = address(0);
        
        uint256[] memory splits = new uint256[](1);
        splits[0] = 5 ether;
        
        vm.expectRevert("Zero recipient");
        registry.completeMission(missionId, results, recipients, splits);
    }

    function test_RevertWhen_CompleteMissionSplitsExceedBudget() public {
        vm.deal(client, 10 ether);
        vm.prank(client);
        uint256 missionId = registry.createMission{value: 5 ether}(keccak256("Task"));
        
        bytes32[] memory results = new bytes32[](2);
        address[] memory recipients = new address[](2);
        recipients[0] = agent1;
        recipients[1] = agent2;
        
        uint256[] memory splits = new uint256[](2);
        splits[0] = 3 ether;
        splits[1] = 3 ether; // Total = 6 ether > 5 ether budget
        
        vm.expectRevert("Splits exceed budget");
        registry.completeMission(missionId, results, recipients, splits);
    }

    function test_RevertWhen_NonCoordinatorCompleteMission() public {
        vm.deal(client, 10 ether);
        vm.prank(client);
        uint256 missionId = registry.createMission{value: 5 ether}(keccak256("Task 1"));
        
        bytes32[] memory results = new bytes32[](1);
        address[] memory recipients = new address[](1);
        recipients[0] = agent1;
        uint256[] memory splits = new uint256[](1);
        splits[0] = 5 ether;
        
        vm.prank(agent1);
        vm.expectRevert("Not coordinator");
        registry.completeMission(missionId, results, recipients, splits);
    }

    // =========================
    // WITHDRAW FEES TESTS
    // =========================

    function test_WithdrawFees_Success() public {
        // Create mission with fees
        vm.prank(agent1);
        registry.registerAgent("AI Researcher", 1 ether);
        
        vm.deal(client, 10 ether);
        vm.prank(client);
        uint256 missionId = registry.createMission{value: 5 ether}(keccak256("Task"));
        
        bytes32[] memory results = new bytes32[](1);
        address[] memory recipients = new address[](1);
        recipients[0] = agent1;
        uint256[] memory splits = new uint256[](1);
        splits[0] = 3 ether; // 2 ether fee
        
        registry.completeMission(missionId, results, recipients, splits);
        
        assertEq(address(registry).balance, 2 ether);
        
        // Withdraw fees
        uint256 feeRecipientBalanceBefore = feeRecipient.balance;
        
        vm.expectEmit(true, false, false, true);
        emit FeesWithdrawn(feeRecipient, 2 ether);
        registry.withdrawFees(payable(feeRecipient));
        
        assertEq(feeRecipient.balance, feeRecipientBalanceBefore + 2 ether);
        assertEq(address(registry).balance, 0);
    }

    function test_WithdrawFees_MultipleFeeSources() public {
        vm.prank(agent1);
        registry.registerAgent("AI Researcher", 1 ether);
        
        // Mission 1: 1 ether fee
        vm.deal(client, 20 ether);
        vm.prank(client);
        uint256 mission1 = registry.createMission{value: 5 ether}(keccak256("Task 1"));
        
        bytes32[] memory results = new bytes32[](1);
        address[] memory recipients = new address[](1);
        recipients[0] = agent1;
        uint256[] memory splits = new uint256[](1);
        splits[0] = 4 ether;
        
        registry.completeMission(mission1, results, recipients, splits);
        
        // Mission 2: 2 ether fee
        vm.prank(client);
        uint256 mission2 = registry.createMission{value: 7 ether}(keccak256("Task 2"));
        
        splits[0] = 5 ether;
        registry.completeMission(mission2, results, recipients, splits);
        
        assertEq(address(registry).balance, 3 ether);
        assertEq(registry.totalFeesCollected(), 3 ether);
        
        registry.withdrawFees(payable(feeRecipient));
        
        assertEq(feeRecipient.balance, 3 ether);
        assertEq(address(registry).balance, 0);
    }

    function test_RevertWhen_WithdrawFeesInvalidAddress() public {
        vm.expectRevert("Invalid address");
        registry.withdrawFees(payable(address(0)));
    }

    function test_RevertWhen_WithdrawFeesNoBalance() public {
        vm.expectRevert("No fees");
        registry.withdrawFees(payable(feeRecipient));
    }

    function test_RevertWhen_NonCoordinatorWithdrawFees() public {
        vm.prank(agent1);
        vm.expectRevert("Not coordinator");
        registry.withdrawFees(payable(feeRecipient));
    }

    // =========================
    // COORDINATOR TRANSFER TESTS
    // =========================

    function test_TransferCoordinator_Success() public {
        address newCoordinator = makeAddr("newCoordinator");
        
        assertEq(registry.coordinator(), coordinator);
        
        vm.expectEmit(true, true, false, false);
        emit CoordinatorTransferred(coordinator, newCoordinator);
        registry.transferCoordinator(newCoordinator);
        
        assertEq(registry.coordinator(), newCoordinator);
    }

    function test_TransferCoordinator_NewCoordinatorCanOperate() public {
        address newCoordinator = makeAddr("newCoordinator");
        
        registry.transferCoordinator(newCoordinator);
        
        // Create mission
        vm.deal(client, 10 ether);
        vm.prank(client);
        uint256 missionId = registry.createMission{value: 5 ether}(keccak256("Task"));
        
        // Old coordinator cannot complete
        bytes32[] memory results = new bytes32[](1);
        address[] memory recipients = new address[](1);
        recipients[0] = agent1;
        uint256[] memory splits = new uint256[](1);
        splits[0] = 5 ether;
        
        vm.prank(coordinator);
        vm.expectRevert("Not coordinator");
        registry.completeMission(missionId, results, recipients, splits);
        
        // New coordinator can complete
        vm.prank(newCoordinator);
        registry.completeMission(missionId, results, recipients, splits);
        
        (, , , , , bool completed, ) = registry.getMission(missionId);
        assertTrue(completed);
    }

    function test_RevertWhen_TransferCoordinatorInvalidAddress() public {
        vm.expectRevert("Invalid address");
        registry.transferCoordinator(address(0));
    }

    function test_RevertWhen_NonCoordinatorTransferCoordinator() public {
        address newCoordinator = makeAddr("newCoordinator");
        
        vm.prank(agent1);
        vm.expectRevert("Not coordinator");
        registry.transferCoordinator(newCoordinator);
    }

    // =========================
    // VIEW FUNCTION TESTS
    // =========================

    function test_GetMissionCount_Empty() public view {
        assertEq(registry.getMissionCount(), 0);
    }

    function test_GetAgentCount_Empty() public view {
        assertEq(registry.getAgentCount(), 0);
    }

    function test_GetAgentList_Empty() public view {
        address[] memory agentList = registry.getAgentList();
        assertEq(agentList.length, 0);
    }

    // =========================
    // INTEGRATION TESTS
    // =========================

    function test_Integration_FullWorkflow() public {
        // 1. Register multiple agents
        vm.prank(agent1);
        registry.registerAgent("AI Researcher", 1 ether);
        
        vm.prank(agent2);
        registry.registerAgent("Data Analyst", 0.5 ether);
        
        vm.prank(agent3);
        registry.registerAgent("Smart Contract Dev", 2 ether);
        
        assertEq(registry.getAgentCount(), 3);
        
        // 2. Client creates multiple missions
        vm.deal(client, 50 ether);
        vm.startPrank(client);
        uint256 mission1 = registry.createMission{value: 10 ether}(keccak256("Mission 1"));
        uint256 mission2 = registry.createMission{value: 15 ether}(keccak256("Mission 2"));
        uint256 mission3 = registry.createMission{value: 8 ether}(keccak256("Mission 3"));
        vm.stopPrank();
        
        assertEq(registry.getMissionCount(), 3);
        assertEq(address(registry).balance, 33 ether);
        
        // 3. Complete mission 1 (all agents, with fee)
        bytes32[] memory results1 = new bytes32[](1);
        results1[0] = keccak256("Result 1");
        
        address[] memory recipients1 = new address[](3);
        recipients1[0] = agent1;
        recipients1[1] = agent2;
        recipients1[2] = agent3;
        
        uint256[] memory splits1 = new uint256[](3);
        splits1[0] = 3 ether;
        splits1[1] = 2 ether;
        splits1[2] = 4 ether; // Total: 9 ether, fee: 1 ether
        
        registry.completeMission(mission1, results1, recipients1, splits1);
        
        assertEq(agent1.balance, 3 ether);
        assertEq(agent2.balance, 2 ether);
        assertEq(agent3.balance, 4 ether);
        assertEq(registry.totalFeesCollected(), 1 ether);
        
        // 4. Complete mission 2 (partial agents, exact budget)
        bytes32[] memory results2 = new bytes32[](2);
        results2[0] = keccak256("Result 2A");
        results2[1] = keccak256("Result 2B");
        
        address[] memory recipients2 = new address[](2);
        recipients2[0] = agent1;
        recipients2[1] = agent3;
        
        uint256[] memory splits2 = new uint256[](2);
        splits2[0] = 7 ether;
        splits2[1] = 8 ether; // Total: 15 ether, fee: 0
        
        registry.completeMission(mission2, results2, recipients2, splits2);
        
        assertEq(agent1.balance, 10 ether);
        assertEq(agent2.balance, 2 ether);
        assertEq(agent3.balance, 12 ether);
        assertEq(registry.totalFeesCollected(), 1 ether);
        
        // 5. Verify agent mission counts
        (, , , uint256 agent1Missions, ) = registry.agents(agent1);
        (, , , uint256 agent2Missions, ) = registry.agents(agent2);
        (, , , uint256 agent3Missions, ) = registry.agents(agent3);
        
        assertEq(agent1Missions, 2);
        assertEq(agent2Missions, 1);
        assertEq(agent3Missions, 2);
        
        // 6. Verify global state
        assertEq(registry.totalMissionsCompleted(), 2);
        assertEq(address(registry).balance, 9 ether); // 1 ether fee + 8 ether from mission3
        
        // 7. Transfer coordinator
        address newCoordinator = makeAddr("newCoordinator");
        registry.transferCoordinator(newCoordinator);
        
        // 8. New coordinator completes mission 3
        vm.prank(newCoordinator);
        
        bytes32[] memory results3 = new bytes32[](1);
        results3[0] = keccak256("Result 3");
        
        address[] memory recipients3 = new address[](1);
        recipients3[0] = agent2;
        
        uint256[] memory splits3 = new uint256[](1);
        splits3[0] = 6 ether; // Fee: 2 ether
        
        registry.completeMission(mission3, results3, recipients3, splits3);
        
        assertEq(agent2.balance, 8 ether);
        assertEq(registry.totalMissionsCompleted(), 3);
        assertEq(registry.totalFeesCollected(), 3 ether);
        
        // 9. New coordinator withdraws fees
        vm.prank(newCoordinator);
        registry.withdrawFees(payable(feeRecipient));
        
        assertEq(feeRecipient.balance, 3 ether);
        assertEq(address(registry).balance, 0);
    }

    function test_Integration_AgentUpdateAndMissionCompletion() public {
        // Register agent with initial capability
        vm.prank(agent1);
        registry.registerAgent("Junior Developer", 0.5 ether);
        
        // Complete first mission
        vm.deal(client, 10 ether);
        vm.prank(client);
        uint256 mission1 = registry.createMission{value: 2 ether}(keccak256("Task 1"));
        
        bytes32[] memory results = new bytes32[](1);
        address[] memory recipients = new address[](1);
        recipients[0] = agent1;
        uint256[] memory splits = new uint256[](1);
        splits[0] = 2 ether;
        
        registry.completeMission(mission1, results, recipients, splits);
        
        (, , , uint256 missionsAfter1, ) = registry.agents(agent1);
        assertEq(missionsAfter1, 1);
        
        // Update agent (promotion)
        vm.prank(agent1);
        registry.registerAgent("Senior Developer", 2 ether);
        
        (, string memory capability, uint256 price, uint256 missionsAfter2, ) = registry.agents(agent1);
        assertEq(capability, "Senior Developer");
        assertEq(price, 2 ether);
        assertEq(missionsAfter2, 1); // Mission count preserved
        
        // Complete second mission
        vm.prank(client);
        uint256 mission2 = registry.createMission{value: 3 ether}(keccak256("Task 2"));
        
        registry.completeMission(mission2, results, recipients, splits);
        
        (, , , uint256 missionsAfter3, ) = registry.agents(agent1);
        assertEq(missionsAfter3, 2);
    }
}
