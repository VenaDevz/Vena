"use client";

import { PROJECT } from "@/lib/project";
import { STRATUM_LEVELS, TOKENOMICS } from "@/lib/tokenomics";
import SectionShell from "./SectionShell";

export default function StratumTimeline() {
  return (
    <SectionShell
      id="stratum"
      eyebrow={`${PROJECT.timeBonusName} / Time`}
      title="Eight levels of depth."
      subtitle={`Staked Pickaxes begin at Stratum 1. Stake duration raises your reward multiplier up to ${TOKENOMICS.stratumMaxMultiplier}x after 30 days — per NFT, not per wallet.`}
    >
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[640px] text-left border-collapse">
          <thead>
            <tr className="border-b border-[rgba(0,212,255,0.15)]">
              <th className="py-3 pr-4 text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                Level
              </th>
              <th className="py-3 pr-4 text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                Duration
              </th>
              <th className="py-3 text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                Reward Multiplier
              </th>
            </tr>
          </thead>
          <tbody>
            {STRATUM_LEVELS.map((row) => (
              <tr
                key={row.level}
                className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(0,212,255,0.03)] transition-colors"
              >
                <td className="py-4 pr-4">
                  <span
                    className="text-sm font-bold text-white"
                    style={{ fontFamily: "var(--font-orbitron)" }}
                  >
                    {String(row.level).padStart(2, "0")}
                  </span>
                </td>
                <td className="py-4 pr-4 text-sm text-slate-400">{row.duration}</td>
                <td className="py-4">
                  <span className="text-sm font-mono text-[#00ff88]">
                    {row.multiplier.toFixed(2)}x
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Max Pickaxes", value: "10,000" },
          { label: "Max Stratum", value: `${TOKENOMICS.stratumMaxMultiplier}x` },
          { label: "Unstake", value: "Reset Lv.1" },
          { label: "Upgrade", value: "Burn + Pay" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-xl text-center"
            style={{
              border: "1px solid rgba(0,212,255,0.1)",
              background: "rgba(10,15,22,0.7)",
            }}
          >
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
              {stat.label}
            </div>
            <div
              className="mt-2 text-lg font-black text-white"
              style={{ fontFamily: "var(--font-orbitron)" }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
