"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import { PROJECT } from "@/lib/project";
import { formatCrystal, formatPrimeCrystal } from "../config/farm-config";
import type { ResourceStockpile } from "../lib/farm-storage";
import { getHalvingInfo } from "@/lib/mining";

type FarmHeaderProps = {
  crystal: number;
  rate: number;
  primeCrystal: number;
  balanceVena: number;
  isConnected: boolean;

  // New controls
  rallyActive?: boolean;
  rallyRemaining?: number;
  rallyOnCooldown?: boolean;
  rallyCooldownRemaining?: number;
  rallyBoost?: number;
  rallyCommander?: () => void;

  powerCores?: number;
  powerCoreMax?: number;
  nextCoreCost?: number | null;
  forgePowerCore?: () => void;

  resources?: ResourceStockpile;
};

function formatVenaBalance(balance: number): string {
  if (balance >= 1000) return `${(balance / 1000).toFixed(1)}K`;
  return balance.toFixed(0);
}

export default function FarmHeader({
  crystal,
  rate,
  primeCrystal,
  balanceVena,
  isConnected,
  rallyActive,
  rallyRemaining,
  rallyOnCooldown,
  rallyCooldownRemaining,
  rallyBoost,
  rallyCommander,
  powerCores = 0,
  powerCoreMax = 6,
  nextCoreCost,
  forgePowerCore,
  resources,
}: FarmHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [halvingText, setHalvingText] = useState("...");

  useEffect(() => {
    setMounted(true);
    const updateHalving = () => {
      const info = getHalvingInfo();
      const diff = info.nextHalvingMs - Date.now();
      if (diff <= 0) {
        setHalvingText("Halving Now!");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / 1000 / 60) % 60);
      setHalvingText(`${days}d ${hours}h ${mins}m`);
    };
    updateHalving();
    const int = setInterval(updateHalving, 60000);
    return () => clearInterval(int);
  }, []);

  const venaLabel = !mounted ? "—" : isConnected ? formatVenaBalance(balanceVena) : "—";

  return (
    <header className="farm-header sticky top-0 z-50">
      <div className="mx-auto flex h-[72px] w-full items-center justify-between gap-3 px-4 sm:px-6 relative">
        {/* Left Side: Logo & Protocol */}
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="shrink-0 text-[10px] uppercase tracking-widest text-slate-500 hover:text-[#00f0ff]"
            style={{ fontFamily: "Futura, sans-serif", fontWeight: 300 }}
          >
            ← Protocol
          </Link>
          <div className="hidden h-4 w-px bg-white/10 sm:block" />
          <div className="min-w-0">
            <h1 
              className="truncate text-sm font-bold text-[#00ff88] uppercase tracking-[0.2em]"
              style={{ fontFamily: "Futura, sans-serif" }}
            >
              VenaLand
            </h1>
          </div>
          <div className="hidden h-4 w-px bg-white/10 sm:block" />
          <div className="hidden lg:flex flex-col items-start justify-center">
             <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Next Halving</span>
             <span className="text-[11px] font-mono font-black text-red-400">{halvingText}</span>
          </div>
        </div>

        {/* Center/Right: Resources & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-end">
          
          {/* ── Additional Resources (Ore, Iron, Gold) ── */}
          <div className="farm-panel hidden px-3 py-1.5 xl:flex items-center gap-2 border-white/10">
            <Image src="/farm/items/ore.png" alt="Ore" width={28} height={28} className="object-contain drop-shadow-[0_0_5px_#b87333]" />
            <span className="text-[11px] font-bold uppercase text-slate-300">Ore </span>
            <span className="text-sm font-black tabular-nums text-orange-300">{formatCrystal(resources?.ore ?? 0)}</span>
          </div>
          <div className="farm-panel hidden px-3 py-1.5 xl:flex items-center gap-2 border-white/10">
            <Image src="/farm/items/iron.png" alt="Iron" width={28} height={28} className="object-contain drop-shadow-[0_0_5px_#a8b8c8]" />
            <span className="text-[11px] font-bold uppercase text-slate-300">Iron </span>
            <span className="text-sm font-black tabular-nums text-slate-200">{formatCrystal(resources?.iron ?? 0)}</span>
          </div>
          <div className="farm-panel hidden px-3 py-1.5 xl:flex items-center gap-2 border-white/10">
            <Image src="/farm/items/gold.png" alt="Gold" width={28} height={28} className="object-contain drop-shadow-[0_0_5px_#ffd700]" />
            <span className="text-[11px] font-bold uppercase text-slate-300">Gold </span>
            <span className="text-sm font-black tabular-nums text-yellow-300">{formatCrystal(resources?.gold ?? 0)}</span>
          </div>

          {/* ── Main Resources ── */}
          <div className="farm-panel hidden px-3 py-1.5 sm:flex items-center gap-2 border-l border-white/10 rounded-none bg-transparent shadow-none pl-3">
            <Image src="/farm/items/crystal.png" alt="Crystal" width={28} height={28} className="object-contain drop-shadow-[0_0_8px_#00ff88]" />
            <span className="text-[11px] font-bold uppercase text-slate-300">Crystal </span>
            <span className="farm-hud-stat text-base font-black tabular-nums text-[#00ff88]">
              {formatCrystal(crystal)}
            </span>
            <span className="ml-2 text-[11px] font-bold text-slate-400">
              +{rate.toFixed(1)}/s
            </span>
          </div>
          {mounted && primeCrystal > 0 && (
            <div className="farm-panel hidden px-3 py-1.5 lg:flex items-center gap-2">
              <Image src="/farm/items/crystal.png" alt="Prime" width={22} height={22} className="object-contain hue-rotate-[260deg] drop-shadow-[0_0_5px_#c084fc]" />
              <span className="text-[10px] uppercase text-slate-500">Prime </span>
              <span className="farm-hud-stat text-sm font-bold tabular-nums text-[#c084fc]">
                {formatPrimeCrystal(primeCrystal)}
              </span>
            </div>
          )}
          <div className="farm-panel px-3 py-1.5 bg-[#00d4ff]/10 border-[#00d4ff]/30 flex items-center gap-2">
            <Image src="/farm/items/vena-token.png" alt="VENA" width={28} height={28} className="object-contain drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
            <span className="text-[11px] font-bold uppercase text-slate-300">VENA </span>
            <span className="text-sm font-black tabular-nums text-[#00d4ff] drop-shadow-[0_0_5px_rgba(0,212,255,0.8)]">
              {venaLabel}
            </span>
            <a 
              href="https://app.uniswap.org/swap?outputCurrency=0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf&chain=robinhood" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ml-2 bg-[#00ff88]/10 hover:bg-[#00ff88]/30 border border-[#00ff88]/40 text-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.2)] px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all"
            >
              Buy $VENA
            </a>
          </div>

          <div className="h-6 w-px bg-white/10 mx-1 hidden lg:block" />

          {/* ── Power Cores (Moved to Header) ── */}
          <div className="farm-side-card flex items-center px-3 py-1.5 gap-3" style={{ background: "rgba(10,14,20,0.85)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-bold text-[#00d4ff] uppercase tracking-wider">Cores</span>
              <div className="farm-power-core-pips m-0 gap-[2px]">
                {Array.from({ length: powerCoreMax }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-3 rounded-sm ${i < powerCores ? "bg-[#00d4ff] shadow-[0_0_5px_#00d4ff]" : "bg-slate-700/50 border border-slate-600/30"}`}
                    title={i < powerCores ? `Core ${i + 1} active` : `Core ${i + 1} locked`}
                  />
                ))}
              </div>
            </div>
            {nextCoreCost !== undefined && nextCoreCost !== null ? (
              <button
                type="button"
                onClick={forgePowerCore}
                disabled={(primeCrystal ?? 0) < nextCoreCost}
                className="farm-power-core-btn text-[#00d4ff] hover:bg-[#00d4ff]/20 border border-[#00d4ff]/30 rounded px-2 py-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Forge Core ${powerCores + 1} — costs ${nextCoreCost} ◆`}
                style={{ fontSize: "9px" }}
              >
                FORGE
              </button>
            ) : (
              <span className="farm-power-core-maxed text-yellow-400 font-bold" style={{ fontSize: "9px", margin: 0 }}>MAX</span>
            )}
          </div>

          {/* ── Rally Button (Moved to Header) ── */}
          <div className="farm-side-card flex items-center justify-center px-3 py-1.5 min-w-[140px]" style={{ background: "rgba(10,14,20,0.85)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
            {rallyActive ? (
              <div className="flex items-center gap-2">
                <span className="text-yellow-300 animate-pulse">🔥</span>
                <div>
                  <p className="text-[10px] font-bold text-yellow-300">{rallyBoost}× Surge</p>
                  <p className="text-[8px] text-yellow-200/70">{rallyRemaining}s</p>
                </div>
              </div>
            ) : rallyOnCooldown ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">⏱️</span>
                <div>
                  <p className="text-[10px] font-bold text-slate-300">Recharging</p>
                  <p className="text-[8px] text-slate-500">{rallyCooldownRemaining}s</p>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={rallyCommander}
                className="flex items-center gap-2 text-left w-full hover:brightness-125 transition-all"
              >
                <span className="text-[#00ff88] drop-shadow-[0_0_5px_#00ff88]">🤖</span>
                <div>
                  <p className="text-[10px] font-bold text-[#00ff88] uppercase tracking-wider">Rally Crew!</p>
                  <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-0.5">2× speed (30s)</p>
                </div>
              </button>
            )}
          </div>

          <div className="h-6 w-px bg-white/10 mx-1 hidden lg:block" />

          {mounted ? <ConnectWalletButton /> : <div className="h-9 w-24 rounded-lg bg-white/5" aria-hidden />}
        </div>
      </div>
    </header>
  );
}
