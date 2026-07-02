# Treasury Operations — ETH → $VENA → Staking Pool

## Current state: **manual (not automated on-chain)**

When a user calls `forge.mintSilver()` with 0.01 ETH:

```
User wallet  ──0.01 ETH──►  VenaForge  ──0.01 ETH──►  Treasury wallet
```

The Forge contract **only collects ETH** to the treasury address. It does **not**:

- Swap ETH → $VENA on a DEX
- Transfer $VENA to `VenaMining`
- Start or fund the staking pool automatically

This is by design for launch — treasury ops stay flexible until $VENA has liquidity on Robinhood Chain.

---

## Manual workflow (until automation)

### 1. Monitor treasury balance

```bash
cast balance 0x882db6c850f866Af6f050335540bf3da4CB0dfcA --rpc-url https://rpc.mainnet.chain.robinhood.com
```

### 2. Swap ETH → $VENA

After $VENA is live on Virtuals with a liquid pair:

- Use Robinhood Chain DEX (or aggregator) to swap accumulated ETH for $VENA
- Recommended: batch swaps weekly or at a threshold (e.g. every 0.5 ETH)

### 3. Fund staking pool

Once `VenaMining` is deployed:

```bash
# Transfer bought $VENA to mining contract
cast send $VENA_TOKEN "transfer(address,uint256)" $MINING_CONTRACT $AMOUNT \
  --rpc-url $RH_RPC --private-key $OPS_KEY

# When ready to open staking (one-time, irreversible start)
cast send $MINING_CONTRACT "start()" --rpc-url $RH_RPC --private-key $OPS_KEY
```

Set `NEXT_PUBLIC_STAKING=$MINING_CONTRACT` in production env **only after** `start()` is called.

### 4. Upgrade revenue ($VENA)

When upgrades are enabled, `upgrade()` sends $VENA directly to treasury. Same flow:

- Treasury $VENA → transfer to `VenaMining` contract
- Increases pool without burning

---

## Future automation (not built yet)

A keeper bot or scheduled script could:

1. Read treasury ETH balance
2. Swap via DEX router when balance > threshold
3. Approve + transfer $VENA to `VenaMining`
4. Emit event for transparency

This requires: $VENA token address, DEX router on Robinhood Chain, ops wallet with swap permissions.

---

## Trade fee burn (separate flywheel)

Virtuals trade fees arrive as **$VIRTUAL** (70% of 1% trade fee). Protocol ops:

1. Claim fees from Virtuals Tax Manager
2. Swap $VIRTUAL → $VENA at random intervals
3. **Burn** the acquired $VENA (send to `0x000...dead` or use burn function)

This is also **off-chain / manual** today — not wired in smart contracts.
