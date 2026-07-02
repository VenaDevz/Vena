"use client";

import Image from "next/image";
import { Pickaxe } from "lucide-react";
import type { PickaxeNFT } from "@/lib/types";
import { RARITY_CONFIG } from "@/lib/types";
import { getPickaxeDailyYield } from "../config/game-config";
import { formatVenaAmount } from "@/lib/mining";

type ActiveStakesPanelProps = {
  equippedPickaxes: PickaxeNFT[];
  displayPickaxeId: number | null;
  isMiningLive: boolean;
  onToggle: (pickaxe: PickaxeNFT) => void;
};

export default function ActiveStakesPanel({
  equippedPickaxes,
  displayPickaxeId,
  isMiningLive,
  onToggle,
}: ActiveStakesPanelProps) {
  if (equippedPickaxes.length === 0) {
    return (
      <section
        className="miner-glass rounded-2xl border border-dashed border-white/10 p-5"
        aria-label="Active stakes"
      >
        <div className="flex items-start gap-3">
          <Pickaxe className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />
          <div>
            <h2 className="miner-panel-title text-sm font-semibold text-white">
              Active stakes
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              No pickaxes selected for mining. Use Stake Pickaxes below or select from
              your wallet inventory below.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="miner-glass rounded-2xl p-5" aria-label="Active stakes">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="miner-panel-title text-[10px] uppercase tracking-[0.2em] text-[#00ff88]/70">
            Mining roster
          </p>
          <h2 className="miner-panel-title text-sm font-semibold text-white">
            {equippedPickaxes.length} active stake
            {equippedPickaxes.length === 1 ? "" : "s"}
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
          {isMiningLive ? "Live" : "Pending stake"}
        </span>
      </div>

      <ul className="space-y-2">
        {equippedPickaxes.map((pickaxe) => {
          const cfg = RARITY_CONFIG[pickaxe.rarity];
          const inHand = displayPickaxeId === pickaxe.id;

          return (
            <li
              key={pickaxe.id}
              className="flex items-center gap-3 rounded-xl border border-[#00ff88]/15 bg-[#00ff88]/5 p-3"
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
                  {pickaxe.staked ? " · On-chain staked" : " · Awaiting on-chain stake"}
                  {inHand ? " · In robot hand" : ""}
                  {" · ~"}
                  {formatVenaAmount(
                    getPickaxeDailyYield(pickaxe.rarity, pickaxe.hashrate)
                  )}
                  /day
                </p>
              </div>
              <button
                type="button"
                onClick={() => onToggle(pickaxe)}
                className="miner-panel-title shrink-0 rounded-lg border border-[#7000ff]/35 px-2 py-1.5 text-[10px] uppercase tracking-wider text-[#7000ff] hover:bg-[#7000ff]/10"
              >
                Remove
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
