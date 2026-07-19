/** VENA Command Base — Crystal → USDC exchange (fee-funded pool) */

import type { SavedFarmState } from "../lib/farm-storage";

export const EXCHANGE_SEASON_ID = "s1";
export const EXCHANGE_SEASON_LABEL = "Season 1";
export const EXCHANGE_SEASON_END = "Aug 1, 2026";

/**
 * Total USDC deposited into the season pool (from swap fees / treasury ops).
 * Top up this value whenever new fee revenue is allocated to the game market.
 */
export const EXCHANGE_POOL_USDC = 500;

/**
 * How much Crystal the pool is sized to absorb at the current rate.
 * Rate = poolRemaining / crystalQuotaRemaining.
 * When the pool is topped up, increase both USDC and optionally reset quota.
 */
export const EXCHANGE_CRYSTAL_QUOTA = 2_000_000;

/** Minimum Crystal per swap — keeps micro-transactions meaningful. */
export const EXCHANGE_MIN_CRYSTAL = 500;

/** Max Crystal per single swap (anti-whale drain in one tx). */
export const EXCHANGE_MAX_CRYSTAL = 100_000;

const POOL_KEY = `vena-farm-exchange-pool:${EXCHANGE_SEASON_ID}`;
const QUOTA_KEY = `vena-farm-exchange-quota:${EXCHANGE_SEASON_ID}`;

export function loadPoolClaimed(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(POOL_KEY) ?? 0);
  } catch {
    return 0;
  }
}

export function loadQuotaUsed(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(QUOTA_KEY) ?? 0);
  } catch {
    return 0;
  }
}

export function recordExchange(crystalIn: number, usdcOut: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(POOL_KEY, String(loadPoolClaimed() + usdcOut));
  localStorage.setItem(QUOTA_KEY, String(loadQuotaUsed() + crystalIn));
}

export function poolRemaining(): number {
  return Math.max(0, EXCHANGE_POOL_USDC - loadPoolClaimed());
}

export function quotaRemaining(): number {
  return Math.max(0, EXCHANGE_CRYSTAL_QUOTA - loadQuotaUsed());
}

/** Current USDC per 1 Crystal (floats as pool depletes). */
export function exchangeRate(): number {
  const pool = poolRemaining();
  const quota = quotaRemaining();
  if (pool <= 0 || quota <= 0) return 0;
  return pool / quota;
}

/** Preview USDC output for a Crystal input at the current rate. */
export function previewUsdc(crystalIn: number): number {
  const rate = exchangeRate();
  if (rate <= 0 || crystalIn <= 0) return 0;
  const raw = crystalIn * rate;
  return Math.min(raw, poolRemaining());
}

export function formatUsdc(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(2)}K`;
  if (n >= 10) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(3)}`;
  return `$${n.toFixed(4)}`;
}

export function normalizeExchange(
  ex: SavedFarmState["exchange"]
): NonNullable<SavedFarmState["exchange"]> {
  if (!ex || ex.seasonId !== EXCHANGE_SEASON_ID) {
    return { seasonId: EXCHANGE_SEASON_ID, totalCrystalSold: 0, totalUsdcEarned: 0 };
  }
  return ex;
}
