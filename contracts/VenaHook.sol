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
        int256 d = BalanceDelta.unwrap(delta);
        assembly {
            d := sar(128, d)
        }
        return int128(d);
    }
    function amount1(BalanceDelta delta) internal pure returns (int128) {
        int256 d = BalanceDelta.unwrap(delta);
        assembly {
            d := signextend(15, d)
        }
        return int128(d);
    }
}

interface IPoolManager {
    function take(address currency, address to, uint256 amount) external;
}

bytes4 constant AFTER_SWAP_SELECTOR = bytes4(
    keccak256("afterSwap(address,(address,address,uint24,int24,address),(bool,int256,uint160),int256,bytes)")
);

/**
 * @title VenaHook v4
 * @notice Uniswap v4 hook for ETH/VENA pool with buy/sell NFT game logic.
 *
 * On ETH -> VENA buy:
 *   - Track lifetime cumulative VENA bought per address (analytics only).
 *   - Mint 1 Silver NFT per whole VENA received (net of hook fee).
 *   - Tier upgrades happen only via Forge on-site, never on buy.
 *
 * On VENA -> ETH sell:
 *   - Auto-claim accumulated swap fees for the seller's own registered NFTs.
 *   - Burn NFTs by sold whole-token count (1 NFT per full 1 VENA sold).
 *   - Fractional sells accumulate per user; burn strongest-first.
 *
 * Fees:
 *   - 1% of swap output via afterSwap return delta.
 *   - 80% to NFT holder reward pool (rarity x Stratum weight), claimable manually
 *     or auto-claimed on sell for the seller's NFTs only.
 *   - 20% to treasury: sent immediately to the treasury address (must accept ETH + VENA).
 *
 * Swapper detection:
 *   - hookData = abi.encode(address swapper) from VenaSwapRouter.
 *   - Fallback: tx.origin for Uniswap UI / direct EOA swaps.
 *
 * NFT ops are wrapped in try/catch so swaps never revert if mint/burn fails.
 *
 * CREATE2 address flags: last 14 bits == 0x0044
 *
 * Pool safety:
 *   - This hook is intended for exactly one pool: ETH/VENA, fee=0, tickSpacing=1.
 */
contract VenaHook is Ownable, ReentrancyGuard {
    using BalanceDeltaLib for BalanceDelta;

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 private constant PRECISION      = 1e18;
    uint256 private constant FEE_DIVISOR      = 100;   // 1%
    uint256 private constant HOLDER_SHARE_BPS = 8000;  // 80%
    uint256 private constant TREASURY_BPS     = 2000;  // 20%

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
    mapping(address => uint256) public sellRemainderWei;

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
    event SwapEffectsFailed(address indexed swapper, bool isBuy);

    error InvalidPoolKey();

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
        _validatePoolKey(key);

        int128 rawOutput;
        address outputCurrency;

        if (params.zeroForOne) {
            rawOutput      = delta.amount1();
            outputCurrency = key.currency1;
        } else {
            rawOutput      = delta.amount0();
            outputCurrency = key.currency0;
        }

        if (rawOutput <= 0) return (AFTER_SWAP_SELECTOR, 0);

        uint256 outputAmount = uint256(uint128(rawOutput));
        uint256 feeAmount    = outputAmount / FEE_DIVISOR;
        if (feeAmount == 0) return (AFTER_SWAP_SELECTOR, 0);

        poolManager.take(outputCurrency, address(this), feeAmount);

        bool isEth = (outputCurrency == address(0));
        _splitFee(feeAmount, isEth);

        address swapper = _resolveSwapper(hookData);
        if (swapper != address(0)) {
            if (params.zeroForOne) {
                _tryBuyEffects(swapper, outputAmount - feeAmount);
            } else {
                int128 rawVenaIn = delta.amount1();
                uint256 venaIn = rawVenaIn < 0 ? uint256(int256(-rawVenaIn)) : 0;
                _trySellEffects(swapper, venaIn);
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

    function _trySellEffects(address swapper, uint256 venaIn) internal {
        try this._handleSell(swapper, venaIn) {} catch {
            emit SwapEffectsFailed(swapper, false);
        }
    }

    /// @dev External only for try/catch; do not call directly.
    function _handleBuy(address swapper, uint256 venaOut) external {
        require(msg.sender == address(this), "Internal");

        cumulativeVenaBought[swapper] += venaOut;

        uint256 wholeCount = venaOut / 1e18;
        if (wholeCount > 0) {
            pickaxe.mintByHook(swapper, PickaxeNFT.Tier.Silver, wholeCount);
            emit PickaxesMinted(swapper, wholeCount, PickaxeNFT.Tier.Silver);
        }
    }

    /// @dev External only for try/catch; do not call directly.
    function _handleSell(address swapper, uint256 venaIn) external {
        require(msg.sender == address(this), "Internal");

        _claimFeesForUser(swapper);

        uint256 totalSold = sellRemainderWei[swapper] + venaIn;
        uint256 burnCount = totalSold / 1e18;
        sellRemainderWei[swapper] = totalSold % 1e18;
        if (burnCount > 0) {
            _burnForUser(swapper, burnCount);
        }
    }

    // ─── NFT registry ─────────────────────────────────────────────────────────

    function onNFTAcquired(address newOwner, uint256 tokenId) external {
        require(msg.sender == address(pickaxe), "Only PickaxeNFT");

        if (newOwner == address(venaMining)) {
            address staker = venaMining.stakedBy(tokenId);
            if (staker != address(0) && _logicalOwner[tokenId] == staker) return;
        }

        address logicalOwner = newOwner;
        if (newOwner == address(venaMining)) {
            address staker = venaMining.stakedBy(tokenId);
            if (staker != address(0)) logicalOwner = staker;
        }

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
        (uint256 ethOut, uint256 venaOut) = _claimFees(msg.sender, tokenIds);
        require(ethOut > 0 || venaOut > 0, "Nothing to claim");
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getUserTokenIds(address user) external view returns (uint256[] memory) {
        return _userTokenIds[user];
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
        uint256 holderShare   = (feeAmount * HOLDER_SHARE_BPS) / 10_000;
        uint256 treasuryShare = feeAmount - holderShare;

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

    function _claimFeesForUser(address holder) internal {
        uint256[] memory ids = _userTokenIds[holder];
        if (ids.length == 0) return;

        uint256[] memory claimIds = new uint256[](ids.length);
        uint256 n;
        for (uint256 i; i < ids.length; ++i) {
            if (!_ownsNFT(holder, ids[i])) continue;
            if (tokenAcquiredAt[ids[i]] == 0) continue;
            claimIds[n++] = ids[i];
        }
        if (n == 0) return;

        assembly {
            mstore(claimIds, n)
        }

        _claimFees(holder, claimIds);
    }

    function _claimFees(address holder, uint256[] memory tokenIds)
        internal
        returns (uint256 totalEthClaim, uint256 totalVenaClaim)
    {
        require(tokenIds.length > 0 && tokenIds.length <= 100, "1-100 tokens");

        for (uint256 i; i < tokenIds.length; ++i) {
            uint256 id = tokenIds[i];
            require(_ownsNFT(holder, id), "Not owner");
            require(tokenAcquiredAt[id] != 0, "Not registered");

            (uint256 e, uint256 v) = _pendingForToken(id);

            tokenEthSnapshot[id]         = pendingEth;
            tokenVenaSnapshot[id]        = pendingVena;
            tokenTotalWeightSnapshot[id] = totalEffectiveWeightScaled;

            _refreshEffectiveWeight(id);

            totalEthClaim  += e;
            totalVenaClaim += v;
        }

        if (totalEthClaim == 0 && totalVenaClaim == 0) return (0, 0);

        uint256 ethBal = address(this).balance;
        uint256 venaBal = venaToken.balanceOf(address(this));
        if (totalEthClaim  > ethBal)  totalEthClaim  = ethBal;
        if (totalVenaClaim > venaBal) totalVenaClaim = venaBal;

        if (totalEthClaim == 0 && totalVenaClaim == 0) return (0, 0);

        totalEthDistributed  += totalEthClaim;
        totalVenaDistributed += totalVenaClaim;

        if (totalEthClaim > 0) {
            (bool ok, ) = payable(holder).call{value: totalEthClaim}("");
            require(ok, "ETH transfer failed");
        }
        if (totalVenaClaim > 0) {
            require(venaToken.transfer(holder, totalVenaClaim), "VENA transfer failed");
        }

        emit FeesClaimed(holder, tokenIds, totalEthClaim, totalVenaClaim);
    }

    function _validatePoolKey(PoolKey calldata key) internal view {
        if (
            key.currency0 != address(0) ||
            key.currency1 != address(venaToken) ||
            key.fee != 0 ||
            key.tickSpacing != 1 ||
            key.hooks != address(this)
        ) revert InvalidPoolKey();
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

    function _burnForUser(address user, uint256 burnCount) internal {
        uint256[] memory ids = _userTokenIds[user];
        bool[] memory used = new bool[](ids.length);
        uint256 burned;

        for (uint256 step; step < burnCount; ++step) {
            (bool found, uint256 id, uint256 idx) = _selectStrongestBurnable(user, ids, used);
            if (!found) break;
            used[idx] = true;

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

    function _selectStrongestBurnable(
        address user,
        uint256[] memory ids,
        bool[] memory used
    ) internal view returns (bool found, uint256 tokenId, uint256 selectedIdx) {
        uint256 bestScore;
        uint256 bestId;
        uint256 bestIdx = type(uint256).max;

        for (uint256 i; i < ids.length; ++i) {
            if (used[i]) continue;
            uint256 id = ids[i];
            if (!_tokenExists(id)) continue;

            bool burnable = (venaMining.stakedBy(id) != address(0)) || (pickaxe.ownerOf(id) == user);
            if (!burnable) continue;

            uint256 score = _burnPriorityScore(id);
            if (bestIdx == type(uint256).max || score > bestScore) {
                bestScore = score;
                bestId = id;
                bestIdx = i;
            }
        }

        if (bestIdx == type(uint256).max) return (false, 0, 0);
        return (true, bestId, bestIdx);
    }

    function _burnPriorityScore(uint256 tokenId) internal view returns (uint256) {
        uint256 rarity = RARITY_WEIGHTS[uint256(pickaxe.tokenTier(tokenId))];
        (, uint256 mult) = _stratumFromHeld(_heldDuration(tokenId));
        return rarity * 1000 + mult;
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
