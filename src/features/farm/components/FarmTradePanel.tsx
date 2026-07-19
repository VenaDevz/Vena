"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Store,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import {
  generateOrder,
  orderFeeCrystal,
  orderGrossCrystal,
  TRADE_BOOK_SIZE,
  TRADE_FEE_BPS,
  type TradeOrder,
  type TradeResource,
  type TradeSide,
} from "../config/farm-trade";
import { RESOURCE_META, formatCrystal } from "../config/farm-config";
import type { ResourceStockpile } from "../lib/farm-storage";

// Replaced Lucide icons with game sprites

type Props = {
  crystal: number;
  resources: ResourceStockpile;
  tradesFilled: number;
  onFill: (order: TradeOrder) => boolean;
};

function buildBook(baseSeed: number): TradeOrder[] {
  return Array.from({ length: TRADE_BOOK_SIZE }, (_, i) =>
    generateOrder(baseSeed + i, i % 2 === 0 ? "sell" : "buy")
  );
}

function num(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export default function FarmTradePanel({ crystal, resources, tradesFilled, onFill }: Props) {
  const [tab, setTab] = useState<TradeSide>("sell");
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const seedRef = useRef(0);

  useEffect(() => {
    const base = Math.floor(Date.now() / 1000) % 100000;
    seedRef.current = base + TRADE_BOOK_SIZE;
    setOrders(buildBook(base));
  }, []);

  const handleFill = (order: TradeOrder) => {
    const ok = onFill(order);
    if (!ok) return;
    setPulseId(order.id);
    window.setTimeout(() => setPulseId(null), 600);
    const nextSeed = seedRef.current++;
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? generateOrder(nextSeed, order.side) : o))
    );
  };

  const visible = useMemo(() => orders.filter((o) => o.side === tab), [orders, tab]);
  const feePct = (TRADE_FEE_BPS / 100).toFixed(0);
  const sellCount = orders.filter((o) => o.side === "sell").length;
  const buyCount = orders.filter((o) => o.side === "buy").length;

  return (
    <div className="flex flex-col gap-4">

        <div className="flex items-center gap-3 bg-black/20 p-2.5 rounded-lg border border-white/5">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 rounded text-cyan-400 text-[11px] font-bold tracking-wider">
            <Users size={12} />
            {sellCount + buyCount} ORDERS
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 rounded text-[#00ff88] text-[11px] font-bold tracking-wider">
            <ArrowLeftRight size={12} />
            {tradesFilled} FILLS
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded text-white text-[11px] font-bold tracking-wider ml-auto">
            <span className="text-[#00ff88]">💎</span>
            {formatCrystal(crystal)}
          </div>
        </div>

        <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 mt-2">
          <button
            type="button"
            onClick={() => setTab("sell")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${tab === "sell" ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]" : "text-slate-500 hover:text-slate-300 border border-transparent"}`}
          >
            <TrendingUp size={14} />
            Sell Orders ({sellCount})
          </button>
          <button
            type="button"
            onClick={() => setTab("buy")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${tab === "buy" ? "bg-green-500/20 text-[#00ff88] border border-green-500/30 shadow-[0_0_10px_rgba(0,255,136,0.2)]" : "text-slate-500 hover:text-slate-300 border border-transparent"}`}
          >
            <TrendingDown size={14} />
            Buy Orders ({buyCount})
          </button>
        </div>

        <div className="farm-trade-list">
          {visible.length === 0 ? (
            <p className="farm-trade-empty">Scanning relay for commander orders…</p>
          ) : (
            visible.map((o) => {
              const meta = RESOURCE_META[o.resource];
              const gross = orderGrossCrystal(o);
              const fee = orderFeeCrystal(o);
              const isSell = o.side === "sell";
              const net = isSell ? gross - fee : gross + fee;
              const stock = resources[o.resource] ?? 0;

              const canFill = isSell ? stock >= o.amount : crystal >= net;

              return (
                <div
                  key={o.id}
                  className={`farm-trade-order ${pulseId === o.id ? "farm-trade-order-pulse" : ""} ${canFill ? "farm-trade-order-ready" : ""}`}
                >
                  <div className="farm-trade-order-badge">
                    {isSell ? "WANTS" : "OFFERS"}
                  </div>

                  <div className="farm-trade-order-body">
                    <div className="farm-trade-order-main">
                      <span className="farm-trade-order-icon" title={meta.label}>
                        <img src={`/farm/items/${o.resource}.png`} alt={o.resource} className="farm-trade-item-img" />
                      </span>
                      <div className="farm-trade-order-info">
                        <p className="farm-trade-order-line">
                          <span className="farm-trade-order-amt" style={{ color: meta.color }}>
                            {num(o.amount)} {meta.label}
                          </span>
                          <span className="farm-trade-order-unit">
                            @ {o.unitPrice.toFixed(2)} 💎/unit
                          </span>
                        </p>
                        <p className="farm-trade-order-trader">{o.trader}</p>
                      </div>
                    </div>

                    <div className="farm-trade-order-footer">
                      <div className="farm-trade-order-price">
                        <span className="farm-trade-order-price-label">
                          {isSell ? "You receive" : "Total cost"}
                        </span>
                        <span className={isSell ? "farm-trade-price-sell" : "farm-trade-price-buy"}>
                          💎 {num(net)}
                        </span>
                        <span className="farm-trade-order-fee">
                          fee {num(fee)}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={!canFill}
                        onClick={() => handleFill(o)}
                        className={`farm-trade-fill-btn ${isSell ? "farm-trade-fill-sell" : "farm-trade-fill-buy"}`}
                      >
                        {isSell ? "Sell" : "Buy"}
                      </button>
                    </div>

                    {!canFill && (
                      <p className="farm-trade-order-blocked">
                        {isSell
                          ? `Need ${num(o.amount)} ${meta.label} (have ${num(stock)})`
                          : `Need 💎 ${num(net)} Crystal`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <p className="farm-bazaar-footer">
          {feePct}% of every fill → VENA treasury · funds staking & USDC exchange pool
        </p>
      </div>
  );
}
