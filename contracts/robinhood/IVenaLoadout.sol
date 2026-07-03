// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @notice Read-only surface for VenaMiningV3 — chassis level + accessories.
 *         Implementations may add shop/upgrade functions behind feature flags.
 */
interface IVenaLoadout {
    /// @return multiplierBps 10000 = 1.00× applied to Stratum-adjusted pickaxe power sum.
    function powerMultiplierBps(address user) external view returns (uint256);
}
