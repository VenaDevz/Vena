// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TreasuryVesting
 * @notice Locks 1,000 VENA and releases them linearly over VESTING_PERIOD.
 *
 * - Beneficiary (owner) can call release() at any time to claim vested tokens.
 * - Nothing can be released before startTime.
 * - After VESTING_PERIOD, 100% is claimable.
 *
 * Deployment:
 *   1. Deploy this contract (set beneficiary = your wallet).
 *   2. Transfer 1,000 VENA to this contract address.
 *   3. Call start() — vesting clock begins.
 */
contract TreasuryVesting is Ownable {
    // ─── Config ───────────────────────────────────────────────────────────────

    uint256 public constant VESTING_PERIOD = 180 days; // change if needed
    uint256 public constant TOTAL_LOCKED   = 1_000 * 1e18;

    // ─── State ────────────────────────────────────────────────────────────────

    IERC20  public immutable venaToken;
    address public immutable beneficiary;

    uint256 public startTime;
    bool    public started;
    uint256 public totalReleased;

    // ─── Events ───────────────────────────────────────────────────────────────

    event VestingStarted(uint256 startTime, uint256 endTime);
    event Released(address indexed to, uint256 amount);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _venaToken, address _beneficiary)
        Ownable(_beneficiary)
    {
        require(_venaToken    != address(0), "Zero address");
        require(_beneficiary  != address(0), "Zero address");
        venaToken   = IERC20(_venaToken);
        beneficiary = _beneficiary;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Start the vesting clock. Contract must hold >= 1,000 VENA.
     */
    function start() external onlyOwner {
        require(!started, "Already started");
        require(
            venaToken.balanceOf(address(this)) >= TOTAL_LOCKED,
            "Fund 1000 VENA first"
        );
        started   = true;
        startTime = block.timestamp;
        emit VestingStarted(startTime, startTime + VESTING_PERIOD);
    }

    // ─── Release ──────────────────────────────────────────────────────────────

    /**
     * @notice Claim all currently vested (but unreleased) tokens.
     */
    function release() external {
        require(msg.sender == beneficiary, "Not beneficiary");
        require(started, "Not started");

        uint256 amount = releasable();
        require(amount > 0, "Nothing to release");

        totalReleased += amount;
        venaToken.transfer(beneficiary, amount);
        emit Released(beneficiary, amount);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    /// @notice How many tokens are vested so far (cumulative).
    function vestedAmount() public view returns (uint256) {
        if (!started) return 0;
        uint256 elapsed = block.timestamp - startTime;
        if (elapsed >= VESTING_PERIOD) return TOTAL_LOCKED;
        return TOTAL_LOCKED * elapsed / VESTING_PERIOD;
    }

    /// @notice How many tokens can be claimed right now.
    function releasable() public view returns (uint256) {
        uint256 vested = vestedAmount();
        return vested > totalReleased ? vested - totalReleased : 0;
    }

    /// @notice Progress percentage (0–100).
    function vestingProgress() external view returns (uint256) {
        if (!started) return 0;
        uint256 elapsed = block.timestamp - startTime;
        if (elapsed >= VESTING_PERIOD) return 100;
        return elapsed * 100 / VESTING_PERIOD;
    }
}
