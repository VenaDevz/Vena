"use client";

import { useState } from "react";
import { X, Store, ArrowLeftRight } from "lucide-react";
import FarmTradePanel from "./FarmTradePanel";
import FarmMarketPanel from "./FarmMarketPanel";
import type { ResourceStockpile } from "../lib/farm-storage";
import type { TradeOrder } from "../config/farm-trade";

type BazaarTab = "trade" | "store";

type Props = {
  crystal: number;
  resources: ResourceStockpile;
  balanceVena: number;
  owned: string[];
  isPaying: boolean;
  isDemoMode: boolean;
  tradesFilled: number;
  onFill: (order: TradeOrder) => boolean;
  onBuy: (itemId: string) => void;
  onClose: () => void;
};

export default function FarmBazaarModal({
  crystal,
  resources,
  balanceVena,
  owned,
  isPaying,
  isDemoMode,
  tradesFilled,
  onFill,
  onBuy,
  onClose,
}: Props) {
  const [tab, setTab] = useState<BazaarTab>("trade");

  return (
    <div
      className="farm-bazaar-modal-overlay"
      role="dialog"
      aria-modal
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="farm-bazaar-modal">
        {/* ── Header ── */}
        <div className="farm-bazaar-modal-header border-b border-white/10 pb-4 mb-2">
          <div className="farm-bazaar-modal-title-row flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 shadow-[0_0_15px_rgba(0,212,255,0.3)]">
                <Store size={16} className="text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">Command Marketplace</h2>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Trade resources & purchase upgrades</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors p-1"
              aria-label="Close marketplace"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>

          {/* Pill Tab Switcher */}
          <div className="flex mt-6 bg-black/40 p-1 rounded-full border border-white/5 w-fit">
            <button
              type="button"
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                tab === "trade" 
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(0,212,255,0.2)]" 
                  : "text-slate-500 hover:text-slate-300 border border-transparent"
              }`}
              onClick={() => setTab("trade")}
            >
              <ArrowLeftRight size={14} />
              P2P Trade
            </button>
            <button
              type="button"
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                tab === "store" 
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.2)]" 
                  : "text-slate-500 hover:text-slate-300 border border-transparent"
              }`}
              onClick={() => setTab("store")}
            >
              <Store size={14} />
              Upgrades
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="farm-bazaar-modal-body">
          {tab === "trade" ? (
            <FarmTradePanel
              crystal={crystal}
              resources={resources}
              tradesFilled={tradesFilled}
              onFill={onFill}
            />
          ) : (
            <FarmMarketPanel
              crystal={crystal}
              resources={resources}
              balanceVena={balanceVena}
              owned={owned}
              isPaying={isPaying}
              isDemoMode={isDemoMode}
              onBuy={onBuy}
            />
          )}
        </div>
      </div>
    </div>
  );
}
