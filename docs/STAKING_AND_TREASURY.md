# Staking (Model B) + Treasury Buyback

## $VENA token

| Field | Value |
|-------|--------|
| Contract | `0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf` |
| Virtuals | https://app.virtuals.io/virtuals/95873 |

Set in env:

```
NEXT_PUBLIC_VENA_TOKEN=0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf
VENA_TOKEN=0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf
```

---

## Virtuals buy tx decoded

Reference: [buy tx 0x2580…](https://robinhoodchain.blockscout.com/tx/0x2580ca9983ddd1f689ba9c92094e49a6a625063b1e16622d0711392baa79e0a7)

| Field | Value |
|-------|--------|
| Contract | `0xd4cCBFA37e2f35611b3042e4096Ad7a3459Bd007` (VENA bonding proxy) |
| Function | `buy(uint256 amountIn, address token, uint256 amountOutMin, uint256 deadline)` |
| Paid with | **$VIRTUAL** (not ETH) |
| Received | ~17M $VENA |

Virtuals UI “buy with VIRTUAL” hits this proxy directly — **low slippage**.

ETH mint revenue path for treasury keeper:

```
ETH → $VIRTUAL (Uniswap) → $VENA (bonding proxy buy) → fundRewards()
```

The older aggregator `0x8a19…` is used for some ETH UI flows (often via relayer). Keeper uses bonding proxy — same economics as UI VIRTUAL buy.

---

## Why Uniswap ETH→VENA has high slippage

Robinhood Chain liquidity for $VENA is structured differently from a normal Uniswap pool:

| Route | Status |
|-------|--------|
| VENA / WETH (Uniswap) | **Does not exist** |
| VIRTUAL / WETH (Uniswap) | Exists — good liquidity |
| VIRTUAL / VENA (Uniswap) | Pair exists but **insufficient liquidity** for buys |
| VENA bonding curve | **Primary market** pre-graduation |

Virtuals UI does **not** do a simple Uniswap ETH→VENA swap. It routes through:

```
ETH → WETH → $VIRTUAL (Uniswap) → $VENA (bonding curve)
```

via aggregator `0x8a19963649b2Fc3D50c951953F89BcbFbD5f0b51`.

Example sell tx (VENA→ETH):  
https://robinhoodchain.blockscout.com/tx/0x388f5e2f679a90c4788e0b8f652001b62ba1b4c1c433350271229cbb723e41b9

Example buy txs send **ETH as `value`** to the same aggregator (reverse path).

The UI may use a **relayer** (`0x6c10…`) to submit signed calldata — that is not a blockchain “relay” in the L2 sense, but an off-chain order submitter.

---

## Staking — Model B (`VenaMiningV2`)

Old `VenaMining` required **250M VENA upfront** before `start()`.

**VenaMiningV2** is buyback-fed:

- No fixed allocation at deploy
- Treasury keeper calls `fundRewards(amount)` after each buyback
- Each deposit vests into `rewardPerSecond` over **7 days** (configurable)
- Staking opens automatically when pool ≥ **1,000 VENA** (configurable)
- Frontend uses `getUserInfo` / `isActive` (compatible with miner UI)

### Deploy (local / testnet first)

```bash
export PRIVATE_KEY=0x...
export VENA_TOKEN=0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf
export PICKAXE_NFT=0xe250751a2514e0d1267AcBEBF43787aF579b6F4c
export FUNDING_OPERATOR=0x882db6c850f866Af6f050335540bf3da4CB0dfcA  # treasury keeper

forge script script/robinhood/DeployMiningV2.s.sol \
  --rpc-url https://rpc.mainnet.chain.robinhood.com --broadcast -vvvv
```

Then on mainnet (when ready):

```bash
# 1. Enable upgrades
cast send $FORGE "setVena(address)" $VENA_TOKEN --rpc-url $RH_RPC --private-key $PRIVATE_KEY

# 2. After buyback, fund pool
npm run treasury:fund -- --execute --fund-only
```

Set `NEXT_PUBLIC_STAKING=<VenaMiningV2>` only after first successful `fundRewards`.

---

## Treasury buyback — gas reserve (recommended)

| Parameter | Value | Why |
|-----------|-------|-----|
| `GAS_RESERVE_ETH` | **0.01 ETH** | Always keep gas for approve / fund / future txs |
| `MIN_SWAP_ETH` | **0.02 ETH** | Don't swap dust (gas > benefit) |
| **Trigger** | treasury ≥ **0.03 ETH** | 0.01 reserve + 0.02 min swap |

Keeper — **manual** (sen çalıştırırsın, `.env` otomatik okunur):

```bash
# 1. Önizleme — tx göndermez, ne yapacağını gösterir
npm run treasury:keeper

# 2. Tam cycle — ETH buyback (varsa) + havuza VENA ekleme
npm run treasury:keeper:run

# 3. Sadece havuza ekleme (buyback atla)
npm run treasury:fund:run

# 4. Sadece buyback (fund atla)
npm run treasury:buyback -- --execute
```

Slippage: `.env` içinde `SLIPPAGE_BPS=2000` (= **%20**, script daha yükseğe izin vermez).

Daemon isteğe bağlı: `npm run treasury:keeper:watch` (önerilmez — sen manuel tercih ettin).

Flow:

```
Mint 0.01 ETH → Treasury
       ↓ (when balance ≥ 0.03 ETH)
Buy $VENA via Virtuals aggregator path
       ↓
fundRewards() → VenaMiningV2 pool grows
       ↓
Stakers earn proportional to VPICK power
```

---

## Local test checklist

1. `forge build` — compile VenaMiningV2
2. `.env.local` — VENA token, pickaxe, forge addresses
3. Deploy VenaMiningV2 on testnet OR fork mainnet with Anvil
4. `npm run treasury:buyback` — dry-run quotes
5. Manual buy on Virtuals → `--fund-only --execute`
6. `/miner` — connect wallet, Select pickaxe, Stake, claim
7. Push to GitHub only after all steps pass

---

## Key Robinhood addresses

| Contract | Address |
|----------|---------|
| $VENA | `0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf` |
| $VIRTUAL | `0xc6911796042b15d7fa4f6cde69e245ddcd3d9c31` |
| WETH | `0x0bd7d308f8e1639fab988df18a8011f41eacad73` |
| Virtuals FRouter | `0xCa6395246B4382Ba70F886526dD9a9De984F6081` |
| VENA bonding proxy | `0xd4cCBFA37e2f35611b3042e4096Ad7a3459Bd007` |
| VENA bonding pair | `0x425ddd764672a3bbd3ac1f76a251a5c303bfd942` |
| Uniswap router | `0x89e5db8b5aa49aa85ac63f691524311aeb649eba` |
| Virtuals aggregator | `0x8a19963649b2Fc3D50c951953F89BcbFbD5f0b51` |
