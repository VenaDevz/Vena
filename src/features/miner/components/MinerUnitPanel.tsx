"use client";

import { useState } from "react";
import { Pickaxe } from "lucide-react";
import EquipmentSlot, { type SlotState } from "./EquipmentSlot";
import UnlockSlotModal from "./UnlockSlotModal";
import PickaxePickerModal from "./PickaxePickerModal";
import RobotFigure from "./RobotFigure";
import type { PickaxeNFT } from "@/lib/types";
import { RARITY_CONFIG } from "@/lib/types";
import {
  GAME_CONFIG,
  SLOT_DEFINITIONS,
  type StoreItem,
  getSlotUnlockCostVena,
  isSlotUnlockable,
  resolveDisplayPickaxe,
  type DisplayPickaxeMode,
} from "../config/game-config";
import { isDemoPickaxeEnabled } from "../config/demo-pickaxes";

type MinerUnitPanelProps = {
  walletPickaxes: PickaxeNFT[];
  balanceVena: number;
  unlockedSlots: boolean[];
  equippedPickaxes: PickaxeNFT[];
  equippedPickaxeIds: Set<number>;
  accessoryBySlot: Record<number, StoreItem | null>;
  displayMode: DisplayPickaxeMode;
  displayPickaxeId: number | null;
  isMiningLive: boolean;
  onUnlockSlot: (slotIndex: number) => boolean;
  onTogglePickaxe: (pickaxe: PickaxeNFT) => void;
  onSetDisplayPickaxe: (id: number) => void;
  onNotify: (message: string) => void;
};

function accessorySlotState(
  slotIndex: number,
  unlockedSlots: boolean[],
  accessoryBySlot: Record<number, StoreItem | null>
): SlotState {
  if (!unlockedSlots[slotIndex]) return "locked";
  return accessoryBySlot[slotIndex] ? "open-filled" : "open-empty";
}

export default function MinerUnitPanel({
  walletPickaxes,
  balanceVena,
  unlockedSlots,
  equippedPickaxes,
  equippedPickaxeIds,
  accessoryBySlot,
  displayMode,
  displayPickaxeId,
  isMiningLive,
  onUnlockSlot,
  onTogglePickaxe,
  onSetDisplayPickaxe,
  onNotify,
}: MinerUnitPanelProps) {
  const [pendingUnlock, setPendingUnlock] = useState<number | null>(null);
  const [pickaxePickerOpen, setPickaxePickerOpen] = useState(false);

  const displayPickaxe = resolveDisplayPickaxe(
    walletPickaxes,
    equippedPickaxes,
    displayMode,
    displayPickaxeId
  );

  const topSlot = SLOT_DEFINITIONS.find((s) => s.position === "top")!;
  const rightSlot = SLOT_DEFINITIONS.find((s) => s.position === "right")!;

  const handleAccessoryClick = (slotIndex: number) => {
    if (!unlockedSlots[slotIndex]) {
      if (!isSlotUnlockable(slotIndex)) {
        onNotify("Accessory slots unlock soon — cost in $VENA TBD");
        return;
      }
      setPendingUnlock(slotIndex);
      return;
    }
    onNotify("Equip accessories from the shop panel");
  };

  const handleConfirmUnlock = () => {
    if (pendingUnlock === null) return;
    const cost = getSlotUnlockCostVena(pendingUnlock);
    if (cost === null) {
      onNotify("This slot is not unlockable yet");
      setPendingUnlock(null);
      return;
    }
    if (balanceVena < cost) {
      onNotify("Insufficient balance");
      return;
    }
    const ok = onUnlockSlot(pendingUnlock);
    if (ok) {
      onNotify(`Slot unlocked for ${cost} VENA`);
      setPendingUnlock(null);
    }
  };

  const unlockedCount = unlockedSlots.filter(Boolean).length;
  const hasEquipped = equippedPickaxes.length > 0;
  const displayColor = displayPickaxe
    ? RARITY_CONFIG[displayPickaxe.rarity].color
    : "#00f0ff";

  return (
    <>
      <section
        className="miner-unit-panel miner-glass flex h-[40rem] w-full flex-col overflow-hidden rounded-2xl sm:h-[42rem]"
        aria-label="Miner unit and equipment"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <div>
            <p className="miner-panel-title text-[10px] uppercase tracking-[0.22em] text-[#00f0ff]/60">
              Unit · MK-0
            </p>
            <h2 className="miner-panel-title text-sm font-semibold text-white">
              Miner Chassis
            </h2>
          </div>
          <div
            className={[
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider",
              isMiningLive
                ? "bg-[#00ff88]/12 text-[#00ff88]"
                : hasEquipped
                  ? "bg-amber-500/12 text-amber-400"
                  : "bg-white/5 text-slate-500",
            ].join(" ")}
          >
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                isMiningLive ? "animate-pulse bg-[#00ff88]" : hasEquipped ? "bg-amber-400" : "bg-slate-500",
              ].join(" ")}
            />
            {isMiningLive ? "Mining" : hasEquipped ? "Staked" : "Idle"}
          </div>
        </div>

        {/* Accessory dock */}
        <div className="flex shrink-0 items-center justify-center gap-10 border-b border-white/[0.04] px-4 py-3">
          <EquipmentSlot
            label={topSlot.label}
            state={accessorySlotState(topSlot.slotIndex, unlockedSlots, accessoryBySlot)}
            variant="compact"
            equippedAccessory={accessoryBySlot[topSlot.slotIndex]}
            onClick={() => handleAccessoryClick(topSlot.slotIndex)}
          />
          <EquipmentSlot
            label={rightSlot.label}
            state={accessorySlotState(rightSlot.slotIndex, unlockedSlots, accessoryBySlot)}
            variant="compact"
            equippedAccessory={accessoryBySlot[rightSlot.slotIndex]}
            onClick={() => handleAccessoryClick(rightSlot.slotIndex)}
          />
        </div>

        {/* Robot arena — hero */}
        <div className="miner-arena relative flex min-h-0 flex-1 flex-col items-center justify-end overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[10%] bg-[radial-gradient(ellipse_80%_70%_at_50%_100%,rgba(0,240,255,0.14)_0%,transparent_68%)]" aria-hidden />
          <div className="miner-robot-stage relative z-[1] h-full w-full max-w-none px-1 pb-1 pt-2">
            <div
              className="miner-robot-platform pointer-events-none absolute bottom-[3%] left-1/2 z-0 h-[9%] w-[70%] -translate-x-1/2 rounded-[100%]"
              aria-hidden
            />
            <RobotFigure displayPickaxe={displayPickaxe} />
          </div>
          {displayPickaxe && (
            <p
              className="pointer-events-none absolute bottom-3 left-1/2 z-[2] max-w-[90%] -translate-x-1/2 truncate text-center text-[10px] uppercase tracking-[0.2em]"
              style={{ color: `${displayColor}99` }}
            >
              {displayPickaxe.name}
            </p>
          )}
        </div>

        {/* Pickaxe bay — primary action */}
        <div className="shrink-0 px-4 pb-3 pt-2">
          <button
            type="button"
            onClick={() => setPickaxePickerOpen(true)}
            className="group flex w-full items-center gap-3 rounded-xl border border-[#00f0ff]/25 bg-gradient-to-r from-[#00f0ff]/8 to-[#7000ff]/8 px-4 py-3 text-left transition-all hover:border-[#00f0ff]/45 hover:from-[#00f0ff]/12 hover:to-[#7000ff]/12 hover:shadow-[0_0_32px_rgba(0,240,255,0.12)]"
            aria-label="Select mining pickaxes"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#00f0ff]/30 bg-[#00f0ff]/10">
              <Pickaxe className="h-5 w-5 text-[#00f0ff]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="miner-panel-title text-xs font-semibold uppercase tracking-wider text-white">
                Stake Pickaxes
              </p>
              <p className="truncate text-[11px] text-slate-500">
                {equippedPickaxes.length === 0
                  ? "Select pickaxes to stake for mining"
                  : displayPickaxe
                    ? `${equippedPickaxes.length} staked · ${displayPickaxe.rarity} in hand`
                    : `${equippedPickaxes.length} pickaxe${equippedPickaxes.length === 1 ? "" : "s"} staked`}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="miner-panel-title text-xl font-bold tabular-nums text-[#00f0ff]">
                {equippedPickaxes.length}
              </p>
              <p className="text-[9px] uppercase tracking-wider text-slate-600">
                active
              </p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap justify-center gap-x-5 gap-y-1 border-t border-white/[0.06] px-4 py-2.5 text-[10px] text-slate-500">
          <span>Slots {unlockedCount}/{SLOT_DEFINITIONS.length}</span>
          <span>
            Wallet {walletPickaxes.length}
            {isDemoPickaxeEnabled() ? " · demo" : ""}
          </span>
        </div>
      </section>

      {pendingUnlock !== null && (
        <UnlockSlotModal
          slotIndex={pendingUnlock}
          slotLabel={SLOT_DEFINITIONS[pendingUnlock]?.label ?? "Slot"}
          balanceVena={balanceVena}
          onClose={() => setPendingUnlock(null)}
          onConfirm={handleConfirmUnlock}
        />
      )}

      {pickaxePickerOpen && (
        <PickaxePickerModal
          pickaxes={walletPickaxes}
          equippedIds={equippedPickaxeIds}
          displayPickaxeId={displayPickaxeId}
          maxStake={GAME_CONFIG.pickaxes.maxMiningStake}
          onClose={() => setPickaxePickerOpen(false)}
          onToggle={(pickaxe) => onTogglePickaxe(pickaxe)}
          onSetDisplay={onSetDisplayPickaxe}
        />
      )}
    </>
  );
}
