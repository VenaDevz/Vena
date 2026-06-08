"use client";

import { motion } from "framer-motion";
import { PROJECT } from "@/lib/project";
import { TOKENOMICS } from "@/lib/tokenomics";

const metrics = [
  { label: "Live Pickaxes", value: "—", hint: "On-chain after launch" },
  { label: "Total Weight", value: "—", hint: "Σ rarity × Stratum" },
  { label: "Avg. Weight", value: "—", hint: "Per live NFT" },
  {
    label: "Token Supply",
    value: `— / ${TOKENOMICS.maxTokenSupply.toLocaleString("en-US")}`,
    hint: "Whole tokens only",
  },
  { label: "Next Token ID", value: "—", hint: "Next mint index" },
  { label: "Pool Fee", value: "1%", hint: "80% holders · 20% treasury" },
];

export default function ProtocolMetrics() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.06, duration: 0.45 }}
          className="relative p-4 sm:p-5 rounded-xl overflow-hidden group"
          style={{
            background: "rgba(10,15,22,0.85)",
            border: "1px solid rgba(0,212,255,0.1)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div className="text-[10px] font-mono tracking-[0.2em] text-slate-500 uppercase mb-2">
            {m.label}
          </div>
          <div
            className="text-xl sm:text-2xl font-black text-white tabular-nums"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            {m.value}
          </div>
          <div className="text-[10px] text-slate-600 font-mono mt-1.5">{m.hint}</div>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.36, duration: 0.45 }}
        className="col-span-2 lg:col-span-3 p-4 rounded-xl border border-[rgba(0,255,136,0.15)] bg-[rgba(0,255,136,0.04)]"
      >
        <p className="text-xs sm:text-sm text-slate-400 font-mono text-center">
          Pool awaiting launch seed · {PROJECT.network} · Uniswap v4 Hook · Max{" "}
          {TOKENOMICS.maxNftSupply.toLocaleString("en-US")} Pickaxes
        </p>
      </motion.div>
    </div>
  );
}
