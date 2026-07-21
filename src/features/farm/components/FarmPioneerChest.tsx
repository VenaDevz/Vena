"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { parseUnits } from "viem";
import { RH_CONTRACTS, erc20Abi } from "@/lib/contracts/robinhood";
import { targetChainId } from "@/config/wagmi";
import { FARM_TREASURY } from "../config/farm-config";

type AnimPhase = "idle" | "confirming" | "charging" | "opening" | "flash" | "done";

type FarmPioneerChestProps = {
  onSuccess: () => void;
};

export default function FarmPioneerChest({ onSuccess }: FarmPioneerChestProps) {
  const { address } = useAccount();
  const [phase, setPhase] = useState<AnimPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { writeContract, data: txHash, isPending: txPending, error: txError, reset: resetTx } = useWriteContract();
  const { isLoading: txConfirming, isSuccess: txSuccess, isError: txFailed } = useWaitForTransactionReceipt({ hash: txHash });

  // Handle transaction states
  useEffect(() => {
    if (txPending) {
      setPhase("confirming");
    } else if (txConfirming) {
      setPhase("charging");
    } else if (txFailed || txError) {
      setPhase("idle");
      setErrorMessage("Transaction failed or was rejected.");
      resetTx();
    } else if (txSuccess && phase === "charging") {
      setPhase("opening");
      openPioneerChest(txHash as string);
    }
  }, [txPending, txConfirming, txFailed, txError, txSuccess, txHash, phase, resetTx]);

  const handleBuy = useCallback(() => {
    if (!RH_CONTRACTS.usdgToken) {
      setErrorMessage("USDG Token not configured");
      return;
    }
    setErrorMessage(null);
    setPhase("confirming");
    
    // Cost is 10 USDG (assuming 6 decimals)
    writeContract({
      address: RH_CONTRACTS.usdgToken,
      abi: erc20Abi,
      functionName: "transfer",
      args: [FARM_TREASURY, parseUnits("10", 6)],
      chainId: targetChainId,
    });
  }, [writeContract]);

  const openPioneerChest = async (hash: string) => {
    try {
      const res = await fetch("/api/farm/pioneer-chest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, txHash: hash }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open chest");

      // Flash sequence
      setPhase("flash");
      setTimeout(() => {
        setPhase("done");
      }, 800);
    } catch (e: any) {
      setErrorMessage(e.message);
      setPhase("idle");
      resetTx();
    }
  };

  const getImg = (p: AnimPhase) => {
    if (p === "charging") return "/venachest-glow-nobg.png";
    if (p === "opening" || p === "flash") return "/venachest-open-nobg.png";
    return "/venachest-nobg.png";
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto rounded-2xl border border-[#00f0ff]/20 bg-[#0a0a0f]/95 shadow-[0_0_40px_rgba(0,240,255,0.1)]">
      {errorMessage && (
        <div className="mb-4 w-full rounded-lg bg-red-500/20 p-3 text-sm text-red-400 text-center border border-red-500/30">
          {errorMessage}
        </div>
      )}

      {phase === "idle" && (
        <div className="text-center">
          <div className="relative w-48 h-48 mx-auto mb-4 hover:scale-105 transition-transform">
            <Image src={getImg("idle")} alt="Pioneer Chest" fill className="object-contain drop-shadow-[0_0_15px_rgba(0,240,255,0.3)]" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30">
            <span className="text-[#00ff88] text-[10px] uppercase font-bold tracking-widest">
              ✓ 250k VENA Requirement Met
            </span>
          </div>
          <h3 className="text-xl font-bold text-white mb-2 font-orbitron tracking-wider">Pioneer Chest</h3>
          <p className="text-sm text-slate-400 mb-6">Unbox your VenaLand Base NFT and deploy your command center. Guaranteed Base NFT inside.</p>
          <button
            onClick={handleBuy}
            className="w-full py-3.5 rounded-xl font-black text-sm tracking-widest text-[#030609] transition-transform hover:scale-[1.02]"
            style={{
              backgroundImage: "linear-gradient(135deg, #00f0ff 0%, #0080ff 100%)",
              boxShadow: "0 0 20px rgba(0,240,255,0.4)",
            }}
          >
            BUY & UNBOX (10 USDG)
          </button>
        </div>
      )}

      {(phase === "confirming" || phase === "charging") && (
        <div className="text-center w-full min-h-[300px] flex flex-col justify-center">
          <div className="relative w-56 h-56 mx-auto" style={{ animation: phase === "charging" ? "pulse-glow 0.5s infinite" : "pulse-glow 2s infinite" }}>
            <Image src={getImg(phase)} alt="Chest" fill className="object-contain" />
          </div>
          <p className="mt-6 text-[#00f0ff] font-bold animate-pulse text-sm uppercase tracking-widest">
            {phase === "confirming" ? "Waiting for Wallet Signature..." : "Charging Network Transaction..."}
          </p>
        </div>
      )}

      {phase === "opening" && (
        <div className="text-center w-full min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="w-80 h-80 relative" style={{ animation: "chest-open-zoom 1.8s ease-out forwards" }}>
            <Image src={getImg("opening")} alt="Opened!" fill className="object-contain drop-shadow-[0_0_40px_rgba(255,255,255,1)]" />
          </div>
        </div>
      )}

      {phase === "flash" && (
        <div className="text-center w-full min-h-[300px] flex flex-col items-center justify-center">
          <div className="w-96 h-96 relative" style={{ animation: "chest-fade-after-open 0.8s ease-out forwards" }}>
            <Image src={getImg("flash")} alt="Fading" fill className="object-contain" />
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="text-center animate-in fade-in zoom-in duration-500">
          <div className="relative w-48 h-48 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(0,255,136,0.5)]">
            <Image src="/miner/composites/robot-base.png" alt="VenaLand Base" fill className="object-contain" />
          </div>
          <h3 className="text-2xl font-black text-[#00ff88] mb-2 font-orbitron">ACCESS GRANTED</h3>
          <p className="text-sm text-slate-300 mb-2">You successfully acquired a <span className="font-bold text-[#00f0ff]">2x2 Command Base (Tier 1)</span>.</p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/30">
            <span className="text-[#00f0ff] text-[10px] uppercase font-bold tracking-widest">
              NFT DEPLOYED TO WALLET
            </span>
          </div>
          <button
            onClick={onSuccess}
            className="w-full py-4 rounded-xl font-black text-sm tracking-widest text-[#0a0a0f] transition-all hover:scale-[1.02] bg-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.4)]"
          >
            ENTER COMMAND CENTER
          </button>
        </div>
      )}
    </div>
  );
}
