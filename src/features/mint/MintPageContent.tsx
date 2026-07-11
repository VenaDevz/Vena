"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  useAccount,
  useBalance,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { formatUnits, parseEther } from "viem";
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  Loader2,
  Pickaxe,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PROJECT } from "@/lib/project";
import {
  forgeAbi,
  isForgeLive,
  isPickaxeDeployed,
  pickaxeNftAbi,
  RH_CONTRACTS,
  TIER_INDEX,
} from "@/lib/contracts/robinhood";
import {
  RARITY_TIERS,
  SILVER_MINT_ETH,
  TIER_MAX_SUPPLY,
  tierUpgradeVena,
} from "@/lib/tokenomics";
import { formatVena } from "@/lib/mint-pricing";
import { FORGE_RECIPES } from "@/lib/forge";
import { getPickaxeImage, type Rarity } from "@/lib/types";

function upgradeLadderCopy(tier: Rarity): string {
  if (tier === "Silver") return `${SILVER_MINT_ETH} ETH mint`;

  const recipe = FORGE_RECIPES.find((row) => row.outputTier === tier);
  const vena = formatVena(tierUpgradeVena(tier));
  if (!recipe) return `${vena} $VENA`;

  return `Burn ${recipe.inputCount} ${recipe.inputTier} · ${vena} $VENA`;
}

function pickaxeImageInset(tier: Rarity): string {
  if (tier === "Diamond") return "inset-5 sm:inset-6";
  if (tier === "Emerald") return "inset-4 sm:inset-5";
  return "inset-3 sm:inset-4";
}

export default function MintPageContent() {
  const { address, isConnected, chain } = useAccount();
  const { open } = useAppKit();
  const [step, setStep] = useState<"idle" | "minting">("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const forgeLive = isForgeLive();
  const nftDeployed = isPickaxeDeployed();
  const wrongChain = isConnected && chain?.id !== PROJECT.chainId;

  const { data: ethBalance } = useBalance({
    address,
    query: { enabled: Boolean(address) },
  });

  const { data: chainData, refetch: refetchChain } = useReadContracts({
    contracts: [
      {
        address: RH_CONTRACTS.pickaxeNft,
        abi: pickaxeNftAbi,
        functionName: "totalMinted",
      },
      {
        address: RH_CONTRACTS.pickaxeNft,
        abi: pickaxeNftAbi,
        functionName: "tierConfig",
        args: [TIER_INDEX.Silver],
      },
      {
        address: RH_CONTRACTS.forge,
        abi: forgeAbi,
        functionName: "silverPriceWei",
      },
      {
        address: RH_CONTRACTS.forge,
        abi: forgeAbi,
        functionName: "paused",
      },
    ],
    query: {
      enabled: nftDeployed,
      refetchInterval: 15_000,
    },
  });

  const totalMinted = chainData?.[0]?.result as bigint | undefined;
  const silverTier = chainData?.[1]?.result as
    | readonly [bigint, bigint, bigint, string]
    | undefined;
  const onChainWei = chainData?.[2]?.result as bigint | undefined;
  const forgePaused = chainData?.[3]?.result as boolean | undefined;

  const silverMinted = silverTier ? Number(silverTier[1]) : undefined;
  const silverMax = silverTier ? Number(silverTier[0]) : TIER_MAX_SUPPLY.Silver;
  const mintEthWei = onChainWei ?? parseEther(SILVER_MINT_ETH);
  const supplyPct =
    silverMinted !== undefined
      ? Math.min(100, (silverMinted / silverMax) * 100)
      : 0;
  const soldOut = silverMinted !== undefined && silverMinted >= silverMax;

  const mintCostEth = formatUnits(mintEthWei, 18);
  const hasEthBalance =
    ethBalance !== undefined && ethBalance.value >= mintEthWei;

  const { writeContractAsync } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({ hash: txHash });

  const mintStatus: "preview" | "waiting-forge" | "ready" | "paused" | "soldout" =
    useMemo(() => {
      if (!nftDeployed) return "preview";
      if (!forgeLive) return "waiting-forge";
      if (forgePaused) return "paused";
      if (soldOut) return "soldout";
      return "ready";
    }, [nftDeployed, forgeLive, forgePaused, soldOut]);

  const handleMint = useCallback(async () => {
    if (!forgeLive || !address) return;
    try {
      setStep("minting");
      const hash = await writeContractAsync({
        address: RH_CONTRACTS.forge,
        abi: forgeAbi,
        functionName: "mintSilver",
        value: mintEthWei,
      });
      setTxHash(hash);
      setStep("idle");
      refetchChain();
    } catch {
      setStep("idle");
    }
  }, [address, forgeLive, mintEthWei, refetchChain, writeContractAsync]);

  const busy = step !== "idle" || confirming;
  const priceLabel = `${Number(mintCostEth)} ETH`;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#030609]">
        <section className="relative overflow-hidden pt-28 pb-12">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(0,212,255,0.14) 0%, transparent 55%)",
            }}
          />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 hover:text-[#00d4ff] transition-colors mb-8"
            >
              <ArrowLeft size={14} />
              Back to protocol
            </Link>

            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                <p className="text-[10px] font-mono tracking-[0.35em] text-[#00d4ff]/80 uppercase mb-3">
                  {SILVER_MINT_ETH} ETH · {PROJECT.network}
                </p>
                <h1
                  className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] mb-5"
                  style={{ fontFamily: "var(--font-orbitron)" }}
                >
                  Mint.
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#C0C0C0] via-white to-[#00ff88]">
                    Fuel the pool.
                  </span>
                </h1>
                <p className="text-slate-400 leading-relaxed max-w-lg mb-8">
                  No {PROJECT.tokenSymbol} needed to start. Mint your Silver Pickaxe
                  for {SILVER_MINT_ETH} ETH — every mint buys {PROJECT.tokenDisplay}{" "}
                  into the <span className="text-[#00ff88]">staking pool</span>. You
                  earn when staking goes live.
                </p>

                <div className="p-5 rounded-2xl border border-[#00ff88]/15 bg-[rgba(0,255,136,0.04)] mb-8">
                  <p className="text-[10px] font-mono text-[#00ff88]/80 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <RefreshCw size={12} />
                    Staking flywheel
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    {[
                      "You mint (ETH)",
                      "Treasury",
                      "Buy $VENA",
                      "Staking pool",
                      "You stake & earn",
                    ].map((label, i, arr) => (
                      <span key={label} className="flex items-center gap-2">
                        <span className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/8 text-slate-300">
                          {label}
                        </span>
                        {i < arr.length - 1 && (
                          <ArrowRight size={14} className="text-slate-600 shrink-0" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="relative w-full max-w-sm mx-auto lg:mx-0 aspect-square">
                  <div
                    className="absolute inset-0 rounded-full blur-3xl opacity-30"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(192,192,192,0.5) 0%, transparent 70%)",
                    }}
                  />
                  <Image
                    src={getPickaxeImage("Silver")}
                    alt="Silver Pickaxe"
                    fill
                    className="object-contain drop-shadow-[0_0_50px_rgba(192,192,192,0.4)]"
                    priority
                    sizes="400px"
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="lg:sticky lg:top-28"
              >
                <div className="mb-6 p-5 rounded-2xl border border-white/8 bg-[rgba(10,15,22,0.85)]">
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <span className="text-slate-500">Silver minted</span>
                    <span className="text-white">
                      {silverMinted?.toLocaleString() ?? "0"} /{" "}
                      {silverMax.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#C0C0C0] via-[#00d4ff] to-[#00ff88]"
                      initial={{ width: 0 }}
                      animate={{ width: `${supplyPct}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                  {totalMinted !== undefined && (
                    <p className="mt-2 text-[10px] font-mono text-slate-600">
                      {totalMinted.toLocaleString()} total Pickaxes minted
                    </p>
                  )}
                </div>

                <div
                  className="p-6 sm:p-8 rounded-2xl border border-[rgba(0,212,255,0.25)]"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(0,212,255,0.08) 0%, rgba(3,6,9,0.98) 45%)",
                    boxShadow: "0 0 48px rgba(0,212,255,0.1)",
                  }}
                >
                  <div className="flex items-end justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                        Silver Pickaxe
                      </p>
                      <p
                        className="text-4xl font-black text-white mt-1"
                        style={{ fontFamily: "var(--font-orbitron)" }}
                      >
                        {priceLabel}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-mono text-slate-500">Power</p>
                      <p className="text-2xl font-bold text-[#00d4ff]">10</p>
                    </div>
                  </div>

                  {mintStatus === "preview" && (
                    <div className="text-center py-6 text-sm text-slate-400">
                      <Sparkles className="mx-auto mb-2 text-[#00d4ff]" size={24} />
                      Deploy VPICK contract first
                    </div>
                  )}

                  {mintStatus === "waiting-forge" && (
                    <div className="text-center py-6 text-sm text-slate-400">
                      <TrendingUp className="mx-auto mb-2 text-[#00ff88]" size={24} />
                      VPICK live — deploy Forge to open mint
                    </div>
                  )}

                  {mintStatus === "paused" && (
                    <p className="text-center text-amber-400 text-sm py-6 font-mono">
                      Mint paused
                    </p>
                  )}

                  {mintStatus === "soldout" && (
                    <p className="text-center text-[#00d4ff] text-sm py-6 font-mono">
                      Silver sold out
                    </p>
                  )}

                  {mintStatus === "ready" && (
                    <>
                      {isConnected && (
                        <p className="text-xs font-mono text-slate-500 mb-4 text-center">
                          <Wallet size={12} className="inline mr-1 -mt-0.5" />
                          {`${Number(formatUnits(ethBalance?.value ?? BigInt(0), 18)).toFixed(4)} ETH`}
                          {!hasEthBalance && (
                            <span className="text-amber-500 block mt-1">
                              Insufficient balance
                            </span>
                          )}
                        </p>
                      )}

                      {wrongChain ? (
                        <button
                          type="button"
                          onClick={() => open({ view: "Networks" })}
                          className="w-full py-4 rounded-xl font-bold text-sm text-[#030609]"
                          style={{
                            fontFamily: "var(--font-orbitron)",
                            background: "linear-gradient(135deg, #ff6b6b, #ff8e53)",
                          }}
                        >
                          Switch to {PROJECT.network}
                        </button>
                      ) : !isConnected ? (
                        <button
                          type="button"
                          onClick={() => open()}
                          className="w-full py-4 rounded-xl font-bold text-sm text-[#030609]"
                          style={{
                            fontFamily: "var(--font-orbitron)",
                            background:
                              "linear-gradient(135deg, #32cd32, #00ff88, #00d4ff)",
                            boxShadow: "0 0 36px rgba(0,255,136,0.35)",
                          }}
                        >
                          Connect Wallet
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busy || !hasEthBalance}
                          onClick={handleMint}
                          className="w-full py-4 rounded-xl font-bold text-sm text-[#030609] disabled:opacity-45 flex items-center justify-center gap-2"
                          style={{
                            fontFamily: "var(--font-orbitron)",
                            background:
                              "linear-gradient(135deg, #32cd32, #00ff88, #00d4ff)",
                            boxShadow: "0 0 36px rgba(0,255,136,0.35)",
                          }}
                        >
                          {busy ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              Minting…
                            </>
                          ) : (
                            <>
                              <Pickaxe size={18} />
                              Mint for {SILVER_MINT_ETH} ETH
                            </>
                          )}
                        </button>
                      )}
                    </>
                  )}

                  <p className="mt-5 text-[10px] text-center font-mono text-slate-600 leading-relaxed">
                    <Coins size={10} className="inline mr-1" />
                    100% of mint fees → {PROJECT.tokenDisplay} buybacks → staking pool
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-16 border-t border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2
              className="text-2xl font-black text-white text-center mb-10"
              style={{ fontFamily: "var(--font-orbitron)" }}
            >
              Upgrade ladder
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {RARITY_TIERS.map((tier) => (
                <div
                  key={tier.id}
                  className="rounded-2xl overflow-hidden border border-white/8 bg-[rgba(10,15,22,0.9)]"
                  style={{ borderColor: `${tier.color}22` }}
                >
                  <div className="aspect-square relative overflow-hidden">
                    <div className={`absolute ${pickaxeImageInset(tier.id as Rarity)}`}>
                      <Image
                        src={getPickaxeImage(tier.id as Rarity)}
                        alt={tier.label}
                        fill
                        className="pickaxe-blend object-contain"
                        sizes="20vw"
                      />
                    </div>
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(3,6,9,0.95) 0%, transparent 55%)",
                      }}
                    />
                  </div>
                  <div className="p-4 -mt-2 relative z-10">
                    <h3
                      className="font-bold"
                      style={{ color: tier.color, fontFamily: "var(--font-orbitron)" }}
                    >
                      {tier.label}
                    </h3>
                    <p className="text-xs font-mono text-slate-500 mt-2 leading-relaxed">
                      {upgradeLadderCopy(tier.id as Rarity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
