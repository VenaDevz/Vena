import type { Rarity } from "./types";

const PINATA_BY_RARITY: Record<Rarity, string | undefined> = {
  Silver: process.env.NEXT_PUBLIC_PICKAXE_IMAGE_SILVER,
  Gold: process.env.NEXT_PUBLIC_PICKAXE_IMAGE_GOLD,
  Platinum: process.env.NEXT_PUBLIC_PICKAXE_IMAGE_PLATINUM,
  Diamond: process.env.NEXT_PUBLIC_PICKAXE_IMAGE_DIAMOND,
  Emerald: process.env.NEXT_PUBLIC_PICKAXE_IMAGE_EMERALD,
};

/** Site UI image — Pinata/IPFS URL from env, else local fallback. */
export function resolvePickaxeImage(rarity: Rarity, fallback: string): string {
  const fromEnv = PINATA_BY_RARITY[rarity]?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : fallback;
}
