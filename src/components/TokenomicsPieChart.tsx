"use client";

import { SUPPLY_ALLOCATIONS } from "@/lib/tokenomics";

/** Donut chart for 10k VENA supply split — pure CSS, no chart library. */
export default function TokenomicsPieChart() {
  let cursor = 0;
  const stops = SUPPLY_ALLOCATIONS.map((slice) => {
    const start = cursor;
    cursor += slice.pct;
    return `${slice.color} ${start}% ${cursor}%`;
  }).join(", ");

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full shrink-0"
        style={{
          background: `conic-gradient(${stops})`,
          boxShadow: "0 0 40px rgba(0,212,255,0.12)",
        }}
        role="img"
        aria-label="VENA supply: 50% liquidity, 25% automated capital formation, 25% team-treasury"
      >
        <div
          className="absolute inset-[18%] rounded-full flex flex-col items-center justify-center text-center"
          style={{
            background: "linear-gradient(160deg, rgba(10,15,22,0.98) 0%, rgba(6,10,16,0.99) 100%)",
            border: "1px solid rgba(0,212,255,0.15)",
          }}
        >
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">
            Total
          </span>
          <span
            className="text-lg sm:text-xl font-black text-white"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            1,000,000,000
          </span>
        </div>
      </div>

      <ul className="w-full max-w-xs space-y-3">
        {SUPPLY_ALLOCATIONS.map((slice) => (
          <li key={slice.key} className="flex items-start gap-3 text-sm">
            <span
              className="mt-1 w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: slice.color }}
            />
            <div className="min-w-0">
              <div className="flex justify-between gap-2">
                <span className="text-slate-300">{slice.label}</span>
                <span className="font-mono text-white shrink-0">{slice.pct}%</span>
              </div>
              <p className="text-[10px] text-slate-600 font-mono mt-0.5">{slice.note}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
