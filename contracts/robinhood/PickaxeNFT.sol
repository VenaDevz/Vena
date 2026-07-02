// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PickaxeNFT (Robinhood Chain)
 * @notice VPICK — mint & upgrade only via VenaForge (VENA payment + burn).
 */
contract PickaxeNFT is ERC721, Ownable {
    enum Tier { Silver, Gold, Platinum, Diamond, Emerald }

    struct TierConfig {
        uint256 maxSupply;
        uint256 minted;
        uint256 miningPower;
        string  metadataURI;
    }

    address public forge;

    uint256 private _nextTokenId;

    mapping(Tier => TierConfig) public tierConfig;
    mapping(uint256 => Tier) public tokenTier;

    event Minted(address indexed to, uint256 indexed tokenId, Tier tier);
    event Burned(uint256 indexed tokenId, Tier tier);
    event ForgeSet(address indexed forge);
    event MetadataURISet(Tier indexed tier, string uri);

    constructor(address initialOwner)
        ERC721("Vena Pickaxe", "VPICK")
        Ownable(initialOwner)
    {
        // miningPower = hashrate × pyramid multiplier (matches site tokenomics)
        tierConfig[Tier.Silver]   = TierConfig(10_000, 0,  10,  "");
        tierConfig[Tier.Gold]     = TierConfig( 2_500, 0,  50,  "");
        tierConfig[Tier.Platinum] = TierConfig( 1_250, 0, 108,  "");
        tierConfig[Tier.Diamond]  = TierConfig(   625, 0, 304,  "");
        tierConfig[Tier.Emerald]  = TierConfig(   312, 0, 906,  "");
    }

    modifier onlyForge() {
        require(msg.sender == forge, "Only Forge");
        _;
    }

    function setForge(address _forge) external onlyOwner {
        require(_forge != address(0), "Zero address");
        forge = _forge;
        emit ForgeSet(_forge);
    }

    function setMetadataURI(Tier tier, string calldata uri) external onlyOwner {
        tierConfig[tier].metadataURI = uri;
        emit MetadataURISet(tier, uri);
    }

    function mintByForge(address to, Tier tier) external onlyForge {
        TierConfig storage cfg = tierConfig[tier];
        require(cfg.minted < cfg.maxSupply, "Tier: sold out");
        _mintTo(to, tier);
    }

    function burnByForge(uint256 tokenId) external onlyForge {
        require(_ownerOf(tokenId) == forge, "Forge must hold NFT");
        Tier tier = tokenTier[tokenId];
        _burn(tokenId);
        emit Burned(tokenId, tier);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return tierConfig[tokenTier[tokenId]].metadataURI;
    }

    function getMiningPower(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return tierConfig[tokenTier[tokenId]].miningPower;
    }

    function getTier(uint256 tokenId) external view returns (Tier) {
        _requireOwned(tokenId);
        return tokenTier[tokenId];
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

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

    function _mintTo(address to, Tier tier) internal {
        uint256 tokenId = _nextTokenId++;
        tokenTier[tokenId] = tier;
        tierConfig[tier].minted++;
        _safeMint(to, tokenId);
        emit Minted(to, tokenId, tier);
    }
}
