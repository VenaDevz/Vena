"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
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
};

export function usePoolStats(userPower: number): PoolStats | null {
  const enabled = isMiningDeployed;

  const { data: poolBalanceWei } = useReadContract({
    address: VENA_MINING_ADDRESS,
    abi: venaMiningAbi,
    functionName: "poolBalance",
    query: { enabled, refetchInterval: 15_000 },
  });

  const { data: rewardPerSecondWei } = useReadContract({
    address: VENA_MINING_ADDRESS,
    abi: venaMiningAbi,
    functionName: "rewardPerSecond",
    query: { enabled, refetchInterval: 15_000 },
  });

  const { data: totalPowerWei } = useReadContract({
    address: VENA_MINING_ADDRESS,
    abi: venaMiningAbi,
    functionName: "totalPower",
    query: { enabled, refetchInterval: 15_000 },
  });

  const { data: miningActive } = useReadContract({
    address: VENA_MINING_ADDRESS,
    abi: venaMiningAbi,
    functionName: "isActive",
    query: { enabled, refetchInterval: 15_000 },
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

    return {
      poolBalanceVena: Number(formatUnits(poolBal, 18)),
      rewardPerSecondVena: Number(formatUnits(rps, 18)),
      effectiveRateVenaPerSec: Number(formatUnits(effective, 18)),
      poolDailyVena: poolDaily,
      totalPower,
      isActive: Boolean(miningActive),
      userSharePct,
      userDailyVena,
    };
  }, [
    enabled,
    poolBalanceWei,
    rewardPerSecondWei,
    totalPowerWei,
    miningActive,
    userPower,
  ]);
}
