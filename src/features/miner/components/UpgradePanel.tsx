"use client";

import { useEffect, useState } from "react";
import {
  GAME_CONFIG,
  formatDuration,
  formatVena,
  getUpgradeCostVena,
} from "../config/game-config";
import { useMinerStore } from "../store/miner-store";

type UpgradePanelProps = {
  balanceVena: number;
  onStartUpgrade: (cost: number) => void;
  onSkipUpgrade: (cost: number) => void;
  onUpgradeComplete: () => void;
  onNotify: (message: string) => void;
  isPaying: boolean;
};

export default function UpgradePanel({
  balanceVena,
  onStartUpgrade,
  onSkipUpgrade,
  onUpgradeComplete,
  onNotify,
  isPaying,
}: UpgradePanelProps) {
  const level = useMinerStore((s) => s.level);
  const upgradeEndsAt = useMinerStore((s) => s.upgradeEndsAt);
  const [now, setNow] = useState(Date.now());

  const pricingEnabled = GAME_CONFIG.upgrade.pricingEnabled;
  const isUpgrading = upgradeEndsAt !== null && upgradeEndsAt > now;
  const remainingMs = isUpgrading ? upgradeEndsAt - now : 0;
  const nextCost = getUpgradeCostVena(level);
  
  const totalDuration = GAME_CONFIG.upgrade.durationMs;
  const skipCost = isUpgrading 
    ? Math.max(0, Math.ceil((remainingMs / totalDuration) * nextCost))
    : 0;

  useEffect(() => {
    if (!isUpgrading) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isUpgrading]);

  useEffect(() => {
    if (upgradeEndsAt !== null && upgradeEndsAt <= now) {
      onUpgradeComplete();
    }
  }, [now, upgradeEndsAt, onUpgradeComplete]);

  const handleStart = () => {
    if (!pricingEnabled) {
      onNotify("Level upgrade pricing coming soon");
      return;
    }
    if (isUpgrading) return;
    if (balanceVena < nextCost) {
      onNotify("Insufficient balance");
      return;
    }
    if (isPaying) return;
    onStartUpgrade(nextCost);
  };

  const handleSkip = () => {
    if (!pricingEnabled) return;
    if (!isUpgrading) return;
    if (balanceVena < skipCost) {
      onNotify("Insufficient balance");
      return;
    }
    if (isPaying) return;
    onSkipUpgrade(skipCost);
  };

  return (
    <section className="miner-glass rounded-2xl p-5" aria-label="Level upgrade">
      <div className="mb-4">
        <p className="miner-panel-title text-[10px] uppercase tracking-[0.2em] text-[#7000ff]/80">
          Development
        </p>
        <h2 className="miner-panel-title text-sm font-semibold text-white">
          Level upgrade
        </h2>
      </div>

      <div className="rounded-xl border border-white/5 bg-black/25 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Current level</span>
          <span className="miner-panel-title font-semibold text-white">
            {level}
          </span>
        </div>
        {pricingEnabled ? (
          <>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-500">Next upgrade</span>
              <span className="font-medium text-[#00f0ff]">
                {formatVena(nextCost)} VENA
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-500">Duration</span>
              <span className="text-slate-400">4 hours</span>
            </div>
          </>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            Upgrade pricing is not set yet — character levels unlock soon.
          </p>
        )}
      </div>

      {isUpgrading && (
        <div className="mt-4 rounded-xl border border-[#7000ff]/30 bg-[#7000ff]/10 p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            Time remaining
          </p>
          <p className="miner-panel-title mt-1 text-3xl font-bold tabular-nums text-[#7000ff]">
            {formatDuration(remainingMs)}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleStart}
          disabled={!pricingEnabled || isUpgrading || isPaying}
          className="miner-panel-title flex-1 rounded-xl border border-[#00f0ff]/40 bg-[#00f0ff]/10 py-3 text-sm font-semibold text-[#00f0ff] transition-colors hover:bg-[#00f0ff]/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pricingEnabled ? (isPaying ? "Processing Tx..." : "Upgrade level") : "Coming soon"}
        </button>
        {pricingEnabled && (
          <button
            type="button"
            onClick={handleSkip}
            disabled={!isUpgrading || isPaying}
            className="miner-panel-title flex-1 rounded-xl border border-white/20 bg-white/5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPaying ? "Processing..." : `Finish now (${formatVena(skipCost)} VENA)`}
          </button>
        )}
      </div>
    </section>
  );
}
