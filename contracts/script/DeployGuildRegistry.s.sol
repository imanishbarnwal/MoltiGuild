// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Script.sol";
import "../src/GuildRegistry.sol";

contract DeployGuildRegistry is Script {
    function run() external returns (GuildRegistry) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        address coordinator = vm.envOr("COORDINATOR_ADDRESS", address(0xf7D8E04f82d343B68a7545FF632e282B502800Fd));

        GuildRegistry registry = new GuildRegistry(coordinator);

        // V5: Set buyback treasury if provided
        address treasury = vm.envOr("BUYBACK_TREASURY", address(0));
        if (treasury != address(0)) {
            registry.setBuybackTreasury(treasury);
            console.log("Buyback Treasury:", treasury);
        }

        console.log("GuildRegistry deployed at:", address(registry));
        console.log("Coordinator:", registry.coordinator());

        vm.stopBroadcast();
        
        return registry;
    }
}
