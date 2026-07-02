"use client";

import { motion } from "framer-motion";
import { useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { PROJECT } from "@/lib/project";
import { TOKENOMICS } from "@/lib/tokenomics";
import { getVirtualsTradeUrl } from "@/lib/links";

const PICKAXE_ADDR = (process.env.NEXT_PUBLIC_PICKAXE_NFT ?? "") as `0x${string}`;
const STAKING_ADDR = (process.env.NEXT_PUBLIC_STAKING ?? "") as `0x${string}`;
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

const stakingABI = [
  {
    name: "totalStaked",
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
        address: STAKING_ADDR,
        abi: stakingABI,
        functionName: "totalStaked",
      },
      {
        address: VENA_ADDR,
        abi: erc20ABI,
        functionName: "totalSupply",
      },
    ],
    query: {
      enabled: Boolean(PICKAXE_ADDR),
      refetchInterval: 30_000,
    },
  });

  const minted = data?.[0]?.result as bigint | undefined;
  const staked = data?.[1]?.result as bigint | undefined;
  const totalSupply = data?.[2]?.result as bigint | undefined;

  const livePickaxes = minted !== undefined ? Number(minted) : undefined;
  const stakedCount = staked !== undefined ? Number(staked) : undefined;
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
      label: "Staked Pickaxes",
      value: stakedCount !== undefined ? fmtNum(stakedCount) : "—",
      hint: "Earning $VENA",
    },
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
    {
      label: "Trade Fee",
      value: `${TOKENOMICS.tradeFeeBps / 100}%`,
      hint: "Buyback & burn",
    },
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
