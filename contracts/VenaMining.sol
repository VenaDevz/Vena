// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PickaxeNFT.sol";

/**
 * @title VenaMining
 * @notice Stake Pickaxe NFTs to earn VENA from the 4,000-token mining pool over 180 days.
 *
 * Reward math (MasterChef-style accumulator):
 *   rewardPerSecond  = 4,000e18 / (180 × 86,400)   ≈ 0.000257 VENA/s
 *   accRewardPerPower  updated every interaction
 *   userShare  = userTotalPower × accRewardPerPower − rewardDebt
 *
 * Mining power per tier:
 *   Silver 10 | Gold 50 | Platinum 108 | Diamond 304 | Emerald 905
 *
 * Workflow:
 *   1. Owner funds contract with 4,000 VENA, calls start().
 *   2. Users call stakeNFT(tokenId) — contract holds NFT.
 *   3. Users call claimRewards() at any time.
 *   4. Users call unstakeNFT(tokenId) to withdraw NFT + pending rewards.
 *   5. After endTime all remaining rewards can be swept by owner.
 */
contract VenaMining is IERC721Receiver, Ownable, ReentrancyGuard {
    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant EMISSION_PERIOD = 180 days;
    uint256 public constant TOTAL_REWARD     = 4_000 * 1e18;
    uint256 public constant REWARD_PER_SEC   = TOTAL_REWARD / EMISSION_PERIOD;

    /// @dev Precision multiplier for accRewardPerPower
    uint256 private constant ACC_PRECISION = 1e18;

    // ─── Immutables ───────────────────────────────────────────────────────────

    IERC20     public immutable venaToken;
    PickaxeNFT public immutable pickaxe;

    // ─── Pool state ───────────────────────────────────────────────────────────

    uint256 public startTime;
    uint256 public endTime;
    bool    public started;

    uint256 public lastRewardTime;
    uint256 public accRewardPerPower; // ACC_PRECISION-scaled
    uint256 public totalPower;        // sum of mining power of all staked NFTs

    // ─── User state ───────────────────────────────────────────────────────────

    struct UserInfo {
        uint256   totalPower;    // sum of staked NFT mining powers
        uint256   rewardDebt;    // ACC_PRECISION-scaled
        uint256   pendingHarvest; // accumulated but not yet transferred
        uint256[] stakedIds;     // tokenIds currently staked
    }

    mapping(address => UserInfo) private _users;

    /// @dev reverse lookup: tokenId → staker (zero = not staked)
    mapping(uint256 => address) public stakedBy;

    /// @dev VenaHook - may force-unstake and burn on VENA sells.
    address public venaHook;

    // ─── Events ───────────────────────────────────────────────────────────────

    event Started(uint256 startTime, uint256 endTime);
    event Staked(address indexed user, uint256 indexed tokenId, uint256 power);
    event Unstaked(address indexed user, uint256 indexed tokenId);
    event RewardsClaimed(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed tokenId);
    event Swept(address indexed to, uint256 amount);
    event VenaHookSet(address indexed hook);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _venaToken, address _pickaxe, address initialOwner)
        Ownable(initialOwner)
    {
        require(_venaToken != address(0) && _pickaxe != address(0), "Zero address");
        venaToken = IERC20(_venaToken);
        pickaxe   = PickaxeNFT(_pickaxe);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Fund the contract with 4,000 VENA and begin emissions.
     * Must be called once after transferring TOTAL_REWARD to this contract.
     */
    function start() external onlyOwner {
        require(!started, "Already started");
        require(
            venaToken.balanceOf(address(this)) >= TOTAL_REWARD,
            "Fund 4000 VENA first"
        );
        started       = true;
        startTime     = block.timestamp;
        endTime       = block.timestamp + EMISSION_PERIOD;
        lastRewardTime = block.timestamp;
        emit Started(startTime, endTime);
    }

    /**
     * @notice Sweep unclaimed VENA after emissions end. Sends to owner.
     */
    function setVenaHook(address _hook) external onlyOwner {
        venaHook = _hook;
        emit VenaHookSet(_hook);
    }

    function sweep() external onlyOwner {
        require(block.timestamp > endTime, "Emissions not ended");
        _updatePool();
        uint256 bal = venaToken.balanceOf(address(this));
        // Leave enough for outstanding user rewards
        // (totalPower == 0 after everyone unstakes, so bal is safe to sweep)
        require(totalPower == 0, "Users still staked");
        venaToken.transfer(owner(), bal);
        emit Swept(owner(), bal);
    }

    // ─── Core ─────────────────────────────────────────────────────────────────

    /**
     * @notice Stake one Pickaxe NFT. Caller must approveForAll first.
     */
    function stakeNFT(uint256 tokenId) external nonReentrant {
        require(started, "Mining not started");
        require(pickaxe.ownerOf(tokenId) == msg.sender, "Not owner");
        require(stakedBy[tokenId] == address(0), "Already staked");

        _updatePool();

        UserInfo storage user = _users[msg.sender];
        _harvest(user);

        uint256 power = pickaxe.getMiningPower(tokenId);
        user.totalPower += power;
        user.rewardDebt  = user.totalPower * accRewardPerPower / ACC_PRECISION;
        user.stakedIds.push(tokenId);

        totalPower      += power;
        stakedBy[tokenId] = msg.sender;

        pickaxe.transferFrom(msg.sender, address(this), tokenId);
        emit Staked(msg.sender, tokenId, power);
    }

    /**
     * @notice Unstake one NFT and claim pending rewards.
     */
    function unstakeNFT(uint256 tokenId) external nonReentrant {
        require(stakedBy[tokenId] == msg.sender, "Not staker");

        _updatePool();

        UserInfo storage user = _users[msg.sender];
        _harvest(user);

        uint256 power = pickaxe.getMiningPower(tokenId);
        user.totalPower -= power;
        user.rewardDebt  = user.totalPower * accRewardPerPower / ACC_PRECISION;

        totalPower      -= power;
        stakedBy[tokenId] = address(0);

        _removeStakedId(user, tokenId);

        pickaxe.transferFrom(address(this), msg.sender, tokenId);

        // Send accumulated harvest
        _transferHarvest(user);

        emit Unstaked(msg.sender, tokenId);
    }

    /**
     * @notice Claim pending VENA rewards without unstaking.
     */
    function claimRewards() external nonReentrant {
        require(started, "Mining not started");

        _updatePool();

        UserInfo storage user = _users[msg.sender];
        _harvest(user);
        user.rewardDebt = user.totalPower * accRewardPerPower / ACC_PRECISION;

        _transferHarvest(user);
    }

    /**
     * @notice Emergency: withdraw NFT without claiming rewards (forfeit earnings).
     * Use only if a bug prevents normal unstake.
     */
    /**
     * @notice Called by VenaHook when user sells VENA. Claims rewards, unstakes, burns NFT.
     */
    function forceUnstakeAndBurn(uint256 tokenId) external nonReentrant {
        require(msg.sender == venaHook, "Only hook");
        address staker = stakedBy[tokenId];
        require(staker != address(0), "Not staked");

        _updatePool();

        UserInfo storage user = _users[staker];
        _harvest(user);

        uint256 power = pickaxe.getMiningPower(tokenId);
        if (user.totalPower >= power) user.totalPower -= power;
        else user.totalPower = 0;

        if (totalPower >= power) totalPower -= power;
        else totalPower = 0;

        user.rewardDebt = user.totalPower * accRewardPerPower / ACC_PRECISION;
        stakedBy[tokenId] = address(0);
        _removeStakedId(user, tokenId);

        _transferHarvest(user);

        pickaxe.burnByHook(tokenId);
        emit Unstaked(staker, tokenId);
    }

    function emergencyWithdraw(uint256 tokenId) external nonReentrant {
        require(stakedBy[tokenId] == msg.sender, "Not staker");

        UserInfo storage user = _users[msg.sender];

        uint256 power = pickaxe.getMiningPower(tokenId);
        if (user.totalPower >= power) user.totalPower -= power;
        else user.totalPower = 0;

        if (totalPower >= power) totalPower -= power;
        else totalPower = 0;

        user.rewardDebt     = user.totalPower * accRewardPerPower / ACC_PRECISION;
        user.pendingHarvest = 0;
        stakedBy[tokenId]   = address(0);

        _removeStakedId(user, tokenId);

        pickaxe.transferFrom(address(this), msg.sender, tokenId);
        emit EmergencyWithdraw(msg.sender, tokenId);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function pendingRewards(address account) external view returns (uint256) {
        UserInfo storage user = _users[account];
        if (user.totalPower == 0) return user.pendingHarvest;

        uint256 acc = accRewardPerPower;
        if (totalPower > 0 && started) {
            uint256 to   = block.timestamp < endTime ? block.timestamp : endTime;
            uint256 from = lastRewardTime < startTime ? startTime : lastRewardTime;
            if (to > from) {
                uint256 reward = (to - from) * REWARD_PER_SEC;
                acc += reward * ACC_PRECISION / totalPower;
            }
        }
        uint256 earned = user.totalPower * acc / ACC_PRECISION;
        uint256 debt   = user.rewardDebt;
        return user.pendingHarvest + (earned > debt ? earned - debt : 0);
    }

    function getUserInfo(address account)
        external
        view
        returns (
            uint256   power,
            uint256[] memory stakedIds,
            uint256   pending
        )
    {
        UserInfo storage u = _users[account];
        return (u.totalPower, u.stakedIds, this.pendingRewards(account));
    }

    function isActive() external view returns (bool) {
        return started && block.timestamp <= endTime;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _updatePool() internal {
        if (!started) return;
        uint256 now_ = block.timestamp < endTime ? block.timestamp : endTime;
        if (now_ <= lastRewardTime) return;

        if (totalPower > 0) {
            uint256 elapsed = now_ - lastRewardTime;
            uint256 reward  = elapsed * REWARD_PER_SEC;
            accRewardPerPower += reward * ACC_PRECISION / totalPower;
        }
        lastRewardTime = now_;
    }

    function _harvest(UserInfo storage user) internal {
        if (user.totalPower == 0) return;
        uint256 earned = user.totalPower * accRewardPerPower / ACC_PRECISION;
        if (earned > user.rewardDebt) {
            user.pendingHarvest += earned - user.rewardDebt;
        }
    }

    function _transferHarvest(UserInfo storage user) internal {
        uint256 amount = user.pendingHarvest;
        if (amount == 0) return;
        user.pendingHarvest = 0;
        uint256 bal = venaToken.balanceOf(address(this));
        if (amount > bal) amount = bal; // safety cap
        venaToken.transfer(msg.sender, amount);
        emit RewardsClaimed(msg.sender, amount);
    }

    function _removeStakedId(UserInfo storage user, uint256 tokenId) internal {
        uint256[] storage ids = user.stakedIds;
        for (uint256 i; i < ids.length; ++i) {
            if (ids[i] == tokenId) {
                ids[i] = ids[ids.length - 1];
                ids.pop();
                return;
            }
        }
    }

    // ─── ERC-721 Receiver ─────────────────────────────────────────────────────

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
