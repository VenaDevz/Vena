/**
 * Pyramid mining — staking rewards paid from a BUYBACK-FED pool.
 * No pre-minted allocation: the pool grows from mint/upgrade revenue → $VENA buybacks.
 * The reference daily cap below is illustrative for yield estimates only.
 */

import type { Rarity } from "./types";
import {
  stackMiningPower,
  getSilverEquivalent,
  FORGE_PATHS,
  type ForgePath,
} from "./forge";
import { RARITY_TIERS, TOKENOMICS, tierMintOrUpgradeCost } from "./tokenomics";

export const MINING_EMISSION = {
  /** Illustrative reference pool size for yield preview (not a fixed allocation). */
  poolVena: 250_000_000,
  /** Illustrative distribution window for the yield preview. */
  emissionDays: 730,
  launchReferencePower: 50_000,
  uiTickMs: 1_000,
} as const;

export const DAILY_GLOBAL_CAP =
  MINING_EMISSION.poolVena / MINING_EMISSION.emissionDays;

export const FULL_NETWORK_EFFECTIVE_POWER =
  TOKENOMICS.maxNftSupply *
  RARITY_TIERS[0].hashrate *
  RARITY_TIERS[0].miningPyramidMultiplier;

export const MINING_SCENARIOS = {
  early: {
    id: "early",
    label: "Early network",
    referencePower: MINING_EMISSION.launchReferencePower,
    note: "~350 staked Silvers equivalent",
  },
  full: {
    id: "full",
    label: "Full capacity",
    referencePower: FULL_NETWORK_EFFECTIVE_POWER,
    note: "All 10,000 Silver Pickaxes staked",
  },
} as const;

const TIER_BY_ID = Object.fromEntries(
  RARITY_TIERS.map((t) => [t.id, t])
) as Record<Rarity, (typeof RARITY_TIERS)[number]>;

export function getMiningPyramidMultiplier(rarity: Rarity): number {
  return TIER_BY_ID[rarity].miningPyramidMultiplier;
}

export function getForgeTokenCost(rarity: Rarity): number {
  return tierMintOrUpgradeCost(rarity);
}

export function effectiveMiningPower(hashrate: number, rarity: Rarity): number {
  if (hashrate <= 0) return 0;
  return hashrate * getMiningPyramidMultiplier(rarity);
}

export function venaPerDayFromPower(
  effectivePower: number,
  networkPower: number = MINING_EMISSION.launchReferencePower
): number {
  if (effectivePower <= 0) return 0;
  const total = networkPower + effectivePower;
  return (effectivePower / total) * DAILY_GLOBAL_CAP;
}

export function venaPerDayForPickaxe(
  rarity: Rarity,
  hashrate: number,
  networkPower: number = MINING_EMISSION.launchReferencePower
): number {
  return venaPerDayFromPower(
    effectiveMiningPower(hashrate, rarity),
    networkPower
  );
}

export function venaPerHourForPickaxe(
  rarity: Rarity,
  hashrate: number,
  networkPower: number = MINING_EMISSION.launchReferencePower
): number {
  return venaPerDayForPickaxe(rarity, hashrate, networkPower) / 24;
}

export function venaPerSecondFromPower(
  effectivePower: number,
  networkPower: number = MINING_EMISSION.launchReferencePower
): number {
  return venaPerDayFromPower(effectivePower, networkPower) / 86_400;
}

export function venaPerSecondForPickaxe(
  rarity: Rarity,
  hashrate: number,
  networkPower: number = MINING_EMISSION.launchReferencePower
): number {
  return venaPerDayForPickaxe(rarity, hashrate, networkPower) / 86_400;
}

export function estimatePaybackDays(
  rarity: Rarity,
  hashrate: number,
  networkPower: number = MINING_EMISSION.launchReferencePower
): number {
  const daily = venaPerDayForPickaxe(rarity, hashrate, networkPower);
  const cost = getSilverEquivalent(rarity);
  if (daily <= 0) return Infinity;
  return cost / daily;
}

export function formatVenaAmount(value: number, maxDecimals = 4): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (value >= 1) return value.toFixed(2);
  if (value >= 0.01) return value.toFixed(3);
  return value.toFixed(maxDecimals);
}

/** Locale-aware yield display (e.g. 10,263.7 VENA). */
export function formatYieldAmount(value: number, maxFractionDigits = 3): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
}

/** @deprecated alias */
export function formatVenaRate(value: number): string {
  return formatVenaAmount(value);
}

export function venaPerDay(totalEffectivePower: number): number {
  return venaPerDayFromPower(totalEffectivePower);
}

export function venaPerSecond(totalEffectivePower: number): number {
  return venaPerSecondFromPower(totalEffectivePower);
}

function buildMiningYields(networkPower: number) {
  return RARITY_TIERS.map((tier) => {
    const daily = venaPerDayForPickaxe(tier.id, tier.hashrate, networkPower);
    return {
      tier: tier.id,
      hashrate: tier.hashrate,
      tokenCost: tierMintOrUpgradeCost(tier.id),
      pyramidMult: tier.miningPyramidMultiplier,
      miningPower: effectiveMiningPower(tier.hashrate, tier.id),
      daily,
      hourly: daily / 24,
      monthly: daily * 30,
    };
  });
}

export const RARITY_MINING_YIELDS = buildMiningYields(
  MINING_EMISSION.launchReferencePower
);

export const RARITY_MINING_YIELDS_FULL = buildMiningYields(
  FULL_NETWORK_EFFECTIVE_POWER
);

export function dailyFromSilverCount(
  count: number,
  networkPower: number = MINING_EMISSION.launchReferencePower
): number {
  return venaPerDayFromPower(stackMiningPower("Silver", count), networkPower);
}

export function dailyFromTierStack(
  rarity: Rarity,
  count: number,
  networkPower: number = MINING_EMISSION.launchReferencePower
): number {
  return venaPerDayFromPower(stackMiningPower(rarity, count), networkPower);
}

function dailyFromForgePath(
  path: ForgePath,
  networkPower: number = MINING_EMISSION.launchReferencePower
): number {
  let power = 0;
  for (const [rarity, count] of Object.entries(path.ingredients)) {
    if (count && count > 0) {
      power += stackMiningPower(rarity as Rarity, count);
    }
  }
  return venaPerDayFromPower(power, networkPower);
}

/** Silver stack vs forged tier — every path must lose to the upgrade */
export const FORGE_MINING_CHECKS = RARITY_TIERS.filter(
  (t) => t.id !== "Silver"
).map((tier) => {
  const forgedDaily = venaPerDayForPickaxe(tier.id, tier.hashrate);
  const silverDaily = dailyFromSilverCount(tier.silverEquivalent);
  const paths = FORGE_PATHS[tier.id as Exclude<Rarity, "Silver">];
  const pathChecks = paths.map((path) => ({
    label: path.label,
    stackDaily: dailyFromForgePath(path),
    forgedWins: forgedDaily > dailyFromForgePath(path),
  }));
  return {
    tier: tier.id,
    silverEquivalent: tier.silverEquivalent,
    silverStackDaily: silverDaily,
    forgedDaily,
    silverThreeDaily: tier.id === "Gold" ? dailyFromSilverCount(3) : null,
    forgedBeatsFullStack: forgedDaily > silverDaily,
    pathChecks,
    dailyAdvantagePct:
      silverDaily > 0
        ? Math.round(((forgedDaily - silverDaily) / silverDaily) * 1000) / 10
        : 0,
  };
});

/** Illustrative pool reference — grows with buybacks, not a fixed calendar. */
export const MINING_POOL_SCHEDULE = {
  totalVena: MINING_EMISSION.poolVena,
  days: MINING_EMISSION.emissionDays,
  dailyCap: DAILY_GLOBAL_CAP,
  endsOnDay: MINING_EMISSION.emissionDays,
  note: "Buyback-fed — pool grows with mint & upgrade volume",
} as const;
