// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title VenaLandBase
 * @dev ERC1155 Smart Contract for VenaLand Bases (Arsalar).
 * Features:
 * - 7.5% EIP-2981 Royalties.
 * - Token IDs correspond to Grid Sizes: 2 = 2x2, 3 = 3x3, 4 = 4x4, 5 = 5x5.
 * - Admin functions for minting (when a user opens a Chest).
 * - Admin function to upgrade bases (burn smaller base, mint larger base).
 */
contract VenaLandBase is ERC1155, ERC2981, Ownable {
    using Strings for uint256;

    // Contract name & symbol for marketplaces (like OpenSea)
    string public name = "VenaLand Bases";
    string public symbol = "VENALAND";

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
    ) ERC1155("ipfs://bafybeihvmwejvd5nbvx2ylyq5mzoj3waw7ymlkimq5wbb2gt42nlpnfwqa/") Ownable(initialOwner) {
        // IPFS Metadata URI
        _baseTokenURI = "ipfs://bafybeihvmwejvd5nbvx2ylyq5mzoj3waw7ymlkimq5wbb2gt42nlpnfwqa/"; 
        
        // Set default royalty to 7.5% (750 basis points)
        _setDefaultRoyalty(treasury, 750);
    }

    /**
     * @dev Sets a new Base URI for all tokens.
     */
    function setBaseURI(string memory newuri) external onlyOwner {
        _baseTokenURI = newuri;
        _setURI(newuri);
    }

    /**
     * @dev Overrides the ERC1155 uri function to append the token ID and .json
     * Ex: ipfs://Qm.../2.json
     */
    function uri(uint256 tokenId) public view virtual override returns (string memory) {
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
    }

    /**
     * @dev Mints a specific land to a user. Called when a user opens a Chest.
     */
    function mintBase(address to, uint256 sizeId, uint256 amount) external onlyOwner {
        require(sizeId >= 2 && sizeId <= 5, "Invalid Base Size ID");
        _mint(to, sizeId, amount, "");
    }

    /**
     * @dev Upgrades a user's base. Burns the old size and mints the new size.
     * Called by the backend/game logic after verifying VENA payment.
     */
    function adminUpgradeBase(address user, uint256 oldSizeId, uint256 newSizeId) external onlyOwner {
        require(oldSizeId >= 2 && oldSizeId <= 4, "Invalid Old Size");
        require(newSizeId == oldSizeId + 1, "Can only upgrade 1 level at a time");
        require(newSizeId <= 5, "Max size reached");
        require(balanceOf(user, oldSizeId) > 0, "User does not own the old base");

        _burn(user, oldSizeId, 1);
        _mint(user, newSizeId, 1, "");
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
