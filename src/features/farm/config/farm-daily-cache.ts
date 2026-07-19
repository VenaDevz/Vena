/**
 * Commander's Daily Cache — one free claim per UTC day (Kintara free-spinner inspired).
 */

import { getDayKey } from "./farm-quests";
import type { VpickTier } from "./farm-config";
import { vpickCacheCrystalMultiplier } from "./farm-config";

export type CacheReward =
  | { kind: "crystal"; amount: number; label: string }
  | { kind: "ore" | "iron" | "gold"; amount: number; label: string };

/** Deterministic roll from day + wallet so the prize is stable until claimed. */
function hashSeed(dayKey: string, address: string): number {
  const s = `${dayKey}:${address.toLowerCase()}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function roll(r: number): number {
  return r / 2147483647;
}

export function dailyCacheReward(dayKey: string, address: string, vpickTier: VpickTier): CacheReward {
  const seed = hashSeed(dayKey, address);
  const r = roll(seed);

  const mult = vpickCacheCrystalMultiplier(vpickTier);

  if (r < 0.05) {
    const amount = Math.round(1500 * mult);
    return { kind: "crystal", amount, label: `${amount.toLocaleString("en-US")} Crystal` };
  }
  if (r < 0.45) {
    const amount = Math.round((200 + roll(seed * 3) * 600) * mult);
    return { kind: "crystal", amount, label: `${amount.toLocaleString("en-US")} Crystal` };
  }
  if (r < 0.7) {
    const amount = Math.round(500 + roll(seed * 5) * 1500);
    return { kind: "ore", amount, label: `${amount.toLocaleString("en-US")} Ore` };
  }
  if (r < 0.9) {
    const amount = Math.round(200 + roll(seed * 7) * 600);
    return { kind: "iron", amount, label: `${amount.toLocaleString("en-US")} Iron` };
  }
  const amount = Math.round(50 + roll(seed * 11) * 150);
  return { kind: "gold", amount, label: `${amount.toLocaleString("en-US")} Gold` };
}

export function cacheDayKey(): string {
  return getDayKey();
}

export function msUntilNextCache(lastDayKey: string): number {
  const next = new Date(lastDayKey);
  next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(0, 0, 0, 0);
  return Math.max(0, next.getTime() - Date.now());
}

export function formatCountdown(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
