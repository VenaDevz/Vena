// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {VenaMiningV2} from "../../contracts/robinhood/VenaMiningV2.sol";

/**
 * @notice Deploy buyback-fed VenaMiningV2.
 *
 * Env:
 *   PRIVATE_KEY
 *   VENA_TOKEN          (required)
 *   PICKAXE_NFT         (required)
 *   FUNDING_OPERATOR    (optional — defaults to deployer; set to treasury keeper wallet)
 *
 * After deploy:
 *   1. Run treasury buyback keeper → fundRewards(amount)
 *   2. Set NEXT_PUBLIC_STAKING when first fund lands and staking opens
 */
contract DeployMiningV2 is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address vena = vm.envAddress("VENA_TOKEN");
        address nft = vm.envAddress("PICKAXE_NFT");
        address fundingOp = vm.envOr("FUNDING_OPERATOR", deployer);

        vm.startBroadcast(deployerKey);

        VenaMiningV2 mining = new VenaMiningV2(vena, nft, deployer, fundingOp);

        vm.stopBroadcast();

        console.log("=== VenaMiningV2 Deploy ===");
        console.log("VenaMiningV2:", address(mining));
        console.log("VENA:", vena);
        console.log("PickaxeNFT:", nft);
        console.log("Funding operator:", fundingOp);
        console.log("Min pool to start:", mining.minPoolToStart());
        console.log("Fund vest period (sec):", mining.fundVestPeriod());
        console.log("");
        console.log("NEXT: buyback ETH->VENA, approve mining, call fundRewards()");
        console.log("NEXT_PUBLIC_STAKING=", address(mining));
    }
}
