import {
  FARM_BUILDING_MAP,
  FARM_CONVEYOR_BOOST,
  FARM_OFFLINE_CAP_SEC,
  levelRate,
  type FarmBuildingId,
  type ResourceType,
} from "../config/farm-config";
import type { ResourceStockpile } from "./farm-storage";

export type FarmCell = { buildingId: FarmBuildingId | null; level?: number };

/** Per-cell output multiplier from adjacent conveyors (+25% each conveyor, stacks). */
export function adjacencyMultipliers(cells: FarmCell[], gridDim: number): number[] {
  const mults = Array.from({ length: cells.length }, () => 1);
  for (let i = 0; i < cells.length; i++) {
    if (cells[i]?.buildingId !== "conveyor") continue;
    const row = Math.floor(i / gridDim);
    const col = i % gridDim;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || c < 0 || r >= gridDim || c >= gridDim) continue;
      const ni = r * gridDim + c;
      const neighborId = cells[ni]?.buildingId;
      if (neighborId && neighborId !== "conveyor") {
        mults[ni] += FARM_CONVEYOR_BOOST;
      }
    }
  }
  return mults;
}

/**
 * Crystal/s capacity — Crystal is end-of-chain, so this sums the output of
 * Crystal-producing converters only (bottlenecked at runtime by Gold feed).
 */
export function productionRate(
  cells: FarmCell[],
  multiplier: number,
  gridDim = 2
): number {
  const adj = adjacencyMultipliers(cells, gridDim);
  let base = 0;
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!cell?.buildingId) continue;
    const def = FARM_BUILDING_MAP[cell.buildingId];
    if (!def) continue;
    if (def.produces === "crystal" && def.consumesPerSec != null) {
      base += levelRate(def.ratePerSec, cell.level ?? 1) * adj[i];
    }
  }
  return base * multiplier;
}

/** True if any building produces or converts anything (used to gate the tick). */
export function hasProduction(cells: FarmCell[]): boolean {
  for (const cell of cells) {
    if (!cell.buildingId) continue;
    const def = FARM_BUILDING_MAP[cell.buildingId];
    if (!def) continue;
    if (def.consumesPerSec != null || def.ratePerSec > 0) return true;
  }
  return false;
}

/** Per-resource production rates from producer buildings, scaled by level. */
export function resourceRates(
  cells: FarmCell[],
  gridDim = 2
): Record<ResourceType, number> {
  const adj = adjacencyMultipliers(cells, gridDim);
  const rates: Record<ResourceType, number> = {
    ore: 0,
    iron: 0,
    gold: 0,
    crystal: 0,
    prime_crystal: 0,
  };
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!cell?.buildingId) continue;
    const def = FARM_BUILDING_MAP[cell.buildingId];
    if (def.consumesPerSec == null && def.ratePerSec > 0) {
      rates[def.produces] += levelRate(def.ratePerSec, cell.level ?? 1) * adj[i];
    }
  }
  return rates;
}

/** How much of each resource was produced (not net) in a single tick. */
export type TickGained = {
  ore: number;
  iron: number;
  gold: number;
  crystal: number;
  prime_crystal: number;
};

/**
 * Run one tick of the full multi-resource chain.
 *
 * `primeCrystal` is passed in separately (like `crystal`) because it is not
 * stored in `ResourceStockpile` — it lives at the top of the save object.
 *
 * Returns updated stockpiles, new crystal/primeCrystal amounts, and
 * per-resource production deltas for the quest tracker (gross produced).
 */
export function tickResources(
  cells: FarmCell[],
  stockpile: ResourceStockpile,
  crystal: number,
  primeCrystal: number,
  elapsedSec: number,
  multiplier: number,
  gridDim = 2
): {
  stockpile: ResourceStockpile;
  crystal: number;
  primeCrystal: number;
  gained: TickGained;
} {
  const sec = Math.min(elapsedSec, FARM_OFFLINE_CAP_SEC);
  const adj = adjacencyMultipliers(cells, gridDim);

  let ore = stockpile.ore;
  let iron = stockpile.iron;
  let gold = stockpile.gold;
  let crys = crystal;
  let prme = primeCrystal;

  const gained: TickGained = { ore: 0, iron: 0, gold: 0, crystal: 0, prime_crystal: 0 };

  // 1. Producers add to their respective stockpile (level-scaled + conveyor adjacency)
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!cell?.buildingId) continue;
    const def = FARM_BUILDING_MAP[cell.buildingId];
    if (def.consumesPerSec != null) continue;
    if (def.ratePerSec <= 0) continue;
    const rate = levelRate(def.ratePerSec, cell.level ?? 1) * adj[i];
    const amount = rate * sec * multiplier;
    if (def.produces === "ore") {
      ore += amount;
      gained.ore += amount;
    } else if (def.produces === "iron") {
      iron += amount;
      gained.iron += amount;
    } else if (def.produces === "gold") {
      gold += amount;
      gained.gold += amount;
    } else if (def.produces === "crystal") {
      crys += amount;
      gained.crystal += amount;
    }
  }

  // 2. Converters — sorted by chain order so each stage feeds the next
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (!cell?.buildingId) continue;
    const def = FARM_BUILDING_MAP[cell.buildingId];
    if (!def.consumesPerSec) continue;

    const lvl = cell.level ?? 1;
    const cellMult = adj[i];
    const consumeRate = levelRate(def.consumesPerSec, lvl) * multiplier * cellMult;
    const outRate = levelRate(def.ratePerSec, lvl) * multiplier * cellMult;
    const needed = consumeRate * sec;

    if (def.produces === "iron") {
      const consumed = Math.min(ore, needed);
      ore -= consumed;
      const out = (consumed / consumeRate) * outRate;
      iron += out;
      gained.iron += out;
    } else if (def.produces === "gold") {
      const consumed = Math.min(iron, needed);
      iron -= consumed;
      const out = (consumed / consumeRate) * outRate;
      gold += out;
      gained.gold += out;
    } else if (def.produces === "crystal") {
      const consumed = Math.min(gold, needed);
      gold -= consumed;
      const out = (consumed / consumeRate) * outRate;
      crys += out;
      gained.crystal += out;
    } else if (def.produces === "prime_crystal") {
      // Crystal Forge: consumes from the Crystal float (not stockpile)
      // Boosts intentionally NOT applied here — Prime Crystal is meant to be
      // a deliberate, slow grind independent of the surge mechanic.
      const rawConsume = levelRate(def.consumesPerSec, lvl) * cellMult;
      const rawOut = levelRate(def.ratePerSec, lvl) * cellMult;
      const rawNeeded = rawConsume * sec;
      const consumed = Math.min(crys, rawNeeded);
      crys -= consumed;
      const out = (consumed / rawConsume) * rawOut;
      prme += out;
      gained.prime_crystal += out;
    }
  }

  return {
    stockpile: {
      ore: Math.max(0, ore),
      iron: Math.max(0, iron),
      gold: Math.max(0, gold),
    },
    crystal: crys,
    primeCrystal: prme,
    gained,
  };
}

export function accrueCrystal(
  crystal: number,
  ratePerSec: number,
  lastTickAt: number,
  now = Date.now()
): { crystal: number; lastTickAt: number; gained: number } {
  if (ratePerSec <= 0) return { crystal, lastTickAt: now, gained: 0 };
  const elapsedSec = Math.max(0, (now - lastTickAt) / 1000);
  const capped = Math.min(elapsedSec, FARM_OFFLINE_CAP_SEC);
  const gained = ratePerSec * capped;
  return { crystal: crystal + gained, lastTickAt: now, gained };
}
