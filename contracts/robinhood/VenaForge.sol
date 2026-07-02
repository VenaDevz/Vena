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
 * @notice Mint Silver with ETH. Upgrade tiers with $VENA + burn the lower Pickaxe.
 *
 * Revenue flow (handled by protocol ops off-chain):
 *   - ETH mint fees  → treasury → market-buy $VENA → staking pool.
 *   - $VENA upgrade  → treasury (already $VENA) → staking pool.
 *
 * Default Silver mint: 0.01 ETH.
 * Default upgrade $VENA ladder (18 decimals): 1M / 2M / 4M / 8M into Gold/Plat/Dia/Emerald.
 */
contract VenaForge is Ownable, ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;

    IERC20 public vena;
    PickaxeNFT public immutable pickaxe;

    /// @dev Collects mint (ETH) + upgrade ($VENA) revenue for buybacks → staking pool
    address public treasury;

    uint256 public silverPriceWei;
    /// @notice $VENA cost to upgrade INTO a tier (Silver index unused)
    mapping(PickaxeNFT.Tier => uint256) public tierUpgradeVena;

    bool public paused;

    event SilverMinted(address indexed user, uint256 indexed tokenId, uint256 ethPaid);
    event Upgraded(
        address indexed user,
        uint256 indexed burnedId,
        uint256 indexed mintedId,
        PickaxeNFT.Tier fromTier,
        PickaxeNFT.Tier toTier,
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
        vena = IERC20(_vena); // may be zero at launch; set later via setVena() to enable upgrades
        treasury = _treasury;

        silverPriceWei = 0.01 ether;

        tierUpgradeVena[PickaxeNFT.Tier.Gold]     = 1_000_000 * 1e18;
        tierUpgradeVena[PickaxeNFT.Tier.Platinum] = 2_000_000 * 1e18;
        tierUpgradeVena[PickaxeNFT.Tier.Diamond]  = 4_000_000 * 1e18;
        tierUpgradeVena[PickaxeNFT.Tier.Emerald]  = 8_000_000 * 1e18;
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

    /// @notice Set $VENA after Virtuals launch to enable upgrades.
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

    /// @notice Mint a Silver Pickaxe with ETH.
    function mintSilver() external payable nonReentrant {
        require(!paused, "Paused");
        require(msg.value == silverPriceWei, "Wrong ETH amount");
        _sendEth(treasury, msg.value);
        pickaxe.mintByForge(msg.sender, PickaxeNFT.Tier.Silver);
        uint256 mintedId = pickaxe.totalMinted() - 1;
        emit SilverMinted(msg.sender, mintedId, msg.value);
    }

    /// @notice Burn a Pickaxe and mint the next tier, paying $VENA. Caller must own tokenId.
    function upgrade(uint256 tokenId) external nonReentrant {
        require(!paused, "Paused");
        require(pickaxe.ownerOf(tokenId) == msg.sender, "Not owner");

        PickaxeNFT.Tier current = pickaxe.getTier(tokenId);
        require(current != PickaxeNFT.Tier.Emerald, "Max tier");

        require(address(vena) != address(0), "Upgrades not live");

        PickaxeNFT.Tier next = PickaxeNFT.Tier(uint8(current) + 1);
        uint256 cost = tierUpgradeVena[next];
        require(cost > 0, "Upgrade disabled");

        vena.safeTransferFrom(msg.sender, treasury, cost);

        pickaxe.safeTransferFrom(msg.sender, address(this), tokenId);
        pickaxe.burnByForge(tokenId);
        pickaxe.mintByForge(msg.sender, next);
        uint256 mintedId = pickaxe.totalMinted() - 1;

        emit Upgraded(msg.sender, tokenId, mintedId, current, next, cost);
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
