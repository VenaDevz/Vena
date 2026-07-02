"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import type { PickaxeNFT } from "@/lib/types";
import { RARITY_CONFIG } from "@/lib/types";
import { getPickaxeDailyYield } from "../config/game-config";
import { formatVenaAmount } from "@/lib/mining";

type PickaxeInventoryProps = {
  pickaxes: PickaxeNFT[];
  equippedIds: Set<number>;
  displayPickaxeId: number | null;
  isLoading: boolean;
  isConnected: boolean;
  onSetDisplay: (id: number) => void;
  onToggle: (pickaxe: PickaxeNFT) => void;
};

export default function PickaxeInventory({
  pickaxes,
  equippedIds,
  displayPickaxeId,
  isLoading,
  isConnected,
  onSetDisplay,
  onToggle,
}: PickaxeInventoryProps) {
  return (
    <section className="miner-glass rounded-2xl p-5" aria-label="Pickaxe inventory">
      <div className="mb-4">
        <p className="miner-panel-title text-[10px] uppercase tracking-[0.2em] text-[#00f0ff]/70">
          Wallet inventory
        </p>
        <h2 className="miner-panel-title text-sm font-semibold text-white">
          VPICK pickaxes
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Select pickaxes to stake for mining. Star any NFT to show it in the
          robot hand — otherwise the highest-rarity selected pickaxe is shown.
          {process.env.NEXT_PUBLIC_MINER_DEMO_PICKAXES === "1" && (
            <span className="mt-1 block text-[#7000ff]/80">
              Demo mode: preview pickaxes from /public are listed below.
            </span>
          )}
        </p>
      </div>

      {!isConnected ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Connect wallet to load your pickaxes.
        </p>
      ) : isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/5"
            />
          ))}
        </div>
      ) : pickaxes.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          No pickaxes found. Mint a Silver Pickaxe with $VENA to start mining.
        </p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {pickaxes.map((pickaxe) => {
            const cfg = RARITY_CONFIG[pickaxe.rarity];
            const equipped = equippedIds.has(pickaxe.id);
            const isDisplay = displayPickaxeId === pickaxe.id;

            return (
              <li
                key={pickaxe.id}
                className={[
                  "flex items-center gap-3 rounded-xl border p-3",
                  equipped
                    ? "border-[#00f0ff]/25 bg-[#00f0ff]/5"
                    : "border-white/5 bg-black/20",
                ].join(" ")}
              >
                <div
                  className="relative h-12 w-12 shrink-0 rounded-lg border border-white/10"
                  style={{ background: cfg.bgGradient }}
                >
                  {pickaxe.image && (
                    <Image
                      src={pickaxe.image}
                      alt=""
                      fill
                      className="pickaxe-blend object-contain p-0.5"
                      sizes="48px"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="miner-panel-title truncate text-sm font-medium text-white">
                    {pickaxe.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {pickaxe.tokenId} · ~{formatVenaAmount(getPickaxeDailyYield(pickaxe.rarity, pickaxe.hashrate))}/day
                    {equipped ? " · Staking" : ""}
                    {isDisplay ? " · In hand" : ""}
                    {pickaxe.staked ? " · On-chain" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    title="Show in robot hand"
                    onClick={() => onSetDisplay(pickaxe.id)}
                    className={[
                      "rounded-lg p-2 transition-colors",
                      isDisplay
                        ? "bg-[#7000ff]/20 text-[#7000ff]"
                        : "text-slate-600 hover:bg-white/5 hover:text-[#7000ff]",
                    ].join(" ")}
                    aria-label={`Display ${pickaxe.name} in hand`}
                  >
                    <Star
                      className="h-4 w-4"
                      fill={isDisplay ? "currentColor" : "none"}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggle(pickaxe)}
                    className={[
                      "miner-panel-title rounded-lg border px-2 py-1.5 text-[10px] uppercase tracking-wider",
                      equipped
                        ? "border-[#7000ff]/35 text-[#7000ff] hover:bg-[#7000ff]/10"
                        : "border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/10",
                    ].join(" ")}
                  >
                    {equipped ? "Unstake" : "Stake"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
