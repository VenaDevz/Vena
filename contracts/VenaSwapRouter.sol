// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─── Uniswap v4 minimal interfaces (inlined) ─────────────────────────────────

struct PoolKey {
    address currency0;   // token0 — ETH = address(0)
    address currency1;   // token1 — VENA
    uint24  fee;         // 0 for hook-fee pools
    int24   tickSpacing;
    address hooks;
}

struct SwapParams {
    bool    zeroForOne;
    int256  amountSpecified;   // negative = exact input
    uint160 sqrtPriceLimitX96;
}

// BalanceDelta is a packed int256: upper 128 bits = delta0, lower 128 bits = delta1
type BalanceDelta is int256;

function toAmount0(BalanceDelta d) pure returns (int128 a) {
    assembly { a := sar(128, d) }
}
function toAmount1(BalanceDelta d) pure returns (int128 a) {
    assembly { a := signextend(15, d) }
}

interface IPoolManager {
    function unlock(bytes calldata data) external returns (bytes memory);
    function swap(PoolKey calldata key, SwapParams calldata params, bytes calldata hookData)
        external returns (BalanceDelta);
    function settle() external payable returns (uint256);
    function take(address currency, address to, uint256 amount) external;
    function sync(address currency) external;
}

interface IERC20 {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// ─── VenaSwapRouter ───────────────────────────────────────────────────────────

contract VenaSwapRouter {

    IPoolManager public immutable poolManager;
    address       public immutable venaToken;
    address       public immutable hookAddress;
    int24         public immutable tickSpacing;

    // sqrtPrice limits — just inside MIN/MAX so the swap doesn't revert on price limit
    uint160 private constant SQRT_PRICE_MIN = 4295128740;
    uint160 private constant SQRT_PRICE_MAX = 1461446703485210103287273052203988822378723970341;

    struct CallbackData {
        bool    zeroForOne;       // true = ETH→VENA, false = VENA→ETH
        int256  amountSpecified;  // negative = exact input
        address payer;
        address recipient;
        uint256 ethValue;
    }

    constructor(
        address _poolManager,
        address _venaToken,
        address _hookAddress,
        int24   _tickSpacing
    ) {
        poolManager  = IPoolManager(_poolManager);
        venaToken    = _venaToken;
        hookAddress  = _hookAddress;
        tickSpacing  = _tickSpacing;
    }

    // ── ETH → VENA ────────────────────────────────────────────────────────────
    /// @param minOut  minimum VENA to receive (slippage protection)
    function swapETHForVena(uint256 minOut) external payable returns (uint256 venaOut) {
        require(msg.value > 0, "No ETH sent");
        bytes memory result = poolManager.unlock(abi.encode(CallbackData({
            zeroForOne      : true,
            amountSpecified : -int256(msg.value),
            payer           : msg.sender,
            recipient       : msg.sender,
            ethValue        : msg.value
        })));
        venaOut = abi.decode(result, (uint256));
        require(venaOut >= minOut, "Slippage: too little VENA");
    }

    // ── VENA → ETH ────────────────────────────────────────────────────────────
    /// @param venaIn  exact VENA amount to sell
    /// @param minOut  minimum ETH to receive
    function swapVenaForETH(uint256 venaIn, uint256 minOut) external returns (uint256 ethOut) {
        require(venaIn > 0, "No VENA sent");
        // Pull VENA from sender first
        require(
            IERC20(venaToken).transferFrom(msg.sender, address(this), venaIn),
            "VENA transfer failed"
        );
        bytes memory result = poolManager.unlock(abi.encode(CallbackData({
            zeroForOne      : false,
            amountSpecified : -int256(venaIn),
            payer           : address(this),
            recipient       : msg.sender,
            ethValue        : 0
        })));
        ethOut = abi.decode(result, (uint256));
        require(ethOut >= minOut, "Slippage: too little ETH");
    }

    // ── Uniswap v4 unlock callback ────────────────────────────────────────────
    function unlockCallback(bytes calldata raw) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only PoolManager");

        CallbackData memory d = abi.decode(raw, (CallbackData));

        PoolKey memory key = PoolKey({
            currency0   : address(0),
            currency1   : venaToken,
            fee         : 0,
            tickSpacing : tickSpacing,
            hooks       : hookAddress
        });

        // Pass real swapper to VenaHook v2 (hookData = abi.encode(address))
        bytes memory hookData = abi.encode(d.recipient);

        BalanceDelta delta = poolManager.swap(
            key,
            SwapParams({
                zeroForOne      : d.zeroForOne,
                amountSpecified : d.amountSpecified,
                sqrtPriceLimitX96: d.zeroForOne ? SQRT_PRICE_MIN : SQRT_PRICE_MAX
            }),
            hookData
        );

        int128 d0 = toAmount0(delta); // ETH delta  (negative = caller owes pool, positive = pool owes caller)
        int128 d1 = toAmount1(delta); // VENA delta (negative = caller owes pool, positive = pool owes caller)

        if (d.zeroForOne) {
            // ETH→VENA: d0 < 0 (we owe ETH), d1 > 0 (pool owes us VENA)
            if (d0 < 0) {
                uint256 ethOwed = uint256(-int256(d0));
                poolManager.settle{value: ethOwed}();
                uint256 excess = d.ethValue > ethOwed ? d.ethValue - ethOwed : 0;
                if (excess > 0) {
                    (bool ok,) = d.recipient.call{value: excess}("");
                    require(ok, "ETH refund failed");
                }
            }
            uint256 venaOut = d1 > 0 ? uint256(int256(d1)) : 0;
            if (venaOut > 0) poolManager.take(venaToken, d.recipient, venaOut);
            return abi.encode(venaOut);

        } else {
            // VENA→ETH: d1 < 0 (we owe VENA), d0 > 0 (pool owes us ETH)
            if (d1 < 0) {
                uint256 venaOwed = uint256(-int256(d1));
                poolManager.sync(venaToken);
                IERC20(venaToken).transfer(address(poolManager), venaOwed);
                poolManager.settle();
            }
            uint256 ethOut = d0 > 0 ? uint256(int256(d0)) : 0;
            if (ethOut > 0) poolManager.take(address(0), d.recipient, ethOut);
            return abi.encode(ethOut);
        }
    }

    receive() external payable {}
}
