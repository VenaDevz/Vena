// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title VenaLandChest
 * @dev ERC1155 Smart Contract for VenaLand Chests (Standard & Premium).
 * Features:
 * - 7.5% EIP-2981 Royalties directed to a treasury address.
 * - Dynamic metadata URIs (e.g. ipfs://CID/0.json).
 * - Batch airdrop functionality.
 */
contract VenaLandChest is ERC1155, ERC2981, Ownable {
    using Strings for uint256;

    // Token IDs
    uint256 public constant STANDARD_CHEST = 0;
    uint256 public constant PREMIUM_CHEST = 1;

    // Contract name & symbol for marketplaces (like OpenSea)
    string public name = "VenaLand Chests";
    string public symbol = "VENAC";

    // Base URI for metadata (e.g. "ipfs://Qm.../")
    string private _baseTokenURI;

    /**
     * @dev Constructor
     * @param initialOwner Wallet address that will own the contract (can mint).
     * @param treasury Wallet address that will receive the 7.5% royalties.
     */
    constructor(
        address initialOwner,
        address treasury
    ) ERC1155("ipfs://bafybeifiz4qimxmxqmyj7snparkat5cgrnn3nq6hkcl7zehtd6w5sryx3a/") Ownable(initialOwner) {
        _baseTokenURI = "ipfs://bafybeifiz4qimxmxqmyj7snparkat5cgrnn3nq6hkcl7zehtd6w5sryx3a/";
        
        // Set default royalty to 7.5% (750 basis points)
        // 10000 basis points = 100%
        _setDefaultRoyalty(treasury, 750);
    }

    /**
     * @dev Sets a new Base URI for all tokens. Used to update metadata if needed.
     */
    function setBaseURI(string memory newuri) external onlyOwner {
        _baseTokenURI = newuri;
        _setURI(newuri);
    }

    /**
     * @dev Overrides the ERC1155 uri function to append the token ID and .json
     * Ex: ipfs://Qm.../0.json
     */
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
    }

    /**
     * @dev Mints a specific chest to a user. Only owner (or automated minter contract) can call this.
     */
    function mintChest(address to, uint256 chestId, uint256 amount) external onlyOwner {
        require(chestId == STANDARD_CHEST || chestId == PREMIUM_CHEST, "Invalid chest ID");
        _mint(to, chestId, amount, "");
    }

    /**
     * @dev Batch mints chests for airdrops.
     * Use this to distribute the airdrop to VPICK and 250K+ VENA holders.
     */
    function airdropChests(address[] calldata recipients, uint256 chestId, uint256 amountPerRecipient) external onlyOwner {
        require(chestId == STANDARD_CHEST || chestId == PREMIUM_CHEST, "Invalid chest ID");
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], chestId, amountPerRecipient, "");
        }
    }

    /**
     * @dev Allows the treasury address to be updated for royalties.
     */
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    // Required overrides for ERC2981 support
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
