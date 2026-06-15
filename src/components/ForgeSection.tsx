"use client";

import Image from "next/image";
import { FORGE_PATHS } from "@/lib/forge";
import { RARITY_TIERS, TIER_MAX_SUPPLY } from "@/lib/tokenomics";
import SectionShell from "./SectionShell";
import ForgeUpgradeBlock from "./ForgeUpgradeBlock";

export default function ForgeSection() {
  return (
    <SectionShell
      id="forge"
      eyebrow="Rarity"
      title="Forge higher tiers."
      subtitle="Mint is always Silver. Upgrade with Silver or burn lower tiers — 2× Gold → Platinum, 2× Platinum → Diamond, and so on. Silver dries up? The market still climbs."
    >
      <div className="mb-10 p-5 sm:p-6 rounded-2xl border border-[rgba(0,212,255,0.12)] bg-[rgba(10,15,22,0.7)]">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">
          Silver-equivalent ladder
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-sm font-mono">
          {RARITY_TIERS.map((tier, i) => (
            <span key={tier.id} className="flex items-center gap-2 sm:gap-3">
              <span style={{ color: tier.color }} className="font-semibold">
                {tier.label}
                <span className="text-slate-500 font-normal ml-1">({tier.silverEquivalent})</span>
              </span>
              {i < RARITY_TIERS.length - 1 && (
                <span className="text-slate-600">→</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {RARITY_TIERS.map((tier) => {
          const paths =
            tier.id === "Silver"
              ? null
              : FORGE_PATHS[tier.id as keyof typeof FORGE_PATHS];

          return (
            <div
              key={tier.id}
              className="relative rounded-2xl overflow-hidden group"
              style={{
                border: `1px solid ${tier.color}22`,
                background: "rgba(10,15,22,0.9)",
              }}
            >
              <div className="aspect-square relative overflow-hidden">
                <Image
                  src={`/${tier.id.toLowerCase()}.jpeg`}
                  alt={`${tier.label} Pickaxe`}
                  fill
                  className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 50vw, 20vw"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, rgba(3,6,9,0.95) 0%, transparent 55%)`,
                  }}
                />
              </div>
              <div className="p-4 -mt-2 relative z-10">
                <h3
                  className="text-lg font-bold"
                  style={{ fontFamily: "var(--font-orbitron)", color: tier.color }}
                >
                  {tier.label}
                </h3>
                <dl className="mt-3 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-500">
                    <dt>Fee weight</dt>
                    <dd className="text-white">{tier.powerMultiplier}x</dd>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <dt>Mining pyramid</dt>
                    <dd className="text-[#a78bfa]">{tier.miningPyramidMultiplier}x</dd>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <dt>Hashrate</dt>
                    <dd className="text-[#00ff88]">{tier.hashrate} H/s</dd>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <dt>Max supply</dt>
                    <dd className="text-slate-400">
                      ~{TIER_MAX_SUPPLY[tier.id].toLocaleString("en-US")}
                    </dd>
                  </div>
                </dl>
                {tier.id === "Silver" ? (
                  <p className="mt-3 text-[10px] text-slate-500 font-mono">
                    1 whole $VENA = 1 mint
                  </p>
                ) : (
                  <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
                      Forge paths
                    </p>
                    <ul className="space-y-1">
                      {paths?.map((path) => (
                        <li
                          key={path.label}
                          className="text-[10px] font-mono text-[#00d4ff]/90"
                        >
                          {path.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-8 text-center text-sm text-slate-500 font-mono max-w-3xl mx-auto leading-relaxed">
        Example: 32 tokens → 32 Silver, or 8 Gold, or 4 Platinum, or 2 Diamond, or 1 Emerald.
        Same token lock — your route depends on what the market still holds.
      </p>

      <ForgeUpgradeBlock />
    </SectionShell>
  );
}
