"use client";

import { formatVena, type StoreItem } from "../config/game-config";

type StoreItemCardProps = {
  item: StoreItem;
  owned: boolean;
  balanceVena: number;
  onBuy: (item: StoreItem) => void;
};

export default function StoreItemCard({
  item,
  owned,
  balanceVena,
  onBuy,
}: StoreItemCardProps) {
  const canAfford = balanceVena >= item.priceVena;

  return (
    <article className="rounded-xl border border-white/5 bg-black/25 p-4 transition-colors hover:border-[#00f0ff]/20">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="miner-panel-title text-sm font-semibold text-white">
            {item.name}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
        </div>
        <span
          className={[
            "shrink-0 rounded px-2 py-0.5 text-[9px] uppercase tracking-wider",
            item.type === "accessory"
              ? "bg-[#7000ff]/20 text-[#7000ff]"
              : "bg-[#00f0ff]/15 text-[#00f0ff]",
          ].join(" ")}
        >
          {item.type}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="miner-panel-title text-base font-bold text-[#00f0ff]">
          {formatVena(item.priceVena)} VENA
        </span>
        {owned ? (
          <span className="text-xs font-medium text-emerald-400/90">Owned</span>
        ) : (
          <button
            type="button"
            onClick={() => onBuy(item)}
            disabled={!canAfford}
            className="miner-panel-title rounded-lg border border-[#00f0ff]/30 px-3 py-1.5 text-xs font-semibold text-[#00f0ff] hover:bg-[#00f0ff]/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Buy
          </button>
        )}
      </div>
    </article>
  );
}
