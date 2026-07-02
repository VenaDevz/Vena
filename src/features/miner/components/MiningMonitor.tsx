"use client";

import { useState } from "react";
import {
  formatSessionEarned,
  GAME_CONFIG,
  getEquippedEffectivePower,
  getVenaPerDay,
  getVenaPerSecond,
  type StoreItem,
} from "../config/game-config";
import { formatVenaAmount } from "@/lib/mining";
import { hasMiningContract } from "../config/mining-contract";
import type { PickaxeNFT } from "@/lib/types";

type MiningMonitorProps = {
  level: number;
  equippedPickaxes: PickaxeNFT[];
  equippedAccessories: StoreItem[];
  earnedVena: number;
  isMining: boolean;
  miningActive: boolean;
  pendingOnChainVena: number;
  isClaimPending: boolean;
  onClaimSession: () => void;
  onClaimOnChain: () => void;
};

export default function MiningMonitor({
  level,
  equippedPickaxes,
  equippedAccessories,
  earnedVena,
  isMining,
  miningActive,
  pendingOnChainVena,
  isClaimPending,
  onClaimSession,
  onClaimOnChain,
}: MiningMonitorProps) {
  const [sessionClaimedFlash, setSessionClaimedFlash] = useState(false);

  const effectivePower = getEquippedEffectivePower(equippedPickaxes);
  const venaPerDay = getVenaPerDay(level, equippedPickaxes, equippedAccessories);
  const venaPerSecond = getVenaPerSecond(
    level,
    equippedPickaxes,
    equippedAccessories
  );

  const handleSessionClaim = () => {
    onClaimSession();
    setSessionClaimedFlash(true);
    window.setTimeout(() => setSessionClaimedFlash(false), 2000);
  };

  const needsStake =
    hasMiningContract &&
    equippedPickaxes.some((p) => p.id >= 0 && !p.staked);

  return (
    <section className="miner-glass rounded-2xl p-5" aria-label="Mining monitor">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="miner-panel-title text-[10px] uppercase tracking-[0.2em] text-[#00f0ff]/70">
            Mining monitor
          </p>
          <h2 className="miner-panel-title text-sm font-semibold text-white">
            Live output
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isMining && (
            <span className="flex items-center gap-1.5 rounded-lg border border-[#00ff88]/25 bg-[#00ff88]/10 px-2 py-1 text-[10px] uppercase tracking-wider text-[#00ff88]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#00ff88]" />
              Live
            </span>
          )}
          <span className="rounded-lg border border-[#00f0ff]/20 bg-[#00f0ff]/5 px-2 py-1 text-[10px] uppercase tracking-wider text-[#00f0ff]">
            Lv.{level}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/5 bg-black/25 p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Est. daily yield
          </p>
          <p className="miner-panel-title mt-1 text-2xl font-bold tabular-nums text-[#00f0ff]">
            {formatVenaAmount(venaPerDay)}
            <span className="ml-1 text-xs font-normal text-slate-500">/day</span>
          </p>
          <p className="mt-1 text-[10px] text-slate-600">
            {effectivePower.toFixed(0)} mining power
          </p>
        </div>
        <div className="rounded-xl border border-[#7000ff]/20 bg-[#7000ff]/5 p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Session earned
          </p>
          <p
            className={[
              "miner-panel-title mt-1 text-2xl font-bold tabular-nums text-[#7000ff]",
              isMining ? "transition-[opacity] duration-300" : "",
            ].join(" ")}
          >
            {formatSessionEarned(earnedVena)}
            <span className="ml-1 text-xs font-normal text-slate-500">VENA</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleSessionClaim}
          disabled={earnedVena <= 0 || isClaimPending}
          className="miner-panel-title flex-1 rounded-xl border border-[#7000ff]/40 bg-[#7000ff]/10 py-3 text-sm font-semibold text-[#7000ff] transition-colors hover:bg-[#7000ff]/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sessionClaimedFlash
            ? "Session saved"
            : "Save session rewards"}
        </button>
        {hasMiningContract && (
          <button
            type="button"
            onClick={onClaimOnChain}
            disabled={pendingOnChainVena <= 0 || isClaimPending}
            className="miner-panel-title flex-1 rounded-xl border border-[#00ff88]/40 bg-[#00ff88]/10 py-3 text-sm font-semibold text-[#00ff88] transition-colors hover:bg-[#00ff88]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isClaimPending
              ? "Confirm in wallet…"
              : `Claim on-chain (${formatVenaAmount(pendingOnChainVena)})`}
          </button>
        )}
      </div>

      {hasMiningContract && pendingOnChainVena > 0 && (
        <p className="mt-2 text-[10px] text-slate-600">
          On-chain pending from VenaMining contract — claim sends VENA to your
          wallet.
        </p>
      )}

      <p className="mt-3 text-xs text-slate-600">
        {equippedPickaxes.length === 0
          ? "Equip a VPICK pickaxe to start mining. The robot chassis does not mine on its own."
          : needsStake
            ? "Equip triggers stake — confirm wallet txs to activate mining."
            : !miningActive && hasMiningContract
              ? "Mining pool not started on-chain yet. Session counter runs in preview mode."
              : `${equippedPickaxes.length} pickaxe(s) active · +${formatVenaAmount(venaPerSecond, 6)}/sec · ${GAME_CONFIG.mining.emissionPoolVena.toLocaleString("en-US")} pool / ${GAME_CONFIG.mining.emissionDays}d`}
      </p>
    </section>
  );
}
