"use client";

import {
  DAILY_GLOBAL_CAP,
  FORGE_MINING_CHECKS,
  MINING_POOL_SCHEDULE,
  RARITY_MINING_YIELDS,
  RARITY_MINING_YIELDS_FULL,
  MINING_EMISSION,
  MINING_SCENARIOS,
} from "@/lib/mining";
import { PROJECT } from "@/lib/project";
import { SUPPLY_ALLOCATIONS, SUPPLY_BREAKDOWN } from "@/lib/tokenomics";
import SectionShell from "./SectionShell";
import TokenomicsPieChart from "./TokenomicsPieChart";

export default function TokenomicsSection() {
  return (
    <SectionShell
      id="tokenomics"
      eyebrow="Tokenomics"
      title="10,000 $VENA. 10,000 Pickaxes."
      subtitle={`One whole token always equals one NFT. ${SUPPLY_BREAKDOWN.mining.toLocaleString("en-US")} VENA funds mining — separate from LP fees.`}
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
            Mining vs LP fees
          </h3>
          <div className="space-y-4 text-sm text-slate-400">
            <p>
              <span className="text-[#00d4ff] font-semibold">LP fees (1%)</span> — Real ETH from
              swaps. 80% to Pickaxe holders by weight. Claim anytime.
            </p>
            <p>
              <span className="text-[#00ff88] font-semibold">
                Mining ({SUPPLY_BREAKDOWN.mining.toLocaleString("en-US")} VENA /{" "}
                {MINING_EMISSION.emissionDays}d)
              </span>{" "}
              — Fixed schedule: ~{DAILY_GLOBAL_CAP.toFixed(2)} {PROJECT.tokenSymbol}/day for exactly{" "}
              {MINING_EMISSION.emissionDays} days. Pool always depletes on day{" "}
              {MINING_EMISSION.emissionDays}, regardless of stake count. Payback speed depends on
              network dilution — early stakers earn more per token.
            </p>
          </div>
          <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] grid grid-cols-3 gap-4 text-center">
            <div>
              <div
                className="text-2xl font-black text-white"
                style={{ fontFamily: "var(--font-orbitron)" }}
              >
                {MINING_POOL_SCHEDULE.days}d
              </div>
              <div className="text-[10px] font-mono text-slate-500 uppercase mt-1">
                Mining program
              </div>
            </div>
            <div>
              <div
                className="text-2xl font-black text-[#00ff88]"
                style={{ fontFamily: "var(--font-orbitron)" }}
              >
                {MINING_POOL_SCHEDULE.dailyCap.toFixed(1)}
              </div>
              <div className="text-[10px] font-mono text-slate-500 uppercase mt-1">
                VENA / day cap
              </div>
            </div>
            <div>
              <div
                className="text-2xl font-black text-[#00d4ff]"
                style={{ fontFamily: "var(--font-orbitron)" }}
              >
                4K
              </div>
              <div className="text-[10px] font-mono text-slate-500 uppercase mt-1">
                Total emission
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 overflow-x-auto">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
          Pyramid mining — {MINING_SCENARIOS.early.label} (
          {MINING_EMISSION.launchReferencePower.toLocaleString("en-US")} other miners ·{" "}
          {DAILY_GLOBAL_CAP.toFixed(2)} {PROJECT.tokenSymbol}/day cap)
        </p>
        <p className="text-xs text-slate-500 mb-4 max-w-3xl">
          Higher tiers amortize faster — Emerald ~7 days at launch, Silver ~16 days. One
          forged tier always out-earns the same number of Silvers (e.g. 3 Silver &lt; 1 Gold).
          If all 10,000 Pickaxes stake day one, Silver payback
          stretches to ~{RARITY_MINING_YIELDS_FULL[0]?.paybackDays ?? "600"}d, but the pool still
          runs {MINING_EMISSION.emissionDays} days total.
        </p>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[rgba(0,212,255,0.12)] text-[10px] font-mono text-slate-500 uppercase">
              <th className="py-2 pr-3">Tier</th>
              <th className="py-2 pr-3">Cost</th>
              <th className="py-2 pr-3">Pyramid</th>
              <th className="py-2 pr-3">Daily</th>
              <th className="py-2 pr-3">Monthly</th>
              <th className="py-2">Payback</th>
            </tr>
          </thead>
          <tbody>
            {RARITY_MINING_YIELDS.map((row) => (
              <tr
                key={row.tier}
                className="border-b border-[rgba(255,255,255,0.04)] text-slate-400"
              >
                <td className="py-3 pr-3 font-semibold text-white">{row.tier}</td>
                <td className="py-3 pr-3 font-mono">{row.tokenCost} {PROJECT.tokenSymbol}</td>
                <td className="py-3 pr-3 font-mono text-[#a78bfa]">{row.pyramidMult}x</td>
                <td className="py-3 pr-3 font-mono text-[#00ff88]">
                  {row.daily.toFixed(3)} {PROJECT.tokenSymbol}
                </td>
                <td className="py-3 pr-3 font-mono">{row.monthly.toFixed(2)} {PROJECT.tokenSymbol}</td>
                <td className="py-3 font-mono text-[#00d4ff]">~{row.paybackDays}d</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 grid sm:grid-cols-2 gap-3">
          {FORGE_MINING_CHECKS.map((row) => (
            <div
              key={row.tier}
              className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(10,15,22,0.6)]"
            >
              <p className="text-[10px] font-mono text-slate-500 uppercase mb-2">
                → {row.tier} ({row.silverEquivalent} token lock)
              </p>
              <p className="text-xs text-slate-400">
                {row.silverEquivalent}× Silver stack:{" "}
                <span className="text-slate-300 font-mono">
                  {row.silverStackDaily.toFixed(3)}
                </span>
                /day
              </p>
              <p className="text-xs text-slate-400 mt-1">
                1× {row.tier}:{" "}
                <span className="text-[#00ff88] font-mono">
                  {row.forgedDaily.toFixed(3)}
                </span>
                /day{" "}
                <span className="text-[#00d4ff]">(+{row.dailyAdvantagePct}%)</span>
              </p>
              <ul className="mt-3 space-y-1 border-t border-[rgba(255,255,255,0.04)] pt-2">
                {row.pathChecks.map((pc) => (
                  <li key={pc.label} className="text-[10px] font-mono text-slate-600">
                    {pc.label}: {pc.stackDaily.toFixed(3)}/day → forge wins
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
