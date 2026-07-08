"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, List, Filter, Cpu, Wallet, Loader2 } from "lucide-react";
import { useAppKit } from "@reown/appkit/react";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import NFTCard from "./NFTCard";
import ForgeUpgradePanel from "./ForgeUpgradePanel";
import RewardCounter from "./RewardCounter";
import { PROJECT } from "@/lib/project";
import { RARITY_CONFIG, RARITY_ORDER, type PickaxeNFT, type Rarity } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import {
  effectiveMiningPower,
  formatVenaAmount,
  venaPerDayFromPower,
} from "@/lib/mining";

// ─── Contract addresses ───────────────────────────────────────────────────────

const PICKAXE_ADDR = (process.env.NEXT_PUBLIC_PICKAXE_NFT ?? "") as `0x${string}`;
const MINING_ADDR  = (process.env.NEXT_PUBLIC_VENA_MINING  ?? "") as `0x${string}`;

// ─── ABIs (minimal) ───────────────────────────────────────────────────────────

const pickaxeABI = [
  { name: "totalMinted",       type: "function", stateMutability: "view",        inputs: [],                                                                                        outputs: [{ type: "uint256" }] },
  { name: "ownerOf",           type: "function", stateMutability: "view",        inputs: [{ name: "tokenId", type: "uint256" }],                                                    outputs: [{ type: "address" }] },
  { name: "tokenTier",         type: "function", stateMutability: "view",        inputs: [{ name: "tokenId", type: "uint256" }],                                                    outputs: [{ type: "uint8"   }] },
  { name: "setApprovalForAll", type: "function", stateMutability: "nonpayable",  inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }],              outputs: [] },
  { name: "isApprovedForAll",  type: "function", stateMutability: "view",        inputs: [{ name: "owner", type: "address" }, { name: "operator", type: "address" }],              outputs: [{ type: "bool" }] },
] as const;

const miningABI = [
  { name: "getUserInfo", type: "function", stateMutability: "view",       inputs: [{ name: "account", type: "address" }], outputs: [{ name: "power", type: "uint256" }, { name: "stakedIds", type: "uint256[]" }, { name: "pending", type: "uint256" }] },
  { name: "stakeNFT",   type: "function", stateMutability: "nonpayable", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [] },
  { name: "unstakeNFT", type: "function", stateMutability: "nonpayable", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [] },
  { name: "isActive",   type: "function", stateMutability: "view",       inputs: [],                                     outputs: [{ type: "bool" }] },
] as const;

// ─── Tier → Rarity mapping (must match PickaxeNFT.Tier enum order) ───────────

const TIER_TO_RARITY: Rarity[] = ["Silver", "Gold", "Platinum", "Diamond", "Emerald"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MiningDashboard() {
  const { isConnected, address } = useAccount();
  const { open } = useAppKit();
  const [filter, setFilter] = useState<Rarity | "All">("All");
  const [gridView, setGridView] = useState(true);

  const { writeContractAsync } = useWriteContract();

  // ── 1. How many NFTs have ever been minted? ─────────────────────────────────
  const { data: totalMinted } = useReadContract({
    address: PICKAXE_ADDR,
    abi: pickaxeABI,
    functionName: "totalMinted",
    query: { enabled: isConnected },
  });

  // ── 2. Which token IDs does this user have staked? ──────────────────────────
  const { data: userInfo, refetch: refetchUserInfo } = useReadContract({
    address: MINING_ADDR,
    abi: miningABI,
    functionName: "getUserInfo",
    args: [address!],
    query: { enabled: isConnected && !!address },
  });

  // ── 3. Is the mining pool active? ───────────────────────────────────────────
  const { data: miningActive } = useReadContract({
    address: MINING_ADDR,
    abi: miningABI,
    functionName: "isActive",
    query: { enabled: isConnected },
  });

  // ── 4. Has user approved VenaMining to transfer their NFTs? ─────────────────
  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: PICKAXE_ADDR,
    abi: pickaxeABI,
    functionName: "isApprovedForAll",
    args: [address!, MINING_ADDR],
    query: { enabled: isConnected && !!address },
  });

  // ── 5. Multicall: ownerOf + tokenTier for every minted token ────────────────
  const total    = Number(totalMinted ?? 0);
  const tokenIds = useMemo(() => Array.from({ length: total }, (_, i) => i), [total]);

  const ownerCalls = useMemo(
    () => tokenIds.map((id) => ({
      address: PICKAXE_ADDR,
      abi:     pickaxeABI,
      functionName: "ownerOf" as const,
      args:    [BigInt(id)] as [bigint],
    })),
    [tokenIds],
  );

  const tierCalls = useMemo(
    () => tokenIds.map((id) => ({
      address: PICKAXE_ADDR,
      abi:     pickaxeABI,
      functionName: "tokenTier" as const,
      args:    [BigInt(id)] as [bigint],
    })),
    [tokenIds],
  );

  const { data: owners, refetch: refetchOwners } = useReadContracts({
    contracts: ownerCalls,
    query: { enabled: isConnected && total > 0 },
  });

  const { data: tierData } = useReadContracts({
    contracts: tierCalls,
    query: { enabled: isConnected && total > 0 },
  });

  // ── 6. Build NFT list from on-chain data ────────────────────────────────────
  const stakedIdSet = useMemo(() => {
    const ids = (userInfo?.[1] ?? []) as bigint[];
    return new Set(ids.map((id) => Number(id)));
  }, [userInfo]);

  const nfts = useMemo((): PickaxeNFT[] => {
    if (!isConnected || !address || !owners || !tierData) return [];

    const result: PickaxeNFT[] = [];

    tokenIds.forEach((id) => {
      const owner   = owners[id]?.result   as string | undefined;
      const tierNum = tierData[id]?.result as number | undefined;
      if (tierNum === undefined) return;

      const isStaked = stakedIdSet.has(id);
      const isOwned  = owner?.toLowerCase() === address.toLowerCase();

      // Only show NFTs the user owns OR has staked
      if (!isOwned && !isStaked) return;

      const rarity = TIER_TO_RARITY[tierNum] ?? "Silver";
      const cfg    = RARITY_CONFIG[rarity];

      result.push({
        id,
        tokenId: `#${id.toString().padStart(4, "0")}`,
        name:    `${rarity} Pickaxe`,
        rarity,
        hashrate: cfg.hashrate,
        staked:  isStaked,
        image:   cfg.image,
      });
    });

    return result;
  }, [isConnected, address, owners, tierData, stakedIdSet, tokenIds]);

  // ── 7. Stake / unstake with real contract calls ──────────────────────────────
  const handleStake = async (id: number) => {
    if (!miningActive) {
      alert("Mining pool has not started yet. The owner must call start() and fund 4,000 VENA first.");
      throw new Error("Mining not active");
    }
    try {
      // Approve VenaMining to transfer NFTs if not already approved
      if (!isApproved) {
        await writeContractAsync({
          address: PICKAXE_ADDR,
          abi: pickaxeABI,
          functionName: "setApprovalForAll",
          args: [MINING_ADDR, true],
        });
        await refetchApproval();
      }
      await writeContractAsync({
        address: MINING_ADDR,
        abi: miningABI,
        functionName: "stakeNFT",
        args: [BigInt(id)],
      });
      await Promise.all([refetchOwners(), refetchUserInfo()]);
    } catch (err) {
      console.error("Stake failed:", err);
    }
  };

  const handleUnstake = async (id: number) => {
    try {
      await writeContractAsync({
        address: MINING_ADDR,
        abi: miningABI,
        functionName: "unstakeNFT",
        args: [BigInt(id)],
      });
      await Promise.all([refetchOwners(), refetchUserInfo()]);
    } catch (err) {
      console.error("Unstake failed:", err);
    }
  };

  // ── 8. Derived stats ─────────────────────────────────────────────────────────
  const stakedNfts      = useMemo(() => nfts.filter((n) => n.staked), [nfts]);
  const totalHashrate   = useMemo(() => stakedNfts.reduce((s, n) => s + n.hashrate, 0), [stakedNfts]);
  const totalMiningPower = useMemo(
    () => stakedNfts.reduce((s, n) => s + effectiveMiningPower(n.hashrate, n.rarity), 0),
    [stakedNfts],
  );
  const stakedCount = stakedNfts.length;

  const filtered = useMemo(
    () => (filter === "All" ? nfts : nfts.filter((n) => n.rarity === filter)),
    [nfts, filter],
  );

  const isLoading = isConnected && total > 0 && (!owners || !tierData);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <section
      id="mining"
      className="relative min-h-screen py-24 px-4 sm:px-6 lg:px-8 cyber-grid"
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(0,255,136,0.05) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto">
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
            Higher rarity, higher {PROJECT.tokenSymbol}. Stake Pickaxes to earn from the
            mining pool.
          </p>
          {isConnected && (
            <p className="mt-2 text-slate-600 text-xs font-mono">
              {stakedCount}/{nfts.length} staked · {formatNumber(totalHashrate)} H/s ·{" "}
              {formatNumber(totalMiningPower)} mining power
            </p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          <div>
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="flex flex-wrap items-center gap-3 mb-6"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Filter size={13} className="text-slate-500" />
                  {(["All", ...RARITY_ORDER] as const).map((r) => {
                    const color  = r === "All" ? "#64748b" : RARITY_CONFIG[r].color;
                    const active = filter === r;
                    return (
                      <button
                        key={r}
                        onClick={() => setFilter(r as Rarity | "All")}
                        className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase font-mono transition-all duration-200"
                        style={{
                          background:  active ? `${color}25` : "rgba(255,255,255,0.03)",
                          border:      active ? `1px solid ${color}60` : "1px solid rgba(255,255,255,0.06)",
                          color:       active ? color : "rgb(100,116,139)",
                          boxShadow:   active ? `0 0 10px ${color}20` : "none",
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>

                <div className="ml-auto flex items-center gap-1 p-1 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                  <button
                    onClick={() => setGridView(true)}
                    className={`p-1.5 rounded-md transition-all ${gridView ? "bg-[rgba(0,212,255,0.15)] text-[#00d4ff]" : "text-slate-600 hover:text-slate-400"}`}
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    onClick={() => setGridView(false)}
                    className={`p-1.5 rounded-md transition-all ${!gridView ? "bg-[rgba(0,212,255,0.15)] text-[#00d4ff]" : "text-slate-600 hover:text-slate-400"}`}
                  >
                    <List size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {isConnected && (
              <ForgeUpgradePanel
                compact
                nfts={nfts}
                onForged={() => {
                  void Promise.all([refetchOwners(), refetchUserInfo()]);
                }}
              />
            )}

            <AnimatePresence mode="popLayout">
              {!isConnected ? (
                /* ── Not connected ── */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-24 px-6 text-center rounded-2xl border border-[rgba(0,212,255,0.12)] bg-[rgba(10,15,22,0.6)]"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)" }}
                  >
                    <Wallet size={24} className="text-[#00d4ff]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "var(--font-orbitron)" }}>
                    Connect wallet
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
                    Link your wallet to view Pickaxes, stake for mining, and track rewards.
                  </p>
                  <button
                    type="button"
                    onClick={() => open()}
                    className="px-6 py-3 rounded-xl font-semibold text-sm tracking-wider text-[#030609]"
                    style={{ fontFamily: "var(--font-orbitron)", backgroundImage: "linear-gradient(135deg, #32cd32 0%, #00ff88 50%, #00d4ff 100%)" }}
                  >
                    Connect Wallet
                  </button>
                </motion.div>

              ) : isLoading ? (
                /* ── Loading chain data ── */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-24 gap-3"
                >
                  <Loader2 size={28} className="text-[#00d4ff] animate-spin" />
                  <p className="text-slate-500 font-mono text-sm">Reading your Pickaxes from chain…</p>
                </motion.div>

              ) : nfts.length === 0 ? (
                /* ── No NFTs owned ── */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(10,15,22,0.6)]"
                >
                  <div className="text-5xl mb-4">⛏️</div>
                  <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: "var(--font-orbitron)" }}>
                    No Pickaxes found
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm">
                    You don&apos;t own any Pickaxe NFTs yet. Mint a Silver Pickaxe for 0.01 ETH on /mint.
                  </p>
                  <Link
                    href={PROJECT.routes.mint}
                    className="mt-4 text-sm text-[#00d4ff] hover:underline font-mono"
                  >
                    Mint Pickaxe →
                  </Link>
                </motion.div>

              ) : filtered.length === 0 ? (
                /* ── Filter returns nothing ── */
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
                /* ── NFT grid ── */
                <div className={gridView ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" : "flex flex-col gap-3"}>
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

          {/* ── Sidebar stats ── */}
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
                walletConnected={isConnected}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-4 grid grid-cols-2 gap-3"
            >
              {[
                { label: "Staked",    value: isConnected ? `${stakedCount}/${nfts.length}` : "—",                        sub: "Pickaxes"   },
                { label: "Hashrate",  value: isConnected ? formatNumber(totalHashrate) : "—",                             sub: "H/s Active" },
                { label: "Est. Daily",value: isConnected ? formatVenaAmount(venaPerDayFromPower(totalMiningPower)) : "—", sub: `${PROJECT.tokenSymbol}/day est.` },
                { label: "Tier Bonus",value: isConnected ? "1.0×" : "—",                                                 sub: "Multiplier" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-3.5 rounded-xl"
                  style={{ background: "rgba(13,21,32,0.8)", border: "1px solid rgba(0,212,255,0.1)" }}
                >
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">
                    {stat.label}
                  </div>
                  <div className="text-base font-black text-white leading-none" style={{ fontFamily: "var(--font-orbitron)" }}>
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
