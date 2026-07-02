"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Star, X } from "lucide-react";
import type { PickaxeNFT } from "@/lib/types";
import { RARITY_CONFIG } from "@/lib/types";
import ModalPortal from "./ModalPortal";

type PickaxePickerModalProps = {
  pickaxes: PickaxeNFT[];
  equippedIds: Set<number>;
  displayPickaxeId: number | null;
  maxStake: number;
  onClose: () => void;
  onToggle: (pickaxe: PickaxeNFT) => void;
  onSetDisplay: (id: number) => void;
};

export default function PickaxePickerModal({
  pickaxes,
  equippedIds,
  displayPickaxeId,
  maxStake,
  onClose,
  onToggle,
  onSetDisplay,
}: PickaxePickerModalProps) {
  const atCap = equippedIds.size >= maxStake;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pickaxe-picker-title"
    >
      <div className="miner-glass max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/5 p-5">
          <div>
            <p className="miner-panel-title text-[10px] uppercase tracking-[0.2em] text-[#00f0ff]/70">
              Select pickaxes to stake
            </p>
            <h2
              id="pickaxe-picker-title"
              className="miner-panel-title text-lg font-semibold text-white"
            >
              VPICK Pickaxes
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {equippedIds.size} selected · tap to add or remove · star sets robot
              hand
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-4">
          {pickaxes.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No pickaxe NFTs in your wallet. Mint a Silver Pickaxe with $VENA to
              get started.
            </p>
          ) : (
            <ul className="space-y-2">
              {pickaxes.map((pickaxe) => {
                const cfg = RARITY_CONFIG[pickaxe.rarity];
                const selected = equippedIds.has(pickaxe.id);
                const isDisplay = displayPickaxeId === pickaxe.id;
                const disabled = !selected && atCap;

                return (
                  <li key={pickaxe.id}>
                    <div
                      className={[
                        "flex w-full items-center gap-3 rounded-xl border p-3 transition-colors",
                        selected
                          ? "border-[#00f0ff]/35 bg-[#00f0ff]/8"
                          : disabled
                            ? "border-white/5 bg-black/10 opacity-60"
                            : "border-white/5 bg-black/20",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onToggle(pickaxe)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div
                          className="relative h-14 w-14 shrink-0 rounded-lg border border-white/10"
                          style={{ background: cfg.bgGradient }}
                        >
                          {pickaxe.image && (
                            <Image
                              src={pickaxe.image}
                              alt=""
                              fill
                              className="pickaxe-blend object-contain p-1"
                              sizes="56px"
                            />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="miner-panel-title truncate text-sm font-semibold text-white">
                            {pickaxe.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {pickaxe.tokenId} · {pickaxe.hashrate} V/s
                            {pickaxe.staked ? " · Staked" : ""}
                            {pickaxe.id < 0 ? " · Demo" : ""}
                          </p>
                        </div>
                        <span
                          className="shrink-0 text-[10px] uppercase tracking-wider"
                          style={{ color: selected ? "#00f0ff" : cfg.color }}
                        >
                          {selected ? "Mining" : pickaxe.rarity}
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Show in robot hand"
                        onClick={() => onSetDisplay(pickaxe.id)}
                        className={[
                          "shrink-0 rounded-lg p-2 transition-colors",
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
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/5 p-4">
          <p className="text-xs text-slate-500">
            {atCap
              ? `Cap reached (${maxStake}). Remove one to add another.`
              : `Up to ${maxStake} pickaxes can mine at once.`}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="miner-panel-title shrink-0 rounded-xl border border-[#00f0ff]/40 bg-[#00f0ff]/10 px-4 py-2 text-xs uppercase tracking-wider text-[#00f0ff] hover:bg-[#00f0ff]/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
