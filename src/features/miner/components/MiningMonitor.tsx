"use client";

import { formatVenaAmount } from "@/lib/mining";
import { hasMiningContract, isMiningDeployed } from "../config/mining-contract";
import type { PoolStats } from "../hooks/usePoolStats";
import type { StoreItem } from "../config/game-config";
import {
  formatSessionEarned,
  getEquippedEffectivePower,
  getVenaPerDay,
} from "../config/game-config";
import type { PickaxeNFT } from "@/lib/types";

type MiningMonitorProps = {
  level: number;
  equippedPickaxes: PickaxeNFT[];
  equippedAccessories: StoreItem[];
  earnedVena: number;
  isMining: boolean;
  miningActive: boolean;
  poolStats: PoolStats | null;
  pendingOnChainVena: number;
  isClaimPending: boolean;
  onClaimOnChain: () => void;
};

export default function MiningMonitor({
  level,
  equippedPickaxes,
  equippedAccessories,
  earnedVena,
  isMining,
  miningActive,
  poolStats,
  pendingOnChainVena,
  isClaimPending,
  onClaimOnChain,
}: MiningMonitorProps) {
  const previewPower = getEquippedEffectivePower(equippedPickaxes);
  const previewDaily = getVenaPerDay(level, equippedPickaxes, equippedAccessories);

  const onChainLive = Boolean(
    isMiningDeployed && poolStats?.isActive && isMining
  );
  const showPreview = !onChainLive;

  const poolLive = Boolean(isMiningDeployed && poolStats?.isActive);

  const displayDaily = onChainLive
    ? (poolStats?.userDailyVena ?? 0)
    : previewDaily;
  const displayPower = onChainLive
    ? poolStats && poolStats.userSharePct > 0
      ? `${poolStats.userSharePct.toFixed(2)}% pool share`
      : "0% pool share"
    : `${previewPower.toFixed(0)} mining power (preview)`;

  return (
    <section className="miner-glass rounded-2xl p-5" aria-label="Mining monitor">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="miner-panel-title text-[10px] uppercase tracking-[0.2em] text-[#00f0ff]/70">
            Mining monitor
          </p>
          <h2 className="miner-panel-title text-sm font-semibold text-white">
            {onChainLive ? "Live on-chain output" : "Yield preview"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isMining && (
            <span className="flex items-center gap-1.5 rounded-lg border border-[#00ff88]/25 bg-[#00ff88]/10 px-2 py-1 text-[10px] uppercase tracking-wider text-[#00ff88]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00ff88]" />
              Staked
            </span>
          )}
          {poolLive && (
            <span className="rounded-lg border border-[#00f0ff]/20 bg-[#00f0ff]/5 px-2 py-1 text-[10px] uppercase tracking-wider text-[#00f0ff]">
              Pool live
            </span>
          )}
          <span className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">
            Lv.{level}
          </span>
        </div>
      </div>

      {poolStats?.isActive && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              Pool balance
            </p>
            <p className="miner-panel-title text-sm font-semibold tabular-nums text-white">
              {formatVenaAmount(poolStats.poolBalanceVena)}
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              Network power
            </p>
            <p className="miner-panel-title text-sm font-semibold tabular-nums text-white">
              {poolStats.totalPower.toLocaleString("en-US")}
            </p>
          </div>
          <div className="rounded-lg border border-[#c084fc]/20 bg-[#c084fc]/5 px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-[#c084fc]/70">
              Halving multiplier
            </p>
            <p className="miner-panel-title text-sm font-semibold tabular-nums text-[#c084fc]">
              {poolStats.halvingMultiplier}x
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              Next halving
            </p>
            <p className="miner-panel-title text-[11px] mt-1 font-semibold tabular-nums text-slate-300">
              {poolStats.nextHalvingDate 
                ? poolStats.nextHalvingDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : "TBA"}
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              Pool emission
            </p>
            <p className="miner-panel-title text-sm font-semibold tabular-nums text-[#00f0ff]">
              {formatVenaAmount(poolStats.poolDailyVena)}
              <span className="text-[10px] font-normal text-slate-500">/day</span>
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              Your share
            </p>
            <p className="miner-panel-title text-sm font-semibold tabular-nums text-[#00ff88]">
              {poolStats.userSharePct.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/5 bg-black/25 p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            {onChainLive ? "Your est. daily yield" : "Est. daily yield (preview)"}
          </p>
          <p className="miner-panel-title mt-1 text-2xl font-bold tabular-nums text-[#00f0ff]">
            {formatVenaAmount(displayDaily)}
            <span className="ml-1 text-xs font-normal text-slate-500">/day</span>
          </p>
          <p className="mt-1 text-[10px] text-slate-600">{displayPower}</p>
          {onChainLive && (
            <p className="mt-1 text-[10px] text-slate-600">
              Updates as pool balance, emission, and total staked power change.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-[#00ff88]/20 bg-[#00ff88]/5 p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Claimable rewards
          </p>
          <p className="miner-panel-title mt-1 text-2xl font-bold tabular-nums text-[#00ff88]">
            {hasMiningContract && miningActive
              ? formatVenaAmount(pendingOnChainVena)
              : showPreview
                ? formatSessionEarned(earnedVena)
                : "0"}
            <span className="ml-1 text-xs font-normal text-slate-500">VENA</span>
          </p>
          <p className="mt-1 text-[10px] text-slate-600">
            {hasMiningContract && miningActive
              ? "Accrues on-chain after stake — press Claim to receive."
              : poolLive
                ? "Connect wallet and stake VPICK pickaxes to earn from the live pool."
                : "Preview only until you stake on-chain."}
          </p>
        </div>
      </div>

      {hasMiningContract && miningActive && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onClaimOnChain}
            disabled={pendingOnChainVena <= 0 || isClaimPending}
            className="miner-panel-title w-full rounded-xl border border-[#00ff88]/40 bg-[#00ff88]/10 py-3 text-sm font-semibold text-[#00ff88] transition-colors hover:bg-[#00ff88]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isClaimPending
              ? "Confirm in wallet…"
              : pendingOnChainVena > 0
                ? `Claim ${formatVenaAmount(pendingOnChainVena)} VENA`
                : "Claim rewards"}
          </button>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-600">
        {!isMiningDeployed
          ? "Select a VPICK pickaxe from your wallet, then press Stake in the roster."
          : !poolLive
            ? "Pool is funding — pickaxe selection previews estimated yields."
            : equippedPickaxes.length === 0
              ? "Select a VPICK pickaxe, then press Stake in the roster. Rewards accrue on-chain; claim manually."
              : !isMining
                ? "Pickaxes selected but not staked. Press Stake per pickaxe — selection alone does not mine."
                : "Staked · rate shifts when others stake/unstake or treasury adds buybacks to the pool."}
      </p>
    </section>
  );
}
