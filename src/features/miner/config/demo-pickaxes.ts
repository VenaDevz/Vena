import type { PickaxeNFT, Rarity } from "@/lib/types";
import { RARITY_CONFIG } from "@/lib/types";

const DEMO_RARITIES: Rarity[] = [
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Emerald",
];

/** Local preview pickaxes from /public — not on-chain. */
export const DEMO_PICKAXES: PickaxeNFT[] = DEMO_RARITIES.map(
  (rarity, index) => {
    const cfg = RARITY_CONFIG[rarity];
    return {
      id: -(index + 1),
      tokenId: `#DEMO${index + 1}`,
      name: `${rarity} Pickaxe`,
      rarity,
      hashrate: cfg.hashrate,
      staked: false,
      image: cfg.image,
    };
  }
);

export function isDemoPickaxeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MINER_DEMO_PICKAXES === "1";
}

export function mergeWithDemoPickaxes(wallet: PickaxeNFT[]): PickaxeNFT[] {
  if (!isDemoPickaxeEnabled()) return wallet;
  return [...wallet, ...DEMO_PICKAXES];
}
