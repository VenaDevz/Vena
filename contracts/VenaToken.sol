// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VenaToken
 * @notice Fixed-supply ERC-20 token for the Vena Mining Protocol.
 *
 * Supply breakdown (10,000 VENA total):
 *   5,000  → Liquidity (Uniswap v4 pool)
 *   4,000  → Mining emissions (transferred to VenaMining on deploy)
 *   1,000  → Treasury
 *
 * No additional minting ever. Owner can only renounce after setup.
 */
contract VenaToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 10_000 * 1e18;

    constructor(address initialOwner)
        ERC20("Vena", "VENA")
        Ownable(initialOwner)
    {
        _mint(initialOwner, MAX_SUPPLY);
    }
}
