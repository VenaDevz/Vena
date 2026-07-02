// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PickaxeNFT.sol";

/**
 * @title VenaMining (Robinhood Chain)
 * @notice Stake VPICK NFTs to earn VENA from the 250M pool over ~730 days.
 */
contract VenaMining is IERC721Receiver, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant EMISSION_PERIOD = 730 days;
    uint256 public constant TOTAL_REWARD     = 250_000_000 * 1e18;
    uint256 public constant REWARD_PER_SEC   = TOTAL_REWARD / EMISSION_PERIOD;

    uint256 private constant ACC_PRECISION = 1e18;

    IERC20 public immutable venaToken;
    PickaxeNFT public immutable pickaxe;

    uint256 public startTime;
    uint256 public endTime;
    bool    public started;

    uint256 public lastRewardTime;
    uint256 public accRewardPerPower;
    uint256 public totalPower;

    struct UserInfo {
        uint256   totalPower;
        uint256   rewardDebt;
        uint256   pendingHarvest;
        uint256[] stakedIds;
    }

    mapping(address => UserInfo) private _users;
    mapping(uint256 => address) public stakedBy;

    event Started(uint256 startTime, uint256 endTime);
    event Staked(address indexed user, uint256 indexed tokenId, uint256 power);
    event Unstaked(address indexed user, uint256 indexed tokenId);
    event RewardsClaimed(address indexed user, uint256 amount);
    event Swept(address indexed to, uint256 amount);

    constructor(address _venaToken, address _pickaxe, address initialOwner)
        Ownable(initialOwner)
    {
        require(_venaToken != address(0) && _pickaxe != address(0), "Zero address");
        venaToken = IERC20(_venaToken);
        pickaxe   = PickaxeNFT(_pickaxe);
    }

    function start() external onlyOwner {
        require(!started, "Already started");
        require(venaToken.balanceOf(address(this)) >= TOTAL_REWARD, "Fund mining pool first");
        started = true;
        startTime = block.timestamp;
        endTime = block.timestamp + EMISSION_PERIOD;
        lastRewardTime = block.timestamp;
        emit Started(startTime, endTime);
    }

    function sweep() external onlyOwner {
        require(block.timestamp > endTime, "Emissions not ended");
        _updatePool();
        require(totalPower == 0, "Users still staked");
        uint256 bal = venaToken.balanceOf(address(this));
        venaToken.safeTransfer(owner(), bal);
        emit Swept(owner(), bal);
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
        venaToken.safeTransfer(msg.sender, pending);
        emit RewardsClaimed(msg.sender, pending);
    }

    function pendingRewards(address user) external view returns (uint256) {
        UserInfo storage u = _users[user];
        if (!started || u.totalPower == 0) return u.pendingHarvest;
        uint256 acc = accRewardPerPower;
        if (block.timestamp > lastRewardTime && totalPower > 0) {
            uint256 end = block.timestamp > endTime ? endTime : block.timestamp;
            if (end > lastRewardTime) {
                uint256 elapsed = end - lastRewardTime;
                acc += elapsed * REWARD_PER_SEC * ACC_PRECISION / totalPower;
            }
        }
        uint256 accumulated = u.totalPower * acc / ACC_PRECISION;
        return u.pendingHarvest + accumulated - u.rewardDebt;
    }

    function stakedTokenIds(address user) external view returns (uint256[] memory) {
        return _users[user].stakedIds;
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }

    function _updatePool() internal {
        if (!started || block.timestamp <= lastRewardTime || totalPower == 0) {
            return;
        }
        uint256 end = block.timestamp > endTime ? endTime : block.timestamp;
        if (end <= lastRewardTime) return;
        uint256 elapsed = end - lastRewardTime;
        accRewardPerPower += elapsed * REWARD_PER_SEC * ACC_PRECISION / totalPower;
        lastRewardTime = end;
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
