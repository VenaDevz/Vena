"use client";

import { useEffect } from "react";
import type { PickaxeNFT } from "@/lib/types";
import { getVenaPerSecond, type StoreItem } from "../config/game-config";
import { useMinerStore } from "../store/miner-store";

const TICK_MS = 1_000;

export function useMiningLoop(
  equippedPickaxes: PickaxeNFT[],
  equippedAccessories: StoreItem[],
  isActive: boolean
) {
  const level = useMinerStore((s) => s.level);
  const tickMining = useMinerStore((s) => s.tickMining);

  useEffect(() => {
    if (!isActive || equippedPickaxes.length === 0) return;

    const venaPerSecond = getVenaPerSecond(
      level,
      equippedPickaxes,
      equippedAccessories
    );
    if (venaPerSecond <= 0) return;

    const perTick = venaPerSecond * (TICK_MS / 1000);
    const id = window.setInterval(() => tickMining(perTick), TICK_MS);

    return () => window.clearInterval(id);
  }, [isActive, level, equippedPickaxes, equippedAccessories, tickMining]);
}

export function canMineEquipped(
  equippedPickaxes: PickaxeNFT[],
  stakedIds: Set<number>,
  miningContractEnabled: boolean,
  miningActive: boolean
): boolean {
  if (equippedPickaxes.length === 0) return false;

  const realPickaxes = equippedPickaxes.filter((p) => p.id >= 0);
  if (realPickaxes.length === 0) {
    return (
      process.env.NEXT_PUBLIC_MINER_DEMO_PICKAXES === "1" &&
      equippedPickaxes.every((p) => p.id < 0)
    );
  }

  if (!miningContractEnabled || !miningActive) return false;

  return realPickaxes.every((p) => stakedIds.has(p.id));
}
