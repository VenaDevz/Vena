import type { PickaxeNFT, Rarity } from "@/lib/types";
import { RARITY_CONFIG, RARITY_ORDER, getPickaxeImage } from "@/lib/types";
import { effectiveMiningPower, formatVenaAmount } from "@/lib/mining";

export type StoreItemType = "accessory" | "pickaxe";

export type StoreItem = {
  id: string;
  name: string;
  description: string;
  type: StoreItemType;
  /** null = price not set yet (not purchasable). */
  priceVena: number | null;
  speedBonusPercent?: number;
};

export type SlotPosition = "top" | "left" | "right" | "bottom";

export type SlotDefinition = {
  id: string;
  label: string;
  position: SlotPosition;
  slotIndex: number;
  accepts: StoreItemType;
};

export type DisplayPickaxeMode = "highest-tier" | "selected";

export const GAME_CONFIG = {
  /** Wallet VENA is the balance source — no free tokens. */
  pickaxes: {
    /** Default hashrate when tier is unknown (Prism VPICK). */
    defaultHashratePerNft: 10,
    /** Max pickaxes equipped in tool slots at once. */
    maxEquipped: 2,
    /** Max pickaxes staked for mining at once (wallet may hold more). */
    maxMiningStake: 100,
    /** Which pickaxe renders in the robot hand by default. */
    defaultDisplayMode: "highest-tier" as DisplayPickaxeMode,
  },

  /**
   * Mining economy — tune pool, calendar, and dilution here.
   * Pyramid tier multipliers live in `@/lib/tokenomics` (RARITY_TIERS).
   */
  mining: {
    /** VENA allocated to mining rewards (not the full 1B supply). */
    emissionPoolVena: 250_000_000,
    /** Calendar length the pool is spread across (days). */
    emissionDays: 730,
    /** Rest-of-network power estimate — higher = slower solo earnings. */
    referenceNetworkPower: 50_000,
    /** Robot chassis bonus — pickaxes provide primary hash rate. */
    chassisBonusPerLevel: 0,
    powerGainPerLevel: 0,
  },

  slots: {
    total: 4,
    /** All slots locked at launch — accessory unlock costs TBD. */
    defaultUnlockedCount: 0,
    /** null = coming soon (not purchasable yet). */
    unlockCostsVena: [null, null, null, null] as const,
  },

  upgrade: {
    /** Set true when level-upgrade pricing is finalized. */
    pricingEnabled: true,
    baseCostVena: 100_000,
    costMultiplier: 1.4,
    durationMs: 4 * 60 * 60 * 1000,
    timeSkipCostVena: 50,
  },

  store: {
    accessories: [
      {
        id: "power-ring",
        name: "Power Ring",
        description: "+10% mining speed",
        type: "accessory" as const,
        priceVena: null,
        speedBonusPercent: 10,
      },
      {
        id: "flux-band",
        name: "Flux Band",
        description: "+5% mining speed",
        type: "accessory" as const,
        priceVena: null,
        speedBonusPercent: 5,
      },
    ] satisfies StoreItem[],
  },
} as const;

export const SLOT_DEFINITIONS: SlotDefinition[] = [
  {
    id: "slot-accessory-top",
    label: "Accessory",
    position: "top",
    slotIndex: 0,
    accepts: "accessory",
  },
  {
    id: "slot-pickaxe-left",
    label: "Pickaxe",
    position: "left",
    slotIndex: 1,
    accepts: "pickaxe",
  },
  {
    id: "slot-accessory-right",
    label: "Accessory",
    position: "right",
    slotIndex: 2,
    accepts: "accessory",
  },
  {
    id: "slot-pickaxe-bottom",
    label: "Pickaxe",
    position: "bottom",
    slotIndex: 3,
    accepts: "pickaxe",
  },
];

export function getUpgradeCostVena(currentLevel: number): number {
  const { baseCostVena, costMultiplier } = GAME_CONFIG.upgrade;
  return Math.floor(baseCostVena * Math.pow(costMultiplier, currentLevel - 1));
}

export function getSlotUnlockCostVena(slotIndex: number): number | null {
  return GAME_CONFIG.slots.unlockCostsVena[slotIndex] ?? null;
}

export function isSlotUnlockable(slotIndex: number): boolean {
  return getSlotUnlockCostVena(slotIndex) !== null;
}

export function rarityRank(rarity: Rarity): number {
  return RARITY_ORDER.indexOf(rarity);
}

/** Pickaxe shown in the robot hand — equipped or explicitly starred only. */
export function resolveDisplayPickaxe(
  walletPickaxes: PickaxeNFT[],
  equippedPickaxes: PickaxeNFT[],
  mode: DisplayPickaxeMode,
  selectedDisplayId: number | null
): PickaxeNFT | null {
  if (mode === "selected" && selectedDisplayId !== null) {
    const pool = [...equippedPickaxes, ...walletPickaxes];
    return pool.find((p) => p.id === selectedDisplayId) ?? null;
  }

  if (equippedPickaxes.length === 0) return null;

  return [...equippedPickaxes].sort(
    (a, b) => rarityRank(a.rarity) - rarityRank(b.rarity)
  )[0];
}

export function getMinerDailyGlobalCap(): number {
  const { emissionPoolVena, emissionDays } = GAME_CONFIG.mining;
  return emissionPoolVena / emissionDays;
}

/** Pyramid share: your power / (network + you) × daily global cap. */
export function minerVenaPerDayFromPower(effectivePower: number): number {
  if (effectivePower <= 0) return 0;
  const { referenceNetworkPower } = GAME_CONFIG.mining;
  const total = referenceNetworkPower + effectivePower;
  return (effectivePower / total) * getMinerDailyGlobalCap();
}

export function minerVenaPerSecondFromPower(effectivePower: number): number {
  return minerVenaPerDayFromPower(effectivePower) / 86_400;
}

export function getPickaxeDailyYield(rarity: Rarity, hashrate: number): number {
  return minerVenaPerDayFromPower(effectiveMiningPower(hashrate, rarity));
}

function resolveEffectivePowerWithBonuses(
  level: number,
  equippedPickaxes: PickaxeNFT[],
  accessories: StoreItem[]
): number {
  if (equippedPickaxes.length === 0) return 0;

  let power = getEquippedEffectivePower(equippedPickaxes);
  power += (level - 1) * GAME_CONFIG.mining.powerGainPerLevel;

  let speedMultiplier = 1;
  for (const item of accessories) {
    if (item.speedBonusPercent) {
      speedMultiplier += item.speedBonusPercent / 100;
    }
  }

  return power * speedMultiplier;
}

export function getEquippedEffectivePower(pickaxes: PickaxeNFT[]): number {
  return pickaxes.reduce(
    (sum, p) => sum + effectiveMiningPower(p.hashrate, p.rarity),
    0
  );
}

/** VENA per second from pyramid emission pool — NOT raw hashrate. */
export function getVenaPerSecond(
  level: number,
  equippedPickaxes: PickaxeNFT[],
  accessories: StoreItem[]
): number {
  const power = resolveEffectivePowerWithBonuses(
    level,
    equippedPickaxes,
    accessories
  );
  return minerVenaPerSecondFromPower(power);
}

export function getVenaPerDay(
  level: number,
  equippedPickaxes: PickaxeNFT[],
  accessories: StoreItem[]
): number {
  const power = resolveEffectivePowerWithBonuses(
    level,
    equippedPickaxes,
    accessories
  );
  return minerVenaPerDayFromPower(power);
}

/** @deprecated Use getVenaPerSecond — hashrate is not VENA/sec */
export function getMiningPowerPerSecond(
  level: number,
  equippedPickaxes: PickaxeNFT[],
  accessories: StoreItem[]
): number {
  return getVenaPerSecond(level, equippedPickaxes, accessories);
}

export function formatSessionEarned(amount: number): string {
  return formatVenaAmount(amount, 6);
}

export function formatDailyCap(): string {
  return formatVenaAmount(getMinerDailyGlobalCap(), 2);
}

export function formatVena(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function pickaxeFromTokenId(
  id: number,
  tierNum?: number
): PickaxeNFT {
  const TIER_TO_RARITY: Rarity[] = [
    "Silver",
    "Gold",
    "Platinum",
    "Diamond",
    "Emerald",
  ];
  const rarity = TIER_TO_RARITY[tierNum ?? 0] ?? "Silver";
  const cfg = RARITY_CONFIG[rarity];
  return {
    id,
    tokenId: `#${id.toString().padStart(4, "0")}`,
    name: `${rarity} Pickaxe`,
    rarity,
    hashrate: cfg.hashrate,
    staked: false,
    image: getPickaxeImage(rarity),
  };
}
