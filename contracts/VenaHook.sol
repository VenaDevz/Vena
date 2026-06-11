// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20}          from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable}         from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PickaxeNFT.sol";

// ─── Inline IVenaMining (Remix cannot fetch ./interfaces/) ───────────────────

interface IVenaMining {
    function stakedBy(uint256 tokenId) external view returns (address);
    function forceUnstakeAndBurn(uint256 tokenId) external;
}

// ─── Inline Uniswap v4 types ─────────────────────────────────────────────────

struct PoolKey {
    address currency0;
    address currency1;
    uint24  fee;
    int24   tickSpacing;
    address hooks;
}

struct SwapParams {
    bool    zeroForOne;
    int256  amountSpecified;
    uint160 sqrtPriceLimitX96;
}

type BalanceDelta is int256;

library BalanceDeltaLib {
    function amount0(BalanceDelta delta) internal pure returns (int128) {
        return int128(BalanceDelta.unwrap(delta) >> 128);
    }
    function amount1(BalanceDelta delta) internal pure returns (int128) {
        return int128(BalanceDelta.unwrap(delta));
    }
}

interface IPoolManager {
    function take(address currency, address to, uint256 amount) external;
}

bytes4 constant AFTER_SWAP_SELECTOR = bytes4(
    keccak256("afterSwap(address,(address,address,uint24,int24,address),(bool,int256,uint160),int256,bytes)")
);

/**
 * @title VenaHook v2
 * @notice Uniswap v4 hook for ETH/VENA pool with buy/sell NFT game logic.
 *
 * On ETH -> VENA buy:
 *   - Track lifetime cumulative VENA bought per address (never resets on sell).
 *   - Mint 1 NFT per whole VENA at current tier (Silver/Gold/...).
 *   - Upgrade all existing NFTs in-place when tier threshold is crossed.
 *
 * On VENA -> ETH sell (any amount):
 *   - Burn ALL NFTs for the swapper (staked NFTs auto-unstake + burn via VenaMining).
 *
 * Fees:
 *   - 1% of swap output via afterSwap return delta.
 *   - 80% to NFT holder reward pool (rarity x Stratum weight).
 *   - 20% to treasury (immediate transfer).
 *
 * Swapper detection:
 *   - hookData = abi.encode(address swapper) from VenaSwapRouter.
 *   - Fallback: tx.origin for Uniswap UI / direct EOA swaps.
 *
 * NFT ops are wrapped in try/catch so swaps never revert if mint/burn fails.
 *
 * CREATE2 address flags: last 14 bits == 0x0044
 */
contract VenaHook is Ownable, ReentrancyGuard {
    using BalanceDeltaLib for BalanceDelta;

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 private constant PRECISION      = 1e18;
    uint256 private constant FEE_DIVISOR      = 100;   // 1%
    uint256 private constant HOLDER_SHARE_BPS = 8000;  // 80%
    uint256 private constant TREASURY_BPS     = 2000;  // 20%

    uint256 private constant TIER_GOLD     = 4  * 1e18;
    uint256 private constant TIER_PLATINUM = 8  * 1e18;
    uint256 private constant TIER_DIAMOND  = 16 * 1e18;
    uint256 private constant TIER_EMERALD  = 32 * 1e18;

    uint256[5] private RARITY_WEIGHTS = [1, 4, 8, 16, 32];

    // ─── Immutables ───────────────────────────────────────────────────────────

    IPoolManager public immutable poolManager;
    PickaxeNFT   public immutable pickaxe;
    IERC20       public immutable venaToken;
    IVenaMining  public immutable venaMining;

    // ─── Config ───────────────────────────────────────────────────────────────

    address public treasury;

    // ─── Cumulative buy tracking (lifetime, not reset on sell) ────────────────

    mapping(address => uint256) public cumulativeVenaBought;

    // ─── Per-user NFT registry (logical owner, includes staked) ───────────────

    mapping(address => uint256[]) private _userTokenIds;
    mapping(uint256 => uint256)   private _tokenIndex; // 1-based index in _userTokenIds
    mapping(uint256 => address)   private _logicalOwner;

    // ─── Stratum + fee state ──────────────────────────────────────────────────

    mapping(uint256 => uint256) public tokenAcquiredAt;

    uint256 public totalEffectiveWeightScaled;
    mapping(uint256 => uint256) public tokenEffectiveWeightScaled;

    uint256 public pendingEth;
    uint256 public pendingVena;

    mapping(uint256 => uint256) public tokenEthSnapshot;
    mapping(uint256 => uint256) public tokenVenaSnapshot;
    mapping(uint256 => uint256) public tokenTotalWeightSnapshot;

    uint256 public totalEthDistributed;
    uint256 public totalVenaDistributed;
    uint256 public totalEthToTreasury;
    uint256 public totalVenaToTreasury;

    // ─── Events ───────────────────────────────────────────────────────────────

    event NFTRegistered(address indexed owner, uint256 indexed tokenId, uint256 rarityWeight);
    event StratumUpdated(uint256 indexed tokenId, uint8 newLevel, uint256 multiplierX100);
    event SwapFeeCollected(bool indexed isEth, uint256 totalFee, uint256 holderShare, uint256 treasuryShare);
    event FeesClaimed(address indexed holder, uint256[] tokenIds, uint256 ethAmount, uint256 venaAmount);
    event PickaxesMinted(address indexed user, uint256 count, PickaxeNFT.Tier tier);
    event PickaxesBurned(address indexed user, uint256 count);
    event TierUpgradedBatch(address indexed user, PickaxeNFT.Tier newTier, uint256 count);
    event SwapEffectsFailed(address indexed swapper, bool isBuy);

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address      _poolManager,
        address      _pickaxe,
        address      _venaToken,
        address      _venaMining,
        address      _treasury,
        address      initialOwner
    )
        Ownable(initialOwner)
    {
        require(_poolManager != address(0), "Zero: poolManager");
        require(_pickaxe     != address(0), "Zero: pickaxe");
        require(_venaToken   != address(0), "Zero: venaToken");
        require(_venaMining   != address(0), "Zero: venaMining");
        require(_treasury     != address(0), "Zero: treasury");

        poolManager = IPoolManager(_poolManager);
        pickaxe     = PickaxeNFT(_pickaxe);
        venaToken   = IERC20(_venaToken);
        venaMining  = IVenaMining(_venaMining);
        treasury    = _treasury;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero treasury");
        treasury = _treasury;
    }

    // ─── afterSwap ────────────────────────────────────────────────────────────

    function afterSwap(
        address,
        PoolKey    calldata key,
        SwapParams calldata params,
        BalanceDelta        delta,
        bytes      calldata hookData
    ) external returns (bytes4, int128) {
        require(msg.sender == address(poolManager), "Only PoolManager");
        if (params.amountSpecified >= 0) return (AFTER_SWAP_SELECTOR, 0);

        int128 rawOutput;
        address outputCurrency;

        if (params.zeroForOne) {
            rawOutput      = delta.amount1();
            outputCurrency = key.currency1;
        } else {
            rawOutput      = delta.amount0();
            outputCurrency = key.currency0;
        }

        if (rawOutput >= 0) return (AFTER_SWAP_SELECTOR, 0);

        uint256 outputAmount = uint256(int256(-rawOutput));
        uint256 feeAmount    = outputAmount / FEE_DIVISOR;
        if (feeAmount == 0) return (AFTER_SWAP_SELECTOR, 0);

        poolManager.take(outputCurrency, address(this), feeAmount);

        bool isEth = (outputCurrency == address(0));
        _splitFee(feeAmount, isEth);

        address swapper = _resolveSwapper(hookData);
        if (swapper != address(0)) {
            if (params.zeroForOne) {
                _tryBuyEffects(swapper, outputAmount);
            } else {
                _trySellEffects(swapper);
            }
        }

        return (AFTER_SWAP_SELECTOR, int128(int256(feeAmount)));
    }

    // ─── Buy / sell effects (never revert the swap) ───────────────────────────

    function _tryBuyEffects(address swapper, uint256 venaOut) internal {
        try this._handleBuy(swapper, venaOut) {} catch {
            emit SwapEffectsFailed(swapper, true);
        }
    }

    function _trySellEffects(address swapper) internal {
        try this._handleSell(swapper) {} catch {
            emit SwapEffectsFailed(swapper, false);
        }
    }

    /// @dev External only for try/catch; do not call directly.
    function _handleBuy(address swapper, uint256 venaOut) external {
        require(msg.sender == address(this), "Internal");

        uint256 prevCum = cumulativeVenaBought[swapper];
        uint256 newCum  = prevCum + venaOut;
        cumulativeVenaBought[swapper] = newCum;

        PickaxeNFT.Tier oldTier = _tierForCumulative(prevCum);
        PickaxeNFT.Tier newTier = _tierForCumulative(newCum);

        if (newTier > oldTier) {
            _upgradeAllForUser(swapper, newTier);
        }

        uint256 wholeCount = venaOut / 1e18;
        if (wholeCount > 0) {
            pickaxe.mintByHook(swapper, newTier, wholeCount);
            emit PickaxesMinted(swapper, wholeCount, newTier);
        }
    }

    /// @dev External only for try/catch; do not call directly.
    function _handleSell(address swapper) external {
        require(msg.sender == address(this), "Internal");
        _burnAllForUser(swapper);
    }

    // ─── NFT registry ─────────────────────────────────────────────────────────

    function onNFTAcquired(address newOwner, uint256 tokenId) external {
        require(msg.sender == address(pickaxe), "Only PickaxeNFT");

        // Staking moves NFT to VenaMining - keep registry under staker, preserve Stratum.
        if (newOwner == address(venaMining)) {
            address staker = venaMining.stakedBy(tokenId);
            if (staker != address(0) && _logicalOwner[tokenId] == staker) return;
        }

        address logicalOwner = newOwner;
        if (newOwner == address(venaMining)) {
            address staker = venaMining.stakedBy(tokenId);
            if (staker != address(0)) logicalOwner = staker;
        }

        // Unstake returns NFT to same owner - preserve Stratum.
        if (_logicalOwner[tokenId] == logicalOwner && tokenAcquiredAt[tokenId] != 0) return;

        address prev = _logicalOwner[tokenId];
        if (prev != address(0) && prev != logicalOwner) {
            _removeFromRegistry(prev, tokenId);
            uint256 oldW = tokenEffectiveWeightScaled[tokenId];
            if (oldW > 0 && totalEffectiveWeightScaled >= oldW) {
                totalEffectiveWeightScaled -= oldW;
            }
        }

        _registerNFT(logicalOwner, tokenId);
    }

    function registerNFT(uint256 tokenId) external {
        require(pickaxe.ownerOf(tokenId) == msg.sender, "Not owner");
        _registerNFT(msg.sender, tokenId);
    }

    function registerNFTs(uint256[] calldata tokenIds) external {
        for (uint256 i; i < tokenIds.length; ++i) {
            require(pickaxe.ownerOf(tokenIds[i]) == msg.sender, "Not owner");
            _registerNFT(msg.sender, tokenIds[i]);
        }
    }

    // ─── Claim fees ───────────────────────────────────────────────────────────

    function claimFees(uint256[] calldata tokenIds) external nonReentrant {
        require(tokenIds.length > 0 && tokenIds.length <= 100, "1-100 tokens");

        uint256 totalEthClaim;
        uint256 totalVenaClaim;

        for (uint256 i; i < tokenIds.length; ++i) {
            uint256 id = tokenIds[i];
            require(_ownsNFT(msg.sender, id), "Not owner");
            require(tokenAcquiredAt[id] != 0, "Not registered");

            (uint256 e, uint256 v) = _pendingForToken(id);

            tokenEthSnapshot[id]         = pendingEth;
            tokenVenaSnapshot[id]        = pendingVena;
            tokenTotalWeightSnapshot[id] = totalEffectiveWeightScaled;

            _refreshEffectiveWeight(id);

            totalEthClaim  += e;
            totalVenaClaim += v;
        }

        uint256 ethBal  = address(this).balance;
        uint256 venaBal = venaToken.balanceOf(address(this));
        if (totalEthClaim  > ethBal)  totalEthClaim  = ethBal;
        if (totalVenaClaim > venaBal) totalVenaClaim = venaBal;

        require(totalEthClaim > 0 || totalVenaClaim > 0, "Nothing to claim");

        totalEthDistributed  += totalEthClaim;
        totalVenaDistributed += totalVenaClaim;

        if (totalEthClaim > 0) {
            (bool ok, ) = payable(msg.sender).call{value: totalEthClaim}("");
            require(ok, "ETH transfer failed");
        }
        if (totalVenaClaim > 0) {
            require(venaToken.transfer(msg.sender, totalVenaClaim), "VENA transfer failed");
        }

        emit FeesClaimed(msg.sender, tokenIds, totalEthClaim, totalVenaClaim);
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getUserTokenIds(address user) external view returns (uint256[] memory) {
        return _userTokenIds[user];
    }

    function tierForAddress(address user) external view returns (PickaxeNFT.Tier) {
        return _tierForCumulative(cumulativeVenaBought[user]);
    }

    function pendingFees(uint256 tokenId)
        external view
        returns (uint256 ethAmount, uint256 venaAmount)
    {
        return _pendingForToken(tokenId);
    }

    function pendingFeesMultiple(uint256[] calldata tokenIds)
        external view
        returns (uint256 totalEth, uint256 totalVena)
    {
        for (uint256 i; i < tokenIds.length; ++i) {
            (uint256 e, uint256 v) = _pendingForToken(tokenIds[i]);
            totalEth  += e;
            totalVena += v;
        }
    }

    function getStratumInfo(uint256 tokenId)
        external view
        returns (uint8 level, uint256 multiplierX100)
    {
        return _stratumFromHeld(_heldDuration(tokenId));
    }

    function contractBalances()
        external view
        returns (uint256 ethBalance, uint256 venaBalance)
    {
        return (address(this).balance, venaToken.balanceOf(address(this)));
    }

    // ─── Internal: fees ───────────────────────────────────────────────────────

    function _splitFee(uint256 feeAmount, bool isEth) internal {
        uint256 holderShare    = (feeAmount * HOLDER_SHARE_BPS) / 10_000;
        uint256 treasuryShare  = feeAmount - holderShare;

        if (isEth) {
            pendingEth += holderShare;
            totalEthToTreasury += treasuryShare;
            if (treasuryShare > 0) {
                (bool ok, ) = payable(treasury).call{value: treasuryShare}("");
                require(ok, "Treasury ETH failed");
            }
        } else {
            pendingVena += holderShare;
            totalVenaToTreasury += treasuryShare;
            if (treasuryShare > 0) {
                require(venaToken.transfer(treasury, treasuryShare), "Treasury VENA failed");
            }
        }

        emit SwapFeeCollected(isEth, feeAmount, holderShare, treasuryShare);
    }

    function _resolveSwapper(bytes calldata hookData) internal view returns (address) {
        if (hookData.length == 32) {
            address swapper = abi.decode(hookData, (address));
            if (swapper != address(0)) return swapper;
        }
        address origin = tx.origin;
        if (origin != address(0)) return origin;
        return address(0);
    }

    // ─── Internal: tier logic ─────────────────────────────────────────────────

    function _tierForCumulative(uint256 cumulative)
        internal pure
        returns (PickaxeNFT.Tier)
    {
        if (cumulative >= TIER_EMERALD)  return PickaxeNFT.Tier.Emerald;
        if (cumulative >= TIER_DIAMOND)  return PickaxeNFT.Tier.Diamond;
        if (cumulative >= TIER_PLATINUM) return PickaxeNFT.Tier.Platinum;
        if (cumulative >= TIER_GOLD)     return PickaxeNFT.Tier.Gold;
        return PickaxeNFT.Tier.Silver;
    }

    function _upgradeAllForUser(address user, PickaxeNFT.Tier newTier) internal {
        uint256[] storage ids = _userTokenIds[user];
        uint256 upgraded;

        for (uint256 i; i < ids.length; ++i) {
            uint256 id = ids[i];
            if (!_tokenExists(id)) continue;

            PickaxeNFT.Tier current = pickaxe.tokenTier(id);
            if (newTier > current) {
                pickaxe.upgradeTierByHook(id, newTier);
                _refreshEffectiveWeight(id);
                upgraded++;
            }
        }

        if (upgraded > 0) emit TierUpgradedBatch(user, newTier, upgraded);
    }

    function _burnAllForUser(address user) internal {
        uint256[] memory ids = _userTokenIds[user];
        uint256 burned;

        for (uint256 i; i < ids.length; ++i) {
            uint256 id = ids[i];
            if (!_tokenExists(id)) {
                _removeFromRegistry(user, id);
                continue;
            }

            if (venaMining.stakedBy(id) != address(0)) {
                venaMining.forceUnstakeAndBurn(id);
            } else if (pickaxe.ownerOf(id) == user) {
                pickaxe.burnByHook(id);
            } else {
                continue;
            }

            _unregisterNFT(id);
            burned++;
        }

        if (burned > 0) emit PickaxesBurned(user, burned);
    }

    // ─── Internal: registry + weights ─────────────────────────────────────────

    function _registerNFT(address owner, uint256 tokenId) internal {
        bool isFirst = (tokenAcquiredAt[tokenId] == 0);

        if (!isFirst) {
            uint256 oldW = tokenEffectiveWeightScaled[tokenId];
            if (totalEffectiveWeightScaled >= oldW) totalEffectiveWeightScaled -= oldW;
        }

        tokenAcquiredAt[tokenId] = block.timestamp;

        uint256 rarity = RARITY_WEIGHTS[uint256(pickaxe.tokenTier(tokenId))];
        uint256 newW   = rarity * 100 * PRECISION;
        tokenEffectiveWeightScaled[tokenId] = newW;
        totalEffectiveWeightScaled         += newW;

        tokenEthSnapshot[tokenId]         = pendingEth;
        tokenVenaSnapshot[tokenId]        = pendingVena;
        tokenTotalWeightSnapshot[tokenId] = totalEffectiveWeightScaled;

        _addToRegistry(owner, tokenId);

        emit NFTRegistered(owner, tokenId, rarity);
    }

    function _unregisterNFT(uint256 tokenId) internal {
        address user = _logicalOwner[tokenId];
        if (user != address(0)) _removeFromRegistry(user, tokenId);

        uint256 oldW = tokenEffectiveWeightScaled[tokenId];
        if (totalEffectiveWeightScaled >= oldW) totalEffectiveWeightScaled -= oldW;

        tokenEffectiveWeightScaled[tokenId] = 0;
        tokenAcquiredAt[tokenId]            = 0;
        tokenEthSnapshot[tokenId]           = 0;
        tokenVenaSnapshot[tokenId]          = 0;
        tokenTotalWeightSnapshot[tokenId]   = 0;
        _logicalOwner[tokenId]              = address(0);
    }

    function _addToRegistry(address user, uint256 tokenId) internal {
        if (_logicalOwner[tokenId] == user && _tokenIndex[tokenId] != 0) return;
        if (_tokenIndex[tokenId] != 0) {
            _removeFromRegistry(_logicalOwner[tokenId], tokenId);
        }
        _userTokenIds[user].push(tokenId);
        _tokenIndex[tokenId] = _userTokenIds[user].length;
        _logicalOwner[tokenId] = user;
    }

    function _removeFromRegistry(address user, uint256 tokenId) internal {
        uint256 idx = _tokenIndex[tokenId];
        if (idx == 0) return;

        uint256[] storage arr = _userTokenIds[user];
        uint256 lastId = arr[arr.length - 1];

        arr[idx - 1] = lastId;
        arr.pop();

        if (lastId != tokenId) {
            _tokenIndex[lastId] = idx;
        }
        _tokenIndex[tokenId] = 0;
    }

    function _refreshEffectiveWeight(uint256 tokenId) internal {
        (, uint256 mult) = _stratumFromHeld(_heldDuration(tokenId));
        uint256 rarity   = RARITY_WEIGHTS[uint256(pickaxe.tokenTier(tokenId))];
        uint256 newW     = rarity * mult * PRECISION;
        uint256 oldW     = tokenEffectiveWeightScaled[tokenId];

        if (newW != oldW) {
            if (totalEffectiveWeightScaled >= oldW) totalEffectiveWeightScaled -= oldW;
            totalEffectiveWeightScaled         += newW;
            tokenEffectiveWeightScaled[tokenId] = newW;
            (uint8 lvl, ) = _stratumFromHeld(_heldDuration(tokenId));
            emit StratumUpdated(tokenId, lvl, mult);
        }
    }

    function _ownsNFT(address user, uint256 tokenId) internal view returns (bool) {
        if (pickaxe.ownerOf(tokenId) == user) return true;
        return venaMining.stakedBy(tokenId) == user;
    }

    function _tokenExists(uint256 tokenId) internal view returns (bool) {
        try pickaxe.ownerOf(tokenId) returns (address owner) {
            return owner != address(0);
        } catch {
            return false;
        }
    }

    function _pendingForToken(uint256 tokenId)
        internal view
        returns (uint256 ethAmt, uint256 venaAmt)
    {
        if (tokenAcquiredAt[tokenId] == 0)   return (0, 0);
        if (totalEffectiveWeightScaled == 0)  return (0, 0);

        uint256 ethAdded  = pendingEth  > tokenEthSnapshot[tokenId]
            ? pendingEth  - tokenEthSnapshot[tokenId]  : 0;
        uint256 venaAdded = pendingVena > tokenVenaSnapshot[tokenId]
            ? pendingVena - tokenVenaSnapshot[tokenId] : 0;

        if (ethAdded == 0 && venaAdded == 0) return (0, 0);

        uint256 w      = tokenEffectiveWeightScaled[tokenId];
        uint256 totalW = tokenTotalWeightSnapshot[tokenId] != 0
            ? tokenTotalWeightSnapshot[tokenId]
            : totalEffectiveWeightScaled;

        if (w == 0 || totalW == 0) return (0, 0);

        ethAmt  = (ethAdded  * w) / totalW;
        venaAmt = (venaAdded * w) / totalW;
    }

    function _heldDuration(uint256 tokenId) internal view returns (uint256) {
        uint256 t = tokenAcquiredAt[tokenId];
        return t == 0 ? 0 : block.timestamp - t;
    }

    function _stratumFromHeld(uint256 held)
        internal pure
        returns (uint8 level, uint256 multiplierX100)
    {
        if (held < 1 hours)  return (1, 100);
        if (held < 6 hours)  return (2, 125);
        if (held < 24 hours) return (3, 160);
        if (held < 3 days)   return (4, 210);
        if (held < 7 days)   return (5, 280);
        if (held < 14 days)  return (6, 375);
        if (held < 30 days)  return (7, 500);
        return (8, 650);
    }

    receive() external payable {}
}
