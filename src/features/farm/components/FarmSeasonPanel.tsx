"use client";

import { BarChart3, ArrowRightLeft } from "lucide-react";
import {
  EXCHANGE_CRYSTAL_QUOTA,
  EXCHANGE_POOL_USDC,
  EXCHANGE_SEASON_END,
  EXCHANGE_SEASON_LABEL,
  quotaRemaining,
} from "../config/farm-exchange";
import { formatCrystal } from "../config/farm-config";

type Props = {
  poolLeft: number;
  playerCrystalSold: number;
  playerUsdcEarned: number;
  tradesFilled: number;
};

export default function FarmSeasonPanel({
  poolLeft,
  playerCrystalSold,
  playerUsdcEarned,
  tradesFilled,
}: Props) {
  const poolPct = EXCHANGE_POOL_USDC > 0 ? (poolLeft / EXCHANGE_POOL_USDC) * 100 : 0;
  const quotaLeft = quotaRemaining();
  const quotaPct = EXCHANGE_CRYSTAL_QUOTA > 0 ? (quotaLeft / EXCHANGE_CRYSTAL_QUOTA) * 100 : 0;

  return (
    <div className="farm-bazaar farm-bazaar--season">
      <div className="farm-bazaar-awning farm-bazaar-awning--season" aria-hidden />

      <div className="farm-bazaar-inner">
        {/* Header */}
        <div className="farm-bazaar-top">
          <div>
            <p className="farm-bazaar-kicker">
              <BarChart3 size={11} strokeWidth={2.25} />
              Fee-funded pools
            </p>
            <h3 className="farm-bazaar-title">{EXCHANGE_SEASON_LABEL} Intel</h3>
          </div>
          <span className="farm-bazaar-badge farm-bazaar-badge--season">S1</span>
        </div>

        <p className="farm-bazaar-sub">
          Live pool snapshots for the current season. Ends <strong className="text-slate-400">{EXCHANGE_SEASON_END}</strong>.
        </p>

        {/* Stats */}
        <div className="farm-bazaar-stats">
          <div className="farm-bazaar-stat">
            <span className="text-[#22c55e]">${poolLeft.toFixed(0)} USDC</span>
          </div>
          <div className="farm-bazaar-stat">
            <ArrowRightLeft size={11} className="text-[#00d4ff]" />
            <span>{tradesFilled} fills</span>
          </div>
        </div>

        {/* Pool bars */}
        <div className="farm-season-stat">
          <div className="farm-season-stat-head">
            <span>USDC exchange pool</span>
            <span className="text-[#22c55e]">${poolLeft.toFixed(0)} left</span>
          </div>
          <div className="farm-season-bar">
            <div className="farm-season-bar-fill farm-season-bar-usdc" style={{ width: `${poolPct}%` }} />
          </div>
        </div>

        <div className="farm-season-stat">
          <div className="farm-season-stat-head">
            <span>Crystal quota</span>
            <span className="text-[#00ff88]">{formatCrystal(quotaLeft)} left</span>
          </div>
          <div className="farm-season-bar">
            <div className="farm-season-bar-fill farm-season-bar-crystal" style={{ width: `${quotaPct}%` }} />
          </div>
        </div>

        {/* Player stats */}
        <div className="farm-season-you">
          <div className="farm-season-you-row">
            <span>Your swaps</span>
            <span>{formatCrystal(playerCrystalSold)} → ${playerUsdcEarned.toFixed(2)}</span>
          </div>
          <div className="farm-season-you-row">
            <span>Trade Post fills</span>
            <span>{tradesFilled}</span>
          </div>
        </div>

        <p className="farm-bazaar-footer">
          Pool funded from 5% trade fees · live payouts in S2
        </p>
      </div>
    </div>
  );
}
