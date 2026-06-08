/**
 * Forge graph — every tier reachable without Silver once Gold exists.
 * Silver-equivalent costs: 1 → 4 → 8 → 16 → 32 (powers of two ×4 entry).
 */

import type { Rarity } from "./types";
import { RARITY_TIERS } from "./tokenomics";

export type ForgeIngredient = Partial<Record<Rarity, number>>;

export type ForgePath = {
  ingredients: ForgeIngredient;
  /** Human-readable recipe */
  label: string;
};

const TIER_INDEX: Record<Rarity, number> = {
  Silver: 0,
  Gold: 1,
  Platinum: 2,
  Diamond: 3,
  Emerald: 4,
};

const TIER_BY_ID = Object.fromEntries(
  RARITY_TIERS.map((t) => [t.id, t])
) as Record<Rarity, (typeof RARITY_TIERS)[number]>;

/** Token value locked in one NFT of this tier (Silver = 1) */
export function getSilverEquivalent(rarity: Rarity): number {
  return TIER_BY_ID[rarity].silverEquivalent;
}

export const FORGE_PATHS: Record<Exclude<Rarity, "Silver">, ForgePath[]> = {
  Gold: [{ ingredients: { Silver: 4 }, label: "4 Silver" }],
  Platinum: [
    { ingredients: { Silver: 8 }, label: "8 Silver" },
    { ingredients: { Gold: 2 }, label: "2 Gold" },
  ],
  Diamond: [
    { ingredients: { Silver: 16 }, label: "16 Silver" },
    { ingredients: { Platinum: 2 }, label: "2 Platinum" },
    { ingredients: { Gold: 4 }, label: "4 Gold" },
  ],
  Emerald: [
    { ingredients: { Silver: 32 }, label: "32 Silver" },
    { ingredients: { Diamond: 2 }, label: "2 Diamond" },
    { ingredients: { Platinum: 4 }, label: "4 Platinum" },
    { ingredients: { Gold: 8 }, label: "8 Gold" },
  ],
};

/** Max NFTs if entire supply forges into this tier only */
export function maxTheoreticalSupply(rarity: Rarity): number {
  return Math.floor(
    TIER_BY_ID.Silver.maxSupplyBasis / getSilverEquivalent(rarity)
  );
}

/** Effective mining power for a stack of same-tier pickaxes */
export function stackMiningPower(rarity: Rarity, count: number): number {
  if (count <= 0) return 0;
  const tier = TIER_BY_ID[rarity];
  return count * tier.hashrate * tier.miningPyramidMultiplier;
}

export function tierRank(rarity: Rarity): number {
  return TIER_INDEX[rarity];
}

export function isHigherTier(a: Rarity, b: Rarity): boolean {
  return TIER_INDEX[a] > TIER_INDEX[b];
}

/** Primary cross-tier upgrade (2× previous tier) for UI highlights */
export function primaryTierUpgrade(target: Exclude<Rarity, "Silver">): ForgePath | null {
  const paths = FORGE_PATHS[target];
  const rank = TIER_INDEX[target];
  const prevTier = RARITY_TIERS[rank - 1]?.id as Rarity | undefined;
  if (!prevTier || prevTier === "Silver") return paths[1] ?? paths[0] ?? null;
  return paths.find((p) => p.ingredients[prevTier] === 2) ?? null;
}
