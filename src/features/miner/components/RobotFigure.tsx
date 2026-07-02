"use client";

import type { PickaxeNFT, Rarity } from "@/lib/types";

type RobotFigureProps = {
  displayPickaxe: PickaxeNFT | null;
};

/** Idle — no pickaxe equipped (transparent background) */
const IDLE_ROBOT_SRC = "/miner/vena-robot-transparent.png";

/**
 * Full robot renders (body + pickaxe baked in). Drop PNGs in public/miner/.
 * Same canvas size / framing as vena-robot.png for all tiers.
 */
const ROBOT_SRC_BY_RARITY: Record<Rarity, string> = {
  Silver: "/miner/robot-silver.png",
  Gold: "/miner/robot-gold.png",
  Platinum: "/miner/robot-platinum.png",
  Diamond: "/miner/robot-diamond.png",
  Emerald: "/miner/robot-emerald.png",
};

export default function RobotFigure({ displayPickaxe }: RobotFigureProps) {
  const src = displayPickaxe
    ? ROBOT_SRC_BY_RARITY[displayPickaxe.rarity]
    : IDLE_ROBOT_SRC;

  const alt = displayPickaxe
    ? `Miner unit with ${displayPickaxe.name}`
    : "Vena Protocol miner unit";

  return (
    <div className="relative z-[1] h-full w-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt={alt}
        className="miner-robot-img mx-auto block"
        decoding="async"
      />
    </div>
  );
}
