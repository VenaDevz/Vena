import type { Rarity } from "./types";
import { tierUpgradeVena } from "./tokenomics";

/** Format a $VENA whole-token amount for display. */
export function formatVena(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString("en-US");
}

/** $VENA cost to upgrade into a tier (Silver returns 0). */
export function tierUpgradeCostVena(tier: Rarity): number {
  return tierUpgradeVena(tier);
}
