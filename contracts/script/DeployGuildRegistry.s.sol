// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Script.sol";
import "../src/GuildRegistry.sol";

contract DeployGuildRegistry is Script {
    function run() external returns (GuildRegistry) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        address coordinator = 0xf7D8E04f82d343B68a7545FF632e282B502800Fd;
        
        GuildRegistry registry = new GuildRegistry(coordinator);
        
        console.log("GuildRegistry deployed at:", address(registry));
        console.log("Coordinator:", registry.coordinator());
        
        vm.stopBroadcast();
        
        return registry;
    }
}
