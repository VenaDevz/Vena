/**
 * VENA Tokenomics v3 — 10,000 supply (1 whole token = 1 Pickaxe NFT)
 * Forge: Silver-equivalent ladder 1→4→8→16→32 with 2× tier-to-tier paths.
 */

import type { Rarity } from "./types";

export const TOKENOMICS = {
  maxTokenSupply: 10_000,
  maxNftSupply: 10_000,
  wholeTokenPerNft: 1,
  poolFeeBps: 100, // 1%
  lpFeeToHoldersPct: 80,
  lpFeeToTreasuryPct: 20,
  miningPoolPct: 40,
  liquidityPoolPct: 50,
  treasuryAllocationPct: 10,
  miningStakeBonusPerDayPct: 2,
  miningStakeBonusMaxPct: 30,
  stratumMaxMultiplier: 6.5,
  transferResetsStratum: true,
  emissionDays: 180,
} as const;

export const SUPPLY_BREAKDOWN = {
  total: TOKENOMICS.maxTokenSupply,
  liquidity: 5_000,
  mining: 4_000,
  treasury: 1_000,
} as const;

export const SUPPLY_ALLOCATIONS = [
  {
    key: "liquidity",
    label: "Liquidity (v4 pool)",
    amount: SUPPLY_BREAKDOWN.liquidity,
    pct: TOKENOMICS.liquidityPoolPct,
    color: "#00d4ff",
    note: "Launch depth · LP locked",
  },
  {
    key: "mining",
    label: "Mining emissions",
    amount: SUPPLY_BREAKDOWN.mining,
    pct: TOKENOMICS.miningPoolPct,
    color: "#00ff88",
    note: `${SUPPLY_BREAKDOWN.mining.toLocaleString("en-US")} VENA over ${TOKENOMICS.emissionDays}d · ~${(SUPPLY_BREAKDOWN.mining / TOKENOMICS.emissionDays).toFixed(2)}/day`,
  },
  {
    key: "treasury",
    label: "Treasury",
    amount: SUPPLY_BREAKDOWN.treasury,
    pct: TOKENOMICS.treasuryAllocationPct,
    color: "#94a3b8",
    note: "Dev · ops · protocol reserve",
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

/** Stratum — holding-duration fee multiplier */
export const STRATUM_LEVELS = [
  { level: 1, label: "Mint", duration: "At mint", multiplier: 1.0 },
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
    title: "Acquire",
    description:
      "Every whole $VENA mints one Silver Pickaxe. Ten tokens in your wallet means ten NFTs — fair and proportional.",
  },
  {
    step: "02",
    title: "Forge",
    description:
      "Upgrade via Silver (4→Gold) or tier-to-tier (2 Gold→Platinum, 2 Platinum→Diamond…). No Silver required once the market has depth.",
  },
  {
    step: "03",
    title: "Claim",
    description:
      "1% pool fees flow to holders by rarity × Stratum weight. Stake for mining from the 4,000 VENA pool over 180 days.",
  },
] as const;

export function computeFeeWeight(
  rarityMultiplier: number,
  stratumMultiplier: number
): number {
  return rarityMultiplier * stratumMultiplier;
}

export function formatSupplyCap(current?: number): string {
  if (current === undefined) return `— / ${TOKENOMICS.maxNftSupply.toLocaleString("en-US")}`;
  return `${current.toLocaleString("en-US")} / ${TOKENOMICS.maxNftSupply.toLocaleString("en-US")}`;
}
