"use client";

import {
  DAILY_GLOBAL_CAP,
  MINING_POOL_SCHEDULE,
  RARITY_MINING_YIELDS,
  MINING_EMISSION,
  MINING_SCENARIOS,
  formatYieldAmount,
} from "@/lib/mining";
import { UPGRADE_MINING_ADVANTAGE } from "@/lib/economy";
import { PROJECT } from "@/lib/project";
import { SUPPLY_ALLOCATIONS, SILVER_MINT_ETH } from "@/lib/tokenomics";
import { formatVena } from "@/lib/mint-pricing";
import SectionShell from "./SectionShell";
import TokenomicsPieChart from "./TokenomicsPieChart";

export default function TokenomicsSection() {
  return (
    <SectionShell
      id="tokenomics"
      eyebrow="Tokenomics"
      title="1B $VENA. 10,000 Pickaxes."
      subtitle="No staking allocation is pre-minted. The reward pool is fed by buybacks: mint & upgrade revenue buys $VENA into the pool, trade fees buy back and burn."
    >
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-10 lg:gap-14 items-start">
        <TokenomicsPieChart />

        <div className="space-y-5">
          {SUPPLY_ALLOCATIONS.map((row) => (
            <div key={row.key}>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm text-slate-300">{row.label}</span>
                <span className="font-mono text-white">
                  {row.amount.toLocaleString("en-US")}{" "}
                  <span className="text-slate-500">({row.pct}%)</span>
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[rgba(255,255,255,0.05)] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${row.pct}%`, backgroundColor: row.color }}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-600 font-mono">{row.note}</p>
            </div>
          ))}
        </div>

        <div
          className="p-6 sm:p-8 rounded-2xl space-y-6"
          style={{
            border: "1px solid rgba(0,212,255,0.12)",
            background: "rgba(10,15,22,0.85)",
          }}
        >
          <h3
            className="text-lg font-bold text-white"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            Buyback flywheels
          </h3>
          <div className="space-y-4 text-sm text-slate-400">
            <p>
              <span className="text-[#00ff88] font-semibold">Mint → pool</span> —
              0.01 ETH per Silver mint buys $VENA on the market and adds it to the
              staking pool. Upgrades pay $VENA into the same pool.
            </p>
            <p>
              <span className="text-[#00d4ff] font-semibold">Trade → burn</span> —
              Virtuals trade fees trigger random-timed $VENA buybacks that are
              permanently burned, tightening supply.
            </p>
            <p>
              <span className="text-[#a78bfa] font-semibold">Staking</span> — Stake
              Pickaxes to earn from the buyback-fed pool. Payout scales with rarity
              weight, Stratum (stake duration), and total staked power.
            </p>
          </div>
          <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] grid grid-cols-3 gap-4 text-center">
            <div>
              <div
                className="text-2xl font-black text-white"
                style={{ fontFamily: "var(--font-orbitron)" }}
              >
                0.01Ξ
              </div>
              <div className="text-[10px] font-mono text-slate-500 uppercase mt-1">
                Silver mint
              </div>
            </div>
            <div>
              <div
                className="text-2xl font-black text-[#00ff88]"
                style={{ fontFamily: "var(--font-orbitron)" }}
              >
                100%
              </div>
              <div className="text-[10px] font-mono text-slate-500 uppercase mt-1">
                Mint → pool
              </div>
            </div>
            <div>
              <div
                className="text-2xl font-black text-[#00d4ff]"
                style={{ fontFamily: "var(--font-orbitron)" }}
              >
                Burn
              </div>
              <div className="text-[10px] font-mono text-slate-500 uppercase mt-1">
                Trade fees
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 overflow-x-auto">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
          Estimated staking yield — {MINING_SCENARIOS.early.label} (
          {MINING_EMISSION.launchReferencePower.toLocaleString("en-US")} network power ·{" "}
          {DAILY_GLOBAL_CAP.toFixed(2)} {PROJECT.tokenSymbol}/day cap)
        </p>
        <p className="text-xs text-slate-500 mb-4 max-w-3xl">
          Illustrative daily {PROJECT.tokenSymbol} at the reference network size. Actual yield
          changes with dilution, Stratum depth, and accessory bonuses.
        </p>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[rgba(0,212,255,0.12)] text-[10px] font-mono text-slate-500 uppercase">
              <th className="py-2 pr-3">Tier</th>
              <th className="py-2 pr-3">Mint / upgrade</th>
              <th className="py-2 pr-3">Power</th>
              <th className="py-2 pr-3">Est. daily</th>
              <th className="py-2">Est. monthly</th>
            </tr>
          </thead>
          <tbody>
            {RARITY_MINING_YIELDS.map((row) => (
              <tr
                key={row.tier}
                className="border-b border-[rgba(255,255,255,0.04)] text-slate-400"
              >
                <td className="py-3 pr-3 font-semibold text-white">{row.tier}</td>
                <td className="py-3 pr-3 font-mono">
                  {row.tier === "Silver"
                    ? `${SILVER_MINT_ETH} ETH`
                    : `${formatVena(row.tokenCost)} ${PROJECT.tokenSymbol}`}
                </td>
                <td className="py-3 pr-3 font-mono text-[#a78bfa]">
                  {row.miningPower.toFixed(0)}
                </td>
                <td className="py-3 pr-3 font-mono text-[#00ff88]">
                  ~{formatYieldAmount(row.daily, 3)} {PROJECT.tokenSymbol}
                </td>
                <td className="py-3 font-mono">
                  ~{formatYieldAmount(row.monthly, 1)} {PROJECT.tokenSymbol}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 grid sm:grid-cols-2 gap-3">
          {UPGRADE_MINING_ADVANTAGE.map((row) => (
            <div
              key={row.tier}
              className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(10,15,22,0.6)]"
            >
              <p className="text-[10px] font-mono text-slate-500 uppercase mb-2">
                Upgrade → {row.tier} ({row.upgradeCostVena.toLocaleString("en-US")} {PROJECT.tokenSymbol})
              </p>
              <p className="text-xs text-slate-400">
                Same-cost Silver stack:{" "}
                <span className="text-slate-300 font-mono">
                  ~{formatYieldAmount(row.silverStackDaily, 3)}
                </span>
                /day
              </p>
              <p className="text-xs text-slate-400 mt-1">
                1× {row.tier}:{" "}
                <span className="text-[#00ff88] font-mono">
                  ~{formatYieldAmount(row.upgradedDaily, 3)}
                </span>
                /day{" "}
                <span className="text-[#00d4ff]">(+{row.miningAdvantagePct}% mining power)</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
