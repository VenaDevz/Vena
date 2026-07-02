// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {PickaxeNFT} from "../../contracts/robinhood/PickaxeNFT.sol";

/**
 * @notice Step 1 — Deploy VPICK on Robinhood Chain (no token required).
 *
 * Env: PRIVATE_KEY
 *
 *   forge script script/robinhood/DeployNFT.s.sol --rpc-url $RH_RPC --broadcast -vvvv
 *
 * After broadcast, set NEXT_PUBLIC_PICKAXE_NFT in .env.local
 * Step 2 (when $VENA exists): DeployForge.s.sol
 */
contract DeployNFT is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        PickaxeNFT nft = new PickaxeNFT(deployer);

        vm.stopBroadcast();

        console.log("=== VPICK NFT Deploy ===");
        console.log("Network: Robinhood Chain");
        console.log("Deployer:", deployer);
        console.log("PickaxeNFT:", address(nft));
        console.log("");
        console.log("Next:");
        console.log("1. setMetadataURI for each tier (0-4)");
        console.log("2. NEXT_PUBLIC_PICKAXE_NFT=", address(nft));
        console.log("3. When $VENA is live: DeployForge.s.sol");
    }
}
