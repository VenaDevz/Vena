/**
 * VENA Tokenomics — $VENA via Virtuals Protocol on Robinhood Chain
 *
 * Supply (1B, Virtuals default split — NO dedicated staking allocation):
 *   - 50%  Liquidity Pool (fixed supply)
 *   - 25%  Automated Capital Formation (Limit Order Program, 2m → 160m FDV)
 *   - 25%  Team / Treasury (6-month linear release)
 *
 * Two flywheels, both market-driven (no pre-minted staking pool):
 *   1. Mint / upgrade revenue  → buy $VENA on market → add to STAKING POOL.
 *   2. Virtuals trade fees      → random-timed buybacks → BURN $VENA.
 *
 * NFTs:
 *   - Mint Silver with 0.01 ETH on Robinhood Chain.
 *   - Upgrade a tier by paying $VENA + burning the lower Pickaxe.
 *   - Stake Pickaxes to earn $VENA from the buyback-fed staking pool.
 */

import type { Rarity } from "./types";

/** Silver mint price — fixed ETH on Robinhood Chain. */
export const SILVER_MINT_ETH = "0.01";

/** Virtuals trade-fee take → random-timed buyback → BURN. */
export const BUYBACK_POLICY = {
  tradeFeeTakePct: 100,
  action: "burn" as const,
} as const;

/** NFT mint & upgrade revenue → buy $VENA → STAKING POOL. */
export const MINT_REVENUE_POLICY = {
  action: "stakingPool" as const,
  toPoolPct: 100,
} as const;

export const TOKENOMICS = {
  maxTokenSupply: 1_000_000_000,
  maxNftSupply: 10_000,
  /** Virtuals universal trade fee */
  tradeFeeBps: 100, // 1%
  /** Share of the 1% fee routed to the project (as $VIRTUAL) */
  projectFeeSharePct: 70,
  buyback: BUYBACK_POLICY,
  mintRevenue: MINT_REVENUE_POLICY,
  liquidityPct: 50,
  acfPct: 25,
  teamTreasuryPct: 25,
  /** Stake-duration reward bonus (mining) */
  stakeBonusPerDayPct: 2,
  stakeBonusMaxPct: 30,
  stratumMaxMultiplier: 6.5,
  transferResetsStratum: true,
} as const;

export const SUPPLY_BREAKDOWN = {
  total: TOKENOMICS.maxTokenSupply,
  liquidity: 500_000_000,
  acf: 250_000_000,
  teamTreasury: 250_000_000,
} as const;

export const SUPPLY_ALLOCATIONS = [
  {
    key: "liquidity",
    label: "Liquidity Pool",
    amount: SUPPLY_BREAKDOWN.liquidity,
    pct: TOKENOMICS.liquidityPct,
    color: "#5ec9d4",
    note: "Fixed supply",
  },
  {
    key: "acf",
    label: "Automated Capital Formation",
    amount: SUPPLY_BREAKDOWN.acf,
    pct: TOKENOMICS.acfPct,
    color: "#e8873a",
    note: "Follows Limit Order Program from 2m to 160m FDV",
  },
  {
    key: "teamTreasury",
    label: "Team – Treasury",
    amount: SUPPLY_BREAKDOWN.teamTreasury,
    pct: TOKENOMICS.teamTreasuryPct,
    color: "#b5c334",
    note: "100% released linearly over 6 months",
  },
] as const;

/**
 * Rarity tiers — silverEquivalent drives LP weight, supply caps, and forge math.
 * - powerMultiplier = silverEquivalent (fee / Stratum weight)
 * - miningPyramidMultiplier: emission boost (forge beats holding stacks)
 */
export const RARITY_TIERS = [
  {
    id: "Silver" as const,
    label: "Silver",
    silverEquivalent: 1,
    /** @deprecated use silverEquivalent */
    forgeCostSilver: 1,
    powerMultiplier: 1,
    miningPyramidMultiplier: 1.0,
    hashrate: 10,
    maxSupplyBasis: 10_000,
    color: "#C0C0C0",
  },
  {
    id: "Gold" as const,
    label: "Gold",
    silverEquivalent: 4,
    forgeCostSilver: 4,
    powerMultiplier: 4,
    miningPyramidMultiplier: 1.25,
    hashrate: 40,
    maxSupplyBasis: 10_000,
    color: "#FFD700",
  },
  {
    id: "Platinum" as const,
    label: "Platinum",
    silverEquivalent: 8,
    forgeCostSilver: 8,
    powerMultiplier: 8,
    miningPyramidMultiplier: 1.35,
    hashrate: 80,
    maxSupplyBasis: 10_000,
    color: "#E5E4E2",
  },
  {
    id: "Diamond" as const,
    label: "Diamond",
    silverEquivalent: 16,
    forgeCostSilver: 16,
    powerMultiplier: 16,
    miningPyramidMultiplier: 1.9,
    hashrate: 160,
    maxSupplyBasis: 10_000,
    color: "#00d4ff",
  },
  {
    id: "Emerald" as const,
    label: "Emerald",
    silverEquivalent: 32,
    forgeCostSilver: 32,
    powerMultiplier: 32,
    miningPyramidMultiplier: 2.83,
    hashrate: 320,
    maxSupplyBasis: 10_000,
    color: "#00ff88",
  },
] as const;

export const TIER_MAX_SUPPLY: Record<Rarity, number> = {
  Silver: 10_000,
  Gold: 2_500,
  Platinum: 1_250,
  Diamond: 625,
  Emerald: 312,
};

/** Stratum — stake-duration reward multiplier (mining) */
export const STRATUM_LEVELS = [
  { level: 1, label: "Staked", duration: "At stake", multiplier: 1.0 },
  { level: 2, label: "1 hour", duration: "1 hour", multiplier: 1.25 },
  { level: 3, label: "6 hours", duration: "6 hours", multiplier: 1.6 },
  { level: 4, label: "24 hours", duration: "24 hours", multiplier: 2.1 },
  { level: 5, label: "3 days", duration: "3 days", multiplier: 2.8 },
  { level: 6, label: "7 days", duration: "7 days", multiplier: 3.75 },
  { level: 7, label: "14 days", duration: "14 days", multiplier: 5.0 },
  { level: 8, label: "30 days", duration: "30 days", multiplier: 6.5 },
] as const;

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Mint",
    description:
      "Pay 0.01 ETH to mint a Silver Pickaxe. Every mint buys $VENA on the market and adds it to the staking pool.",
  },
  {
    step: "02",
    title: "Upgrade",
    description:
      "Burn your current Pickaxe and pay $VENA to mint the next tier. That $VENA is bought back into the pool too.",
  },
  {
    step: "03",
    title: "Stake & Earn",
    description:
      "Stake Pickaxes to earn $VENA from the staking pool — a pool that grows with every mint and upgrade.",
  },
] as const;

export function computeStakeWeight(
  rarityMultiplier: number,
  stratumMultiplier: number
): number {
  return rarityMultiplier * stratumMultiplier;
}

export function formatSupplyCap(current?: number): string {
  if (current === undefined) return `— / ${TOKENOMICS.maxNftSupply.toLocaleString("en-US")}`;
  return `${current.toLocaleString("en-US")} / ${TOKENOMICS.maxNftSupply.toLocaleString("en-US")}`;
}

/**
 * Base $VENA cost unit for upgrades. On-chain values live in VenaForge;
 * this is the display ladder (Gold = base, scaling by silverEquivalent).
 */
export const UPGRADE_BASE_VENA = 1_000_000;

/** $VENA cost to UPGRADE INTO a given tier (Silver has no upgrade cost). */
export function tierUpgradeVena(tier: Rarity): number {
  if (tier === "Silver") return 0;
  const row = RARITY_TIERS.find((t) => t.id === tier);
  return UPGRADE_BASE_VENA * (row?.silverEquivalent ?? 1);
}

/** @deprecated legacy alias — now returns the $VENA upgrade cost. */
export function tierMintOrUpgradeCost(tier: Rarity): number {
  return tierUpgradeVena(tier);
}
