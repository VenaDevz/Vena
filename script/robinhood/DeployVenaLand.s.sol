// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../../contracts/robinhood/VenaLandChest.sol";
import "../../contracts/robinhood/VenaLandBase.sol";

contract DeployVenaLand is Script {
    function run() external {
        // Read PRIVATE_KEY and TREASURY from .env
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        
        // Try to get TREASURY from .env, if not present use deployer address
        address treasuryAddress = vm.envOr("TREASURY", deployerAddress);

        console.log("Deploying VenaLand Contracts...");
        console.log("Deployer Address:", deployerAddress);
        console.log("Treasury Address:", treasuryAddress);

        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);

        // Deploy Chests
        VenaLandChest chest = new VenaLandChest(deployerAddress, treasuryAddress);
        console.log("VenaLandChest deployed to:", address(chest));

        // Deploy Bases
        VenaLandBase base = new VenaLandBase(deployerAddress, treasuryAddress);
        console.log("VenaLandBase deployed to:", address(base));

        vm.stopBroadcast();
        
        console.log("=========================================");
        console.log(unicode"🎉 All VenaLand Contracts Deployed! 🎉");
        console.log("=========================================");
    }
}
