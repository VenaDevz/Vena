# VenaHook v2 - Deployment Guide

## What changed

VenaHook v2 implements the full VENA game model:

| Feature | Behavior |
|---------|----------|
| Buy VENA | 1 whole VENA = 1 NFT at current tier |
| Cumulative tracking | Lifetime VENA bought (NOT reset on sell) |
| Tier thresholds | 1 / 4 / 8 / 16 / 32 VENA cumulative |
| Tier upgrade | In-place (same tokenId, Stratum kept) |
| Sell VENA | Burns ALL NFTs (any sell amount) |
| Staked NFTs | Auto unstake + claim mining rewards + burn |
| Fees | 1% output fee: 80% holders, 20% treasury |
| Stratum | Holding-time multiplier (1.0x to 6.5x over 30 days) |

## Contracts that MUST be redeployed

The live PickaxeNFT and VenaMining cannot be upgraded in-place. For v2:

1. **PickaxeNFT** (new) - adds `mintByHook`, `burnByHook`, `upgradeTierByHook`
2. **VenaMining** (new) - adds `forceUnstakeAndBurn`, `setVenaHook`
3. **VenaHook v2** (CREATE2) - full game logic
4. **VenaSwapRouter** (new) - passes swapper in hookData
5. **New v4 pool** - hook address is immutable in PoolKey
6. **VenaLP** (new) - update HOOK constant to v2 address

VenaToken can stay the same.

## Deploy order

```
1. VenaToken          (keep existing if already deployed)
2. PickaxeNFT v2      (new deploy)
3. Forge              (point to new PickaxeNFT)
4. VenaMining v2      (new deploy, fund 4000 VENA, do NOT start yet)
5. VenaHook v2        (CREATE2 - see below)
6. Wire contracts:
   - PickaxeNFT.setFeeHook(VenaHook)
   - PickaxeNFT.setForge(Forge)
   - VenaMining.setVenaHook(VenaHook)
   - Forge uses new PickaxeNFT address
7. Initialize NEW v4 pool (ETH/VENA, fee=0, tickSpacing=1, hooks=VenaHook)
8. VenaLP deploy + add liquidity to NEW pool
9. VenaSwapRouter deploy (poolManager, venaToken, venaHook, tickSpacing=1)
10. VenaMining.start()
11. Verify all contracts on Basescan
```

## Mine hook address

```bash
# 1. Compile VenaHook.sol in Remix (0.8.24, cancun)
# 2. Paste bytecode into mine-hook-address.js
# 3. Update PICKAXE_NFT, VENA_MINING to NEW addresses after redeploy
node mine-hook-address.js
# 4. Deploy via Create2Deploy with printed salt + initcode
```

## Uniswap UI visibility

For users to swap on Uniswap (not only your site):

### 1. Pool requirements
- In-range liquidity (use VenaLP full-range)
- Correct PoolKey: ETH(0) / VENA, fee=0, tickSpacing=1, hooks=VenaHook v2

### 2. Swapper detection
- **Your site (VenaSwapRouter):** hookData = swapper address (reliable)
- **Uniswap UI:** hookData empty, fallback to `tx.origin` (works for MetaMask/Rabby EOAs)

### 3. Hook never reverts swaps
- NFT mint/burn wrapped in try/catch
- Fee collection still required for economics

### 4. Token listing (critical for Uniswap routing)
- Add VENA to Base token lists (Basescan token update, CoinGecko application)
- Share direct Uniswap v4 pool link once live
- Some Uniswap builds exclude unknown hooks from auto-routing - listing helps

### 5. If "No route found" persists
- Confirm liquidity > 0 in-range (StateView)
- Try smaller trade size
- Use venaprotocol.com swap (VenaSwapRouter) as guaranteed path
- Uniswap v4 hooked pools may need manual pool selection in UI

## User flow (after v2)

```
1. User swaps ETH for VENA on Uniswap v4 or venaprotocol.com
2. Hook mints NFTs (1 per whole VENA) at current tier
3. Cumulative VENA tracked - tier upgrades all NFTs in-place
4. User holds NFTs - earns 80% of 1% swap fees via claimFees()
5. Optional: stake on venaprotocol.com for mining pool (4000 VENA / 180d)
6. Optional: Forge upgrade path (4 Silver -> Gold, etc.)
7. If user sells ANY VENA: ALL NFTs burned (staked ones auto-unstaked)
8. Cumulative VENA NOT reset - rebuying mints at same tier level
```

## Tier reference (cumulative VENA bought)

| Tier | Cumulative VENA | Rarity weight |
|------|-----------------|---------------|
| Silver | 1+ | 1x |
| Gold | 4+ | 4x |
| Platinum | 8+ | 8x |
| Diamond | 16+ | 16x |
| Emerald | 32+ | 32x |

## Environment variables (.env.local)

```
NEXT_PUBLIC_VENA_TOKEN=<VenaToken>
NEXT_PUBLIC_PICKAXE_NFT=<new PickaxeNFT>
NEXT_PUBLIC_VENA_MINING=<new VenaMining>
NEXT_PUBLIC_SWAP_ROUTER=<new VenaSwapRouter>
HOOK_ADDRESS=<VenaHook v2>
```

## Migration from v1

- Old pool liquidity: remove via VenaLP.removeLiquidity, add to new pool
- Old NFTs (mintSilver): remain on old PickaxeNFT - not compatible with v2 hook
- Recommend announcing v2 as fresh launch or airdrop/migrate manually
