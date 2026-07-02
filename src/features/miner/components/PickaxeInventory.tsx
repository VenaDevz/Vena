"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import type { PickaxeNFT } from "@/lib/types";
import { RARITY_CONFIG } from "@/lib/types";
import { PROJECT } from "@/lib/project";
import { getPickaxeDailyYield } from "../config/game-config";
import { formatVenaAmount } from "@/lib/mining";

type PickaxeInventoryProps = {
  pickaxes: PickaxeNFT[];
  equippedIds: Set<number>;
  displayPickaxeId: number | null;
  isLoading: boolean;
  isConnected: boolean;
  walletAddressShort?: string | null;
  isContractReady?: boolean;
  stakedIds: Set<number>;
  onSetDisplay: (id: number) => void;
  onToggle: (pickaxe: PickaxeNFT) => void;
};

export default function PickaxeInventory({
  pickaxes,
  equippedIds,
  displayPickaxeId,
  isLoading,
  isConnected,
  walletAddressShort,
  isContractReady = true,
  stakedIds,
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
          Select pickaxes to equip on your miner. Press Stake in the roster when
          the pool opens — rewards do not accrue until then.
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
      ) : !isContractReady ? (
        <p className="py-6 text-center text-sm text-amber-400/90">
          VPICK contract not configured. Set{" "}
          <span className="font-mono">NEXT_PUBLIC_PICKAXE_NFT</span> on the
          server.
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
        <div className="py-6 text-center text-sm text-slate-500 space-y-2">
          <p>
            No VPICK pickaxes in this wallet on {PROJECT.network}
            {walletAddressShort ? ` (${walletAddressShort})` : ""}.
          </p>
          <p className="text-xs text-slate-600">
            Mint with the wallet that holds your NFT, or mint a new Silver
            Pickaxe for 0.01 ETH.
          </p>
        </div>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {pickaxes.map((pickaxe) => {
            const cfg = RARITY_CONFIG[pickaxe.rarity];
            const equipped = equippedIds.has(pickaxe.id);
            const isDisplay = displayPickaxeId === pickaxe.id;
            const isStaked = pickaxe.id >= 0 && stakedIds.has(pickaxe.id);

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
                    {pickaxe.tokenId} · ~{formatVenaAmount(getPickaxeDailyYield(pickaxe.rarity, pickaxe.hashrate))}/day preview
                    {equipped ? " · Selected" : ""}
                    {isStaked ? " · Staked" : ""}
                    {isDisplay ? " · In hand" : ""}
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
                    {equipped ? "Remove" : "Select"}
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
