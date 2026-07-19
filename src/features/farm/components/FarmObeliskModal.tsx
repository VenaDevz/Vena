"use client";

import { X, Lock, Database } from "lucide-react";

type Props = {
  onClose: () => void;
  // Leaderboard
  primeCrystal: number | null;
  totalCrystalProduced: number;
  gridTier: number;
  builtPlots: number;
  streakCount: number;
  address: `0x${string}`;
  // Season & Exchange
  crystal: number;
  exchange: any;
  exchangePoolLeft: number;
  exchangePoolTotal: number;
  tradesFilled: number;
  onExchangeCrystal: (amount: number) => void;
};

export default function FarmObeliskModal({
  onClose,
  primeCrystal,
  totalCrystalProduced,
  gridTier,
  builtPlots,
  streakCount,
  address,
  crystal,
  exchange,
  exchangePoolLeft,
  exchangePoolTotal,
  tradesFilled,
  onExchangeCrystal,
}: Props) {
  return (
    <div className="farm-bazaar-modal-overlay" onClick={onClose}>
      <div className="farm-bazaar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="farm-bazaar-modal-awning" aria-hidden />

        <div className="farm-bazaar-modal-header">
          <div className="farm-bazaar-modal-title-row">
            <div>
              <p className="farm-bazaar-modal-kicker text-purple-400">⚡ Ancient Relic</p>
              <h2 className="farm-bazaar-modal-title">The Obelisk</h2>
            </div>
            <button type="button" onClick={onClose} className="farm-bazaar-modal-close" aria-label="Close Obelisk">
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="farm-bazaar-modal-body flex flex-col gap-4 mt-2">

          <div className="farm-bazaar-stats" style={{ padding: "32px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            <div className="farm-hud-chip-icon farm-hud-chip-icon-crystal" style={{ width: "64px", height: "64px", fontSize: "32px", margin: "0 auto", animation: "farm-plot-pulse 2s infinite" }}>
              <Lock size={32} />
            </div>
            
            <h3 className="text-xl font-bold text-white tracking-widest uppercase">Beta Phase Active</h3>
            
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
              The treasury liquidity pool is currently forming from player trade fees. 
              On-chain $VENA & USDC exchange protocols are offline.
            </p>
            
            <div className="mt-4 p-4 border border-purple-500/20 bg-purple-900/10 rounded-lg">
              <p className="text-purple-300 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                <Database size={14} /> Protocol Status: Gathering Liquidity
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
