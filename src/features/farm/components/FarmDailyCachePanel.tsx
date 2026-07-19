"use client";

import { useEffect, useState } from "react";
import { Gift, Sparkles } from "lucide-react";
import { formatCountdown } from "../config/farm-daily-cache";
import type { CacheReward } from "../config/farm-daily-cache";
import { vpickCacheBonusPercent, type VpickTier } from "../config/farm-config";

type Props = {
  available: boolean;
  preview: CacheReward | null;
  countdownMs: number;
  vpickTier: VpickTier;
  onClaim: () => void;
};

export default function FarmDailyCachePanel({
  available,
  preview,
  countdownMs,
  vpickTier,
  onClaim,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const cacheBonusPct = vpickCacheBonusPercent(vpickTier);

  return (
    <div className={`farm-bazaar farm-bazaar--cache ${available ? "farm-cache-ready" : ""}`}>
      <div className="farm-bazaar-awning farm-bazaar-awning--cache" aria-hidden />

      <div className="farm-bazaar-inner">
        <div className="farm-bazaar-top">
          <div>
            <p className="farm-bazaar-kicker">
              <Gift size={11} strokeWidth={2.25} />
              Commander Resupply
            </p>
            <h3 className="farm-bazaar-title">Daily Supply Cache</h3>
          </div>
          {available && (
            <span className="farm-bazaar-badge farm-bazaar-badge--cache">
              <Sparkles size={10} />
              Ready
            </span>
          )}
        </div>

        <p className="farm-bazaar-sub">
          One free resupply every UTC day — Crystal, ore, iron, or gold.
          {cacheBonusPct > 0 && (
            <span className="farm-cache-vpick">
              {" "}
              VPICK{vpickTier === "emerald" ? " Emerald" : ""} → +{cacheBonusPct}% Crystal rolls.
            </span>
          )}
        </p>

        {available && preview ? (
          <div className="farm-cache-reveal">
            <p className="farm-cache-reveal-label">Today&apos;s cache contains</p>
            <p className="farm-cache-reveal-prize">{preview.label}</p>
            <button type="button" onClick={onClaim} className="farm-cache-claim-btn">
              Open Cache
            </button>
          </div>
        ) : (
          <div className="farm-cache-cooldown">
            <p className="farm-cache-cooldown-label">Next cache in</p>
            <p className="farm-cache-cooldown-time">
              {mounted ? formatCountdown(countdownMs) : "—"}
            </p>
          </div>
        )}

        <p className="farm-bazaar-footer">Resets at 00:00 UTC · prizes are deterministic per wallet</p>
      </div>
    </div>
  );
}
