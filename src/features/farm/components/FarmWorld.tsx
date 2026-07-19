"use client";

import Image from "next/image";
import { Zap, Gem, Store, Trophy, ShoppingBag, Shield } from "lucide-react";
import { formatCrystal } from "../config/farm-config";
import FarmGrid from "./FarmGrid";
import type { SavedFarmState } from "../lib/farm-storage";

type FarmWorldProps = {
  state: SavedFarmState;
  rate: number;
  vpickCount: number;
  vpickBonusPct: number;
  neonBorder: boolean;
  sparkFx: boolean;
  founderFrame: boolean;
  pendingCell: number | null;
  onCellClick: (index: number) => void;
  onManageCell: (index: number) => void;
  onExpandClick: () => void;
  rallyActive: boolean;
  onOpenBazaar: () => void;
  onOpenCommandCenter: () => void;
  onOpenObelisk: () => void;
};

export default function FarmWorld({
  state,
  rate,
  vpickCount,
  vpickBonusPct,
  neonBorder,
  sparkFx,
  founderFrame,
  pendingCell,
  onCellClick,
  onManageCell,
  onExpandClick,
  rallyActive,
  onOpenBazaar,
  onOpenCommandCenter,
  onOpenObelisk,
}: FarmWorldProps) {
  const builtCount = state.cells.filter((c) => c.buildingId).length;

  return (
    <div className="farm-world">
      <div className="farm-world-vignette" aria-hidden />

      <div className="farm-stage">
        <FarmGrid
          state={state}
          neonBorder={neonBorder}
          sparkFx={sparkFx}
          founderFrame={founderFrame}
          pendingCell={pendingCell}
          onCellClick={onCellClick}
          onManageCell={onManageCell}
          onExpandClick={onExpandClick}
          rallyActive={rallyActive}
        />

        {/* ── Bazaar Building ── */}
        <button
          type="button"
          className="farm-world-bazaar"
          onClick={onOpenBazaar}
          aria-label="Open Marketplace"
          title="Enter the Marketplace"
        >
          <div className="farm-world-bazaar-glow" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/farm/marketplace.png"
            alt="Marketplace"
            className="farm-world-bazaar-img"
          />
          <div className="farm-world-bazaar-label">
            <ShoppingBag size={10} strokeWidth={2.5} />
            <span>MARKETPLACE</span>
          </div>
        </button>

        {/* ── Command Center Building ── */}
        <button
          type="button"
          className="farm-world-building farm-world-command"
          onClick={onOpenCommandCenter}
          aria-label="Open Command Center"
        >
          <div className="farm-world-building-glow" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/farm/command-center-v1.png"
            alt="Command Center"
            className="farm-world-building-img"
          />
          <div className="farm-world-building-label">
            <Shield size={10} strokeWidth={2.5} />
            <span>COMMAND CENTER</span>
          </div>
        </button>

        {/* ── Obelisk Building ── */}
        <button
          type="button"
          className="farm-world-building farm-world-obelisk"
          onClick={onOpenObelisk}
          aria-label="Open The Obelisk"
        >
          <div className="farm-world-building-glow" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/farm/obelisk-v1.png"
            alt="Obelisk"
            className="farm-world-building-img"
          />
          <div className="farm-world-building-label">
            <Trophy size={10} strokeWidth={2.5} />
            <span>THE OBELISK</span>
          </div>
        </button>
      </div>

      <div className="farm-hud-float">
        <div className="farm-hud-chip">
          <span className="farm-hud-chip-icon farm-hud-chip-icon-crystal bg-transparent border-none">
            <Image src="/farm/items/crystal.png" alt="Crystal" width={24} height={24} className="object-contain drop-shadow-[0_0_8px_#00ff88]" />
          </span>
          <div>
            <p className="farm-hud-chip-label">Crystal</p>
            <p className="farm-hud-stat farm-hud-chip-value farm-hud-crystal">
              {formatCrystal(state.crystal)}
            </p>
          </div>
        </div>
        <div className="farm-hud-chip">
          <span className="farm-hud-chip-icon farm-hud-chip-icon-rate">
            <Zap size={16} strokeWidth={2.25} />
          </span>
          <div>
            <p className="farm-hud-chip-label">Rate</p>
            <p className="farm-hud-stat farm-hud-chip-value farm-hud-rate">
              +{rate.toFixed(1)}/s
            </p>
          </div>
        </div>
        <div className="farm-hud-chip farm-hud-chip-sm">
          <p className="farm-hud-chip-label">Plots</p>
          <p className="farm-hud-stat farm-hud-chip-value">{builtCount}/{state.cells.length}</p>
        </div>
        {vpickCount > 0 && (
          <div className="farm-hud-chip farm-hud-chip-boost">
            <p className="farm-hud-chip-label">VPICK</p>
            <p className="farm-hud-stat farm-hud-chip-value farm-hud-boost">
              +{vpickBonusPct}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
