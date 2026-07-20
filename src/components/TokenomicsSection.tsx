"use client";

import { SUPPLY_ALLOCATIONS } from "@/lib/tokenomics";
import SectionShell from "./SectionShell";
import TokenomicsPieChart from "./TokenomicsPieChart";

export default function TokenomicsSection() {
  return (
    <SectionShell
      id="tokenomics"
      eyebrow="Tokenomics"
      title="1B $VENA. 10,000 Pickaxes."
      subtitle="No staking allocation is pre-minted. The reward pool is fed by buybacks: mint & upgrade revenue buys $VENA into the pool, trade fees buy back to feed the reward pool."
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
              <span className="text-[#00d4ff] font-semibold">Trade → rewards</span> —
              Virtuals trade fees trigger random-timed $VENA buybacks that are
              fed directly into the reward pools, boosting miner yields.
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
                Rewards
              </div>
              <div className="text-[10px] font-mono text-slate-500 uppercase mt-1">
                Trade fees
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}
