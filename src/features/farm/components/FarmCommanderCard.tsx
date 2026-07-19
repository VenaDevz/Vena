"use client";

import Image from "next/image";

type FarmCommanderCardProps = {
  rate: number;
  rateMultiplier: number;
  vpickCount: number;
  onRally: () => void;
  rallyActive: boolean;
  rallyOnCooldown: boolean;
  rallyRemaining: number;
  rallyCooldownRemaining: number;
  rallyBoost: number;
};

export default function FarmCommanderCard({
  rate,
  rateMultiplier,
  vpickCount,
  onRally,
  rallyActive,
  rallyOnCooldown,
  rallyRemaining,
  rallyCooldownRemaining,
  rallyBoost,
}: FarmCommanderCardProps) {
  const cooldownPct = rallyOnCooldown
    ? Math.max(0, Math.min(100, (rallyCooldownRemaining / 180) * 100))
    : 0;

  return (
    <div className="farm-cmd-card">
      <div className="farm-cmd-header">
        <div className="farm-cmd-avatar">
          <Image
            src="/miner/robot-silver.png"
            alt="Commander"
            width={64}
            height={64}
            className={rallyActive ? "farm-cmd-avatar-live" : ""}
            style={{ width: "auto", height: "auto" }}
          />
        </div>
        <div>
          <p className="farm-hud-stat text-sm font-bold text-white">Commander</p>
          <p className="text-[10px] uppercase tracking-widest text-[#00d4ff]">
            VENA Mine Ops
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        Your robot runs the base. Tap <strong className="text-[#00ff88]">Rally</strong> to
        push the crew into overdrive — <strong className="text-white">{rallyBoost}× crystal</strong> for
        30 seconds.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="farm-cmd-stat">
          <span className="farm-cmd-stat-label">Output</span>
          <span className="farm-cmd-stat-value farm-hud-rate">+{rate.toFixed(1)}/s</span>
        </div>
        <div className="farm-cmd-stat">
          <span className="farm-cmd-stat-label">Multiplier</span>
          <span className="farm-cmd-stat-value farm-hud-crystal">
            {rateMultiplier.toFixed(rateMultiplier % 1 ? 2 : 0)}×
          </span>
        </div>
      </div>

      {vpickCount > 0 && (
        <p className="mt-2 text-[10px] text-[#b98bff]">
          VPICK holder bonus active (+10%)
        </p>
      )}

      <button
        type="button"
        onClick={onRally}
        disabled={rallyOnCooldown}
        className={`farm-cmd-rally-btn ${rallyActive ? "farm-cmd-rally-on" : ""}`}
      >
        {rallyActive
          ? `⚡ RALLY ACTIVE · ${rallyRemaining}s`
          : rallyOnCooldown
            ? `Recharging · ${rallyCooldownRemaining}s`
            : `⚡ Rally — ${rallyBoost}× for 30s`}
      </button>

      {rallyOnCooldown && !rallyActive && (
        <div className="farm-cmd-cd-track">
          <div className="farm-cmd-cd-fill" style={{ width: `${100 - cooldownPct}%` }} />
        </div>
      )}
    </div>
  );
}
