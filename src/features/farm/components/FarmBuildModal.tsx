"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  FARM_BUILDABLE,
  FARM_BUILDING_MAP,
  FARM_DEMO_MODE,
  buildingRateText,
  type FarmBuildingId,
} from "../config/farm-config";

type FarmBuildModalProps = {
  cellIndex: number;
  onClose: () => void;
  onBuild: (buildingId: FarmBuildingId) => void;
  isPaying: boolean;
  balanceVena: number;
};

export default function FarmBuildModal({
  cellIndex,
  onClose,
  onBuild,
  isPaying,
  balanceVena,
}: FarmBuildModalProps) {
  const [selected, setSelected] = useState<FarmBuildingId>("mine_shaft_1");
  const selectedDef = FARM_BUILDING_MAP[selected];
  // VENA-priced buildings are gated here; Crystal-priced ones are validated in
  // the hook (which shows an error if you can't afford it).
  const canAfford = FARM_DEMO_MODE || selectedDef.costVena === 0 || balanceVena >= selectedDef.costVena;

  return (
    <div
      className="farm-bazaar-modal-overlay"
      role="dialog"
      aria-modal
      aria-labelledby="farm-build-title"
      onClick={onClose}
    >
      <div className="w-full max-w-sm p-5 sm:rounded-xl bg-[#080b10] border border-white/10 shadow-[0_0_40px_rgba(0,212,255,0.1)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 id="farm-build-title" className="text-lg font-bold text-white">
              Build on plot {cellIndex + 1}
            </h2>
            <p className="text-xs text-slate-500">
              {FARM_DEMO_MODE
                ? "Builds are free, no wallet tx."
                : "Pay $VENA to treasury — funds protocol buybacks."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <ul className="mb-4 max-h-64 space-y-2 overflow-y-auto">
          {FARM_BUILDABLE.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => setSelected(b.id)}
                className={`w-full rounded-xl border p-3 text-left transition-colors ${
                  selected === b.id
                    ? "border-[#00ff88]/50 bg-[#00ff88]/8"
                    : "border-white/8 hover:border-[#00d4ff]/35 bg-black/20"
                }`}
              >
                <div className="flex justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{b.name}</span>
                  <span className="shrink-0 text-xs font-mono font-bold">
                    {b.costVena > 0 ? (
                      <span className="text-[#00d4ff] drop-shadow-[0_0_5px_rgba(0,212,255,0.6)]">
                        {b.costVena.toLocaleString("en-US")} VENA
                        {FARM_DEMO_MODE && <span className="ml-1 text-slate-500 line-through text-[9px] font-sans opacity-70">(FREE)</span>}
                      </span>
                    ) : (
                      <span className="text-[#00ff88] drop-shadow-[0_0_5px_rgba(0,255,136,0.5)]">
                        💎 {(b.costCrystal ?? 0).toLocaleString("en-US")}
                        {FARM_DEMO_MODE && <span className="ml-1 text-slate-500 line-through text-[9px] font-sans opacity-70">(FREE)</span>}
                      </span>
                    )}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{b.description}</p>
                <p className="mt-1 text-[10px] font-mono text-[#00ff88]">
                  {buildingRateText(b)}
                </p>
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          disabled={isPaying || !canAfford}
          onClick={() => onBuild(selected)}
          className={`w-full py-3 text-sm uppercase tracking-wider ${FARM_DEMO_MODE ? "farm-btn-demo farm-btn-primary" : "farm-btn-primary"}`}
        >
          {isPaying
            ? "Confirm in wallet…"
            : FARM_DEMO_MODE
              ? `Build ${selectedDef.name} (Demo)`
              : selectedDef.costVena > 0
                ? `Build — ${selectedDef.costVena.toLocaleString("en-US")} VENA`
                : `Build — ${(selectedDef.costCrystal ?? 0).toLocaleString("en-US")} Crystal`}
        </button>
      </div>
    </div>
  );
}
