"use client";

import Image from "next/image";
import Link from "next/link";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import ConnectRabbyButton from "@/components/ConnectRabbyButton";
import { getBuyVenaHref } from "@/lib/links";
import FarmPioneerChest from "./FarmPioneerChest";
import {
  FARM_MIN_VENA_HOLD,
  FARM_PICKAXE_START_CRYSTAL,
  FARM_START_CRYSTAL,
} from "../config/farm-config";

type FarmGateProps = {
  isConnected: boolean;
  hasAccess: boolean;
  hasPickaxe: boolean;
  pickaxeRequired: boolean;
  balanceVena: number;
  venaLoading: boolean;
};

export default function FarmGate({
  isConnected,
  hasAccess,
  hasPickaxe,
  balanceVena,
  venaLoading,
}: FarmGateProps) {
  const meetsVena = balanceVena >= FARM_MIN_VENA_HOLD;
  return (
    <div className="w-full min-h-[85vh] flex flex-col md:flex-row rounded-3xl overflow-visible bg-black/40 backdrop-blur-xl border border-white/5 relative shadow-2xl">
      {/* LEFT COLUMN: Lore & Requirements */}
      <div className="flex-1 w-full flex flex-col justify-center p-8 lg:p-16 text-center md:text-left relative z-10 bg-gradient-to-br from-[#00ff88]/5 to-transparent rounded-t-3xl md:rounded-l-3xl md:rounded-tr-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,rgba(0,255,136,0.05)_0%,transparent_70%)] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-10 relative z-10">
          <div className="w-32 h-32 md:w-48 md:h-48 relative shrink-0">
            <Image
              src="/miner/robot-silver.png"
              alt="VENA Commander Robot"
              fill
              className="object-contain drop-shadow-[0_0_35px_rgba(0,255,136,0.4)]"
              priority
            />
          </div>
          <div className="flex flex-col justify-center pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 w-fit mx-auto md:mx-0">
              <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-[#00ff88] text-[10px] uppercase font-bold tracking-widest">Protocol Active</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white font-orbitron tracking-wider mb-4 drop-shadow-lg">
              COMMAND BASE
            </h2>
            <p className="text-sm md:text-base text-slate-400 leading-relaxed max-w-md mx-auto md:mx-0">
              Experience the ultimate cybernetic mining protocol. Deploy shafts, automate extraction, and dominate the grid.
            </p>
          </div>
        </div>

        <div className="w-full max-w-xl mx-auto md:mx-0 rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-md relative z-10 shadow-inner">
          <p className="text-[11px] uppercase tracking-widest text-[#00ff88] mb-5 font-bold flex items-center gap-3">
            <span className="w-6 h-[2px] bg-[#00ff88]" />
            Access Requirements
          </p>
          <ul className="space-y-5 text-sm text-slate-300">
            <li className="flex items-start gap-3">
              <div className="mt-0.5 w-4 h-4 rounded bg-[#00ff88]/20 border border-[#00ff88]/50 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 bg-[#00ff88] rounded-sm" />
              </div>
              <div>
                <p className="font-bold text-white mb-0.5">VenaLand Base NFT</p>
                <p className="text-xs text-slate-400">Required to deploy your command center.</p>
                {isConnected && (
                  <p className={`text-xs mt-1 font-bold ${hasAccess ? "text-[#00ff88]" : "text-amber-400"}`}>
                    {hasAccess ? "✓ Access Granted" : "⚠️ No Base Found"}
                  </p>
                )}
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-0.5 w-4 h-4 rounded bg-purple-500/20 border border-purple-500/50 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 bg-purple-400 rounded-sm" />
              </div>
              <div>
                <p className="font-bold text-white mb-0.5">Starter Pack</p>
                <p className="text-xs text-slate-400">Receive {FARM_START_CRYSTAL.toLocaleString("en-US")} Crystal upon first entry.</p>
                <p className="text-xs text-purple-400 mt-1">VPICK owners get +10% boost.</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* RIGHT COLUMN: Actions / Pioneer Chest */}
      <div className="flex-[0.8] w-full flex flex-col items-center justify-center p-8 lg:p-16 relative border-t md:border-t-0 md:border-l border-white/10 bg-[#060b16]/80 rounded-b-3xl md:rounded-r-3xl md:rounded-bl-none">
        <div className="w-full max-w-md flex flex-col justify-center items-center relative z-10">
          {!isConnected ? (
            <div className="w-full max-w-sm flex flex-col gap-5 items-center">
              <div className="w-16 h-16 rounded-2xl bg-[#00f0ff]/10 border border-[#00f0ff]/20 flex items-center justify-center mb-2">
                <span className="text-2xl">🔐</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1 font-orbitron text-center">Authenticate</h3>
              <p className="text-sm text-slate-400 text-center mb-4">Secure your connection to the grid.</p>
              <ConnectWalletButton fullWidth />
              <ConnectRabbyButton fullWidth />
            </div>
          ) : hasAccess ? (
            <div className="text-center animate-in fade-in zoom-in duration-1000 flex flex-col items-center">
              <div className="w-24 h-24 mb-6 relative">
                <div className="absolute inset-0 bg-[#00ff88] blur-xl opacity-20 rounded-full animate-pulse" />
                <Image src="/farmer/hologram-hq.png" alt="Base" fill className="object-contain drop-shadow-[0_0_20px_rgba(0,255,136,0.8)]" />
              </div>
              <p className="text-2xl font-black text-[#00ff88] font-orbitron mb-2 tracking-widest">ACCESS GRANTED</p>
              <p className="text-sm text-slate-400">Secure connection established.</p>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center">
              {!meetsVena ? (
                <div className="w-full flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="w-24 h-24 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full" />
                    <span className="text-5xl relative z-10 drop-shadow-[0_0_15px_rgba(0,212,255,0.5)]">🧊</span>
                  </div>
                  <h3 className="text-2xl font-black text-white font-orbitron mb-2 tracking-widest uppercase">Pioneer Chest</h3>
                  <p className="text-slate-400 mb-6 leading-relaxed max-w-sm text-sm">
                    Access to the grid is highly restricted. To deploy your command center, you must acquire a Pioneer Chest containing the <strong className="text-white">VenaLand Base NFT</strong>.
                  </p>
                  
                  <div className="w-full max-w-sm bg-black/50 border border-white/10 rounded-xl p-4 mb-8 text-left shadow-inner">
                    <p className="text-[10px] uppercase tracking-widest text-[#00d4ff] mb-3 font-bold">Unlocking Requirements</p>
                    <ul className="space-y-3">
                      <li className="flex items-center justify-between">
                        <span className="text-sm text-slate-300 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                          <strong className="text-white">250,000 VENA</strong> Hold
                        </span>
                        <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">Not Met</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span className="text-sm text-slate-300 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full" />
                          <strong className="text-white">10 USDG</strong> Mint Fee
                        </span>
                        <span className="text-[10px] text-[#00d4ff] bg-[#00d4ff]/10 px-2 py-0.5 rounded-md border border-[#00d4ff]/20">Required</span>
                      </li>
                    </ul>
                  </div>

                  <a 
                    href={getBuyVenaHref()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full max-w-sm block py-4 rounded-xl font-black text-sm tracking-widest text-center text-white transition-transform hover:scale-[1.03] active:scale-95"
                    style={{
                      backgroundImage: "linear-gradient(135deg, #00d4ff 0%, #0055ff 100%)",
                      boxShadow: "0 0 25px rgba(0,212,255,0.3)",
                      fontFamily: "var(--font-orbitron)"
                    }}
                  >
                    ACQUIRE VENA ON DEX
                  </a>
                </div>
              ) : (
                <div className="w-full flex items-center justify-center">
                  <FarmPioneerChest onSuccess={() => window.location.reload()} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-8 left-0 w-full text-center">
          <Link href="/miner" className="text-xs uppercase tracking-widest text-slate-500 hover:text-white transition-colors duration-300 px-4 py-2 rounded-full border border-white/5 hover:border-white/20 bg-white/5">
            Switch to Miner Command →
          </Link>
        </div>
      </div>
    </div>
  );
}
