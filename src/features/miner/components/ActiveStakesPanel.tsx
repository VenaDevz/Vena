"use client";

import Image from "next/image";
import { Pickaxe } from "lucide-react";
import type { PickaxeNFT } from "@/lib/types";
import { RARITY_CONFIG } from "@/lib/types";
import { getPickaxeDailyYield } from "../config/game-config";
import { formatVenaAmount } from "@/lib/mining";
import { hasMiningContract } from "../config/mining-contract";

type ActiveStakesPanelProps = {
  equippedPickaxes: PickaxeNFT[];
  displayPickaxeId: number | null;
  isMiningLive: boolean;
  miningActive: boolean;
  stakedIds: Set<number>;
  onToggle: (pickaxe: PickaxeNFT) => void;
  onStake: (pickaxe: PickaxeNFT) => void;
  onUnstake: (pickaxe: PickaxeNFT) => void;
  onSyncPower?: () => void;
};

export default function ActiveStakesPanel({
  equippedPickaxes,
  displayPickaxeId,
  isMiningLive,
  miningActive,
  stakedIds,
  onToggle,
  onStake,
  onUnstake,
  onSyncPower,
}: ActiveStakesPanelProps) {
  if (equippedPickaxes.length === 0) {
    return (
      <section
        className="miner-glass rounded-2xl border border-dashed border-white/10 p-5"
        aria-label="Selected pickaxes"
      >
        <div className="flex items-start gap-3">
          <Pickaxe className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />
          <div>
            <h2 className="miner-panel-title text-sm font-semibold text-white">
              Selected pickaxes
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              No pickaxes selected. Choose pickaxes below, then press Stake to
              mine on-chain.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const canStakeOnChain = hasMiningContract && miningActive;

  return (
    <section className="miner-glass rounded-2xl p-5" aria-label="Selected pickaxes">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="miner-panel-title text-[10px] uppercase tracking-[0.2em] text-[#00ff88]/70">
            Mining roster
          </p>
          <h2 className="miner-panel-title text-sm font-semibold text-white">
            {equippedPickaxes.length} selected
          </h2>
        </div>
        <span
          className={[
            "rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider",
            isMiningLive
              ? "bg-[#00ff88]/15 text-[#00ff88]"
              : "bg-amber-500/15 text-amber-400",
          ].join(" ")}
        >
          {isMiningLive ? "Mining" : "Not staked"}
        </span>
      </div>

      <ul className="space-y-2">
        {equippedPickaxes.map((pickaxe) => {
          const cfg = RARITY_CONFIG[pickaxe.rarity];
          const inHand = displayPickaxeId === pickaxe.id;
          const isStaked = pickaxe.id >= 0 && stakedIds.has(pickaxe.id);

          return (
            <li
              key={pickaxe.id}
              className={[
                "flex items-center gap-3 rounded-xl border p-3",
                isStaked
                  ? "border-[#00ff88]/15 bg-[#00ff88]/5"
                  : "border-white/10 bg-black/20",
              ].join(" ")}
            >
              <div
                className="relative h-11 w-11 shrink-0 rounded-lg border border-white/10"
                style={{ background: cfg.bgGradient }}
              >
                {pickaxe.image && (
                  <Image
                    src={pickaxe.image}
                    alt=""
                    fill
                    className="pickaxe-blend object-contain p-0.5"
                    sizes="44px"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="miner-panel-title truncate text-sm font-medium text-white">
                  {pickaxe.name}
                </p>
                <p className="text-xs text-slate-500">
                  {pickaxe.tokenId}
                  {isStaked ? " · Staked on-chain" : " · Selected — press Stake to mine"}
                  {inHand ? " · In robot hand" : ""}
                  {" · ~"}
                  {formatVenaAmount(
                    getPickaxeDailyYield(pickaxe.rarity, pickaxe.hashrate)
                  )}
                  /day preview
                  {pickaxe.stratumMultiplier !== undefined && pickaxe.stratumMultiplier > 1 && (
                    <span className="ml-1 text-[11px] font-bold text-[#00f0ff]">
                       · Stratum {pickaxe.stratumMultiplier.toFixed(2)}x
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                {pickaxe.id >= 0 && isStaked ? (
                  <button
                    type="button"
                    onClick={() => onUnstake(pickaxe)}
                    disabled={!canStakeOnChain}
                    className="miner-panel-title rounded-lg border border-[#7000ff]/35 px-2 py-1.5 text-[10px] uppercase tracking-wider text-[#7000ff] hover:bg-[#7000ff]/10 disabled:opacity-40"
                  >
                    Unstake
                  </button>
                ) : pickaxe.id >= 0 ? (
                  <button
                    type="button"
                    onClick={() => onStake(pickaxe)}
                    disabled={!canStakeOnChain}
                    className="miner-panel-title rounded-lg border border-[#00ff88]/35 bg-[#00ff88]/10 px-2 py-1.5 text-[10px] uppercase tracking-wider text-[#00ff88] hover:bg-[#00ff88]/20 disabled:opacity-40"
                  >
                    Stake
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onToggle(pickaxe)}
                  className="miner-panel-title rounded-lg border border-white/10 px-2 py-1.5 text-[10px] uppercase tracking-wider text-slate-400 hover:bg-white/5"
                >
                  Remove
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {stakedIds.size > 0 && onSyncPower && (
        <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-4 text-center">
          <div className="flex flex-col items-center justify-center gap-1">
            <h3 className="miner-panel-title text-xs font-bold text-[#00f0ff]">STRATUM MULTIPLIER</h3>
            {(() => {
              const stakedList = equippedPickaxes.filter(p => p.id >= 0 && stakedIds.has(p.id) && p.stratumMultiplier !== undefined);
              if (stakedList.length > 0) {
                const avg = stakedList.reduce((acc, curr) => acc + (curr.stratumMultiplier || 1), 0) / stakedList.length;
                if (avg >= 1) {
                  return <div className="text-2xl font-black text-[#00f0ff]">{avg.toFixed(2)}x</div>;
                }
              }
              return null;
            })()}
          </div>
          <p className="mt-2 text-[11px] text-slate-400 mb-3">
            Stake duration raises your reward multiplier. Click below to lock in your latest Stratum power level on-chain!
          </p>
          <button
            type="button"
            onClick={() => onSyncPower()}
            disabled={!canStakeOnChain}
            className="miner-panel-title w-full rounded-lg border border-[#00f0ff]/40 bg-[#00f0ff]/10 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-[#00f0ff] hover:bg-[#00f0ff]/20 disabled:opacity-40"
          >
            ⚡ Sync Power (Update Stratum)
          </button>
        </div>
      )}
    </section>
  );
}
