"use client";

import {
  GAME_CONFIG,
  type StoreItem,
} from "../config/game-config";
import StoreItemCard from "./StoreItemCard";

type StorePanelProps = {
  balanceVena: number;
  ownedItemIds: Set<string>;
  onBuyItem: (item: StoreItem) => boolean;
  onNotify: (message: string) => void;
};

export default function StorePanel({
  balanceVena,
  ownedItemIds,
  onBuyItem,
  onNotify,
}: StorePanelProps) {
  const items = GAME_CONFIG.store.accessories;

  const handleBuy = (item: StoreItem) => {
    if (ownedItemIds.has(item.id)) return;
    if (item.priceVena == null) {
      onNotify("Accessory pricing coming soon");
      return;
    }
    if (balanceVena < item.priceVena) {
      onNotify("Insufficient balance");
      return;
    }
    const ok = onBuyItem(item);
    if (ok) onNotify(`Purchased ${item.name}`);
  };

  return (
    <section className="miner-glass rounded-2xl p-5" aria-label="Accessory store">
      <div className="mb-4">
        <p className="miner-panel-title text-[10px] uppercase tracking-[0.2em] text-[#00f0ff]/70">
          Modular store
        </p>
        <h2 className="miner-panel-title text-sm font-semibold text-white">
          Accessories
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Pickaxes come from your VPICK wallet NFTs — not the shop. On-chain
          accessory boosts affect real staking rewards once the shop opens.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <StoreItemCard
            key={item.id}
            item={item}
            owned={ownedItemIds.has(item.id)}
            balanceVena={balanceVena}
            onBuy={handleBuy}
          />
        ))}
      </div>
    </section>
  );
}
