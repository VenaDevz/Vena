"use client";

import { useState, useRef, useEffect } from "react";
import { X, Target, Loader2 } from "lucide-react";
import Image from "next/image";
import { useWriteContract, useConfig, useAccount } from "wagmi";
import { waitForTransactionReceipt } from "@wagmi/core";
import { parseUnits } from "viem";
import { FARM_TREASURY } from "../config/farm-config";

type Props = {
  onClose: () => void;
  onReward: (reward: { type: string; amount: number; name: string; txHash?: string; isPaid?: boolean }) => void;
  hasFreeSpin: boolean;
  crystal: number;
};

const LOOT_TABLE = [
  { id: 1, chance: 35, type: "crystal", amount: 50000, name: "50K Crystal", image: "/farm/items/crystal.png", color: "text-[#00ff88]", bg: "bg-[#00ff88]/20" },
  { id: 2, chance: 20, type: "ore", amount: 25000, name: "25K Ore", image: "/farm/items/ore.png", color: "text-orange-300", bg: "bg-orange-500/20" },
  { id: 3, chance: 15, type: "iron", amount: 10000, name: "10K Iron", image: "/farm/items/iron.png", color: "text-slate-300", bg: "bg-slate-500/20" },
  { id: 4, chance: 10, type: "gold", amount: 2500, name: "2.5K Gold", image: "/farm/items/gold.png", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  { id: 5, chance: 18, type: "vena", amount: 1000, name: "1,000 $VENA", image: "/farm/items/vena-token.png", color: "text-[#00d4ff]", bg: "bg-[#00d4ff]/20" },
  { id: 6, chance: 1, type: "vena", amount: 10000, name: "10,000 $VENA", image: "/farm/items/vena-token.png", color: "text-[#c084fc]", bg: "bg-purple-500/20" },
  { id: 7, chance: 1, type: "core", amount: 1, name: "Power Core", image: "/farm/items/power_core.png", color: "text-red-400", bg: "bg-red-500/20" },
];

// Generate a random visual track for the roulette
const generateTrack = () => {
  const track = [];
  for (let i = 0; i < 40; i++) {
    track.push(LOOT_TABLE[Math.floor(Math.random() * LOOT_TABLE.length)]);
  }
  return track;
};

const VENA_CONTRACT_ADDRESS = "0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf";
const venaTokenAbi = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ type: "bool" }],
  }
] as const;

export default function FarmDecryptorModal({ onClose, onReward, hasFreeSpin, crystal }: Props) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [result, setResult] = useState<typeof LOOT_TABLE[0] | null>(null);
  const [track, setTrack] = useState(() => generateTrack());
  
  const { address } = useAccount();
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();

  const handleSpin = async (isPaid: boolean) => {
    if (isSpinning || isPaying) return;
    
    let payTxHash: string | undefined = undefined;

    if (isPaid) {
      try {
        setIsPaying(true);
        // Charge 5,000 VENA to the treasury
        const hash = await writeContractAsync({
          address: VENA_CONTRACT_ADDRESS,
          abi: venaTokenAbi,
          functionName: "transfer",
          args: [FARM_TREASURY, parseUnits("5000", 18)],
        });
        
        // Wait for absolute finality on the blockchain!
        const receipt = await waitForTransactionReceipt(config, { hash });
        if (receipt.status !== "success") throw new Error("Transaction reverted on chain.");
        
        payTxHash = hash;
      } catch (err) {
        console.error("Payment failed or rejected", err);
        setIsPaying(false);
        return; // Stop spin if they didn't pay
      }
    }
    
    try {
      setIsPaying(true); // Re-use isPaying as a loading state for the secure API call
      const res = await fetch("/api/farm/decryptor-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, isPaid, payTxHash })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to generate reward");
      }

      const won = data.reward;
      
      // First, instantly reset the track back to start
      setResult(null);
      setTrack(generateTrack());
      setIsPaying(false);
      
      // Wait a tiny tick for React to render the reset state
      setTimeout(() => {
        setIsSpinning(true);

        // Insert the SECURE winning item near the end of the track
        setTrack(prevTrack => {
          const newTrack = [...prevTrack];
          newTrack[35] = won;
          return newTrack;
        });

        // After CSS animation ends (4 seconds)
        setTimeout(() => {
          setResult(won);
          setIsSpinning(false);
          // Pass reward info, including the securely paid-out VENA txHash if won
          onReward({ type: won.type, amount: won.amount, name: won.name, txHash: data.txHash, isPaid });
        }, 4000);
      }, 50);

    } catch (err: any) {
      console.error("API error", err);
      alert("Reward API Error: " + err.message);
      setIsPaying(false);
    }
  };

  return (
    <div className="farm-bazaar-modal-overlay" onClick={onClose}>
      <div className="farm-bazaar-modal" onClick={(e) => e.stopPropagation()} style={{ width: "420px" }}>
        <div className="farm-bazaar-modal-awning" aria-hidden />

        <div className="farm-bazaar-modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
          <div className="farm-bazaar-modal-title-row">
            <div>
              <p className="farm-bazaar-modal-kicker text-[#00d4ff] flex items-center gap-1 font-bold">
                🚀 VenaLand
              </p>
              <h2 className="farm-bazaar-modal-title" style={{ fontSize: '24px', background: 'linear-gradient(to right, #fff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Orbital Chest
              </h2>
            </div>
            <button type="button" onClick={onClose} className="farm-bazaar-modal-close hover:bg-slate-800 transition-colors" aria-label="Close">
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="farm-bazaar-modal-body flex flex-col gap-5 mt-4">
          <p className="text-slate-400 text-sm text-center px-4 leading-relaxed">
            Call down an orbital supply drop to win rare resources, time warps, and $VENA. 
            <span className="block mt-1 text-[#00ff88] font-bold">Your first drop every 24h is FREE!</span>
          </p>

          {/* Spinner Window (Glassmorphism & Neon) */}
          <div className="relative w-full h-32 bg-[#05080f]/80 backdrop-blur-md border border-slate-700/50 rounded-xl overflow-hidden flex items-center shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
            
            {/* Center Selector Laser */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-[#00d4ff] transform -translate-x-1/2 z-10 shadow-[0_0_20px_2px_#00d4ff]">
              <div className="absolute top-0 left-1/2 w-3 h-3 bg-[#00d4ff] transform -translate-x-1/2 -translate-y-1/2 rotate-45 shadow-[0_0_10px_#00d4ff]"></div>
              <div className="absolute bottom-0 left-1/2 w-3 h-3 bg-[#00d4ff] transform -translate-x-1/2 translate-y-1/2 rotate-45 shadow-[0_0_10px_#00d4ff]"></div>
            </div>
            
            {/* Dark Edges Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#05080f] via-transparent to-[#05080f] z-0 pointer-events-none"></div>

            {/* Scrolling Track */}
            <div 
              className="flex items-center gap-3 px-1/2 z-0"
              style={{
                transform: isSpinning ? 'translateX(calc(-35 * 92px + 160px))' : (result ? 'translateX(calc(-35 * 92px + 160px))' : 'translateX(160px)'),
                transition: isSpinning ? 'transform 4s cubic-bezier(0.1, 0.7, 0.1, 1)' : 'none'
              }}
            >
              {track.map((item, i) => (
                <div 
                  key={i} 
                  className={`flex-shrink-0 w-20 h-24 rounded-lg border ${item.bg.replace('/20','/40')} ${item.bg} flex flex-col items-center justify-center gap-1 shadow-lg backdrop-blur-sm transition-all duration-300`}
                  style={{
                    background: `linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%)`,
                  }}
                >
                  <div className={`w-14 h-14 relative drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`}>
                    <Image src={item.image} alt={item.name} fill className="object-contain" />
                  </div>
                  <span className={`text-[9px] font-black uppercase text-center leading-tight tracking-wider ${item.color} drop-shadow-md`}>
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Result Banner */}
          <div className="h-20 flex items-center justify-center bg-black/30 rounded-lg border border-white/10 shadow-inner mt-2">
             {result && !isSpinning ? (
               <div className="animate-in zoom-in duration-300 text-center flex flex-col items-center">
                 <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Orbital Drop Secured</p>
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 relative">
                     <Image src={result.image} alt={result.name} fill className="object-contain" />
                   </div>
                   <p className={`text-2xl font-black uppercase tracking-wider ${result.color} drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]`}>
                     {result.name}
                   </p>
                 </div>
               </div>
             ) : (
               <div className="text-center opacity-50">
                 <Target size={24} className="mx-auto mb-1 text-[#00d4ff] animate-pulse" />
                 <p className="text-[10px] text-[#00d4ff] uppercase tracking-widest">Awaiting Coordinates</p>
               </div>
             )}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => handleSpin(false)}
              disabled={isSpinning || isPaying || !hasFreeSpin}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-sm tracking-widest transition-all border ${hasFreeSpin ? 'bg-[#00ff88]/20 border-[#00ff88]/50 text-[#00ff88] shadow-[0_0_15px_rgba(0,255,136,0.3)] hover:bg-[#00ff88]/30 hover:scale-105' : 'bg-white/5 border-white/10 text-slate-400 cursor-not-allowed'}`}
            >
              {hasFreeSpin ? "FREE SPIN" : "NEXT IN 12H"}
            </button>
            <button
              onClick={() => handleSpin(true)}
              disabled={isSpinning || isPaying}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-sm tracking-widest transition-all border flex items-center justify-center gap-2 ${isPaying || isSpinning ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed' : 'bg-[#00d4ff]/20 border-[#00d4ff]/50 text-[#00d4ff] shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:bg-[#00d4ff]/30 hover:scale-105'}`}
            >
              {isPaying ? <><Loader2 size={16} className="animate-spin" /> PROCESSING...</> : "SPIN (5,000 $VENA)"}
            </button>
          </div>
          
          <div className="mt-4 text-center">
             <p className="text-[11px] font-medium text-slate-400">Paid spins burn <strong className="text-white">50% $VENA</strong>. 50% goes to <strong className="text-white">Treasury</strong>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
