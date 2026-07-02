"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { formatVena, getSlotUnlockCostVena } from "../config/game-config";
import ModalPortal from "./ModalPortal";

type UnlockSlotModalProps = {
  slotIndex: number;
  slotLabel: string;
  balanceVena: number;
  onClose: () => void;
  onConfirm: () => void;
};

export default function UnlockSlotModal({
  slotIndex,
  slotLabel,
  balanceVena,
  onClose,
  onConfirm,
}: UnlockSlotModalProps) {
  const cost = getSlotUnlockCostVena(slotIndex);
  const canAfford = cost !== null && balanceVena >= cost;

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
      aria-labelledby="unlock-slot-title"
    >
      <div className="miner-glass w-full max-w-sm rounded-2xl p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="miner-panel-title text-[10px] uppercase tracking-[0.2em] text-[#7000ff]">
              Unlock slot
            </p>
            <h2
              id="unlock-slot-title"
              className="miner-panel-title mt-1 text-lg font-semibold text-white"
            >
              {slotLabel}
            </h2>
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

        <p className="text-sm text-slate-400">
          Permanently unlock this equipment slot for your miner unit.
        </p>

        <div className="mt-4 rounded-xl border border-[#00f0ff]/20 bg-[#00f0ff]/5 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-slate-500">Cost</p>
          <p className="miner-panel-title text-xl font-bold text-[#00f0ff]">
            {cost === null ? "Coming soon" : `${formatVena(cost)} VENA`}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Balance: {formatVena(balanceVena)} VENA
          </p>
        </div>

        {!canAfford && (
          <p className="mt-3 text-sm font-medium text-red-400">Insufficient balance</p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canAfford}
            className="miner-panel-title flex-1 rounded-xl border border-[#00f0ff]/40 bg-[#00f0ff]/10 py-2.5 text-sm font-semibold text-[#00f0ff] transition-colors hover:bg-[#00f0ff]/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Unlock
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
