// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PickaxeNFT.sol";

/**
 * @title Forge
 * @notice Upgrades Pickaxe NFTs by burning lower-tier NFTs and minting one higher-tier NFT.
 *
 * Upgrade paths (silverEquivalent math):
 *   4 × Silver   → 1 Gold        (4 × 1  = 4 → cost 4)
 *   2 × Gold     → 1 Platinum    (2 × 4  = 8)
 *   2 × Platinum → 1 Diamond     (2 × 8  = 16)
 *   2 × Diamond  → 1 Emerald     (2 × 16 = 32)
 *
 * The Forge contract must be set as `forge` on PickaxeNFT before use.
 * Users must approve this contract to transfer their NFTs (setApprovalForAll).
 */
contract Forge is Ownable, ReentrancyGuard {
    // ─── Storage ──────────────────────────────────────────────────────────────

    PickaxeNFT public immutable pickaxe;

    /// @dev inputTier → (inputCount, outputTier)
    struct ForgeRecipe {
        uint256          inputCount;
        PickaxeNFT.Tier  outputTier;
    }

    mapping(PickaxeNFT.Tier => ForgeRecipe) public recipes;

    bool public paused;

    // ─── Events ───────────────────────────────────────────────────────────────

    event Forged(
        address indexed user,
        PickaxeNFT.Tier inputTier,
        uint256[]       burnedIds,
        uint256         mintedId,
        PickaxeNFT.Tier outputTier
    );
    event Paused(bool paused);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _pickaxe, address initialOwner)
        Ownable(initialOwner)
    {
        require(_pickaxe != address(0), "Zero address");
        pickaxe = PickaxeNFT(_pickaxe);

        recipes[PickaxeNFT.Tier.Silver]   = ForgeRecipe(4, PickaxeNFT.Tier.Gold);
        recipes[PickaxeNFT.Tier.Gold]     = ForgeRecipe(2, PickaxeNFT.Tier.Platinum);
        recipes[PickaxeNFT.Tier.Platinum] = ForgeRecipe(2, PickaxeNFT.Tier.Diamond);
        recipes[PickaxeNFT.Tier.Diamond]  = ForgeRecipe(2, PickaxeNFT.Tier.Emerald);
        // Emerald is the max tier — no recipe defined
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    // ─── Forge ────────────────────────────────────────────────────────────────

    /**
     * @notice Upgrade NFTs to the next tier.
     * @param inputTier  The tier of NFTs you are burning.
     * @param tokenIds   Array of tokenIds to burn (must match recipe input count).
     *
     * Requirements:
     *   - caller must own all tokenIds
     *   - this contract must be approved (setApprovalForAll)
     *   - tokenIds.length must equal recipe.inputCount
     *   - all tokenIds must be of inputTier
     */
    function forge(
        PickaxeNFT.Tier inputTier,
        uint256[] calldata tokenIds
    ) external nonReentrant {
        require(!paused, "Forge: paused");
        require(inputTier != PickaxeNFT.Tier.Emerald, "Forge: Emerald is max tier");

        ForgeRecipe memory recipe = recipes[inputTier];
        require(tokenIds.length == recipe.inputCount, "Forge: wrong token count");

        // Validate ownership and tier, then burn
        for (uint256 i; i < tokenIds.length; ++i) {
            uint256 id = tokenIds[i];
            require(pickaxe.ownerOf(id) == msg.sender, "Forge: not your NFT");
            require(pickaxe.tokenTier(id) == inputTier, "Forge: wrong tier");

            // Transfer NFT to dead address (burn)
            pickaxe.transferFrom(msg.sender, address(0xdEaD), id);
        }

        // Mint one upgraded NFT
        pickaxe.mintByForge(msg.sender, recipe.outputTier);

        // Get the ID of the just-minted token
        uint256 mintedId = pickaxe.totalMinted() - 1;

        emit Forged(msg.sender, inputTier, tokenIds, mintedId, recipe.outputTier);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getRecipe(PickaxeNFT.Tier tier)
        external
        view
        returns (uint256 inputCount, PickaxeNFT.Tier outputTier)
    {
        ForgeRecipe memory r = recipes[tier];
        return (r.inputCount, r.outputTier);
    }
}
