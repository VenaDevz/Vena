"use client";

import Image from "next/image";
import { RARITY_TIERS, TIER_MAX_SUPPLY, tierUpgradeVena, SILVER_MINT_ETH } from "@/lib/tokenomics";
import { formatVena } from "@/lib/mint-pricing";
import { getPickaxeImage, type Rarity } from "@/lib/types";
import SectionShell from "./SectionShell";
import ForgeUpgradeBlock from "./ForgeUpgradeBlock";

/** Label of the tier directly below the given one (upgrade source). */
function prevTierLabel(id: Rarity): string {
  const idx = RARITY_TIERS.findIndex((t) => t.id === id);
  return RARITY_TIERS[idx - 1]?.label ?? "Silver";
}

export default function ForgeSection() {
  return (
    <SectionShell
      id="forge"
      eyebrow="Rarity"
      title="Upgrade your Pickaxe."
      subtitle="Everyone mints Silver with 0.01 ETH. To climb a tier, pay $VENA and burn your current Pickaxe — that $VENA feeds the staking pool."
    >
      <div className="mb-10 p-5 sm:p-6 rounded-2xl border border-[rgba(0,212,255,0.12)] bg-[rgba(10,15,22,0.7)]">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">
          Upgrade ladder — burn + pay to climb
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-sm font-mono">
          {RARITY_TIERS.map((tier, i) => (
            <span key={tier.id} className="flex items-center gap-2 sm:gap-3">
              <span style={{ color: tier.color }} className="font-semibold">
                {tier.label}
                <span className="text-slate-500 font-normal ml-1">×{tier.powerMultiplier}</span>
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
                <div
                  className={[
                    "absolute",
                    tier.id === "Diamond"
                      ? "inset-5 sm:inset-6"
                      : tier.id === "Emerald"
                        ? "inset-4 sm:inset-5"
                        : "inset-3 sm:inset-4",
                  ].join(" ")}
                >
                  <Image
                    src={getPickaxeImage(tier.id as Rarity)}
                    alt={`${tier.label} Pickaxe`}
                    fill
                    className="object-contain opacity-90 transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, 20vw"
                  />
                </div>
                <div
                  className="pointer-events-none absolute inset-0"
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
                    <dt>Stake weight</dt>
                    <dd className="text-[#a78bfa]">{tier.powerMultiplier}x</dd>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <dt>Base hashrate</dt>
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
                    Mint · {SILVER_MINT_ETH} ETH
                  </p>
                ) : (
                  <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2">
                      Upgrade from
                    </p>
                    <p className="text-[10px] font-mono text-[#00d4ff]/90">
                      Burn {prevTierLabel(tier.id)} +{" "}
                      {formatVena(tierUpgradeVena(tier.id))} $VENA
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-8 text-center text-sm text-slate-500 font-mono max-w-3xl mx-auto leading-relaxed">
        Every upgrade burns your lower-tier Pickaxe. Mint ETH and upgrade $VENA
        both feed the staking pool — holders earn more as the flywheel spins.
      </p>

      <ForgeUpgradeBlock />
    </SectionShell>
  );
}
