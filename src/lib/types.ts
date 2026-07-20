import { resolvePickaxeImage } from "./nftImages";

export type Rarity = "Silver" | "Gold" | "Platinum" | "Diamond" | "Emerald";

export interface PickaxeNFT {
  id: number;
  tokenId: string;
  name: string;
  rarity: Rarity;
  hashrate: number;
  staked: boolean;
  image?: string;
  stratumMultiplier?: number;
}

export const RARITY_CONFIG: Record<
  Rarity,
  {
    label: string;
    color: string;
    glowClass: string;
    hashrate: number;
    bgGradient: string;
    image: string;
  }
> = {
  Silver: {
    label: "Silver",
    color: "#C0C0C0",
    glowClass: "rarity-silver",
    hashrate: 10,
    bgGradient: "linear-gradient(135deg, rgba(192,192,192,0.12) 0%, rgba(10,15,22,0.9) 100%)",
    image: "/miner/pickaxes/silver.png",
  },
  Gold: {
    label: "Gold",
    color: "#FFD700",
    glowClass: "rarity-gold",
    hashrate: 40,
    bgGradient: "linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(10,15,22,0.9) 100%)",
    image: "/miner/pickaxes/gold.png",
  },
  Platinum: {
    label: "Platinum",
    color: "#E5E4E2",
    glowClass: "rarity-platinum",
    hashrate: 80,
    bgGradient: "linear-gradient(135deg, rgba(229,228,226,0.12) 0%, rgba(10,15,22,0.9) 100%)",
    image: "/miner/pickaxes/platinum.png",
  },
  Diamond: {
    label: "Diamond",
    color: "#00d4ff",
    glowClass: "rarity-diamond",
    hashrate: 160,
    bgGradient: "linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(10,15,22,0.9) 100%)",
    image: "/miner/pickaxes/diamond.png",
  },
  Emerald: {
    label: "Emerald",
    color: "#00ff88",
    glowClass: "rarity-emerald",
    hashrate: 320,
    bgGradient: "linear-gradient(135deg, rgba(0,255,136,0.15) 0%, rgba(10,15,22,0.9) 100%)",
    image: "/emerald.png",
  },
};

export function getPickaxeImage(rarity: Rarity): string {
  return resolvePickaxeImage(rarity, RARITY_CONFIG[rarity].image);
}

/** Preview data — shown when wallet is connected */
export const MOCK_NFTS: PickaxeNFT[] = [
  { id: 1, tokenId: "#0042", name: "Emerald Drill", rarity: "Emerald", hashrate: 320, staked: false, image: "/emerald.png" },
  { id: 2, tokenId: "#0117", name: "Diamond Cutter", rarity: "Diamond", hashrate: 160, staked: false, image: "/diamond.jpeg" },
  { id: 3, tokenId: "#0391", name: "Platinum Striker", rarity: "Platinum", hashrate: 80, staked: false, image: "/platinum.jpeg" },
  { id: 4, tokenId: "#0884", name: "Gold Excavator", rarity: "Gold", hashrate: 40, staked: false, image: "/gold.jpeg" },
  { id: 5, tokenId: "#1203", name: "Silver Pickaxe", rarity: "Silver", hashrate: 10, staked: false, image: "/silver.jpeg" },
];

export const RARITY_ORDER: Rarity[] = ["Emerald", "Diamond", "Platinum", "Gold", "Silver"];
