"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { targetChainId } from "@/config/wagmi";
import {
  isMiningDeployed,
  VENA_MINING_ADDRESS,
  venaMiningAbi,
} from "../config/mining-contract";

const SECONDS_PER_DAY = BigInt(86_400);

/** Mirrors VenaMiningV2._effectiveRewardPerSecond() */
function effectiveRewardPerSecond(
  rewardPerSecond: bigint,
  poolBalance: bigint
): bigint {
  if (poolBalance === BigInt(0)) return BigInt(0);
  const maxRate = poolBalance / SECONDS_PER_DAY;
  return rewardPerSecond > maxRate ? maxRate : rewardPerSecond;
}

export type PoolStats = {
  poolBalanceVena: number;
  rewardPerSecondVena: number;
  effectiveRateVenaPerSec: number;
  poolDailyVena: number;
  totalPower: number;
  isActive: boolean;
  /** User share of global emission (0–100). */
  userSharePct: number;
  /** On-chain estimated daily yield for this user at current pool state. */
  userDailyVena: number;
  /** Timestamp of the next halving, or null if not started. */
  nextHalvingDate: Date | null;
  /** Current multiplier applied (1e18 = 1x, 5e17 = 0.5x). */
  halvingMultiplier: number;
};

export function usePoolStats(userPower: number): PoolStats | null {
  const enabled = isMiningDeployed;

  const { data: poolBalanceWei } = useReadContract({
    address: VENA_MINING_ADDRESS,
    abi: venaMiningAbi,
    functionName: "poolBalance",
    chainId: targetChainId,
    query: { enabled, refetchInterval: 15_000 },
  });

  const { data: rewardPerSecondWei } = useReadContract({
    address: VENA_MINING_ADDRESS,
    abi: venaMiningAbi,
    functionName: "rewardPerSecond",
    chainId: targetChainId,
    query: { enabled, refetchInterval: 15_000 },
  });

  const { data: totalPowerWei } = useReadContract({
    address: VENA_MINING_ADDRESS,
    abi: venaMiningAbi,
    functionName: "totalPower",
    chainId: targetChainId,
    query: { enabled, refetchInterval: 15_000 },
  });

  const { data: miningActive } = useReadContract({
    address: VENA_MINING_ADDRESS,
    abi: venaMiningAbi,
    functionName: "isActive",
    chainId: targetChainId,
    query: { enabled, refetchInterval: 15_000 },
  });

  const { data: startTimeWei } = useReadContract({
    address: VENA_MINING_ADDRESS,
    abi: venaMiningAbi,
    functionName: "startTime",
    chainId: targetChainId,
    query: { enabled, refetchInterval: 60_000 },
  });

  const { data: halvingPeriodWei } = useReadContract({
    address: VENA_MINING_ADDRESS,
    abi: venaMiningAbi,
    functionName: "halvingPeriod",
    chainId: targetChainId,
    query: { enabled, refetchInterval: 3600_000 },
  });

  const { data: currentMultiplierWei } = useReadContract({
    address: VENA_MINING_ADDRESS,
    abi: venaMiningAbi,
    functionName: "currentMultiplier",
    chainId: targetChainId,
    query: { enabled, refetchInterval: 60_000 },
  });

  return useMemo(() => {
    if (!enabled) return null;

    const poolBal = (poolBalanceWei ?? BigInt(0)) as bigint;
    const rps = (rewardPerSecondWei ?? BigInt(0)) as bigint;
    const totalPow = (totalPowerWei ?? BigInt(0)) as bigint;

    const effective = effectiveRewardPerSecond(rps, poolBal);
    const poolDaily = Number(formatUnits(effective * SECONDS_PER_DAY, 18));

    const totalPower = Number(totalPow);
    const userSharePct =
      totalPower > 0 && userPower > 0 ? (userPower / totalPower) * 100 : 0;
    const userDailyVena =
      totalPower > 0 && userPower > 0
        ? poolDaily * (userPower / totalPower)
        : 0;

    const st = Number(startTimeWei ?? BigInt(0));
    const hp = Number(halvingPeriodWei ?? BigInt(30 * 86400));
    
    let nextHalvingDate: Date | null = null;
    if (st > 0 && miningActive) {
      const nowSec = Math.floor(Date.now() / 1000);
      const elapsed = Math.max(0, nowSec - st);
      const halvings = Math.floor(elapsed / hp);
      const nextHalvingSec = st + (halvings + 1) * hp;
      nextHalvingDate = new Date(nextHalvingSec * 1000);
    }

    const currentMult = Number(formatUnits((currentMultiplierWei ?? BigInt(1e18)) as bigint, 18));

    return {
      poolBalanceVena: Number(formatUnits(poolBal, 18)),
      rewardPerSecondVena: Number(formatUnits(rps, 18)),
      effectiveRateVenaPerSec: Number(formatUnits(effective, 18)),
      poolDailyVena: poolDaily,
      totalPower,
      isActive: Boolean(miningActive),
      userSharePct,
      userDailyVena,
      nextHalvingDate,
      halvingMultiplier: currentMult,
    };
  }, [
    enabled,
    poolBalanceWei,
    rewardPerSecondWei,
    totalPowerWei,
    miningActive,
    userPower,
    startTimeWei,
    halvingPeriodWei,
    currentMultiplierWei,
  ]);
}
