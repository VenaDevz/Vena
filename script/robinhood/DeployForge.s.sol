// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {PickaxeNFT} from "../../contracts/robinhood/PickaxeNFT.sol";
import {VenaForge} from "../../contracts/robinhood/VenaForge.sol";

/**
 * @notice Deploy Forge — mint Silver with ETH (no $VENA needed to launch mint).
 *         Upgrades stay disabled until setVena() is called after Virtuals launch.
 *
 * Env:
 *   PRIVATE_KEY
 *   PICKAXE_NFT
 *   VENA_TOKEN      — optional; 0x0 if not launched yet
 *   TREASURY        — optional; defaults to deployer
 */
contract DeployForge is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        address nftAddr = vm.envAddress("PICKAXE_NFT");
        address vena = vm.envOr("VENA_TOKEN", address(0));
        address treasury = vm.envOr("TREASURY", deployer);

        vm.startBroadcast(deployerKey);

        PickaxeNFT nft = PickaxeNFT(nftAddr);
        VenaForge forge = new VenaForge(nftAddr, vena, treasury, deployer);
        nft.setForge(address(forge));

        vm.stopBroadcast();

        console.log("=== VenaForge Deploy ===");
        console.log("VenaForge:", address(forge));
        console.log("PickaxeNFT:", nftAddr);
        console.log("VENA:", vena);
        console.log("Treasury:", treasury);
        console.log("");
        console.log("Mint LIVE: mintSilver() with 0.01 ETH");
        console.log("Upgrades: call forge.setVena(address) after Virtuals launch");
        console.log("NEXT_PUBLIC_FORGE=", address(forge));
    }
}
