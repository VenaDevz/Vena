// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./PickaxeNFT.sol";
import "./IVenaLoadout.sol";

/**
 * @title VenaMiningV4 (Robinhood Chain)
 * @notice Buyback-fed staking with Stratum (per-NFT stake time) + optional Loadout multiplier.
 *         Includes On-Chain Halving, Pausable, and Admin Emergency functions.
 */
contract VenaMiningV4 is IERC721Receiver, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    uint256 public constant ACC_PRECISION = 1e18;
    uint256 public constant BPS = 10_000;

    IERC20 public immutable venaToken;
    PickaxeNFT public immutable pickaxe;
    IVenaLoadout public loadout;

    address public fundingOperator;
    uint256 public minPoolToStart;
    uint256 public fundVestPeriod;
    uint256 public halvingPeriod;

    bool public started;
    bool public stratumEnabled;

    uint256 public startTime;
    uint256 public rewardPerSecond;
    uint256 public lastRewardTime;
    uint256 public accRewardPerPower;
    uint256 public totalPower;

    uint256 public totalFunded;
    uint256 public totalClaimed;

    struct UserInfo {
        uint256 totalPower;
        uint256 rewardDebt;
        uint256 pendingHarvest;
        uint256[] stakedIds;
    }

    mapping(address => UserInfo) private _users;
    mapping(uint256 => address) public stakedBy;
    mapping(uint256 => uint256) public stakedAt;

    event Started(uint256 startTime);
    event Funded(address indexed from, uint256 amount, uint256 newRewardPerSecond);
    event Staked(address indexed user, uint256 indexed tokenId, uint256 powerAdded, uint256 userPower);
    event Unstaked(address indexed user, uint256 indexed tokenId);
    event RewardsClaimed(address indexed user, uint256 amount);
    event PowerSynced(address indexed user, uint256 newPower);
    event LoadoutSet(address indexed loadout);
    event StratumEnabled(bool enabled);
    event FundingOperatorSet(address indexed operator);
    event FundVestPeriodSet(uint256 period);
    event MinPoolToStartSet(uint256 minAmount);

    constructor(
        address _venaToken,
        address _pickaxe,
        address _loadout,
        address initialOwner,
        address _fundingOperator
    ) Ownable(initialOwner) {
        require(_venaToken != address(0) && _pickaxe != address(0), "Zero address");
        venaToken = IERC20(_venaToken);
        pickaxe = PickaxeNFT(_pickaxe);
        if (_loadout != address(0)) {
            loadout = IVenaLoadout(_loadout);
        }
        fundingOperator = _fundingOperator;
        minPoolToStart = 1_000 * 1e18;
        fundVestPeriod = 7 days;
        stratumEnabled = true;
        halvingPeriod = 30 days;
    }

    function setLoadout(address _loadout) external onlyOwner {
        loadout = IVenaLoadout(_loadout);
        emit LoadoutSet(_loadout);
    }

    function setStratumEnabled(bool enabled) external onlyOwner {
        stratumEnabled = enabled;
        emit StratumEnabled(enabled);
    }

    function setFundingOperator(address operator) external onlyOwner {
        require(operator != address(0), "Zero address");
        fundingOperator = operator;
        emit FundingOperatorSet(operator);
    }

    function setFundVestPeriod(uint256 period) external onlyOwner {
        require(period >= 1 hours, "Period too short");
        fundVestPeriod = period;
        emit FundVestPeriodSet(period);
    }

    function setMinPoolToStart(uint256 minAmount) external onlyOwner {
        minPoolToStart = minAmount;
        emit MinPoolToStartSet(minAmount);
    }

    function setHalvingPeriod(uint256 period) external onlyOwner {
        halvingPeriod = period;
    }

    function setRewardPerSecond(uint256 rate) external onlyOwner {
        _updatePool();
        rewardPerSecond = rate;
    }

    function setStartTime(uint256 _startTime) external onlyOwner {
        _updatePool();
        startTime = _startTime;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
    }

    function fundRewards(uint256 amount) external nonReentrant whenNotPaused {
        require(
            msg.sender == fundingOperator || msg.sender == owner(),
            "Not funding role"
        );
        require(amount > 0, "Zero amount");

        venaToken.safeTransferFrom(msg.sender, address(this), amount);
        totalFunded += amount;

        if (!started) {
            require(
                venaToken.balanceOf(address(this)) >= minPoolToStart,
                "Below min pool"
            );
            started = true;
            startTime = block.timestamp;
            lastRewardTime = block.timestamp;
            emit Started(block.timestamp);
        } else {
            _updatePool();
        }

        rewardPerSecond += amount / fundVestPeriod;
        emit Funded(msg.sender, amount, rewardPerSecond);
    }

    function stakeNFT(uint256 tokenId) external nonReentrant whenNotPaused {
        require(started, "Mining not started");
        require(pickaxe.ownerOf(tokenId) == msg.sender, "Not owner");
        require(stakedBy[tokenId] == address(0), "Already staked");

        _updatePool();
        UserInfo storage user = _users[msg.sender];
        _harvest(user);

        uint256 powerBefore = user.totalPower;
        user.stakedIds.push(tokenId);
        stakedBy[tokenId] = msg.sender;
        stakedAt[tokenId] = block.timestamp;

        pickaxe.safeTransferFrom(msg.sender, address(this), tokenId);

        _applyUserPower(msg.sender);
        emit Staked(
            msg.sender,
            tokenId,
            _users[msg.sender].totalPower - powerBefore,
            _users[msg.sender].totalPower
        );
    }

    function unstakeNFT(uint256 tokenId) external nonReentrant whenNotPaused {
        require(stakedBy[tokenId] == msg.sender, "Not staked");

        _updatePool();
        UserInfo storage user = _users[msg.sender];
        _harvest(user);

        _removeStakedId(user, tokenId);
        stakedBy[tokenId] = address(0);
        stakedAt[tokenId] = 0;

        pickaxe.safeTransferFrom(address(this), msg.sender, tokenId);

        _applyUserPower(msg.sender);
        emit Unstaked(msg.sender, tokenId);
    }

    /// @notice Call after loadout level/accessory changes while staked.
    function syncPower() external nonReentrant whenNotPaused {
        require(started, "Mining not started");
        UserInfo storage user = _users[msg.sender];
        require(user.stakedIds.length > 0, "Nothing staked");

        _updatePool();
        _harvest(user);
        _applyUserPower(msg.sender);
        emit PowerSynced(msg.sender, user.totalPower);
    }

    function claimRewards() external nonReentrant whenNotPaused {
        require(started, "Mining not started");
        _updatePool();
        UserInfo storage user = _users[msg.sender];
        _harvest(user);
        _applyUserPower(msg.sender);
        uint256 pending = user.pendingHarvest;
        require(pending > 0, "Nothing to claim");
        user.pendingHarvest = 0;
        totalClaimed += pending;
        venaToken.safeTransfer(msg.sender, pending);
        emit RewardsClaimed(msg.sender, pending);
    }

    function isActive() external view returns (bool) {
        return started;
    }

    function stratumBps(uint256 tokenId) public view returns (uint256) {
        if (!stratumEnabled) return BPS;
        uint256 at = stakedAt[tokenId];
        if (at == 0) return BPS;
        return _stratumBpsFromHeld(block.timestamp - at);
    }

    function pendingRewards(address user) public view returns (uint256) {
        UserInfo storage u = _users[user];
        if (!started || u.totalPower == 0) return u.pendingHarvest;
        uint256 acc = accRewardPerPower;
        if (block.timestamp > lastRewardTime && totalPower > 0) {
            uint256 rate = _effectiveRewardPerSecond();
            uint256 elapsed = block.timestamp - lastRewardTime;
            acc += elapsed * rate * ACC_PRECISION / totalPower;
        }
        uint256 accumulated = u.totalPower * acc / ACC_PRECISION;
        return u.pendingHarvest + accumulated - u.rewardDebt;
    }

    function stakedTokenIds(address user) external view returns (uint256[] memory) {
        return _users[user].stakedIds;
    }

    function getUserInfo(address account)
        external
        view
        returns (uint256 power, uint256[] memory stakedIds, uint256 pending)
    {
        UserInfo storage u = _users[account];
        return (u.totalPower, u.stakedIds, pendingRewards(account));
    }

    function poolBalance() external view returns (uint256) {
        return venaToken.balanceOf(address(this));
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }

    function _stratumBpsFromHeld(uint256 held) internal pure returns (uint256) {
        if (held >= 30 days) return 65_000;
        if (held >= 14 days) return 50_000;
        if (held >= 7 days) return 37_500;
        if (held >= 3 days) return 28_000;
        if (held >= 1 days) return 21_000;
        if (held >= 6 hours) return 16_000;
        if (held >= 1 hours) return 12_500;
        return BPS;
    }

    function _pickaxePower(uint256 tokenId) internal view returns (uint256) {
        uint256 base = pickaxe.getMiningPower(tokenId);
        return (base * stratumBps(tokenId)) / BPS;
    }

    function _calcEffectivePower(address user) internal view returns (uint256) {
        UserInfo storage u = _users[user];
        uint256 sum;
        uint256 len = u.stakedIds.length;
        for (uint256 i; i < len; ++i) {
            sum += _pickaxePower(u.stakedIds[i]);
        }
        if (address(loadout) != address(0)) {
            sum = (sum * loadout.powerMultiplierBps(user)) / BPS;
        }
        return sum;
    }

    function _applyUserPower(address user) internal {
        UserInfo storage u = _users[user];
        uint256 newPower = _calcEffectivePower(user);
        totalPower = totalPower - u.totalPower + newPower;
        u.totalPower = newPower;
        u.rewardDebt = u.totalPower * accRewardPerPower / ACC_PRECISION;
    }

    function _effectiveRewardPerSecond() internal view returns (uint256) {
        uint256 bal = venaToken.balanceOf(address(this));
        if (bal == 0) return 0;
        
        uint256 baseRate = rewardPerSecond;
        if (started && halvingPeriod > 0) {
            uint256 elapsed = block.timestamp > startTime ? block.timestamp - startTime : 0;
            uint256 epoch = elapsed / halvingPeriod;
            if (epoch > 0) {
                baseRate = baseRate / (2 ** epoch);
            }
        }
        
        uint256 maxRate = bal / 1 days;
        return baseRate > maxRate ? maxRate : baseRate;
    }

    function _updatePool() internal {
        if (!started || block.timestamp <= lastRewardTime) return;

        if (totalPower == 0) {
            lastRewardTime = block.timestamp;
            return;
        }

        uint256 rate = _effectiveRewardPerSecond();
        if (rate == 0) return;
        uint256 elapsed = block.timestamp - lastRewardTime;
        accRewardPerPower += elapsed * rate * ACC_PRECISION / totalPower;
        lastRewardTime = block.timestamp;
    }

    function _harvest(UserInfo storage user) internal {
        if (user.totalPower == 0) return;
        uint256 accumulated = user.totalPower * accRewardPerPower / ACC_PRECISION;
        uint256 pending = accumulated - user.rewardDebt;
        if (pending > 0) user.pendingHarvest += pending;
        user.rewardDebt = accumulated;
    }

    function _removeStakedId(UserInfo storage user, uint256 tokenId) internal {
        uint256 len = user.stakedIds.length;
        for (uint256 i; i < len; ++i) {
            if (user.stakedIds[i] == tokenId) {
                user.stakedIds[i] = user.stakedIds[len - 1];
                user.stakedIds.pop();
                return;
            }
        }
    }
}
