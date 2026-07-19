"use client";

import Image from "next/image";
import {
  FARM_BUILDING_MAP,
  FARM_TILE_IMAGE,
  RESOURCE_META,
  levelRate,
  levelVisualTier,
} from "../config/farm-config";
import type { SavedFarmState } from "../lib/farm-storage";
import FarmWorkers, { type WorkerCfg } from "./FarmWorkers";

type FarmGridProps = {
  state: SavedFarmState;
  neonBorder: boolean;
  sparkFx: boolean;
  founderFrame: boolean;
  pendingCell: number | null;
  onCellClick: (index: number) => void;
  onManageCell: (index: number) => void;
  onExpandClick: () => void;
  rallyActive: boolean;
};

/** Build isometric positions for an n×n grid, centered on the board (% values). */
function buildIsoPositions(tier: 1 | 2 | 3 | 4) {
  // To ensure the grid spans nicely and scales down for larger land sizes
  const cfg: Record<number, { n: number; tileW: number; ox: number; oy: number; size: number }> = {
    1: { n: 2, tileW: 28, ox: 50, oy: 35, size: 44 }, // 2x2
    2: { n: 3, tileW: 22, ox: 50, oy: 25, size: 40 }, // 3x3
    3: { n: 4, tileW: 17, ox: 50, oy: 18, size: 34 }, // 4x4
    4: { n: 5, tileW: 14, ox: 50, oy: 13, size: 28 }, // 5x5
  };
  const { n, tileW, ox, oy, size } = cfg[tier] ?? cfg[1];

  // Mathematically perfect seamless layout:
  // dx = half the width of the tile
  const dx = tileW / 2;
  // dy = derived from true aspect ratio of the 220x147 tile (147/220 = 0.66818)
  const dy = tileW * (147 / 220) / 2;

  const positions: { left: number; top: number; z: number }[] = [];
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      positions.push({
        left: ox + (col - row) * dx,
        top:  oy + (col + row) * dy,
        z:    col + row + 1,
      });
    }
  }

  return {
    positions,
    tileW,
    workerCfg: { dim: n, dx, dy, ox, oy, size }
  };
}

export default function FarmGrid({
  state,
  neonBorder,
  sparkFx,
  founderFrame,
  pendingCell,
  onCellClick,
  onManageCell,
  onExpandClick,
  rallyActive,
}: FarmGridProps) {
  const tier = (state.gridTier ?? 1) as 1 | 2 | 3 | 4;
  const { positions, tileW, workerCfg } = buildIsoPositions(tier);
  const workerCount = workerCfg.dim + 1;
  const n = workerCfg.dim;
  const buildingCells = state.cells
    .map((c, i) => (c.buildingId ? { col: i % n, row: Math.floor(i / n) } : null))
    .filter((v): v is { col: number; row: number } => v !== null);

  return (
    <div className={`farm-iso-board ${neonBorder ? "farm-iso-neon" : ""} ${founderFrame ? "farm-iso-founder" : ""}`}>
      {/* ── Base Flag ── */}
      <div 
        className="farm-base-flag" 
        style={{
          left: `${workerCfg.ox - (workerCfg.dim - 1) * workerCfg.dx}%`,
          top: `${workerCfg.oy + (workerCfg.dim - 1) * workerCfg.dy}%`
        }}
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/farm/flag.png" alt="" className="farm-base-flag-img" />
      </div>

      {/* ── Expand ring — clickable outline around the entire board ── */}
      <button
        type="button"
        onClick={onExpandClick}
        className="farm-expand-ring"
        aria-label="Expand base — unlock more plots"
      >
        <span className="farm-expand-ring-label">
          <span className="farm-expand-ring-plus">+</span>
          Expand Base
        </span>
      </button>

      {/* ── Active plots ── */}
      {positions.map((pos, i) => {
        const cell = state.cells[i] ?? { buildingId: null };
        const built = cell.buildingId;
        const def = built ? FARM_BUILDING_MAP[built] : null;
        const isPending = pendingCell === i;
        const resMeta = def ? RESOURCE_META[def.produces] : null;
        const level = cell.level ?? 1;
        const vTier = levelVisualTier(level);
        const glow =
          vTier === 3
            ? ` drop-shadow(0 0 16px ${resMeta?.color ?? "#00ff88"})`
            : vTier === 2
              ? ` drop-shadow(0 0 9px ${resMeta?.color ?? "#00ff88"}bb)`
              : "";
        const buildingFilter = def
          ? `${def.tint ?? ""} drop-shadow(0 12px 16px rgba(0,0,0,0.6))${glow}`.trim()
          : undefined;
        const shownRate = def
          ? def.consumesPerSec
            ? levelRate(def.ratePerSec, level)
            : levelRate(def.ratePerSec > 0 ? def.ratePerSec : def.crystalPerSec, level)
          : 0;

        return (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (isPending) return;
              if (built) onManageCell(i);
              else onCellClick(i);
            }}
            disabled={isPending}
            style={{
              left: `${pos.left}%`,
              top: `${pos.top}%`,
              // pos.z = col+row+1 → (pos.z-1)*100 = (col+row)*100
              // empty: +0, built: +50 → workers use +30 (inside) / +60 (normal)
              zIndex: (pos.z - 1) * 100 + (built ? 50 : 0),
              width: `${tileW}%`,
            }}
            className={`farm-tile ${built ? "farm-tile-built" : "farm-tile-empty"} ${isPending ? "farm-tile-pending" : ""}`}
            aria-label={
              built ? `${def?.name} — tap to manage` : `Empty plot ${i + 1} — tap to build`
            }
          >
            <Image
              src={FARM_TILE_IMAGE}
              alt=""
              width={220}
              height={147}
              className="farm-tile-ground"
              style={{ width: "100%", height: "auto" }}
              draggable={false}
              priority={i === 0}
            />

            {isPending && <span className="farm-tile-status">Building…</span>}

            {built && def && (
              <>
                {sparkFx && (
                  <>
                    <span className="farm-spark" style={{ left: "38%", top: "20%", animationDelay: "0s" }} />
                    <span className="farm-spark" style={{ left: "58%", top: "28%", animationDelay: "0.5s" }} />
                    <span className="farm-spark" style={{ left: "48%", top: "12%", animationDelay: "0.9s" }} />
                  </>
                )}
                <Image
                  src={def.image}
                  alt={def.name}
                  width={220}
                  height={220}
                  className="farm-tile-building"
                  style={{
                    height: "auto",
                    transform: `translateX(-50%) scale(${def.scale})`,
                    filter: buildingFilter,
                  }}
                  draggable={false}
                />
                {/* Level badge */}
                <span className={`farm-tile-level farm-tile-level-t${vTier}`}>Lv.{level}</span>
                {resMeta && (
                  <span
                    className="farm-tile-label"
                    style={{ color: resMeta.color, borderColor: `${resMeta.color}55` }}
                  >
                    <span className="farm-tile-label-icon inline-flex items-center justify-center relative -top-[1px]">
                      <Image 
                        src={resMeta.image} 
                        alt={resMeta.label} 
                        width={12} 
                        height={12} 
                        className="object-contain" 
                        style={resMeta.label === "Prime Crystal" ? { filter: "hue-rotate(260deg)" } : {}}
                      />
                    </span>
                    <span className="farm-tile-label-rate">
                      {def.consumesPerSec 
                        ? `${def.produces === "prime_crystal" ? shownRate.toFixed(3) : shownRate.toFixed(1)}→` 
                        : `+${def.produces === "prime_crystal" ? shownRate.toFixed(3) : shownRate.toFixed(1)}`}
                    </span>
                  </span>
                )}
              </>
            )}

            {!built && !isPending && (
              <span className="farm-tile-plus" aria-hidden>
                <span className="farm-tile-plus-ring">+</span>
              </span>
            )}
          </button>
        );
      })}

      {/* ── Roaming worker units ── */}
      <FarmWorkers
        cfg={workerCfg}
        count={workerCount}
        buildings={buildingCells}
        rallyActive={rallyActive}
      />
    </div>
  );
}
