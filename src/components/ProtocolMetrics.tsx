"use client";

import { motion } from "framer-motion";
import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { PROJECT } from "@/lib/project";
import { TOKENOMICS } from "@/lib/tokenomics";
import { getUniswapPoolUrl } from "@/lib/links";

const PICKAXE_ADDR = (process.env.NEXT_PUBLIC_PICKAXE_NFT ?? "") as `0x${string}`;
const HOOK_ADDR = (process.env.NEXT_PUBLIC_HOOK_ADDRESS ?? "") as `0x${string}`;
const VENA_ADDR = (process.env.NEXT_PUBLIC_VENA_TOKEN ?? "") as `0x${string}`;

const pickaxeABI = [
  {
    name: "totalMinted",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const hookABI = [
  {
    name: "totalEffectiveWeightScaled",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

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
  const { data } = useReadContracts({
    contracts: [
      {
        address: PICKAXE_ADDR,
        abi: pickaxeABI,
        functionName: "totalMinted",
      },
      {
        address: HOOK_ADDR,
        abi: hookABI,
        functionName: "totalEffectiveWeightScaled",
      },
      {
        address: VENA_ADDR,
        abi: erc20ABI,
        functionName: "totalSupply",
      },
    ],
    query: {
      enabled: Boolean(PICKAXE_ADDR && HOOK_ADDR && VENA_ADDR),
      refetchInterval: 30_000,
    },
  });

  const minted = data?.[0]?.result as bigint | undefined;
  const totalWeightScaled = data?.[1]?.result as bigint | undefined;
  const totalSupply = data?.[2]?.result as bigint | undefined;

  const livePickaxes = minted !== undefined ? Number(minted) : undefined;
  const totalWeight =
    totalWeightScaled !== undefined
      ? Number(formatUnits(totalWeightScaled, 18))
      : undefined;
  const avgWeight =
    livePickaxes !== undefined && totalWeight !== undefined && livePickaxes > 0
      ? totalWeight / livePickaxes
      : undefined;
  const supplyWhole =
    totalSupply !== undefined
      ? Number(formatUnits(totalSupply, 18))
      : undefined;

  const metrics = [
    {
      label: "Live Pickaxes",
      value: livePickaxes !== undefined ? fmtNum(livePickaxes) : "—",
      hint: "Minted on-chain",
    },
    {
      label: "Total Weight",
      value: totalWeight !== undefined ? fmtNum(totalWeight, 2) : "—",
      hint: "Σ rarity × Stratum",
    },
    {
      label: "Avg. Weight",
      value: avgWeight !== undefined ? fmtNum(avgWeight, 2) : "—",
      hint: "Per live NFT",
    },
    {
      label: "Token Supply",
      value:
        supplyWhole !== undefined
          ? `${fmtNum(supplyWhole)} / ${TOKENOMICS.maxTokenSupply.toLocaleString("en-US")}`
          : `— / ${TOKENOMICS.maxTokenSupply.toLocaleString("en-US")}`,
      hint: "Whole tokens only",
    },
    {
      label: "Next Token ID",
      value: livePickaxes !== undefined ? fmtNum(livePickaxes) : "—",
      hint: "Next mint index",
    },
    { label: "Pool Fee", value: "1%", hint: "80% holders · 20% treasury" },
  ];

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
          <span className="text-[#00ff88]">Live</span> on {PROJECT.network} · Uniswap v4 hook pool · Max{" "}
          {TOKENOMICS.maxNftSupply.toLocaleString("en-US")} Pickaxes ·{" "}
          <a
            href={getUniswapPoolUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00d4ff] hover:underline"
          >
            View pool
          </a>
        </p>
      </motion.div>
    </div>
  );
}
