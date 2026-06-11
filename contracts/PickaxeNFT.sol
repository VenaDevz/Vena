// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PickaxeNFT
 * @notice ERC-721 Pickaxe NFTs with 5 rarity tiers.
 *
 * Minting (production):
 *   - VenaHook mints on Uniswap v4 buys (mintByHook).
 *   - Forge mints upgraded tiers (mintByForge).
 *   - mintSilver is disabled; acquire via pool swaps.
 *
 * Tier max supply:
 *   Silver 10,000 | Gold 2,500 | Platinum 1,250 | Diamond 625 | Emerald 312
 */
contract PickaxeNFT is ERC721, Ownable, ReentrancyGuard {
    // ─── Types ────────────────────────────────────────────────────────────────

    enum Tier { Silver, Gold, Platinum, Diamond, Emerald }

    struct TierConfig {
        uint256 maxSupply;
        uint256 minted;
        uint256 miningPower;
        string  metadataURI;
    }

    // ─── Storage ──────────────────────────────────────────────────────────────

    IERC20 public immutable venaToken;

    address public forge;
    address public feeHook;

    uint256 private _nextTokenId;

    mapping(Tier => TierConfig) public tierConfig;
    mapping(uint256 => Tier)    public tokenTier;

    // ─── Events ───────────────────────────────────────────────────────────────

    event Minted(address indexed to, uint256 indexed tokenId, Tier tier);
    event TierUpgraded(uint256 indexed tokenId, Tier oldTier, Tier newTier);
    event Burned(uint256 indexed tokenId, Tier tier);
    event ForgeSet(address indexed forge);
    event FeeHookSet(address indexed hook);
    event MetadataURISet(Tier indexed tier, string uri);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _venaToken, address initialOwner)
        ERC721("Vena Pickaxe", "VPICK")
        Ownable(initialOwner)
    {
        require(_venaToken != address(0), "Zero address");
        venaToken = IERC20(_venaToken);

        tierConfig[Tier.Silver]   = TierConfig(10_000, 0, 10,  "");
        tierConfig[Tier.Gold]     = TierConfig( 2_500, 0, 50,  "");
        tierConfig[Tier.Platinum] = TierConfig( 1_250, 0, 108, "");
        tierConfig[Tier.Diamond]  = TierConfig(   625, 0, 304, "");
        tierConfig[Tier.Emerald]  = TierConfig(   312, 0, 905, "");
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setForge(address _forge) external onlyOwner {
        require(_forge != address(0), "Zero address");
        forge = _forge;
        emit ForgeSet(_forge);
    }

    function setFeeHook(address _hook) external onlyOwner {
        feeHook = _hook;
        emit FeeHookSet(_hook);
    }

    function setMetadataURI(Tier tier, string calldata uri) external onlyOwner {
        tierConfig[tier].metadataURI = uri;
        emit MetadataURISet(tier, uri);
    }

    // ─── Hook mint / burn / upgrade ───────────────────────────────────────────

    /**
     * @notice Mint NFTs after a VENA buy on the v4 pool. Only VenaHook.
     * @param to     Recipient (the swapper).
     * @param tier   Tier based on cumulative VENA bought.
     * @param amount Number of NFTs (1 per whole VENA received).
     */
    function mintByHook(address to, Tier tier, uint256 amount) external {
        require(msg.sender == feeHook, "Only hook");
        require(to != address(0), "Zero recipient");
        require(amount > 0 && amount <= 50, "Amount: 1-50");

        TierConfig storage cfg = tierConfig[tier];
        require(cfg.minted + amount <= cfg.maxSupply, "Tier: sold out");

        for (uint256 i; i < amount; ++i) {
            _mintTo(to, tier);
        }
    }

    /**
     * @notice Burn an NFT. Only VenaHook. Burns from current owner (wallet or VenaMining).
     */
    function burnByHook(uint256 tokenId) external {
        require(msg.sender == feeHook, "Only hook");
        _requireOwned(tokenId);

        Tier tier = tokenTier[tokenId];
        tierConfig[tier].minted--;

        _burn(tokenId);
        emit Burned(tokenId, tier);
    }

    /**
     * @notice Upgrade tier in-place (same tokenId, Stratum preserved). Only VenaHook.
     */
    function upgradeTierByHook(uint256 tokenId, Tier newTier) external {
        require(msg.sender == feeHook, "Only hook");
        _requireOwned(tokenId);

        Tier oldTier = tokenTier[tokenId];
        require(newTier > oldTier, "Not upgrade");

        TierConfig storage oldCfg = tierConfig[oldTier];
        TierConfig storage newCfg = tierConfig[newTier];
        require(newCfg.minted < newCfg.maxSupply, "Tier: sold out");

        oldCfg.minted--;
        newCfg.minted++;
        tokenTier[tokenId] = newTier;

        emit TierUpgraded(tokenId, oldTier, newTier);
    }

    // ─── Forge mint ───────────────────────────────────────────────────────────

    function mintByForge(address to, Tier tier) external {
        require(msg.sender == forge, "Only Forge");
        require(tier != Tier.Silver, "Forge: use pool buys");
        TierConfig storage cfg = tierConfig[tier];
        require(cfg.minted < cfg.maxSupply, "Tier: sold out");
        _mintTo(to, tier);
    }

    /**
     * @dev Legacy path disabled - NFTs come from v4 pool buys via VenaHook.
     */
    function mintSilver(uint256) external pure {
        revert("Disabled: buy VENA on the v4 pool");
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return tierConfig[tokenTier[tokenId]].metadataURI;
    }

    function getMiningPower(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return tierConfig[tokenTier[tokenId]].miningPower;
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    /// @notice O(n) scan - useful for frontends; hook uses its own registry.
    function tokensOfOwner(address owner) external view returns (uint256[] memory) {
        uint256 total = _nextTokenId;
        uint256 count;
        for (uint256 i; i < total; ++i) {
            if (_ownerOf(i) == owner) count++;
        }
        uint256[] memory ids = new uint256[](count);
        uint256 idx;
        for (uint256 i; i < total; ++i) {
            if (_ownerOf(i) == owner) ids[idx++] = i;
        }
        return ids;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _mintTo(address to, Tier tier) internal {
        uint256 tokenId = _nextTokenId++;
        tokenTier[tokenId] = tier;
        tierConfig[tier].minted++;
        _safeMint(to, tokenId);
        emit Minted(to, tokenId, tier);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = super._update(to, tokenId, auth);

        bool notifyHook = (
            feeHook != address(0) &&
            to != address(0) &&
            to != address(0xdEaD)
        );

        if (notifyHook) {
            (bool _ok, ) = feeHook.call(
                abi.encodeWithSignature("onNFTAcquired(address,uint256)", to, tokenId)
            );
            _ok;
        }

        return from;
    }
}
