"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import Image from "next/image";
import {
  Gem,
  Pickaxe,
  Cog,
  Coins,
  Frame,
  Sparkles,
  Zap,
  Timer,
  Crown,
  PackagePlus,
  Check,
  Store,
  ShoppingBag,
} from "lucide-react";
import {
  FARM_MARKET,
  FARM_MIN_VENA_HOLD,
  RESOURCE_META,
  formatCrystal,
  type FarmMarketCategory,
  type FarmMarketItem,
} from "../config/farm-config";
import type { ResourceStockpile } from "../lib/farm-storage";

const CATEGORY_LABELS: Record<FarmMarketCategory, string> = {
  cosmetic: "Cosmetics",
  perk: "Perks",
  premium: "Premium",
};

type IconType = ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string }>;

const CATEGORY_ICON: Record<FarmMarketCategory, IconType> = {
  cosmetic: Frame,
  perk: Zap,
  premium: Crown,
};

const CATEGORY_HINT: Record<FarmMarketCategory, string> = {
  cosmetic: "Visual upgrades for your base grid.",
  perk: "Permanent production & rally boosts.",
  premium: "VENA treasury sinks · on-chain in live mode.",
};



const RESOURCE_ICON: Record<"ore" | "iron" | "gold" | "crystal", IconType> = {
  ore: Pickaxe,
  iron: Cog,
  gold: Coins,
  crystal: Gem,
};

const ITEM_ICON: Record<string, IconType> = {
  neon_border: Frame,
  spark_fx: Sparkles,
  overclock: Zap,
  rapid_rally: Timer,
  crystal_cache: PackagePlus,
  founder_frame: Crown,
};

function shortNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return String(n);
}

type Props = {
  crystal: number;
  resources: ResourceStockpile;
  balanceVena: number;
  owned: string[];
  isPaying: boolean;
  isDemoMode: boolean;
  onBuy: (id: string) => void;
};

export default function FarmMarketPanel({
  crystal,
  resources,
  balanceVena,
  owned,
  isPaying,
  isDemoMode,
  onBuy,
}: Props) {
  const [tab, setTab] = useState<FarmMarketCategory>("cosmetic");
  const [pulseId, setPulseId] = useState<string | null>(null);
  const categories: FarmMarketCategory[] = ["cosmetic", "perk", "premium"];

  const ownedCount = owned.length;
  const items = useMemo(
    () => FARM_MARKET.filter((i) => i.category === tab),
    [tab]
  );

  function canBuy(item: FarmMarketItem): boolean {
    const has = !item.repeatable && owned.includes(item.key);
    if (has) return false;
    if (item.costVena) {
      return isDemoMode || balanceVena >= FARM_MIN_VENA_HOLD + item.costVena;
    }
    return crystal >= (item.costCrystal ?? 0);
  }

  function priceLabel(item: FarmMarketItem): string {
    if (item.costVena) return `${shortNum(item.costVena)} VENA`;
    return `${shortNum(item.costCrystal ?? 0)} Crystal`;
  }

  function handleBuy(id: string) {
    onBuy(id);
    setPulseId(id);
    window.setTimeout(() => setPulseId(null), 600);
  }

  return (
    <div className="flex flex-col gap-4">

        <div className="flex items-center gap-3 bg-black/20 p-2.5 rounded-lg border border-white/5">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#00ff88]/10 rounded text-[#00ff88] text-[11px] font-bold tracking-wider">
            <Gem size={12} />
            {formatCrystal(crystal)}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#c084fc]/10 rounded text-[#c084fc] text-[11px] font-bold tracking-wider">
            <ShoppingBag size={12} />
            {ownedCount} OWNED
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded text-white text-[11px] font-bold tracking-wider ml-auto">
            <span className="text-[#00d4ff]">VENA</span>
            {formatCrystal(balanceVena)}
          </div>
        </div>

        <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 mt-2">
          {(["ore", "iron", "gold"] as const).map((r) => {
            const RIcon = RESOURCE_ICON[r];
            return (
              <div key={r} className="flex flex-1 items-center justify-center gap-2 py-2">
                <span className="inline-flex items-center justify-center relative -top-[1px]">
                  <Image src={RESOURCE_META[r].image} alt={RESOURCE_META[r].label} width={14} height={14} className="object-contain" />
                </span>
                <span className="text-[11px] font-mono font-bold" style={{ color: RESOURCE_META[r].color }}>
                  {Math.floor(resources[r]).toLocaleString("en-US")}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
          {categories.map((c) => {
            const CIcon = CATEGORY_ICON[c];
            return (
              <button
                key={c}
                type="button"
                onClick={() => setTab(c)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                  tab === c
                    ? "bg-purple-500/20 text-[#c084fc] border border-purple-500/30 shadow-[0_0_10px_rgba(192,132,252,0.2)]"
                    : "text-slate-500 hover:text-slate-300 border border-transparent"
                }`}
              >
                <CIcon size={14} />
                {c}
              </button>
            );
          })}
        </div>
        
        <p className="text-[11px] text-slate-400 italic text-center -mt-2 mb-2">{CATEGORY_HINT[tab]}</p>

        <div className="farm-store-shelf">
          {items.map((item) => {
            const has = !item.repeatable && owned.includes(item.key);
            const isVena = Boolean(item.costVena);
            const ready = canBuy(item);
            const ItemIcon = ITEM_ICON[item.id] ?? Sparkles;

            return (
              <div
                key={item.id}
                className={`farm-store-item ${has ? "farm-store-item-owned" : ""} ${ready ? "farm-store-item-ready" : ""} ${isVena ? "farm-store-item-vena" : ""} ${pulseId === item.id ? "farm-store-item-pulse" : ""}`}
              >
                <span className={`farm-store-item-badge ${has ? "farm-store-item-badge-owned" : isVena ? "farm-store-item-badge-vena" : "farm-store-item-badge-crystal"}`}>
                  {has ? "OWNED" : isVena ? "VENA" : "CRYSTAL"}
                </span>

                <div className="farm-store-item-main">
                  <span className={`farm-store-item-icon ${isVena ? "farm-store-item-icon-vena" : ""}`}>
                    <ItemIcon size={24} strokeWidth={1.75} />
                  </span>
                  <div className="farm-store-item-info">
                    <p className="farm-store-item-name">{item.name}</p>
                    <p className="farm-store-item-desc">{item.description}</p>
                  </div>
                </div>

                <div className="farm-store-item-footer">
                  {has ? (
                    <span className="farm-store-owned-pill">
                      <Check size={12} strokeWidth={3} />
                      Equipped
                    </span>
                  ) : (
                    <>
                      <div className="farm-store-price">
                        <span className="farm-store-price-label">Price</span>
                        <span className={isVena ? "farm-store-price-vena" : "farm-store-price-crystal"}>
                          {isVena ? (
                            <>
                              {shortNum(item.costVena ?? 0)}{" "}
                              <span className="farm-store-price-unit">VENA</span>
                            </>
                          ) : (
                            <>
                              <Gem size={11} strokeWidth={2.5} className="inline mr-0.5" />
                              {shortNum(item.costCrystal ?? 0)}
                            </>
                          )}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={!ready || (isVena && isPaying)}
                        onClick={() => handleBuy(item.id)}
                        className={`farm-store-buy-btn ${isVena ? "farm-store-buy-btn-vena" : "farm-store-buy-btn-crystal"}`}
                      >
                        {isVena && isPaying ? "…" : "Buy"}
                      </button>
                    </>
                  )}
                </div>

                {!has && !ready && (
                  <p className="farm-store-item-blocked">
                    {isVena ? "Not enough VENA" : "Not enough Crystal"}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="farm-bazaar-footer">
          VENA purchases → treasury buyback · Crystal perks stay in your base forever
        </p>
      </div>
  );
}
