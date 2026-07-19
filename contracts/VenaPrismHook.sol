// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import "./VenaMirror.sol";

// ─── Uniswap v4 minimal types (Remix-friendly) ───────────────────────────────

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

interface IPoolManager {
    function isUnlocked() external view returns (bool);
}

interface IPositionManager {
    function nextTokenId() external view returns (uint256);
    function multicall(bytes[] calldata data) external payable returns (bytes[] memory);
    function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable;
}

interface IPoolInit {
    function initializePool(PoolKey memory key, uint160 sqrtPriceX96) external;
}

interface IAllowanceTransfer {
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

bytes4 constant AFTER_SWAP_SELECTOR = bytes4(
    keccak256("afterSwap(address,(address,address,uint24,int24,address),(bool,int256,uint160),int256,bytes)")
);

/// @title VenaPrismHook
/// @notice Prism-style VENA: hook IS the token. NFT mint/burn syncs on ERC20 transfer (Uniswap UI safe).
/// @dev afterSwap is a no-op. Pool fee 1% accrues to LP; pokeFees → claim per NFT.
contract VenaPrismHook is ERC20, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // ─── Errors ───────────────────────────────────────────────────────────────

    error AlreadySeeded();
    error NotSeeded();
    error ZeroAddress();
    error NotOwnerOrApproved();
    error InvalidTokenId();
    error MirrorOnly();
    error TransferToZero();
    error SelfTransferDisallowed();

    // ─── Events ───────────────────────────────────────────────────────────────

    event Seeded(uint256 indexed posmTokenId, uint160 sqrtPriceX96, uint128 liquidity);
    event NFTMinted(address indexed to, uint256 indexed tokenId);
    event NFTBurned(address indexed from, uint256 indexed tokenId);
    event FeesPoked(uint256 ethGained, uint256 venaGained);
    event Claimed(uint256 indexed tokenId, address indexed owner, uint256 ethOut, uint256 venaOut);
    event PendingCredited(address indexed user, uint256 ethAmount, uint256 venaAmount);
    event PendingWithdrawn(address indexed user, uint256 ethAmount, uint256 venaAmount);
    event BaseURIUpdated(string uri);

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant SUPPLY = 10_000 ether;
    uint256 public constant UNIT = 1 ether;
    uint24  public constant POOL_FEE = 10_000; // 1% LP fee
    int24   public constant TICK_SPACING = 200;

    uint256 private constant ACC_SCALE = 1e12;

    uint8 private constant ACT_DECREASE_LIQUIDITY = 0x01;
    uint8 private constant ACT_MINT_POSITION = 0x02;
    uint8 private constant ACT_SETTLE_PAIR = 0x0d;
    uint8 private constant ACT_TAKE_PAIR = 0x11;
    uint8 private constant ACT_SWEEP = 0x14;

    // ─── Immutables ───────────────────────────────────────────────────────────

    IPoolManager public immutable poolManager;
    address public immutable POSM;
    address public immutable PERMIT2;
    VenaMirror public immutable mirror;

    // ─── Config ───────────────────────────────────────────────────────────────

    bool public seeded;
    uint256 public hookPositionTokenId;
    int24 public globalTickLower;
    int24 public globalTickUpper;
    string public baseURI;

    uint256 private _nextTokenId;
    uint256 public totalShares;

    uint256 public accFeesPerShareETH;
    uint256 public accFeesPerShareVENA;

    mapping(uint256 => uint256) private _oo;
    mapping(address => mapping(uint256 => uint256)) private _ownedSlots;
    mapping(address => uint256) private _addressData;
    mapping(uint256 => uint256) private _feeDebt;
    mapping(address => uint256) public pendingETH;
    mapping(address => uint256) public pendingVENA;
    mapping(uint256 => address) private _nftApprovals;
    mapping(address => mapping(address => bool)) private _nftOperatorApprovals;

    /// @dev Skip ERC20→NFT sync during mirror-initiated 1:1 token moves.
    bool private _silent;

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(
        address _poolManager,
        address _owner,
        address _posm,
        address _permit2
    ) ERC20("Vena", "VENA") Ownable(_owner) {
        if (_poolManager == address(0) || _owner == address(0) || _posm == address(0) || _permit2 == address(0)) {
            revert ZeroAddress();
        }

        poolManager = IPoolManager(_poolManager);
        POSM = _posm;
        PERMIT2 = _permit2;

        mirror = new VenaMirror(address(this));

        _mint(address(this), SUPPLY);

        _approve(address(this), _permit2, type(uint256).max);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setBaseURI(string calldata uri) external onlyOwner {
        baseURI = uri;
        emit BaseURIUpdated(uri);
    }

    /// @notice One-time pool init + LP with entire VENA supply (+ optional ETH via msg.value).
    function seed(
        uint160 sqrtPriceX96,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity
    ) external payable onlyOwner returns (uint256 tokenId) {
        if (seeded) revert AlreadySeeded();

        // Permit2 allowance must be set from hook context (not in CREATE2 constructor).
        IAllowanceTransfer(PERMIT2).approve(address(this), POSM, type(uint160).max, type(uint48).max);

        seeded = true;
        globalTickLower = tickLower;
        globalTickUpper = tickUpper;

        PoolKey memory key = _hostKey();

        bytes memory actions = abi.encodePacked(
            ACT_MINT_POSITION,
            ACT_SETTLE_PAIR,
            ACT_SWEEP,
            ACT_SWEEP
        );
        bytes[] memory mintParams = new bytes[](4);
        mintParams[0] = abi.encode(
            key,
            tickLower,
            tickUpper,
            liquidity,
            msg.value,
            SUPPLY,
            address(this),
            bytes("")
        );
        mintParams[1] = abi.encode(key.currency0, key.currency1);
        mintParams[2] = abi.encode(key.currency0, address(this));
        mintParams[3] = abi.encode(key.currency1, address(this));

        bytes[] memory mc = new bytes[](2);
        mc[0] = abi.encodeWithSelector(IPoolInit.initializePool.selector, key, sqrtPriceX96);
        mc[1] = abi.encodeWithSelector(
            IPositionManager.modifyLiquidities.selector,
            abi.encode(actions, mintParams),
            block.timestamp + 60
        );

        tokenId = IPositionManager(POSM).nextTokenId();
        hookPositionTokenId = tokenId;
        IPositionManager(POSM).multicall{value: msg.value}(mc);

        emit Seeded(tokenId, sqrtPriceX96, liquidity);
    }

    // ─── V4 hook (no-op — Uniswap UI never needs hookData) ───────────────────

    function afterSwap(
        address,
        PoolKey calldata,
        SwapParams calldata,
        BalanceDelta,
        bytes calldata
    ) external view returns (bytes4, int128) {
        require(msg.sender == address(poolManager), "Only PoolManager");
        return (AFTER_SWAP_SELECTOR, 0);
    }

    // ─── ERC20 → NFT sync (core Prism mechanism) ─────────────────────────────

    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        _onTransfer(from, to, value);
    }

    function _onTransfer(address from, address to, uint256) internal {
        if (_isSilent()) return;

        address pm = address(poolManager);
        address self = address(this);

        // Only pool swaps (PM ↔ user) change NFT count — not fee claims (self → user).
        if (from == pm) {
            if (to != address(0) && to != pm && to != self) _realignSolo(to);
        } else if (to == pm) {
            if (from != address(0) && from != pm && from != self) _realignSolo(from);
        } else {
            bool fromIsUser = from != address(0) && from != pm && from != self;
            bool toIsUser = to != address(0) && to != pm && to != self;
            if (fromIsUser && toIsUser) _realignPair(from, to);
        }
    }

    function _realignPair(address from, address to) private {
        uint256 fromTarget = balanceOf(from) / UNIT;
        uint256 toTarget = balanceOf(to) / UNIT;
        uint256 fromCur = _ownedLength(from);
        uint256 toCur = _ownedLength(to);

        uint256 fromLoses = fromCur > fromTarget ? fromCur - fromTarget : 0;
        uint256 toGains = toTarget > toCur ? toTarget - toCur : 0;

        uint256 transferable = fromLoses < toGains ? fromLoses : toGains;
        uint256 toBurn = fromLoses - transferable;
        uint256 toMint = toGains - transferable;

        if (toMint > 0) _maybePoke();

        for (uint256 i; i < transferable; ++i) {
            uint256 tokenId = _pickTail(from);
            _move(from, to, tokenId);
        }
        for (uint256 i; i < toBurn; ++i) {
            uint256 tokenId = _pickTail(from);
            _burnNFT(from, tokenId);
        }
        for (uint256 i; i < toMint; ++i) {
            _mintNFT(to);
        }
    }

    function _realignSolo(address user) private {
        uint256 target = balanceOf(user) / UNIT;
        uint256 cur = _ownedLength(user);

        if (target > cur) {
            uint256 toMint = target - cur;
            _maybePoke();
            for (uint256 i; i < toMint; ++i) _mintNFT(user);
        } else if (cur > target) {
            uint256 toBurn = cur - target;
            for (uint256 i; i < toBurn; ++i) {
                uint256 tokenId = _pickTail(user);
                _burnNFT(user, tokenId);
            }
        }
    }

    // ─── Fee distribution (LP fees via POSM) ──────────────────────────────────

    function pokeFees() public {
        if (!seeded || totalShares == 0) return;
        if (poolManager.isUnlocked()) return;

        uint256 ethBefore = address(this).balance;
        uint256 venaBefore = balanceOf(address(this));

        bytes memory actions = abi.encodePacked(ACT_DECREASE_LIQUIDITY, ACT_TAKE_PAIR);
        bytes[] memory params = new bytes[](2);
        params[0] = abi.encode(hookPositionTokenId, uint256(0), uint128(0), uint128(0), bytes(""));
        params[1] = abi.encode(_hostKey().currency0, _hostKey().currency1, address(this));

        IPositionManager(POSM).modifyLiquidities(abi.encode(actions, params), block.timestamp + 60);

        uint256 ethGained = address(this).balance - ethBefore;
        uint256 venaGained = balanceOf(address(this)) - venaBefore;

        if (ethGained > 0) accFeesPerShareETH += ethGained * ACC_SCALE / totalShares;
        if (venaGained > 0) accFeesPerShareVENA += venaGained * ACC_SCALE / totalShares;

        if (ethGained > 0 || venaGained > 0) emit FeesPoked(ethGained, venaGained);
    }

    function claim(uint256 tokenId) external nonReentrant {
        pokeFees();
        _claimOne(tokenId);
    }

    function claimMany(uint256[] calldata tokenIds) external nonReentrant {
        pokeFees();
        for (uint256 i; i < tokenIds.length; ++i) {
            if (_ownerOf(tokenIds[i]) != address(0)) _claimOne(tokenIds[i]);
        }
    }

    function withdrawPending() external nonReentrant {
        _withdrawPendingTo(msg.sender, msg.sender);
    }

    function pendingFees(uint256 tokenId) external view returns (uint256 owedETH, uint256 owedVENA) {
        if (_ownerOf(tokenId) == address(0)) return (0, 0);
        owedETH = (accFeesPerShareETH - _ethDebtOf(tokenId)) / ACC_SCALE;
        owedVENA = (accFeesPerShareVENA - _venaDebtOf(tokenId)) / ACC_SCALE;
    }

    // ─── Mirror callbacks ─────────────────────────────────────────────────────

    modifier onlyMirror() {
        if (msg.sender != address(mirror)) revert MirrorOnly();
        _;
    }

    function handleNFTTransfer(address from, address to, uint256 tokenId, address caller)
        external
        onlyMirror
        nonReentrant
    {
        if (to == address(0)) revert TransferToZero();
        if (from == to) revert SelfTransferDisallowed();

        address owner = _ownerOf(tokenId);
        if (owner == address(0) || owner != from) revert InvalidTokenId();
        if (caller != owner && _nftApprovals[tokenId] != caller && !_nftOperatorApprovals[owner][caller]) {
            revert NotOwnerOrApproved();
        }

        _move(from, to, tokenId);

        _setSilent(true);
        _transfer(from, to, UNIT);
        _setSilent(false);
    }

    function handleNFTApprove(address spender, uint256 tokenId, address caller) external onlyMirror {
        address owner = _ownerOf(tokenId);
        if (owner == address(0)) revert InvalidTokenId();
        if (caller != owner && !_nftOperatorApprovals[owner][caller]) revert NotOwnerOrApproved();
        _nftApprovals[tokenId] = spender;
        mirror.emitApproval(owner, spender, tokenId);
    }

    function handleNFTSetApprovalForAll(address operator, bool approved, address caller) external onlyMirror {
        _nftOperatorApprovals[caller][operator] = approved;
        mirror.emitApprovalForAll(caller, operator, approved);
    }

    // ─── NFT views ────────────────────────────────────────────────────────────

    function nftOwnerOf(uint256 tokenId) external view returns (address o) {
        o = _ownerOf(tokenId);
        if (o == address(0)) revert InvalidTokenId();
    }

    function nftBalanceOf(address owner) external view returns (uint256) {
        return _ownedLength(owner);
    }

    function nftTokenURI(uint256 tokenId) external view returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert InvalidTokenId();
        if (bytes(baseURI).length == 0) {
            return string(abi.encodePacked("data:application/json,{", '"name":"Vena Pickaxe #', tokenId.toString(), '"}'));
        }
        return string(abi.encodePacked(baseURI, tokenId.toString(), ".json"));
    }

    function nftGetApproved(uint256 tokenId) external view returns (address) {
        return _nftApprovals[tokenId];
    }

    function nftIsApprovedForAll(address o, address s) external view returns (bool) {
        return _nftOperatorApprovals[o][s];
    }

    function ownedTokensOf(address owner) external view returns (uint256[] memory ids) {
        uint256 n = _ownedLength(owner);
        ids = new uint256[](n);
        for (uint256 i; i < n; ++i) ids[i] = uint256(_ownedGet(owner, i));
    }

    // ─── Internal NFT ops ─────────────────────────────────────────────────────

    function _mintNFT(address to) private {
        unchecked {
            uint256 tokenId = ++_nextTokenId;
            uint32 index = _ownedLength(to);
            _setOo(tokenId, to, index);
            _ownedSet(to, index, uint32(tokenId));
            _setOwnedLength(to, index + 1);
            _setFeeDebt(tokenId, uint128(accFeesPerShareETH), uint128(accFeesPerShareVENA));
            totalShares = totalShares + 1;
            mirror.emitTransfer(address(0), to, tokenId);
            emit NFTMinted(to, tokenId);
        }
    }

    function _burnNFT(address from, uint256 tokenId) private {
        _captureAndCreditPending(from, tokenId);

        uint32 index = _ownedIndexOf(tokenId);
        uint32 lastIdx = _ownedLength(from) - 1;

        if (index != lastIdx) {
            uint32 lastTokenId = _ownedGet(from, lastIdx);
            _ownedSet(from, index, lastTokenId);
            _setOo(lastTokenId, from, index);
        }
        _setOwnedLength(from, lastIdx);

        delete _oo[tokenId];
        delete _feeDebt[tokenId];
        delete _nftApprovals[tokenId];

        unchecked { totalShares = totalShares - 1; }
        mirror.emitTransfer(from, address(0), tokenId);
        emit NFTBurned(from, tokenId);
    }

    function _move(address from, address to, uint256 tokenId) private {
        _captureAndCreditPending(from, tokenId);
        _setFeeDebt(tokenId, uint128(accFeesPerShareETH), uint128(accFeesPerShareVENA));

        uint32 fromIdx = _ownedIndexOf(tokenId);
        uint32 lastIdx = _ownedLength(from) - 1;

        if (fromIdx != lastIdx) {
            uint32 lastTokenId = _ownedGet(from, lastIdx);
            _ownedSet(from, fromIdx, lastTokenId);
            _setOo(lastTokenId, from, fromIdx);
        }
        _setOwnedLength(from, lastIdx);

        uint32 toIdx = _ownedLength(to);
        _ownedSet(to, toIdx, uint32(tokenId));
        _setOo(tokenId, to, toIdx);
        _setOwnedLength(to, toIdx + 1);

        delete _nftApprovals[tokenId];
        mirror.emitTransfer(from, to, tokenId);
    }

    function _claimOne(uint256 tokenId) private {
        address owner = _ownerOf(tokenId);
        if (owner == address(0)) revert InvalidTokenId();

        uint256 owedETH = (accFeesPerShareETH - _ethDebtOf(tokenId)) / ACC_SCALE;
        uint256 owedVENA = (accFeesPerShareVENA - _venaDebtOf(tokenId)) / ACC_SCALE;

        _setFeeDebt(tokenId, uint128(accFeesPerShareETH), uint128(accFeesPerShareVENA));

        if (owedETH > 0) {
            (bool ok,) = owner.call{value: owedETH}("");
            if (!ok) {
                pendingETH[owner] += owedETH;
                emit PendingCredited(owner, owedETH, 0);
            }
        }
        if (owedVENA > 0) {
            _transfer(address(this), owner, owedVENA);
        }

        emit Claimed(tokenId, owner, owedETH, owedVENA);
    }

    function _withdrawPendingTo(address from, address recipient) private {
        uint256 ethAmount = pendingETH[from];
        uint256 venaAmount = pendingVENA[from];
        if (ethAmount == 0 && venaAmount == 0) return;
        pendingETH[from] = 0;
        pendingVENA[from] = 0;
        if (ethAmount > 0) {
            (bool ok,) = recipient.call{value: ethAmount}("");
            require(ok, "ETH send failed");
        }
        if (venaAmount > 0) {
            _transfer(address(this), recipient, venaAmount);
        }
        emit PendingWithdrawn(from, ethAmount, venaAmount);
    }

    function _captureAndCreditPending(address holder, uint256 tokenId) private {
        uint256 owedETH = (accFeesPerShareETH - _ethDebtOf(tokenId)) / ACC_SCALE;
        uint256 owedVENA = (accFeesPerShareVENA - _venaDebtOf(tokenId)) / ACC_SCALE;
        if (owedETH == 0 && owedVENA == 0) return;
        if (owedETH > 0) pendingETH[holder] += owedETH;
        if (owedVENA > 0) pendingVENA[holder] += owedVENA;
        emit PendingCredited(holder, owedETH, owedVENA);
    }

    function _maybePoke() private {
        if (!seeded || totalShares == 0) return;
        if (poolManager.isUnlocked()) return;
        pokeFees();
    }

    function _hostKey() internal view returns (PoolKey memory) {
        return PoolKey({
            currency0: address(0),
            currency1: address(this),
            fee: POOL_FEE,
            tickSpacing: TICK_SPACING,
            hooks: address(this)
        });
    }

    // ─── Packed storage helpers ───────────────────────────────────────────────

    function _ownerOf(uint256 id) internal view returns (address) {
        return address(uint160(_oo[id]));
    }

    function _ownedIndexOf(uint256 id) internal view returns (uint32) {
        return uint32(_oo[id] >> 160);
    }

    function _setOo(uint256 id, address owner, uint32 index) internal {
        _oo[id] = uint256(uint160(owner)) | (uint256(index) << 160);
    }

    function _ownedGet(address user, uint256 index) internal view returns (uint32) {
        return uint32(_ownedSlots[user][index >> 3] >> ((index & 7) << 5));
    }

    function _ownedSet(address user, uint256 index, uint32 value) internal {
        uint256 slotIdx = index >> 3;
        uint256 shift = (index & 7) << 5;
        uint256 word = _ownedSlots[user][slotIdx];
        _ownedSlots[user][slotIdx] = (word & ~(uint256(0xFFFFFFFF) << shift)) | (uint256(value) << shift);
    }

    function _ownedLength(address user) internal view returns (uint32) {
        return uint32(_addressData[user]);
    }

    function _setOwnedLength(address user, uint32 len) internal {
        uint256 v = _addressData[user];
        _addressData[user] = (v & ~uint256(0xFFFFFFFF)) | uint256(len);
    }

    function _ethDebtOf(uint256 id) internal view returns (uint128) {
        return uint128(_feeDebt[id] >> 128);
    }

    function _venaDebtOf(uint256 id) internal view returns (uint128) {
        return uint128(_feeDebt[id]);
    }

    function _setFeeDebt(uint256 id, uint128 ethD, uint128 venaD) internal {
        _feeDebt[id] = (uint256(ethD) << 128) | uint256(venaD);
    }

    function _pickTail(address user) private view returns (uint256) {
        return _ownedGet(user, _ownedLength(user) - 1);
    }

    // ─── Silent transfer guard (mirror 1:1 ERC20 sync) ────────────────────────

    function _setSilent(bool v) private {
        _silent = v;
    }

    function _isSilent() private view returns (bool) {
        return _silent;
    }

    receive() external payable {}
}
