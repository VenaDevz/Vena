"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, List, Filter, Cpu } from "lucide-react";
import NFTCard from "./NFTCard";
import RewardCounter from "./RewardCounter";
import { PROJECT } from "@/lib/project";
import { TOKENOMICS } from "@/lib/tokenomics";
import { MOCK_NFTS, RARITY_CONFIG, RARITY_ORDER, type PickaxeNFT, type Rarity } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import {
  effectiveMiningPower,
  formatVenaAmount,
  MINING_EMISSION,
  venaPerDayFromPower,
} from "@/lib/mining";

export default function MiningDashboard() {
  const [nfts, setNfts] = useState<PickaxeNFT[]>(MOCK_NFTS);
  const [filter, setFilter] = useState<Rarity | "All">("All");
  const [gridView, setGridView] = useState(true);

  const handleStake = (id: number) => {
    setNfts((prev) =>
      prev.map((n) => (n.id === id ? { ...n, staked: true } : n))
    );
  };

  const handleUnstake = (id: number) => {
    setNfts((prev) =>
      prev.map((n) => (n.id === id ? { ...n, staked: false } : n))
    );
  };

  const stakedNfts = useMemo(() => nfts.filter((n) => n.staked), [nfts]);

  const totalHashrate = useMemo(
    () => stakedNfts.reduce((sum, n) => sum + n.hashrate, 0),
    [stakedNfts]
  );

  const totalMiningPower = useMemo(
    () =>
      stakedNfts.reduce(
        (sum, n) => sum + effectiveMiningPower(n.hashrate, n.rarity),
        0
      ),
    [stakedNfts]
  );

  const stakedCount = nfts.filter((n) => n.staked).length;

  const filtered = useMemo(
    () => (filter === "All" ? nfts : nfts.filter((n) => n.rarity === filter)),
    [nfts, filter]
  );

  return (
    <section
      id="mining"
      className="relative min-h-screen py-24 px-4 sm:px-6 lg:px-8 cyber-grid"
    >
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(0,255,136,0.05) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Section heading */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-full border border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.05)]">
            <Cpu size={13} className="text-[#00ff88]" />
            <span className="text-xs font-mono tracking-[0.2em] text-[#00ff88] uppercase">
              Mining Operations Center
            </span>
          </div>
          <h2
            className="text-4xl sm:text-5xl font-black text-white tracking-tight"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            Your{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #00d4ff 0%, #00ff88 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Mining Rig
            </span>
          </h2>
          <p className="mt-3 text-slate-500 text-sm sm:text-base max-w-2xl mx-auto">
            {MINING_EMISSION.poolVena.toLocaleString("en-US")} {PROJECT.tokenDisplay} (
            {TOKENOMICS.miningPoolPct}% supply) over{" "}
            {MINING_EMISSION.emissionDays} days. Pyramid tiers — higher rarity, faster payback.
          </p>
          <p className="mt-2 text-slate-600 text-xs font-mono">
            {stakedCount}/{nfts.length} staked · {formatNumber(totalHashrate)} H/s ·{" "}
            {formatNumber(totalMiningPower)} mining power
          </p>
        </motion.div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          {/* LEFT: NFT Grid */}
          <div>
            {/* Toolbar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="flex flex-wrap items-center gap-3 mb-6"
            >
              {/* Rarity filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Filter size={13} className="text-slate-500" />
                {(["All", ...RARITY_ORDER] as const).map((r) => {
                  const color = r === "All" ? "#64748b" : RARITY_CONFIG[r].color;
                  const active = filter === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setFilter(r as Rarity | "All")}
                      className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase font-mono transition-all duration-200"
                      style={{
                        background: active ? `${color}25` : "rgba(255,255,255,0.03)",
                        border: active ? `1px solid ${color}60` : "1px solid rgba(255,255,255,0.06)",
                        color: active ? color : "rgb(100,116,139)",
                        boxShadow: active ? `0 0 10px ${color}20` : "none",
                      }}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>

              {/* View toggle */}
              <div className="ml-auto flex items-center gap-1 p-1 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                <button
                  onClick={() => setGridView(true)}
                  className={`p-1.5 rounded-md transition-all ${
                    gridView
                      ? "bg-[rgba(0,212,255,0.15)] text-[#00d4ff]"
                      : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  onClick={() => setGridView(false)}
                  className={`p-1.5 rounded-md transition-all ${
                    !gridView
                      ? "bg-[rgba(0,212,255,0.15)] text-[#00d4ff]"
                      : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  <List size={14} />
                </button>
              </div>
            </motion.div>

            {/* NFT Cards */}
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="text-5xl mb-4">⛏️</div>
                  <p className="text-slate-500 font-mono text-sm">
                    No pickaxes found for this filter.
                  </p>
                </motion.div>
              ) : (
                <div
                  className={
                    gridView
                      ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                      : "flex flex-col gap-3"
                  }
                >
                  {filtered.map((nft, i) => (
                    <motion.div
                      key={nft.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06, duration: 0.4 }}
                    >
                      <NFTCard
                        nft={nft}
                        onStake={handleStake}
                        onUnstake={handleUnstake}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: Reward Counter (sticky) */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <RewardCounter
                totalHashrate={totalHashrate}
                totalMiningPower={totalMiningPower}
              />
            </motion.div>

            {/* Stats below counter */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-4 grid grid-cols-2 gap-3"
            >
              {[
                { label: "Staked", value: `${stakedCount}/${nfts.length}`, sub: "Pickaxes" },
                {
                  label: "Hashrate",
                  value: formatNumber(totalHashrate),
                  sub: "H/s Active",
                },
                {
                  label: "Est. Daily",
                  value: formatVenaAmount(venaPerDayFromPower(totalMiningPower)),
                  sub: `${PROJECT.tokenSymbol}/day est.`,
                },
                { label: "Tier Bonus", value: "1.0×", sub: "Multiplier" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-3.5 rounded-xl"
                  style={{
                    background: "rgba(13,21,32,0.8)",
                    border: "1px solid rgba(0,212,255,0.1)",
                  }}
                >
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">
                    {stat.label}
                  </div>
                  <div
                    className="text-base font-black text-white leading-none"
                    style={{ fontFamily: "var(--font-orbitron)" }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono mt-0.5">{stat.sub}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
