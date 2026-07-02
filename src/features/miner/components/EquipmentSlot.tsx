"use client";

import { Lock, Plus } from "lucide-react";
import type { PickaxeNFT } from "@/lib/types";
import type { StoreItem } from "../config/game-config";

export type SlotState = "open-empty" | "open-filled" | "locked";

type EquipmentSlotProps = {
  label: string;
  state: SlotState;
  equippedPickaxe?: PickaxeNFT | null;
  equippedAccessory?: StoreItem | null;
  onClick?: () => void;
  /** Tighter footprint for the miner chassis stage */
  variant?: "default" | "compact";
};

export default function EquipmentSlot({
  label,
  state,
  equippedPickaxe,
  equippedAccessory,
  onClick,
  variant = "default",
}: EquipmentSlotProps) {
  const isLocked = state === "locked";
  const isEmpty = state === "open-empty";
  const isFilled = state === "open-filled";
  const fillLabel =
    equippedPickaxe?.rarity ?? equippedAccessory?.name?.split(" ")[0];
  const compact = variant === "compact";

  return (
    <div className={["flex flex-col items-center", compact ? "gap-1" : "gap-2"].join(" ")}>
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        aria-label={`${label}${isLocked ? " — locked" : equippedPickaxe ? ` — ${equippedPickaxe.name}` : ""}`}
        className={[
          "group",
          onClick ? "cursor-pointer" : "cursor-default",
        ].join(" ")}
      >
        <div
          className={[
            "relative flex flex-col items-center justify-center rounded-xl transition-all duration-300",
            "border backdrop-blur-md px-1",
            compact ? "h-11 w-11 bg-[#0a0a0f]/90 shadow-lg" : "h-14 w-14 sm:h-16 sm:w-16",
            isLocked
              ? "border-white/10 bg-black/40 opacity-70 hover:opacity-90"
              : isEmpty
                ? "border-[#00f0ff]/35 bg-[#00f0ff]/5 hover:border-[#00f0ff]/70 hover:bg-[#00f0ff]/10 hover:shadow-[0_0_24px_rgba(0,240,255,0.25)]"
                : "border-[#7000ff]/50 bg-[#7000ff]/10 shadow-[0_0_20px_rgba(112,0,255,0.2)]",
          ].join(" ")}
        >
          <span className={["absolute left-1 top-1 border-l border-t border-[#00f0ff]/50", compact ? "h-1.5 w-1.5" : "h-2 w-2"].join(" ")} />
          <span className={["absolute right-1 top-1 border-r border-t border-[#00f0ff]/50", compact ? "h-1.5 w-1.5" : "h-2 w-2"].join(" ")} />
          <span className={["absolute bottom-1 left-1 border-b border-l border-[#7000ff]/50", compact ? "h-1.5 w-1.5" : "h-2 w-2"].join(" ")} />
          <span className={["absolute bottom-1 right-1 border-b border-r border-[#7000ff]/50", compact ? "h-1.5 w-1.5" : "h-2 w-2"].join(" ")} />

          {isLocked ? (
            <Lock className={["text-slate-500 group-hover:text-[#7000ff] transition-colors", compact ? "h-3.5 w-3.5" : "h-4 w-4 sm:h-5 sm:w-5"].join(" ")} />
          ) : isEmpty ? (
            <Plus className={["text-[#00f0ff]/60 group-hover:text-[#00f0ff] transition-colors", compact ? "h-4 w-4" : "h-5 w-5 sm:h-6 sm:w-6"].join(" ")} />
          ) : isFilled && fillLabel ? (
            <span className={["text-center font-medium leading-tight text-[#00f0ff] px-0.5", compact ? "text-[7px]" : "text-[8px] sm:text-[9px]"].join(" ")}>
              {fillLabel}
            </span>
          ) : null}
        </div>
      </button>
      <span className={["miner-panel-title whitespace-nowrap uppercase tracking-[0.16em] text-slate-500", compact ? "text-[8px]" : "text-[9px] sm:text-[10px]"].join(" ")}>
        {label}
      </span>
    </div>
  );
}
