"use client";

import { PROJECT } from "@/lib/project";
import { BUYBACK_POLICY, MINT_REVENUE_POLICY } from "@/lib/tokenomics";
import SectionShell from "./SectionShell";

export default function FeeDistribution() {
  return (
    <SectionShell
      id="fees"
      eyebrow="Revenue"
      title="Two flywheels."
      subtitle="Every Pickaxe mint and upgrade buys $VENA into the staking pool. Trade fees trigger random-timed buybacks that are sent to the reward pool. This constantly grows the rewards available to active miners."
    >
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div
          className="p-6 sm:p-8 rounded-2xl"
          style={{
            background: "rgba(10,15,22,0.9)",
            border: "1px solid rgba(0,255,136,0.12)",
          }}
        >
          <div className="font-mono text-sm text-slate-500 mb-6">
            Where revenue goes
          </div>
          <div className="space-y-4">
            <FeeBar
              label="NFT mint & upgrades"
              action="Staking pool"
              pct={MINT_REVENUE_POLICY.toPoolPct}
              detail="ETH mint + $VENA upgrades → buy $VENA → staking pool"
              color="#00ff88"
            />
            <FeeBar
              label="Virtuals trade fees"
              action="Buyback & feed pool"
              pct={BUYBACK_POLICY.tradeFeeTakePct}
              detail="Random-timed buybacks → sent to reward pools"
              color="#00d4ff"
            />
          </div>
          <p className="mt-8 text-xs text-slate-500 font-mono leading-relaxed">
            No dedicated staking allocation is pre-minted. The reward pool is
            fed entirely by real product volume — the more Pickaxes minted and
            upgraded, the bigger the pool.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              title: "Mint → pool",
              body: "ETH from every Silver mint is swapped into $VENA and added to the staking pool. Upgrades pay $VENA that flows to the same pool.",
            },
            {
              title: "Trade → rewards",
              body: "Virtuals trade fees come back to the project as $VIRTUAL, are swapped into $VENA at random intervals, and sent to the reward pool — increasing the pool size over time.",
            },
            {
              title: "Staking rewards",
              body: `Stake Pickaxes to earn from the buyback-fed pool. Rewards scale with real ${PROJECT.tokenSymbol} demand, not an emission schedule.`,
            },
            {
              title: "Weighted emissions",
              body: "Your share = rarity weight × Stratum (stake duration). Higher tiers and longer stakes earn a larger slice of the pool.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="p-4 rounded-xl border border-[rgba(0,212,255,0.08)] bg-[rgba(13,21,32,0.6)]"
            >
              <h4 className="text-sm font-bold text-[#00d4ff] font-mono tracking-wide">
                {item.title}
              </h4>
              <p className="mt-1.5 text-sm text-slate-400">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

function FeeBar({
  label,
  action,
  pct,
  detail,
  color,
}: {
  label: string;
  action: string;
  pct: number;
  detail: string;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="font-mono text-white">
          {pct}% → {action}
        </span>
      </div>
      <p className="text-[10px] text-slate-600 font-mono mb-2">{detail}</p>
      <div className="h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
