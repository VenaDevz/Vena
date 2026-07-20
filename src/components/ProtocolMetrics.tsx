"use client";

import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { targetChainId } from "@/config/wagmi";
import { RH_CONTRACTS } from "@/lib/contracts/robinhood";
import { PROJECT } from "@/lib/project";
import { TOKENOMICS } from "@/lib/tokenomics";
import { getVirtualsTradeUrl } from "@/lib/links";

const erc20ABI = [
  {
    name: "totalSupply",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

function fmtNum(n: number, maxFrac = 0): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: maxFrac });
}

export default function ProtocolMetrics() {
  const { data: totalSupplyWei } = useReadContract({
    address: RH_CONTRACTS.venaToken,
    abi: erc20ABI,
    functionName: "totalSupply",
    chainId: targetChainId,
    query: {
      enabled: Boolean(RH_CONTRACTS.venaToken),
      refetchInterval: 30_000,
    },
  });

  const supplyWhole =
    totalSupplyWei !== undefined
      ? Number(formatUnits(totalSupplyWei, 18))
      : undefined;

  const metrics = [
    {
      label: "Max Pickaxes",
      value: fmtNum(TOKENOMICS.maxNftSupply),
      hint: "Hard cap",
    },
    {
      label: "Token Supply",
      value:
        supplyWhole !== undefined
          ? `${fmtNum(supplyWhole)} / ${TOKENOMICS.maxTokenSupply.toLocaleString("en-US")}`
          : `— / ${TOKENOMICS.maxTokenSupply.toLocaleString("en-US")}`,
      hint: `$VENA on ${PROJECT.launchpad}`,
    },
    {
      label: "Staking Pool",
      value: "Buyback-fed",
      hint: "Grows with mint & upgrade volume",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
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
        transition={{ delay: 0.24, duration: 0.45 }}
        className="col-span-2 p-4 rounded-xl border border-[rgba(0,255,136,0.15)] bg-[rgba(0,255,136,0.04)]"
      >
        <p className="text-xs sm:text-sm text-slate-400 font-mono text-center">
          <span className="text-[#00ff88]">Live</span> on {PROJECT.network} · {PROJECT.launchpad} agent token · Max{" "}
          {TOKENOMICS.maxNftSupply.toLocaleString("en-US")} Pickaxes ·{" "}
          <a
            href={getVirtualsTradeUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00d4ff] hover:underline"
          >
            Trade $VENA
          </a>
        </p>
      </motion.div>
    </div>
  );
}
