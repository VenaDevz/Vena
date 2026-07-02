// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VenaToken (Robinhood Chain)
 * @notice Fixed 1B supply — matches site tokenomics.
 *         Deployer receives full supply; allocation script sends to mining / treasury / LP.
 */
contract VenaToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 1e18;

    uint256 public constant LIQUIDITY_ALLOC = 500_000_000 * 1e18;
    uint256 public constant MINING_ALLOC = 250_000_000 * 1e18;
    uint256 public constant TREASURY_ALLOC = 100_000_000 * 1e18;
    uint256 public constant ECOSYSTEM_ALLOC = 150_000_000 * 1e18;

    constructor(address initialOwner) ERC20("Vena", "VENA") Ownable(initialOwner) {
        _mint(initialOwner, MAX_SUPPLY);
    }
}
