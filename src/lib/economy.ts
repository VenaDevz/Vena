/**
 * VENA economy tables — built on tokenomics + mining math.
 */

import type { Rarity } from "./types";
import {
  RARITY_TIERS,
  TOKENOMICS,
  BUYBACK_POLICY,
  MINT_REVENUE_POLICY,
  tierMintOrUpgradeCost,
} from "./tokenomics";
import {
  getCurrentGlobalCap,
  MINING_EMISSION,
  effectiveMiningPower,
  venaPerDayForPickaxe,
  venaPerDayFromPower,
} from "./mining";

export { BUYBACK_POLICY, MINT_REVENUE_POLICY, tierMintOrUpgradeCost };

export type TierEconomyRow = {
  tier: Rarity;
  mintOrUpgradeVena: number;
  miningPower: number;
  stakeWeight: number;
  estDailyVena: number;
  estMonthlyVena: number;
  maxSupply: number;
};

export function tierStakeWeight(tier: Rarity): number {
  return RARITY_TIERS.find((t) => t.id === tier)?.powerMultiplier ?? 1;
}

export function buildTierEconomyTable(
  networkPower: number = MINING_EMISSION.launchReferencePower
): TierEconomyRow[] {
  return RARITY_TIERS.map((tier) => {
    const daily = venaPerDayForPickaxe(tier.id, tier.hashrate, networkPower);
    return {
      tier: tier.id,
      mintOrUpgradeVena: tierMintOrUpgradeCost(tier.id),
      miningPower: effectiveMiningPower(tier.hashrate, tier.id),
      stakeWeight: tier.powerMultiplier,
      estDailyVena: daily,
      estMonthlyVena: daily * 30,
      maxSupply: Math.floor(TOKENOMICS.maxNftSupply / tier.silverEquivalent),
    };
  });
}

export const TIER_ECONOMY_EARLY = buildTierEconomyTable(
  MINING_EMISSION.launchReferencePower
);

/** One upgraded tier vs equivalent Silver stack at reference network size. */
export const UPGRADE_MINING_ADVANTAGE = RARITY_TIERS.filter(
  (t) => t.id !== "Silver"
).map((tier) => {
  const upgradedDaily = venaPerDayForPickaxe(tier.id, tier.hashrate);
  const silverCount = tier.silverEquivalent;
  const stackPower =
    effectiveMiningPower(RARITY_TIERS[0].hashrate, "Silver") * silverCount;
  const stackDaily = venaPerDayFromPower(
    stackPower,
    MINING_EMISSION.launchReferencePower
  );

  return {
    tier: tier.id,
    upgradeCostVena: tierMintOrUpgradeCost(tier.id),
    upgradedDaily,
    silverStackDaily: stackDaily,
    miningAdvantagePct:
      stackDaily > 0
        ? Math.round(((upgradedDaily - stackDaily) / stackDaily) * 1000) / 10
        : 0,
  };
});

export const DAILY_EMISSION_CAP = getCurrentGlobalCap();
