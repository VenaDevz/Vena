// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─── Uniswap v4 minimal types (inlined) ──────────────────────────────────────

struct PoolKey {
    address currency0;   // ETH = address(0)
    address currency1;   // VENA
    uint24  fee;         // 0
    int24   tickSpacing; // 1
    address hooks;
}

struct ModifyLiquidityParams {
    int24   tickLower;
    int24   tickUpper;
    int256  liquidityDelta; // positive = add, negative = remove
    bytes32 salt;
}

type BalanceDelta is int256;

function toD0(BalanceDelta d) pure returns (int128 a) { assembly { a := sar(128, d) } }
function toD1(BalanceDelta d) pure returns (int128 a) { assembly { a := signextend(15, d) } }

interface IPoolManager {
    function unlock(bytes calldata data) external returns (bytes memory);
    function modifyLiquidity(
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) external returns (BalanceDelta callerDelta, BalanceDelta feesAccrued);
    function settle() external payable returns (uint256);
    function take(address currency, address to, uint256 amount) external;
    function sync(address currency) external;
}

interface IStateView {
    function getSlot0(bytes32 poolId)
        external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee);
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

// ─── VenaLP ──────────────────────────────────────────────────────────────────

/**
 * @title VenaLP
 * @notice Full-range liquidity adder for the ETH/VENA Uniswap v4 pool with VenaHook.
 *
 * Usage:
 *   1. Deploy this contract (no constructor args).
 *   2. Call preview(ethWei, venaWei) to see exact amounts that will be used.
 *   3. Approve VENA to this contract address.
 *   4. Call addLiquidity(venaMax) sending ETH as value.
 *
 * Liquidity is held by this contract. Only the deployer (owner) can remove it.
 */
contract VenaLP {

    // ─── Addresses ────────────────────────────────────────────────────────────

    IPoolManager constant PM   = IPoolManager(0x498581fF718922c3f8e6A244956aF099B2652b2b);
    IStateView   constant SV   = IStateView(0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71);
    address      constant VENA = 0xFE96b62c837F85f453a9b42ad1304C10588181fA;
    address public immutable HOOK;

    int24   constant TICK_LOWER   = -887272; // full range
    int24   constant TICK_UPPER   =  887272; // full range
    uint256 constant Q96          = 0x1000000000000000000000000; // 2^96

    // ─── State ────────────────────────────────────────────────────────────────

    address public immutable owner;

    // Track total liquidity added through this contract
    uint256 public totalLiquidity;

    // ─── Callback data ────────────────────────────────────────────────────────

    struct CallbackData {
        bool    isAdd;
        address sender;
        uint256 ethAmt;
        uint256 venaAmt;
        int256  liquidityDelta; // used only for removal
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _hook) {
        require(_hook != address(0), "Zero hook");
        owner = msg.sender;
        HOOK  = _hook;
    }

    // ─── Add Liquidity ────────────────────────────────────────────────────────

    /**
     * @notice Add full-range liquidity.
     *   - First approve VENA to this contract address.
     *   - Then call this function sending ETH as msg.value.
     * @param venaMax Maximum VENA to deposit (excess is refunded).
     */
    function addLiquidity(uint256 venaMax) external payable {
        require(msg.value > 0, "Send ETH");
        require(venaMax > 0,   "Set venaMax");
        require(
            IERC20(VENA).transferFrom(msg.sender, address(this), venaMax),
            "VENA transfer failed - approve first"
        );

        PM.unlock(abi.encode(CallbackData({
            isAdd          : true,
            sender         : msg.sender,
            ethAmt         : msg.value,
            venaAmt        : venaMax,
            liquidityDelta : 0
        })));
    }

    // ─── Remove Liquidity (owner only) ───────────────────────────────────────

    /**
     * @notice Remove liquidity previously added. Owner only.
     * @param liquidityToRemove Amount of liquidity units to remove.
     *   Pass totalLiquidity to remove everything.
     */
    function removeLiquidity(uint256 liquidityToRemove) external {
        require(msg.sender == owner, "Not owner");
        require(liquidityToRemove > 0 && liquidityToRemove <= totalLiquidity, "Invalid amount");

        PM.unlock(abi.encode(CallbackData({
            isAdd          : false,
            sender         : msg.sender,
            ethAmt         : 0,
            venaAmt        : 0,
            liquidityDelta : -int256(liquidityToRemove)
        })));
    }

    // ─── Unlock Callback ──────────────────────────────────────────────────────

    function unlockCallback(bytes calldata raw) external returns (bytes memory) {
        require(msg.sender == address(PM), "Only PoolManager");

        CallbackData memory d = abi.decode(raw, (CallbackData));

        int256 liq;

        if (d.isAdd) {
            // Calculate liquidity from ETH and VENA amounts using current sqrtPrice.
            // Full-range approximation (bounds ≈ 0 and ∞):
            //   L_from_eth  = ethAmt  * sqrtPriceX96 / 2^96
            //   L_from_vena = venaAmt * 2^96 / sqrtPriceX96
            //   L = min(L_from_eth, L_from_vena)
            (uint160 sqrtPX96,,,) = SV.getSlot0(_poolId());
            require(sqrtPX96 > 0, "Pool not initialized");

            uint256 lE = d.ethAmt  * uint256(sqrtPX96) / Q96;
            uint256 lV = d.venaAmt * Q96 / uint256(sqrtPX96);
            liq = int256(lE < lV ? lE : lV);
            require(liq > 0, "Too small - send more ETH/VENA");
        } else {
            liq = d.liquidityDelta; // negative
        }

        // Call modifyLiquidity
        (BalanceDelta delta,) = PM.modifyLiquidity(
            PoolKey({
                currency0   : address(0),
                currency1   : VENA,
                fee         : 0,
                tickSpacing : 1,
                hooks       : HOOK
            }),
            ModifyLiquidityParams({
                tickLower     : TICK_LOWER,
                tickUpper     : TICK_UPPER,
                liquidityDelta: liq,
                salt          : bytes32(0)
            }),
            ""
        );

        // Update total liquidity tracking
        if (d.isAdd) {
            totalLiquidity += uint256(liq);
        } else {
            totalLiquidity -= uint256(-liq);
        }

        int128 d0 = toD0(delta); // ETH delta  (negative = we owe pool, positive = pool owes us)
        int128 d1 = toD1(delta); // VENA delta (negative = we owe pool, positive = pool owes us)

        // ── Settle or take ETH ──────────────────────────────────────────────
        if (d0 < 0) {
            // We owe ETH to pool (adding liquidity)
            uint256 needed = uint256(-int256(d0));
            PM.settle{value: needed}();
            uint256 excess = d.ethAmt > needed ? d.ethAmt - needed : 0;
            if (excess > 0) { (bool _ok,) = payable(d.sender).call{value: excess}(""); _ok; }

        } else if (d0 > 0) {
            // Pool owes us ETH (removing liquidity)
            PM.take(address(0), d.sender, uint256(int256(d0)));
            if (d.ethAmt > 0) { (bool _ok,) = payable(d.sender).call{value: d.ethAmt}(""); _ok; }

        } else {
            if (d.ethAmt > 0) { (bool _ok,) = payable(d.sender).call{value: d.ethAmt}(""); _ok; }
        }

        // ── Settle or take VENA ─────────────────────────────────────────────
        if (d1 < 0) {
            // We owe VENA to pool (adding liquidity)
            uint256 needed = uint256(-int256(d1));
            PM.sync(VENA);
            IERC20(VENA).transfer(address(PM), needed);
            PM.settle();
            uint256 excess = d.venaAmt > needed ? d.venaAmt - needed : 0;
            if (excess > 0) IERC20(VENA).transfer(d.sender, excess);

        } else if (d1 > 0) {
            // Pool owes us VENA (removing liquidity)
            PM.take(VENA, d.sender, uint256(int256(d1)));
            if (d.venaAmt > 0) IERC20(VENA).transfer(d.sender, d.venaAmt);

        } else {
            if (d.venaAmt > 0) IERC20(VENA).transfer(d.sender, d.venaAmt);
        }

        return "";
    }

    // ─── View: Preview amounts before adding ─────────────────────────────────

    /**
     * @notice Preview how much ETH and VENA will actually be used.
     * @param ethWei  ETH in wei (e.g. 50000000000000000 = 0.05 ETH)
     * @param venaWei VENA in wei (e.g. 85000000000000000000 = 85 VENA)
     * @return liquidity Liquidity units that will be added
     * @return ethUsed   Exact ETH that will be consumed
     * @return venaUsed  Exact VENA that will be consumed
     */
    function preview(uint256 ethWei, uint256 venaWei)
        external view
        returns (uint256 liquidity, uint256 ethUsed, uint256 venaUsed)
    {
        (uint160 sqrtPX96,,,) = SV.getSlot0(_poolId());
        require(sqrtPX96 > 0, "Pool not initialized");

        uint256 lE = ethWei  * uint256(sqrtPX96) / Q96;
        uint256 lV = venaWei * Q96 / uint256(sqrtPX96);
        liquidity = lE < lV ? lE : lV;
        ethUsed   = liquidity * Q96 / uint256(sqrtPX96);
        venaUsed  = liquidity * uint256(sqrtPX96) / Q96;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _poolId() internal pure returns (bytes32) {
        return keccak256(abi.encode(
            address(0), VENA, uint24(0), int24(1), HOOK
        ));
    }

    receive() external payable {}
}
