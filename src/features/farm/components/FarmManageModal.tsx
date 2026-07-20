"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Trash2, RefreshCw, ChevronUp } from "lucide-react";
import {
  FARM_BUILDABLE,
  FARM_BUILDING_MAP,
  FARM_DEMO_MODE,
  FARM_MAX_LEVEL,
  RESOURCE_META,
  buildingRateText,
  levelRate,
  upgradeCost,
  type FarmBuildingId,
} from "../config/farm-config";
import type { ResourceStockpile } from "../lib/farm-storage";

type Mode = "info" | "rebuild";

type FarmManageModalProps = {
  cellIndex: number;
  currentBuildingId: FarmBuildingId;
  currentLevel: number;
  crystal: number;
  resources: ResourceStockpile;
  balanceVena: number;
  isPaying: boolean;
  onClose: () => void;
  onDemolish: () => void;
  onUpgrade: () => void;
  onReplace: (buildingId: FarmBuildingId) => void;
};

const DEMOLISH_COST = FARM_DEMO_MODE ? 0 : 500;

export default function FarmManageModal({
  cellIndex,
  currentBuildingId,
  currentLevel,
  crystal,
  resources,
  balanceVena,
  isPaying,
  onClose,
  onDemolish,
  onUpgrade,
  onReplace,
}: FarmManageModalProps) {
  const [mode, setMode] = useState<Mode>("info");
  const [selected, setSelected] = useState<FarmBuildingId>(currentBuildingId);
  const [confirming, setConfirming] = useState(false);

  const current = FARM_BUILDING_MAP[currentBuildingId];
  const selectedDef = FARM_BUILDING_MAP[selected];
  const canDemolish = FARM_DEMO_MODE || crystal >= DEMOLISH_COST;
  const canAffordSelected = FARM_DEMO_MODE || balanceVena >= selectedDef.costVena;

  const level = currentLevel || 1;
  const cost = upgradeCost(current, level);
  const isMaxed = level >= FARM_MAX_LEVEL;

  const outNow = current.consumesPerSec != null || current.ratePerSec > 0
    ? levelRate(current.ratePerSec, level)
    : levelRate(current.crystalPerSec, level);
  const outNext = current.consumesPerSec != null || current.ratePerSec > 0
    ? levelRate(current.ratePerSec, level + 1)
    : levelRate(current.crystalPerSec, level + 1);

  const resMeta = RESOURCE_META[current.produces];
  const resStock =
    cost?.resource && cost.resource.type !== "crystal"
      ? (resources[cost.resource.type as "ore" | "iron" | "gold"] ?? 0)
      : Infinity;

  const milestoneVena = cost?.milestone && !FARM_DEMO_MODE ? cost.vena : 0;
  const canAffordUpgrade =
    cost != null &&
    crystal >= cost.crystal &&
    (!cost.resource || cost.resource.type === "crystal" || resStock >= cost.resource.amount) &&
    (milestoneVena === 0 || balanceVena >= milestoneVena);

  const handleDemolish = () => {
    if (!confirming) { setConfirming(true); return; }
    onDemolish();
    onClose();
  };

  const handleUpgrade = () => {
    onUpgrade();
    // keep modal open so player can chain upgrades
  };

  const handleReplace = () => {
    onReplace(selected);
    onClose();
  };

  return (
    <div
      className="farm-bazaar-modal-overlay"
      role="dialog"
    >
      <div className="w-full max-w-sm p-5 sm:rounded-xl bg-[#080b10] border border-white/10 shadow-[0_0_40px_rgba(0,212,255,0.1)]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">
              Plot {cellIndex + 1}
            </p>
            <h2 id="farm-manage-title" className="text-base font-bold text-white">
              {mode === "info" ? "Manage Building" : "Replace Building"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-white" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => { setMode("info"); setConfirming(false); }}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
              mode === "info"
                ? "bg-[#00d4ff]/15 border border-[#00d4ff]/40 text-[#00d4ff] shadow-[0_0_12px_rgba(0,212,255,0.15)]"
                : "border border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/5"
            }`}
          >
            Upgrade
          </button>
          <button
            type="button"
            onClick={() => { setMode("rebuild"); setConfirming(false); }}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold uppercase tracking-wider transition-all ${
              mode === "rebuild"
                ? "bg-[#00d4ff]/15 border border-[#00d4ff]/40 text-[#00d4ff] shadow-[0_0_12px_rgba(0,212,255,0.15)]"
                : "border border-white/5 text-slate-500 hover:text-slate-300 hover:bg-white/5"
            }`}
          >
            <RefreshCw size={12} className="mr-1.5 inline" />
            Replace
          </button>
        </div>

        {/* Info + Upgrade panel */}
        {mode === "info" && (
          <>
            <div className="mb-4 flex items-center gap-4 rounded-xl border border-white/8 bg-black/25 p-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-black/40 p-1">
                <Image
                  src={current.image}
                  alt={current.name}
                  fill
                  sizes="80px"
                  className="object-contain p-1"
                  style={{ filter: current.tint }}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-white">{current.name}</p>
                  <span className="shrink-0 rounded-md bg-[#00d4ff]/15 border border-[#00d4ff]/40 px-1.5 py-0.5 text-[10px] font-bold text-[#00d4ff]">
                    Lv.{level}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">{current.description}</p>
                <div className="mt-3 rounded-lg bg-black/40 p-2 border border-white/5">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-slate-400 uppercase tracking-wider text-[9px]">Production Rate</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-[#00ff88] flex items-center gap-1.5">
                      <Image src={resMeta.image} alt={resMeta.label} width={14} height={14} className="object-contain" style={{ filter: `drop-shadow(0 0 5px ${resMeta.color})` }} />
                      {current.produces === "prime_crystal" ? (outNow || 0).toFixed(3) : (outNow || 0).toFixed(1)}/s
                    </span>
                    {!isMaxed && (
                      <>
                        <ChevronUp size={12} className="text-slate-500" />
                        <span className="font-mono text-yellow-300 flex items-center gap-1.5">
                          <Image src={resMeta.image} alt={resMeta.label} width={14} height={14} className="object-contain opacity-80" />
                          {current.produces === "prime_crystal" ? (outNext || 0).toFixed(3) : (outNext || 0).toFixed(1)}/s
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Level track */}
            <div className="mb-4">
              <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wider text-slate-500">
                <span>Level {level}</span>
                <span>Max {FARM_MAX_LEVEL}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00d4ff] to-[#00ff88] transition-all"
                  style={{ width: `${(level / FARM_MAX_LEVEL) * 100}%` }}
                />
              </div>
            </div>

            {/* Upgrade button */}
            {isMaxed ? (
              <div className="mb-3 rounded-xl border border-yellow-500/40 bg-yellow-900/15 p-3 text-center text-sm font-bold text-yellow-300">
                ★ Max level reached
              </div>
            ) : cost ? (
              <button
                type="button"
                disabled={!canAffordUpgrade || isPaying}
                onClick={handleUpgrade}
                className="farm-btn-primary mb-3 w-full py-3 text-sm font-bold uppercase tracking-wider disabled:opacity-40"
              >
                <ChevronUp size={15} className="mr-1.5 inline" />
                {isPaying && milestoneVena > 0 ? "Confirming…" : `Upgrade to Lv.${level + 1}`}
                <span className="ml-2 text-[13px] font-normal opacity-90" style={{ fontFamily: '"Futura", sans-serif', fontWeight: 300 }}>
                  💎 {cost.crystal.toLocaleString("en-US")}
                  {cost.resource && cost.resource.type !== "crystal" && (
                    <> · <Image src={RESOURCE_META[cost.resource.type].image} alt="" width={12} height={12} className="inline object-contain relative -top-[1px]" style={cost.resource.type === "prime_crystal" ? { filter: "hue-rotate(260deg)" } : {}} /> {cost.resource.amount.toLocaleString("en-US")}</>
                  )}
                  {milestoneVena > 0 && (
                    <> · {milestoneVena.toLocaleString("en-US")} VENA</>
                  )}
                </span>
              </button>
            ) : null}

            {cost?.milestone && !isMaxed && (
              <p className="mb-3 -mt-1 text-center text-[10px] text-yellow-400/80">
                ★ Milestone upgrade — visual tier boost
              </p>
            )}

            {confirming ? (
              <div className="mb-3 rounded-xl border border-red-500/40 bg-red-900/20 p-3 text-center">
                <p className="text-sm font-bold text-red-300">Confirm demolish?</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {FARM_DEMO_MODE ? "Free demolish." : `Costs ${DEMOLISH_COST} CRYSTAL. Building is lost.`}
                </p>
              </div>
            ) : null}

            <button
              type="button"
              disabled={!canDemolish}
              onClick={handleDemolish}
              className={`w-full rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition-colors
                ${confirming
                  ? "bg-red-600 text-white hover:bg-red-500"
                  : "border border-red-500/40 bg-red-900/15 text-red-400 hover:bg-red-900/35 disabled:opacity-40"
                }`}
            >
              <Trash2 size={13} className="mr-2 inline" />
              {confirming
                ? "Yes, demolish"
                : FARM_DEMO_MODE
                  ? "Demolish (free)"
                  : `Demolish — ${DEMOLISH_COST} CRYSTAL`}
            </button>
          </>
        )}

        {/* Replace panel */}
        {mode === "rebuild" && (
          <>
            <p className="mb-2 text-xs text-slate-500">
              Pick a new building. Current one will be demolished first (level resets to 1).
            </p>
            <ul className="mb-4 max-h-52 space-y-2 overflow-y-auto">
              {FARM_BUILDABLE.filter((b) => b.id !== currentBuildingId).map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(b.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      selected === b.id
                        ? "border-[#7000ff]/50 bg-[#7000ff]/10"
                        : "border-white/8 hover:border-[#00d4ff]/35 bg-black/20"
                    }`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{b.name}</span>
                      <span className="shrink-0 font-mono text-xs text-[#00d4ff]">
                        {FARM_DEMO_MODE ? (
                          <span className="text-[#7000ff]">FREE</span>
                        ) : b.costVena > 0 ? (
                          <>{b.costVena.toLocaleString("en-US")} VENA</>
                        ) : (
                          <span className="text-[#00ff88]">💎 {(b.costCrystal ?? 0).toLocaleString("en-US")}</span>
                        )}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-500">{b.description}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-[#00ff88]">{buildingRateText(b)}</p>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={isPaying || !canAffordSelected || !canDemolish}
              onClick={handleReplace}
              className="farm-btn-primary w-full py-3 text-sm uppercase tracking-wider disabled:opacity-40"
            >
              {isPaying
                ? "Confirming…"
                : FARM_DEMO_MODE
                  ? `Replace with ${selectedDef.name}`
                  : selectedDef.costVena > 0
                    ? `Replace — ${selectedDef.costVena.toLocaleString("en-US")} VENA`
                    : `Replace — ${(selectedDef.costCrystal ?? 0).toLocaleString("en-US")} Crystal`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
