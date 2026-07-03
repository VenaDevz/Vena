# VenaMiningV3 + VenaLoadout

## Deployed (Robinhood mainnet)

| Contract | Address |
|----------|---------|
| **VenaMiningV3** | `0xa3B98AE4aE2257bA279E9C7AB84c9EcfF5535f7e` |
| **VenaLoadout** | `0x29865b0A6a9fA520b9d5DE47434c76936D032bcb` |
| VenaMiningV3 (broken claim, deprecated) | `0x60825e0C77db1E45318D9A025854B775F94cd046` |
| VenaMiningV2 (legacy) | `0x1dDA64bd76165400Ad929D4d94E0D8285288D37B` |

## What V3 adds

- **Stratum** — per-NFT stake duration multiplier (1× → 6.5×), refreshes on claim / sync
- **VenaLoadout** — chassis level + accessory catalog (extensible via `addAccessory`)
- **syncPower()** — call after equipping accessories or leveling up while staked
- **Idle pool fix** — no first-staker windfall when `totalPower == 0`
- **claimRewards fix** — harvest before power refresh (manual Claim works while staked)

## Feature flags (default OFF)

```bash
# Open when UI + economy ready
cast send $LOADOUT "setLevelUpgradesEnabled(bool)" true --rpc-url $RH_RPC --private-key $PK
cast send $LOADOUT "setAccessoryShopEnabled(bool)" true --rpc-url $RH_RPC --private-key $PK
```

While flags are false, staking works normally with **VPICK power + Stratum only**.

## Accessory catalog (pre-registered)

| ID | Item | Price | Bonus |
|----|------|-------|-------|
| 1 | Flux Band | 200k VENA | +5% |
| 2 | Power Ring | 400k VENA | +10% |

Owner can add more: `loadout.addAccessory(id, price, bonusBps)`.

## Level ladder

- Max level 15
- +500 bps per level above 1 (+5% per level)
- Cost: 250k VENA × 1.4^(level−1)

## Env (site + keeper)

```
NEXT_PUBLIC_STAKING=0xa3B98AE4aE2257bA279E9C7AB84c9EcfF5535f7e
NEXT_PUBLIC_LOADOUT=0x29865b0A6a9fA520b9d5DE47434c76936D032bcb
MINING=0xa3B98AE4aE2257bA279E9C7AB84c9EcfF5535f7e
NEXT_PUBLIC_STAKING_LIVE=false   # until announcement
NEXT_PUBLIC_LOADOUT_LIVE=false   # until accessory/level UI wired
```

## Migration from V2

- V2 pool (~9.87M VENA) remains in legacy contract
- New staking + treasury funding → **V3**
- Users unstake V2 → stake V3 when live

## User flow (when loadout opens)

1. `approve` VENA → VenaLoadout
2. `buyAccessory(id)` / `upgradeLevel()`
3. `setAccessoryEquipped(id, true)`
4. `syncPower()` on VenaMiningV3
5. `claimRewards()` (also refreshes Stratum)
