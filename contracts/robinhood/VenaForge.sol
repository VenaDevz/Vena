// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PickaxeNFT.sol";

/**
 * @title VenaForge (Robinhood Chain)
 * @notice Mint Silver with ETH. Forge higher tiers by burning lower Pickaxes + paying $VENA.
 *
 * Forge recipes (silver-equivalent math):
 *   4 × Silver   → 1 Gold        + 150K  $VENA
 *   2 × Gold     → 1 Platinum    + 300K  $VENA
 *   2 × Platinum → 1 Diamond     + 600K  $VENA
 *   2 × Diamond  → 1 Emerald     + 1.2M  $VENA
 *
 * Revenue flow (handled by protocol ops off-chain):
 *   - ETH mint fees  → treasury → market-buy $VENA → staking pool.
 *   - $VENA upgrade  → treasury (already $VENA) → staking pool.
 */
contract VenaForge is Ownable, ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;

    IERC20 public vena;
    PickaxeNFT public immutable pickaxe;

    address public treasury;

    uint256 public silverPriceWei;
    /// @notice $VENA cost to forge INTO a tier (Silver index unused)
    mapping(PickaxeNFT.Tier => uint256) public tierUpgradeVena;

    struct ForgeRecipe {
        uint256 inputCount;
        PickaxeNFT.Tier outputTier;
    }

    /// @dev inputTier → recipe (how many to burn + what you receive)
    mapping(PickaxeNFT.Tier => ForgeRecipe) public recipes;

    bool public paused;

    event SilverMinted(address indexed user, uint256 indexed tokenId, uint256 ethPaid);
    event Forged(
        address indexed user,
        PickaxeNFT.Tier inputTier,
        uint256[] burnedIds,
        uint256 indexed mintedId,
        PickaxeNFT.Tier outputTier,
        uint256 venaPaid
    );
    event TreasurySet(address indexed treasury);
    event VenaSet(address indexed vena);
    event Paused(bool paused);
    event SilverPriceSet(uint256 priceWei);
    event UpgradePriceSet(PickaxeNFT.Tier indexed tier, uint256 venaAmount);

    constructor(
        address _pickaxe,
        address _vena,
        address _treasury,
        address initialOwner
    ) Ownable(initialOwner) {
        require(_pickaxe != address(0) && _treasury != address(0), "Zero address");
        pickaxe = PickaxeNFT(_pickaxe);
        vena = IERC20(_vena);
        treasury = _treasury;

        silverPriceWei = 0.01 ether;

        tierUpgradeVena[PickaxeNFT.Tier.Gold]     = 150_000 * 1e18;
        tierUpgradeVena[PickaxeNFT.Tier.Platinum] = 300_000 * 1e18;
        tierUpgradeVena[PickaxeNFT.Tier.Diamond]  = 600_000 * 1e18;
        tierUpgradeVena[PickaxeNFT.Tier.Emerald]  = 1_200_000 * 1e18;

        recipes[PickaxeNFT.Tier.Silver]   = ForgeRecipe(4, PickaxeNFT.Tier.Gold);
        recipes[PickaxeNFT.Tier.Gold]     = ForgeRecipe(2, PickaxeNFT.Tier.Platinum);
        recipes[PickaxeNFT.Tier.Platinum] = ForgeRecipe(2, PickaxeNFT.Tier.Diamond);
        recipes[PickaxeNFT.Tier.Diamond]  = ForgeRecipe(2, PickaxeNFT.Tier.Emerald);
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
        emit TreasurySet(_treasury);
    }

    function setVena(address _vena) external onlyOwner {
        require(_vena != address(0), "Zero address");
        vena = IERC20(_vena);
        emit VenaSet(_vena);
    }

    function setSilverPriceWei(uint256 priceWei) external onlyOwner {
        silverPriceWei = priceWei;
        emit SilverPriceSet(priceWei);
    }

    function setTierUpgradeVena(PickaxeNFT.Tier tier, uint256 venaAmount) external onlyOwner {
        tierUpgradeVena[tier] = venaAmount;
        emit UpgradePriceSet(tier, venaAmount);
    }

    function setRecipe(
        PickaxeNFT.Tier inputTier,
        uint256 inputCount,
        PickaxeNFT.Tier outputTier
    ) external onlyOwner {
        recipes[inputTier] = ForgeRecipe(inputCount, outputTier);
    }

    /// @notice Mint a Silver Pickaxe with ETH.
    function mintSilver() external payable nonReentrant {
        require(!paused, "Paused");
        require(msg.value == silverPriceWei, "Wrong ETH amount");
        _sendEth(treasury, msg.value);
        pickaxe.mintByForge(msg.sender, PickaxeNFT.Tier.Silver);
        uint256 mintedId = pickaxe.totalMinted() - 1;
        emit SilverMinted(msg.sender, mintedId, msg.value);
    }

    /**
     * @notice Burn lower-tier Pickaxes and mint the next tier, paying $VENA.
     * @param inputTier  Tier of NFTs being burned (e.g. Silver for Gold).
     * @param tokenIds   Must match recipe.inputCount; caller must own all.
     */
    function forge(PickaxeNFT.Tier inputTier, uint256[] calldata tokenIds)
        external
        nonReentrant
    {
        require(!paused, "Paused");
        require(inputTier != PickaxeNFT.Tier.Emerald, "Max tier");
        require(address(vena) != address(0), "Upgrades not live");

        ForgeRecipe memory recipe = recipes[inputTier];
        require(recipe.inputCount > 0, "No recipe");
        require(tokenIds.length == recipe.inputCount, "Wrong token count");

        uint256 cost = tierUpgradeVena[recipe.outputTier];
        require(cost > 0, "Upgrade disabled");

        vena.safeTransferFrom(msg.sender, treasury, cost);

        for (uint256 i; i < tokenIds.length; ++i) {
            uint256 id = tokenIds[i];
            require(pickaxe.ownerOf(id) == msg.sender, "Not owner");
            require(pickaxe.getTier(id) == inputTier, "Wrong tier");
            pickaxe.safeTransferFrom(msg.sender, address(this), id);
            pickaxe.burnByForge(id);
        }

        pickaxe.mintByForge(msg.sender, recipe.outputTier);
        uint256 mintedId = pickaxe.totalMinted() - 1;

        emit Forged(msg.sender, inputTier, tokenIds, mintedId, recipe.outputTier, cost);
    }

    function getRecipe(PickaxeNFT.Tier tier)
        external
        view
        returns (uint256 inputCount, PickaxeNFT.Tier outputTier)
    {
        ForgeRecipe memory r = recipes[tier];
        return (r.inputCount, r.outputTier);
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }

    function _sendEth(address to, uint256 amount) internal {
        (bool ok,) = to.call{value: amount}("");
        require(ok, "ETH transfer failed");
    }
}
