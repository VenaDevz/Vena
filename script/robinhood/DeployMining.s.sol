// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {VenaMining} from "../../contracts/robinhood/VenaMining.sol";

/**
 * @notice Deploy VenaMining — call start() only when ready to open staking.
 *
 * Env:
 *   PRIVATE_KEY
 *   VENA_TOKEN      (required)
 *   PICKAXE_NFT     (required)
 *
 * After deploy:
 *   1. Transfer VENA to mining contract (buyback-fed pool funding)
 *   2. mining.start() when you want staking LIVE
 */
contract DeployMining is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address vena = vm.envAddress("VENA_TOKEN");
        address nft = vm.envAddress("PICKAXE_NFT");

        vm.startBroadcast(deployerKey);

        VenaMining mining = new VenaMining(vena, nft, deployer);

        vm.stopBroadcast();

        console.log("=== VenaMining Deploy ===");
        console.log("VenaMining:", address(mining));
        console.log("VENA:", vena);
        console.log("PickaxeNFT:", nft);
        console.log("");
        console.log("NEXT: fund with VENA buybacks, then call start() - staking stays OFF until then");
        console.log("NEXT_PUBLIC_STAKING=", address(mining));
    }
}
