import type { FarmBuildingId } from "../config/farm-config";
import type { QuestInstance } from "../config/farm-quests";

export type ResourceStockpile = {
  ore: number;
  iron: number;
  gold: number;
};

export type FarmCellState = { buildingId: FarmBuildingId | null; level?: number };

export type SavedFarmState = {
  cells: FarmCellState[];
  crystal: number;
  /** Ultra-rare end-game resource produced by the Crystal Forge. Optional for save compat. */
  primeCrystal?: number;
  /** Number of Power Cores forged (0–6). Each gives +5% permanent production. */
  powerCores?: number;
  resources: ResourceStockpile;
  gridTier: 1 | 2 | 3 | 4;
  lastTickAt: number;
  cosmetics: string[];
  lastRallyAt?: number;
  /** Daily quests — optional so old saves load without migration. */
  quests?: {
    dayKey: string;
    instances: QuestInstance[];
  };
  /** Login streak — optional so old saves load without migration. */
  streak?: {
    lastDayKey: string;
    count: number;
  };
  /** Crystal → USDC exchange history for the current season. */
  exchange?: {
    seasonId: string;
    totalCrystalSold: number;
    totalUsdcEarned: number;
  };
  /** True once the Pickaxe NFT land grant has been applied. */
  landGranted?: boolean;
  /** Tutorial progress (0 = not started, length = done). */
  tutorialStep?: number;
  /** Last UTC day the daily cache was claimed (YYYY-MM-DD). */
  dailyCacheDay?: string;
  /** Timestamp when the next free spin is available (ms since epoch). */
  decryptorFreeSpinAt?: number;
  /** Lifetime Crystal produced (for leaderboard). */
  stats?: {
    totalCrystalProduced: number;
    tradesFilled?: number;
  };
  version: 2;
};

const KEY_PREFIX = "vena-farm-v2";

export function farmStorageKey(address: string): string {
  return `${KEY_PREFIX}:${address.toLowerCase()}`;
}

function migrateState(raw: unknown): SavedFarmState | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (s.version === 2) return s as unknown as SavedFarmState;

  // Migrate from v1
  if (s.version === 1) {
    return {
      cells: (s.cells as SavedFarmState["cells"]) ?? Array.from({ length: 4 }, () => ({ buildingId: null })),
      crystal: (s.crystal as number) ?? 0,
      resources: { ore: 0, iron: 0, gold: 0 },
      gridTier: 1,
      lastTickAt: (s.lastTickAt as number) ?? Date.now(),
      cosmetics: (s.cosmetics as string[]) ?? [],
      lastRallyAt: s.lastRallyAt as number | undefined,
      version: 2,
    };
  }
  return null;
}

export function loadFarmState(address: string): SavedFarmState | null {
  if (typeof window === "undefined") return null;
  try {
    // Try v2 first, then v1 fallback
    const raw2 = localStorage.getItem(`${KEY_PREFIX}:${address.toLowerCase()}`);
    if (raw2) {
      const migrated = migrateState(JSON.parse(raw2));
      if (migrated) return migrated;
    }
    const raw1 = localStorage.getItem(`vena-farm-v1:${address.toLowerCase()}`);
    if (raw1) {
      const migrated = migrateState(JSON.parse(raw1));
      if (migrated) return migrated;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveFarmState(address: string, state: SavedFarmState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(farmStorageKey(address), JSON.stringify(state));
}

export function emptyFarmState(): SavedFarmState {
  return {
    cells: Array.from({ length: 4 }, () => ({ buildingId: null })),
    crystal: 0,
    resources: { ore: 0, iron: 0, gold: 0 },
    gridTier: 1,
    lastTickAt: Date.now(),
    cosmetics: [],
    version: 2,
  };
}
