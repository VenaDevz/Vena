// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PickaxeNFT.sol";

/**
 * @title VenaMiningV2 (Robinhood Chain)
 * @notice Buyback-fed staking pool — no fixed 250M upfront allocation.
 *         Treasury / keeper calls `fundRewards()` after each ETH→VENA buyback.
 *         New deposits vest into `rewardPerSecond` over `fundVestPeriod`.
 */
contract VenaMiningV2 is IERC721Receiver, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant ACC_PRECISION = 1e18;

    IERC20 public immutable venaToken;
    PickaxeNFT public immutable pickaxe;

    /// @notice Address allowed to top up the pool (treasury keeper wallet).
    address public fundingOperator;

    /// @notice Minimum pool balance before staking opens.
    uint256 public minPoolToStart;

    /// @notice Each buyback vests into emission over this window.
    uint256 public fundVestPeriod;

    bool public started;
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

    event Started(uint256 startTime);
    event Funded(address indexed from, uint256 amount, uint256 newRewardPerSecond);
    event Staked(address indexed user, uint256 indexed tokenId, uint256 power);
    event Unstaked(address indexed user, uint256 indexed tokenId);
    event RewardsClaimed(address indexed user, uint256 amount);
    event FundingOperatorSet(address indexed operator);
    event FundVestPeriodSet(uint256 period);
    event MinPoolToStartSet(uint256 minAmount);

    constructor(
        address _venaToken,
        address _pickaxe,
        address initialOwner,
        address _fundingOperator
    ) Ownable(initialOwner) {
        require(_venaToken != address(0) && _pickaxe != address(0), "Zero address");
        venaToken = IERC20(_venaToken);
        pickaxe = PickaxeNFT(_pickaxe);
        fundingOperator = _fundingOperator;
        minPoolToStart = 1_000 * 1e18;
        fundVestPeriod = 7 days;
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

    /// @notice Top up the pool after a treasury buyback. Opens staking on first qualifying deposit.
    function fundRewards(uint256 amount) external nonReentrant {
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

    function stakeNFT(uint256 tokenId) external nonReentrant {
        require(started, "Mining not started");
        require(pickaxe.ownerOf(tokenId) == msg.sender, "Not owner");
        require(stakedBy[tokenId] == address(0), "Already staked");

        _updatePool();

        UserInfo storage user = _users[msg.sender];
        _harvest(user);

        uint256 power = pickaxe.getMiningPower(tokenId);
        user.totalPower += power;
        user.rewardDebt = user.totalPower * accRewardPerPower / ACC_PRECISION;
        user.stakedIds.push(tokenId);

        totalPower += power;
        stakedBy[tokenId] = msg.sender;

        pickaxe.safeTransferFrom(msg.sender, address(this), tokenId);
        emit Staked(msg.sender, tokenId, power);
    }

    function unstakeNFT(uint256 tokenId) external nonReentrant {
        require(stakedBy[tokenId] == msg.sender, "Not staked");

        _updatePool();
        UserInfo storage user = _users[msg.sender];
        _harvest(user);

        uint256 power = pickaxe.getMiningPower(tokenId);
        user.totalPower -= power;
        user.rewardDebt = user.totalPower * accRewardPerPower / ACC_PRECISION;
        _removeStakedId(user, tokenId);

        totalPower -= power;
        stakedBy[tokenId] = address(0);

        pickaxe.safeTransferFrom(address(this), msg.sender, tokenId);
        emit Unstaked(msg.sender, tokenId);
    }

    function claimRewards() external nonReentrant {
        require(started, "Mining not started");
        _updatePool();
        UserInfo storage user = _users[msg.sender];
        _harvest(user);
        uint256 pending = user.pendingHarvest;
        require(pending > 0, "Nothing to claim");
        user.pendingHarvest = 0;
        totalClaimed += pending;
        venaToken.safeTransfer(msg.sender, pending);
        emit RewardsClaimed(msg.sender, pending);
    }

    /// @dev Frontend compatibility alias.
    function isActive() external view returns (bool) {
        return started;
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

    /// @dev Frontend compatibility — matches legacy `getUserInfo` shape.
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

    function _effectiveRewardPerSecond() internal view returns (uint256) {
        uint256 bal = venaToken.balanceOf(address(this));
        if (bal == 0) return 0;
        uint256 maxRate = bal / 1 days;
        return rewardPerSecond > maxRate ? maxRate : rewardPerSecond;
    }

    function _updatePool() internal {
        if (!started || block.timestamp <= lastRewardTime || totalPower == 0) {
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
