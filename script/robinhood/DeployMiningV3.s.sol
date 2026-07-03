// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {VenaLoadout} from "../../contracts/robinhood/VenaLoadout.sol";
import {VenaMiningV3} from "../../contracts/robinhood/VenaMiningV3.sol";

/**
 * @notice Deploy VenaLoadout + VenaMiningV3 (Stratum + extensible accessories).
 *
 * Env:
 *   PRIVATE_KEY, VENA_TOKEN, PICKAXE_NFT, TREASURY, FUNDING_OPERATOR (optional)
 *
 * Feature flags start CLOSED (level + accessory shop). Enable via owner when UI opens:
 *   loadout.setLevelUpgradesEnabled(true)
 *   loadout.setAccessoryShopEnabled(true)
 */
contract DeployMiningV3 is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address vena = vm.envAddress("VENA_TOKEN");
        address nft = vm.envAddress("PICKAXE_NFT");
        address treasury = vm.envAddress("TREASURY");
        address fundingOp = vm.envOr("FUNDING_OPERATOR", treasury);

        vm.startBroadcast(deployerKey);

        VenaLoadout loadout = new VenaLoadout(vena, treasury, deployer);
        VenaMiningV3 mining = new VenaMiningV3(vena, nft, address(loadout), deployer, fundingOp);

        vm.stopBroadcast();

        console.log("=== VenaMiningV3 Deploy ===");
        console.log("VenaLoadout:", address(loadout));
        console.log("VenaMiningV3:", address(mining));
        console.log("VENA:", vena);
        console.log("PickaxeNFT:", nft);
        console.log("Treasury:", treasury);
        console.log("Funding operator:", fundingOp);
        console.log("Level upgrades enabled:", loadout.levelUpgradesEnabled());
        console.log("Accessory shop enabled:", loadout.accessoryShopEnabled());
        console.log("Stratum enabled:", mining.stratumEnabled());
        console.log("");
        console.log("NEXT: fundRewards on V3, set MINING + NEXT_PUBLIC_LOADOUT in env");
        console.log("MINING=", address(mining));
        console.log("NEXT_PUBLIC_LOADOUT=", address(loadout));
        console.log("NEXT_PUBLIC_STAKING=", address(mining));
    }
}
