"use client";

import { useState } from "react";
import { Crown, Lock, Gem, Hexagon, Flame } from "lucide-react";
import { FARM_GRID_TIERS, formatCrystal, formatPrimeCrystal } from "../config/farm-config";
import { EXCHANGE_SEASON_END } from "../config/farm-exchange";

type LbCategory = "prime" | "crystal" | "base" | "streak";

const SEASON_END = EXCHANGE_SEASON_END;

const SIM: Record<LbCategory, { addr: string; score: number }[]> = {
  prime: [
    { addr: "0xF3a2…b891", score: 187.4421 },
    { addr: "0x7c01…2d9a", score: 142.3108 },
    { addr: "0xAb34…f521", score: 98.756 },
    { addr: "CmdrNova", score: 76.2033 },
    { addr: "0xdEad…BeeF", score: 61.8817 },
    { addr: "DeepVeinDAO", score: 45.124 },
    { addr: "0x3f5e…a89d", score: 33.671 },
    { addr: "AuroraRig", score: 21.4502 },
  ],
  crystal: [
    { addr: "IronbaneOps", score: 2_840_000 },
    { addr: "0xF3a2…b891", score: 1_920_000 },
    { addr: "0x7c01…2d9a", score: 1_450_000 },
    { addr: "StratumSix", score: 980_000 },
    { addr: "0xAb34…f521", score: 720_000 },
    { addr: "CmdrNova", score: 510_000 },
    { addr: "0x9a7b…c341", score: 380_000 },
    { addr: "0x8b2c…4e7f", score: 210_000 },
  ],
  base: [
    { addr: "DeepVeinDAO", score: 4025 },
    { addr: "0xF3a2…b891", score: 4018 },
    { addr: "AuroraRig", score: 3012 },
    { addr: "0x7c01…2d9a", score: 3009 },
    { addr: "CmdrNova", score: 2015 },
    { addr: "0xAb34…f521", score: 2008 },
    { addr: "IronbaneOps", score: 2004 },
    { addr: "0x3f5e…a89d", score: 1003 },
  ],
  streak: [
    { addr: "0xF3a2…b891", score: 28 },
    { addr: "StratumSix", score: 24 },
    { addr: "0x7c01…2d9a", score: 19 },
    { addr: "DeepVeinDAO", score: 14 },
    { addr: "CmdrNova", score: 11 },
    { addr: "0xAb34…f521", score: 9 },
    { addr: "AuroraRig", score: 7 },
    { addr: "0x9a7b…c341", score: 5 },
  ],
};

const TABS: { id: LbCategory; label: string; icon: typeof Crown }[] = [
  { id: "prime", label: "◆ Prime", icon: Crown },
  { id: "crystal", label: "Crystal", icon: Gem },
  { id: "base", label: "Base", icon: Hexagon },
  { id: "streak", label: "Streak", icon: Flame },
];

function rankLabel(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

function playerScore(
  cat: LbCategory,
  props: {
    primeCrystal: number;
    totalCrystalProduced: number;
    gridTier: number;
    builtPlots: number;
    streakCount: number;
  }
): number {
  switch (cat) {
    case "prime":
      return props.primeCrystal;
    case "crystal":
      return props.totalCrystalProduced;
    case "base":
      return props.gridTier * 1000 + props.builtPlots;
    case "streak":
      return props.streakCount;
  }
}

function formatScore(cat: LbCategory, score: number): string {
  switch (cat) {
    case "prime":
      return `◆ ${formatPrimeCrystal(score)}`;
    case "crystal":
      return formatCrystal(score);
    case "base": {
      const tier = Math.floor(score / 1000);
      const built = score % 1000;
      const label = FARM_GRID_TIERS.find((t) => t.tier === tier)?.label ?? `${tier}×${tier}`;
      return `${label} · ${built} built`;
    }
    case "streak":
      return `${score}d`;
  }
}

type Props = {
  primeCrystal: number;
  totalCrystalProduced: number;
  gridTier: number;
  builtPlots: number;
  streakCount: number;
  address?: string;
};

export default function FarmLeaderboard(props: Props) {
  const [tab, setTab] = useState<LbCategory>("prime");

  const playerHandle = props.address
    ? `${props.address.slice(0, 6)}…${props.address.slice(-4)}`
    : "You";

  const pScore = playerScore(tab, props);
  const combined = [
    ...SIM[tab],
    { addr: playerHandle, score: pScore, isPlayer: true },
  ].sort((a, b) => b.score - a.score);

  const playerRank = combined.findIndex((e) => "isPlayer" in e && e.isPlayer) + 1;
  const top8 = combined.slice(0, 8);
  const playerInTop = playerRank <= 8;

  return (
    <div className="farm-bazaar farm-bazaar--leaderboard">
      <div className="farm-bazaar-awning farm-bazaar-awning--leaderboard" aria-hidden />

      <div className="farm-bazaar-inner">
        {/* Header */}
        <div className="farm-bazaar-top">
          <div>
            <p className="farm-bazaar-kicker">
              <Crown size={11} strokeWidth={2.25} />
              VenaLand Rankings
            </p>
            <h3 className="farm-bazaar-title">Season Rankings</h3>
          </div>
          <span className="farm-bazaar-badge farm-bazaar-badge--leaderboard">S1</span>
        </div>

        <p className="farm-bazaar-sub">
          Compete across four categories. Ends <strong className="text-slate-400">{SEASON_END}</strong>. On-chain rankings in S2.
        </p>

        {/* Stats row */}
        <div className="farm-bazaar-stats">
          <div className="farm-bazaar-stat">
            <Crown size={12} className="text-[#c084fc]" />
            <span>Rank #{playerRank}</span>
          </div>
          <div className="farm-bazaar-stat">
            <span>Season ends {SEASON_END}</span>
          </div>
        </div>

        {/* Category tabs */}
        <div className="farm-lb-tabs">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`farm-lb-tab ${tab === id ? "farm-lb-tab-on" : ""}`}
            >
              <Icon size={11} strokeWidth={2.25} />
              {label}
            </button>
          ))}
        </div>

        {/* Rows */}
        <div className="farm-lb-list">
          {top8.map((entry, i) => {
            const isPlayer = "isPlayer" in entry && entry.isPlayer;
            const rank = i + 1;
            return (
              <div
                key={`${tab}-${entry.addr}`}
                className={`farm-lb-row ${isPlayer ? "farm-lb-row-you" : ""}`}
              >
                <span className="farm-lb-rank">{rankLabel(rank)}</span>
                <span className="farm-lb-addr">{entry.addr}</span>
                <span className="farm-lb-score">{formatScore(tab, entry.score)}</span>
              </div>
            );
          })}

          {!playerInTop && (
            <>
              <div className="farm-lb-gap">···</div>
              <div className="farm-lb-row farm-lb-row-you">
                <span className="farm-lb-rank">#{playerRank}</span>
                <span className="farm-lb-addr">{playerHandle}</span>
                <span className="farm-lb-score">{formatScore(tab, pScore)}</span>
              </div>
            </>
          )}
        </div>

        <p className="farm-bazaar-footer">
          <Lock size={9} strokeWidth={2.25} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
          Preview rankings · on-chain verification in S2
        </p>
      </div>
    </div>
  );
}
