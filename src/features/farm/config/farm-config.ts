/** VENA Command Base — idle mine grid */

export const FARM_MIN_VENA_HOLD = Number(
  process.env.NEXT_PUBLIC_FARM_MIN_VENA ?? 25_000
);


export const FARM_DEMO_MODE =
  process.env.NEXT_PUBLIC_FARM_DEMO_MODE === "true";

export const FARM_DEMO_START_CRYSTAL = 5_000;

/** Welcome Crystal for a new VENA-holding commander (VenaLand access grant). */
export const FARM_START_CRYSTAL = 750;

/**
 * Bigger welcome grant for VPICK holders. VenaLand ships bundled with the
 * Pickaxe NFT, so holders are onboarded with a head start (not a hard gate).
 */
export const FARM_PICKAXE_START_CRYSTAL = 1_500;

export const FARM_TREASURY =
  (process.env.NEXT_PUBLIC_TREASURY as `0x${string}` | undefined) ??
  ("0x52c965483B19FBeF104B5490Ec65aD4c6ae76AD3" as const);

export const FARM_GRID_SIZE = 4;
export const FARM_OFFLINE_CAP_SEC = 8 * 3600;

/* ── Resource types ─────────────────────────────────────────────── */
export type ResourceType = "ore" | "iron" | "gold" | "crystal" | "prime_crystal";

export const RESOURCE_META: Record<
  ResourceType,
  { label: string; color: string; icon: string; image: string }
> = {
  ore:           { label: "Ore",           color: "#b87333", icon: "⛏", image: "/farm/items/ore.png" },
  iron:          { label: "Iron",          color: "#a8b8c8", icon: "⚙", image: "/farm/items/iron.png" },
  gold:          { label: "Gold",          color: "#ffd700", icon: "◈", image: "/farm/items/gold.png" },
  crystal:       { label: "Crystal",       color: "#00ff88", icon: "💎", image: "/farm/items/crystal.png" },
  prime_crystal: { label: "Prime Crystal", color: "#c084fc", icon: "◆", image: "/farm/items/crystal.png" },
};

/** Conversion ratios: how many units of `from` produce 1 unit of `to`. */
export const CONVERSION_RATIO: Partial<Record<ResourceType, { from: ResourceType; ratio: number }>> = {
  iron:          { from: "ore",     ratio: 3 },
  gold:          { from: "iron",    ratio: 2 },
  crystal:       { from: "gold",    ratio: 5 },
  prime_crystal: { from: "crystal", ratio: 500 },
};

/* ── Building IDs ───────────────────────────────────────────────── */
export type FarmBuildingId =
  | "mine_shaft_1"   // T1 — produces ore
  | "mine_shaft_2"   // T1 — produces iron
  | "deep_shaft"     // T1 — produces gold
  | "ore_forge"      // T2 — converter ore→iron
  | "iron_refinery"  // T2 — converter iron→gold
  | "crystal_lab"    // T2 — converter gold→crystal (VENA-gated)
  | "crystal_forge"  // T3 — converter crystal→prime_crystal (VENA-gated)
  | "conveyor"       // T2 — adjacency multiplier
  | "ore_processor"; // T1 (legacy compat) — direct crystal

export type FarmBuildingDef = {
  id: FarmBuildingId;
  tier: 1 | 2 | 3;
  name: string;
  description: string;
  costVena: number;
  costCrystal?: number;
  /** Primary produced resource (miners) or output resource (converters). */
  produces: ResourceType;
  /** Base rate of production/conversion per second (per unit output). */
  ratePerSec: number;
  /** For converters: how many `from` units consumed per second. */
  consumesPerSec?: number;
  /** Legacy field kept for rate display and backward compat. */
  crystalPerSec: number;
  image: string;
  scale: number;
  /** CSS filter applied to the sprite so shared-art buildings read distinct. */
  tint?: string;
  /** Legacy/retired building — kept for save compat, hidden from the build menu. */
  hidden?: boolean;
};

/* ── Leveling ───────────────────────────────────────────────────── */
export const FARM_MAX_LEVEL = 10;
export const FARM_MILESTONE_LEVELS = [5, 10] as const;

/** Production multiplier for a building at a given level (L1 = 1×, L10 = 5.5×). */
export function levelRate(base: number, level: number): number {
  return base * (1 + 0.5 * (Math.max(1, level) - 1));
}

/** Visual tier for a level: 1 (L1-3), 2 (L4-6), 3 (L7-10). Drives glow/sprite. */
export function levelVisualTier(level: number): 1 | 2 | 3 {
  if (level >= 7) return 3;
  if (level >= 4) return 2;
  return 1;
}

export type UpgradeCost = {
  crystal: number;
  resource?: { type: ResourceType; amount: number };
  vena: number;
  milestone: boolean;
  waitSec: number;
};

/**
 * Cost to upgrade a building from `currentLevel` → `currentLevel + 1`.
 * Crystal + a sink of the building's own resource scale exponentially.
 * Milestone levels (5, 10) also require a small VENA payment in live mode.
 */
export function upgradeCost(def: FarmBuildingDef, currentLevel: number): UpgradeCost | null {
  if (currentLevel >= FARM_MAX_LEVEL) return null;
  const nextLevel = currentLevel + 1;
  const growth = Math.pow(1.7, currentLevel - 1);
  const crystal = Math.round(200 * growth);
  const milestone = (FARM_MILESTONE_LEVELS as readonly number[]).includes(nextLevel);

  let resource: UpgradeCost["resource"];
  if (def.produces !== "crystal" && def.produces !== "prime_crystal") {
    resource = { type: def.produces, amount: Math.round(100 * growth) };
  }

  // Base VENA cost is 5% of the building's original cost, scaling up with level growth.
  // Milestone upgrades (Lv5, Lv10) require a 3x premium VENA payment.
  const baseVena = def.costVena > 0 ? def.costVena * 0.05 : 1000;
  let vena = Math.round(baseVena * growth);
  if (milestone) vena = Math.round(vena * 3);

  // Wait times scale with level (Lv1->2: 5m, Lv2->3: 15m, Lv3->4: 30m, Lv4->5: 1h, then log scaling up to 4h)
  let waitSec = 300; // 5 mins
  if (currentLevel === 2) waitSec = 900; // 15 mins
  else if (currentLevel === 3) waitSec = 1800; // 30 mins
  else if (currentLevel >= 4) waitSec = 3600 + (currentLevel - 4) * 1800; // 1h, 1.5h, 2h... up to 4h at Lv9->10

  return { crystal, resource, vena, milestone, waitSec };
}

export const FARM_TILE_IMAGE = "/farm/tile-v4.png";

export const FARM_BUILDINGS: FarmBuildingDef[] = [
  /* ── Tier 1: Producers ── */
  {
    id: "mine_shaft_1",
    tier: 1,
    name: "Ore Mine",
    description: "Extracts raw Ore from shallow veins.",
    costVena: 4_000,
    produces: "ore",
    ratePerSec: 5,
    crystalPerSec: 1.2,
    image: "/farm/shaft1-v4.png",
    scale: 0.92,
    tint: "saturate(1.25) hue-rotate(-18deg)",
  },
  {
    id: "mine_shaft_2",
    tier: 1,
    name: "Iron Mine",
    description: "Reinforced tunnel that mines solid Iron.",
    costVena: 10_000,
    produces: "iron",
    ratePerSec: 3,
    crystalPerSec: 3.5,
    image: "/farm/shaft2-v4.png",
    scale: 1,
    tint: "saturate(0.75) hue-rotate(175deg) brightness(1.05)",
  },
  {
    id: "deep_shaft",
    tier: 1,
    name: "Gold Mine",
    description: "Deep-core excavation of pure Gold veins.",
    costVena: 20_000,
    produces: "gold",
    ratePerSec: 1.5,
    crystalPerSec: 9,
    image: "/farm/deepshaft-v4.png",
    scale: 1.05,
    tint: "saturate(1.5) hue-rotate(30deg) brightness(1.12)",
  },
  {
    // Legacy building (previously a direct Crystal producer). Kept in the map so
    // old saves still render, but hidden from the build menu and reclassified as
    // a Gold→Crystal converter — Crystal is now strictly end-of-chain.
    id: "ore_processor",
    tier: 2,
    name: "Crystal Extractor",
    description: "Transmutes 6 Gold into 1 Crystal per second.",
    costVena: 0,
    costCrystal: 14_000,
    produces: "crystal",
    ratePerSec: 1,
    consumesPerSec: 6,
    crystalPerSec: 0,
    image: "/farm/processor-v4.png",
    scale: 1.02,
    tint: "saturate(1.2) hue-rotate(85deg)",
    hidden: true,
  },
  /* ── Tier 2: Converters ── */
  {
    id: "ore_forge",
    tier: 2,
    name: "Ore Forge",
    description: "Smelts 3 Ore into 1 Iron every second.",
    costVena: 0,
    costCrystal: 2_000,
    produces: "iron",
    ratePerSec: 1,
    consumesPerSec: 3,
    crystalPerSec: 0,
    image: "/farm/oreforge-v4.png",
    scale: 1.02,
  },
  {
    id: "iron_refinery",
    tier: 2,
    name: "Iron Refinery",
    description: "Refines 2 Iron into 1 Gold per second.",
    costVena: 0,
    costCrystal: 5_000,
    produces: "gold",
    ratePerSec: 1,
    consumesPerSec: 2,
    crystalPerSec: 0,
    image: "/farm/refinery-v4.png",
    scale: 1.02,
  },
  {
    // The only source of Crystal in the game — the end of the refining chain.
    // VENA-gated on purpose: unlocking your Crystal engine drives token demand.
    id: "crystal_lab",
    tier: 2,
    name: "Crystal Lab",
    description: "The only Crystal source — refines 5 Gold into 1 Crystal per second.",
    costVena: 35_000,
    produces: "crystal",
    ratePerSec: 1,
    consumesPerSec: 5,
    crystalPerSec: 0,
    image: "/farm/crystallab-v4.png",
    scale: 1,
  },
  {
    id: "conveyor",
    tier: 2,
    name: "Power Conveyor",
    description: "Boosts all adjacent buildings by +25%.",
    costVena: 17_500,
    produces: "crystal",
    ratePerSec: 0,
    crystalPerSec: 2,
    image: "/farm/conveyor-v4.png",
    scale: 1,
    tint: "saturate(1.1) hue-rotate(205deg) brightness(1.05)",
  },
  {
    // The only source of Prime Crystal — the absolute end of the production chain.
    // Consumes Crystal (hard resource) and produces infinitesimally rare Prime Crystal.
    // VENA-gated at 75,000 to drive maximum token demand.
    id: "crystal_forge",
    tier: 3,
    name: "Crystal Forge",
    description: "The rarest converter. Transmutes 1 Crystal/s into 0.002 Prime Crystal — 500× rarer than Crystal itself. VENA-gated.",
    costVena: 125_000,
    produces: "prime_crystal",
    ratePerSec: 0.002,
    consumesPerSec: 1,
    crystalPerSec: 0,
    image: "/farm/crystallab-v4.png",
    scale: 1.06,
    tint: "hue-rotate(270deg) saturate(1.8) brightness(1.15)",
  },
];

export const FARM_BUILDING_MAP = Object.fromEntries(
  FARM_BUILDINGS.map((b) => [b.id, b])
) as Record<FarmBuildingId, FarmBuildingDef>;

/** Buildings shown in the build menu (excludes retired/legacy ones). */
export const FARM_BUILDABLE = FARM_BUILDINGS.filter((b) => !b.hidden);

/** Human-readable output for a building at a given level (miner / refiner / support). */
export function buildingRateText(def: FarmBuildingDef, level = 1): string {
  if (def.consumesPerSec != null) {
    const from = CONVERSION_RATIO[def.produces]?.from;
    const cin = levelRate(def.consumesPerSec, level);
    const cout = levelRate(def.ratePerSec, level);
    const inLabel = from ? RESOURCE_META[from].label : "";
    const outLabel = RESOURCE_META[def.produces].label;
    const outFmt = def.produces === "prime_crystal" ? cout.toFixed(4) : cout.toFixed(1);
    return `${cin.toFixed(0)} ${inLabel} → ${outFmt} ${outLabel}/s`;
  }
  if (def.ratePerSec > 0) {
    return `+${levelRate(def.ratePerSec, level).toFixed(1)} ${RESOURCE_META[def.produces].label}/s`;
  }
  return "Boosts adjacent buildings +25%";
}

/* ── Market / In-game store ─────────────────────────────────────── */
export type FarmMarketCategory = "cosmetic" | "perk" | "premium";

export type FarmMarketItem = {
  id: string;
  name: string;
  description: string;
  category: FarmMarketCategory;
  /** Owned-flag stored in state.cosmetics (unless repeatable). */
  key: string;
  /** Priced in Crystal (soft currency) — instant purchase. */
  costCrystal?: number;
  /** Priced in VENA — paid on-chain in live mode, free in demo. */
  costVena?: number;
  /** Consumable: no owned flag, can be bought repeatedly. */
  repeatable?: boolean;
  /** Instant Crystal granted on purchase (for caches). */
  grantCrystal?: number;
};

/**
 * The store mixes soft-currency cosmetics/perks (Crystal) with VENA-priced
 * perks and premium goods, giving the token real, repeatable utility.
 */
export const FARM_MARKET: FarmMarketItem[] = [
  /* Cosmetics — Crystal */
  {
    id: "neon_border",
    name: "Neon Grid Frame",
    description: "Cyan pulse border on your command base.",
    category: "cosmetic",
    key: "neon_border",
    costCrystal: 500,
  },
  {
    id: "spark_fx",
    name: "Spark FX",
    description: "Extra spark particles on active shafts.",
    category: "cosmetic",
    key: "spark_fx",
    costCrystal: 800,
  },
  /* Perks — permanent effects */
  {
    id: "overclock",
    name: "Overclock Core",
    description: "+20% production from every building, permanently.",
    category: "perk",
    key: "overclock",
    costCrystal: 30_000,
  },
  {
    id: "rapid_rally",
    name: "Rapid Rally Module",
    description: "Commander rally recharges faster (180s → 110s).",
    category: "perk",
    key: "rapid_rally",
    costVena: 15_000,
  },
  /* Premium — VENA */
  {
    id: "crystal_cache",
    name: "Crystal Cache",
    description: "Instantly deposit +50,000 Crystal into your base.",
    category: "premium",
    key: "crystal_cache",
    costVena: 5_000,
    repeatable: true,
    grantCrystal: 50_000,
  },
  {
    id: "founder_frame",
    name: "Founder's Frame",
    description: "Exclusive 24K-gold command base frame.",
    category: "premium",
    key: "founder_frame",
    costVena: 25_000,
  },
];

/** Numeric effects granted by owned perk keys. */
export const FARM_PERKS = {
  overclockMultiplier: 1.2,
  rapidRallyCooldownSec: 110,
} as const;

/* ── Grid tiers ─────────────────────────────────────────────────── */
export type GridTier = 1 | 2 | 3 | 4;

export type GridTierDef = {
  tier: GridTier;
  label: string;
  plots: number;
  costVena: number;
  costCrystal: number;
  holdVena: number;
};

export const FARM_GRID_TIERS: GridTierDef[] = [
  { tier: 1, label: "2×2", plots: 4,  costVena: 25_000,  costCrystal: 0,      holdVena: 25_000 },
  { tier: 2, label: "3×3", plots: 9,  costVena: 15_000,  costCrystal: 5_000,  holdVena: 50_000 },
  { tier: 3, label: "4×4", plots: 16, costVena: 40_000,  costCrystal: 20_000, holdVena: 100_000 },
  { tier: 4, label: "5×5", plots: 25, costVena: 100_000, costCrystal: 75_000, holdVena: 250_000 },
];

/* ── Power Cores (Prestige) ─────────────────────────────────────── */

/**
 * Prime Crystal cost for each successive Power Core.
 * Costs double each time: 1 → 2 → 4 → 8 → 16 → 32 = 63 total.
 * Each core permanently adds +5% production to everything.
 */
export const POWER_CORE_COSTS = [1, 2, 4, 8, 16, 32] as const;
export const POWER_CORE_BONUS_PER = 0.05; // +5% per core
export const POWER_CORE_MAX = POWER_CORE_COSTS.length; // 6

/** Permanent production multiplier from owned power cores. */
export function powerCoreMultiplier(cores: number): number {
  return 1 + Math.min(cores, POWER_CORE_MAX) * POWER_CORE_BONUS_PER;
}

/** Cost in Prime Crystal to forge the NEXT power core (1-indexed). */
export function nextCoreCost(cores: number): number | null {
  if (cores >= POWER_CORE_MAX) return null;
  return POWER_CORE_COSTS[cores] ?? null;
}

/* ── VPICK & Rally ──────────────────────────────────────────────── */
export const FARM_VPICK_BONUS = { any: 1.1, emerald: 1.25 } as const;

export type VpickTier = "none" | "silver" | "gold" | "platinum" | "diamond" | "emerald";

export function vpickTierFromRarities(rarities: string[]): VpickTier {
  if (rarities.some((r) => r.toLowerCase() === "emerald")) return "emerald";
  if (rarities.some((r) => r.toLowerCase() === "diamond")) return "diamond";
  if (rarities.some((r) => r.toLowerCase() === "platinum")) return "platinum";
  if (rarities.some((r) => r.toLowerCase() === "gold")) return "gold";
  if (rarities.some((r) => r.toLowerCase() === "silver")) return "silver";
  if (rarities.length > 0) return "silver";
  return "none";
}

export function vpickProductionMultiplier(tier: VpickTier): number {
  if (tier === "emerald") return FARM_VPICK_BONUS.emerald;
  if (tier !== "none") return FARM_VPICK_BONUS.any;
  return 1;
}

/** Crystal-roll bonus on daily cache (production uses vpickProductionMultiplier). */
export function vpickCacheCrystalMultiplier(tier: VpickTier): number {
  if (tier === "emerald") return FARM_VPICK_BONUS.emerald;
  if (tier === "any") return FARM_VPICK_BONUS.any;
  return 1;
}

export function vpickBonusPercent(tier: VpickTier): number {
  return Math.round((vpickProductionMultiplier(tier) - 1) * 100);
}

export function vpickCacheBonusPercent(tier: VpickTier): number {
  return Math.round((vpickCacheCrystalMultiplier(tier) - 1) * 100);
}

/** Adjacent buildings get +25% output per touching conveyor (orthogonal). */
export const FARM_CONVEYOR_BOOST = 0.25;

/** Grid side length for a VenaLand tier (2×2 … 5×5). */
export function gridDimForTier(gridTier: number = 1): number {
  const tier = FARM_GRID_TIERS.find((t) => t.tier === gridTier) ?? FARM_GRID_TIERS[0];
  return Math.round(Math.sqrt(tier.plots));
}

export const FARM_RALLY = {
  boost: 2,
  durationSec: 30,
  cooldownSec: 180,
} as const;

/* ── Formatters ─────────────────────────────────────────────────── */
export function formatCrystal(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 100) return Math.floor(n).toLocaleString("en-US");
  return n.toFixed(1);
}

/** Format Prime Crystal with 4 decimal precision for small values. */
export function formatPrimeCrystal(n: number): string {
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  if (n >= 10)    return n.toFixed(2);
  if (n >= 1)     return n.toFixed(3);
  return n.toFixed(4);
}

export function formatResource(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.floor(n).toLocaleString("en-US");
}
