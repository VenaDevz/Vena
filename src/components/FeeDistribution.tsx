"use client";

import { TOKENOMICS } from "@/lib/tokenomics";
import SectionShell from "./SectionShell";

export default function FeeDistribution() {
  return (
    <SectionShell
      id="fees"
      eyebrow="Fee Distribution"
      title="Weighted by depth & rarity."
      subtitle="Every swap pays 1% pool fee. Holders receive 80% by total weight — rarity multiplier × Stratum multiplier. Treasury keeps 20%."
    >
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div
          className="p-6 sm:p-8 rounded-2xl"
          style={{
            background: "rgba(10,15,22,0.9)",
            border: "1px solid rgba(0,255,136,0.12)",
          }}
        >
          <div className="font-mono text-sm text-slate-500 mb-6">Per swap</div>
          <div className="space-y-4">
            <FeeBar label="NFT Holders" pct={TOKENOMICS.lpFeeToHoldersPct} color="#00ff88" />
            <FeeBar label="Treasury" pct={TOKENOMICS.lpFeeToTreasuryPct} color="#00d4ff" />
          </div>
          <p className="mt-8 text-xs text-slate-500 font-mono leading-relaxed">
            Weight = rarity power × Stratum level. Level upgrades sync on-chain before
            retroactive fee amplification — same lazy-sync safety as proven v4 hooks.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              title: "Whole token mint",
              body: "Each integer $VENA creates one Silver Pickaxe with Stratum Level 1.",
            },
            {
              title: "Lazy sync",
              body: "Anyone can sync eligible Stratum levels. Unclaimed fees lock at the prior weight.",
            },
            {
              title: "Weighted claims",
              body: "Claim on-site anytime, or auto-claim when you sell VENA. You only receive your own NFT share — never others' fees.",
            },
            {
              title: "Transfer reset",
              body: "Received Pickaxes restart Stratum at Level 1. Soulbound transfer lock available via owner config.",
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
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="font-mono text-white">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-[rgba(255,255,255,0.06)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
