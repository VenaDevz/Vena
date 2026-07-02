# VENA — Robinhood Chain Deploy Rehberi

NFT + Forge + Staking **Robinhood Chain** üzerinde.
Mint **0.01 ETH** ile → gelir treasury'de → $VENA buyback → staking pool.
Upgrade **$VENA** ile (+ alt tier pickaxe burn). Trade fee → buyback → **burn**.

| Ağ | chainId | RPC |
|---|---|---|
| Mainnet | `4663` | `https://rpc.mainnet.chain.robinhood.com` |
| Testnet | `46630` | `https://rpc.testnet.chain.robinhood.com` |

---

## Launch sırası

```
1. ETH bridge (gas)
2. DeployNFT.s.sol     → VPICK
3. DeployForge.s.sol   → mint 0.01 ETH ile CANLI (VENA gerekmez)
4. Virtuals $VENA      → trade + buybacks + forge.setVena(VENA)
5. VenaMining deploy   → stake (buyback-fed pool)
```

---

## Adım 1 — NFT

```bash
export PRIVATE_KEY=0x...
export RH_RPC=https://rpc.mainnet.chain.robinhood.com

forge script script/robinhood/DeployNFT.s.sol \
  --rpc-url $RH_RPC --broadcast -vvvv
```

`NEXT_PUBLIC_PICKAXE_NFT=0x...`

---

## Adım 2 — Forge (mint açılır)

Token launch beklemeden Forge deploy edilebilir. Mint yalnız ETH ister,
upgrade `setVena()` çağrılana kadar kapalıdır.

```bash
export PICKAXE_NFT=0x...
export TREASURY=0x...          # mint geliri buraya (multisig önerilir)
# VENA_TOKEN opsiyonel — launch öncesi boş bırak (0x0)

forge script script/robinhood/DeployForge.s.sol \
  --rpc-url $RH_RPC --broadcast -vvvv
```

`NEXT_PUBLIC_FORGE=0x...`

### Varsayılan fiyatlar

| Tier | Mint / Upgrade |
|---|---|
| Silver | 0.01 ETH (mint) |
| Gold | 1,000,000 $VENA |
| Platinum | 2,000,000 $VENA |
| Diamond | 4,000,000 $VENA |
| Emerald | 8,000,000 $VENA |

Owner `setSilverPriceWei` / `setTierUpgradeVena` ile güncelleyebilir.

### Kullanıcı akışı

- `mintSilver()` — `msg.value == 0.01 ETH`
- Upgrade: önce `vena.approve(forge, cost)`, sonra `upgrade(tokenId)`
  (alt tier pickaxe yakılır, üst tier mint edilir)

### Revenue akışı

- **Mint (ETH)** → treasury → periyodik $VENA buyback → staking pool
- **Upgrade ($VENA)** → treasury → staking pool
- **Trade fee (Virtuals)** → rastgele zamanlı $VENA buyback → **burn**

---

## Adım 3 — $VENA + Staking (sonra)

Virtuals launch sonrası:

```bash
# Upgrade'leri aç
cast send $FORGE "setVena(address)" $VENA --rpc-url $RH_RPC --private-key $PRIVATE_KEY

# Staking
export VENA_TOKEN=$VENA
forge script script/robinhood/DeployMining.s.sol --rpc-url $RH_RPC --broadcast -vvvv
```

Staking havuzu sabit tahsisat DEĞİL — mint/upgrade buyback'leri ile beslenir.

---

## Verify

```bash
forge verify-contract $FORGE \
  contracts/robinhood/VenaForge.sol:VenaForge \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address)" $NFT $VENA $TREASURY $DEPLOYER) \
  --rpc-url $RH_RPC \
  --verifier blockscout \
  --verifier-url https://robinhoodchain.blockscout.com/api
```
