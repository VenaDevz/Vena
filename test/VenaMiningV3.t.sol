// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {VenaToken} from "../contracts/robinhood/VenaToken.sol";
import {PickaxeNFT} from "../contracts/robinhood/PickaxeNFT.sol";
import {VenaLoadout} from "../contracts/robinhood/VenaLoadout.sol";
import {VenaMiningV3} from "../contracts/robinhood/VenaMiningV3.sol";

contract VenaMiningV3Test is Test {
    VenaToken vena;
    PickaxeNFT nft;
    VenaLoadout loadout;
    VenaMiningV3 mining;

    address treasury = makeAddr("treasury");
    address miner = makeAddr("miner");
    address funder = makeAddr("funder");

    function setUp() public {
        vena = new VenaToken(address(this));
        nft = new PickaxeNFT(address(this));
        loadout = new VenaLoadout(address(vena), treasury, address(this));
        mining = new VenaMiningV3(
            address(vena),
            address(nft),
            address(loadout),
            address(this),
            funder
        );

        nft.setForge(address(this));
        nft.mintByForge(miner, PickaxeNFT.Tier.Gold);

        vena.transfer(funder, 20_000 ether);
        vena.transfer(miner, 1_000_000 ether);

        vm.startPrank(funder);
        vena.approve(address(mining), type(uint256).max);
        mining.fundRewards(10_000 ether);
        vm.stopPrank();

        vm.startPrank(miner);
        nft.setApprovalForAll(address(mining), true);
        mining.stakeNFT(0);
        vm.stopPrank();
    }

    function test_claimAfterAccrual() public {
        vm.warp(block.timestamp + 1 hours);
        vm.prank(miner);
        mining.claimRewards();
        assertGt(vena.balanceOf(miner), 0);
    }

    function test_loadoutBoostIncreasesPower() public {
        loadout.setAccessoryShopEnabled(true);

        vm.startPrank(miner);
        vena.approve(address(loadout), type(uint256).max);
        loadout.buyAccessory(1);
        loadout.setAccessoryEquipped(1, true);
        mining.syncPower();
        vm.stopPrank();

        (uint256 power,,) = mining.getUserInfo(miner);
        assertEq(power, 52); // 50 gold × 1.05 flux band
    }

    function test_shopClosedByDefault() public {
        vm.startPrank(miner);
        vena.approve(address(loadout), type(uint256).max);
        vm.expectRevert("Accessory shop closed");
        loadout.buyAccessory(1);
        vm.stopPrank();
    }

    function test_stratumIncreasesOverTime() public {
        vm.warp(block.timestamp + 2 hours);
        assertEq(mining.stratumBps(0), 12_500);
    }

    function test_idlePoolNoWindfall() public {
        vm.prank(miner);
        mining.unstakeNFT(0);

        vm.warp(block.timestamp + 1 days);

        nft.mintByForge(miner, PickaxeNFT.Tier.Silver);
        uint256 balBefore = vena.balanceOf(miner);
        vm.startPrank(miner);
        mining.stakeNFT(1);
        vm.warp(block.timestamp + 1 hours);
        mining.claimRewards();
        vm.stopPrank();

        uint256 earned = vena.balanceOf(miner) - balBefore;
        // ~59 VENA/hour solo on 10k pool — a windfall would pay out ~24× that (full idle day).
        assertLt(earned, 120 ether);
        assertGt(earned, 5 ether);
    }
}
