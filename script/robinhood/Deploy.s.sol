// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {PickaxeNFT} from "../../contracts/robinhood/PickaxeNFT.sol";
import {VenaForge} from "../../contracts/robinhood/VenaForge.sol";
import {VenaMining} from "../../contracts/robinhood/VenaMining.sol";

/**
 * @notice Optional full deploy: NFT + Forge + Mining.
 *         Mint (ETH) works immediately. Set VENA_TOKEN for upgrades + staking.
 *
 * Env:
 *   PRIVATE_KEY
 *   VENA_TOKEN  — optional (0x0 pre-launch); enables upgrades + mining
 *   TREASURY    — optional; defaults to deployer
 */
contract DeployRobinhood is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);
        address vena = vm.envOr("VENA_TOKEN", address(0));
        address treasury = vm.envOr("TREASURY", deployer);

        vm.startBroadcast(deployerKey);

        PickaxeNFT nft = new PickaxeNFT(deployer);
        VenaForge forge = new VenaForge(address(nft), vena, treasury, deployer);
        nft.setForge(address(forge));

        vm.stopBroadcast();

        console.log("PickaxeNFT:", address(nft));
        console.log("VenaForge:", address(forge));
        console.log("Mint LIVE with 0.01 ETH via forge.mintSilver()");
        console.log("After Virtuals launch: forge.setVena(VENA) + deploy VenaMining");
    }
}
