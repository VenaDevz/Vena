# VENA — Virtuals Protocol Launch Copy

Use these blocks on [app.virtuals.io/create](https://app.virtuals.io/create).  
Website: **https://venaprotocol.com** (meta verification tag is in `src/app/layout.tsx`).

---

## Introductions

VENA is a mining protocol on **Robinhood Chain** built around **VPICK** — utility NFT pickaxes you mint, upgrade, and stake to earn **$VENA**.

Every Silver Pickaxe mint costs **0.01 ETH**. That revenue is swapped into $VENA and added to a **buyback-fed staking pool** — no pre-minted mining allocation. Trade fees from Virtuals trigger random-timed buybacks that **burn** $VENA, tightening supply while the pool grows from real product volume.

10,000 pickaxes. Five rarity tiers. One flywheel: **mint → pool, trade → burn.**

---

## How it Works

**1. Mint** — Pay 0.01 ETH on Robinhood Chain to mint a Silver VPICK. Revenue goes to treasury, is market-bought into $VENA, and tops up the staking pool.

**2. Upgrade** — Burn your current pickaxe and pay $VENA to climb tiers (Gold → Emerald). Upgrade payments also feed the pool.

**3. Stake & Earn** — Stake VPICK NFTs in Miner Command. Rewards scale with rarity weight and **Stratum** (stake duration multiplier up to 6.5×). The pool grows with every mint and upgrade — not a fixed emission schedule.

**4. Trade flywheel** — Virtuals trade fees are swapped into $VENA at random intervals and **burned**, reducing circulating supply over time.

---

## Roadmap

**Phase 1 — Live now**
- VPICK NFT + Forge on Robinhood Chain mainnet
- Silver mint (0.01 ETH) with IPFS metadata
- Miner Command UI (preview / equip pickaxes)
- $VENA launch on Virtuals Protocol

**Phase 2 — Post-launch**
- Enable on-chain upgrades ($VENA payments)
- Open staking pool (`VenaMining.start()`)
- Treasury buyback automation (ETH → $VENA → pool)
- Accessory slot unlocks ($VENA cost TBD)

**Phase 3 — Growth**
- Marketplace integrations
- Expanded accessory ecosystem
- Community governance over pool parameters

---

## Additional Details

- **Chain:** Robinhood Chain (chainId 4663)
- **NFT:** VPICK (ERC-721) — max 10,000 Silver, deflationary upgrades
- **Mint:** 0.01 ETH per Silver via VenaForge
- **Token:** $VENA via Virtuals Protocol — [Trade on Virtuals](https://app.virtuals.io/virtuals/95873)
- **Supply:** 1B total — **100% Liquidity Pool** (Virtuals launch)
- **Staking pool:** Buyback-fed — no dedicated staking allocation at launch
- **Contracts:** PickaxeNFT + VenaForge deployed; VenaMining ready to deploy when staking opens

---

## Token Utility

**$VENA is the core economic asset of the protocol:**

1. **Upgrade fuel** — Pay $VENA to burn a lower-tier pickaxe and mint the next rarity tier.
2. **Staking rewards** — Earn $VENA by staking VPICK NFTs from the buyback-fed pool.
3. **Accessory unlocks** — Future robot accessory slots will require $VENA to unlock (costs TBD).
4. **Deflationary pressure** — Trade fees buy back and burn $VENA on a random schedule.

Mint revenue (ETH) and upgrade revenue ($VENA) both grow the staking pool. Trade fees shrink supply. Holders and stakers benefit from opposite sides of the same flywheel.

---

## Team

VENA is built by a focused team launching on Robinhood Chain via Virtuals Protocol. We ship contracts first, hype second — VPICK mint is already live on mainnet.

- **Website:** https://venaprotocol.com
- **X:** @VenaHub
- **Network:** Robinhood Chain mainnet

---

## Suggested token settings (Virtuals)

| Field | Suggestion |
|-------|------------|
| Token name | Vena |
| Ticker | VENA |
| Chain | Robinhood Chain |
| Website | https://venaprotocol.com |
| Twitter | @VenaHub |
| Supply split | **100% Liquidity Pool** (launched) |
| Trade / agent | https://app.virtuals.io/virtuals/95873 |
