"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, Zap, Clock } from "lucide-react";
import { RARITY_CONFIG, type PickaxeNFT } from "@/lib/types";
import {
  effectiveMiningPower,
  formatVenaAmount,
  getForgeTokenCost,
  getMiningPyramidMultiplier,
  MINING_EMISSION,
  venaPerDayForPickaxe,
  venaPerHourForPickaxe,
  venaPerSecondForPickaxe,
} from "@/lib/mining";
import { formatNumber } from "@/lib/format";
import { PROJECT } from "@/lib/project";

interface NFTCardProps {
  nft: PickaxeNFT;
  onStake: (id: number) => void;
  onUnstake: (id: number) => void;
}

export default function NFTCard({ nft, onStake, onUnstake }: NFTCardProps) {
  const config = RARITY_CONFIG[nft.rarity];
  const [pending, setPending] = useState(false);
  const [localStaked, setLocalStaked] = useState(nft.staked);
  const [sessionRewards, setSessionRewards] = useState(0);

  const pyramidMult = getMiningPyramidMultiplier(nft.rarity);
  const tokenCost = getForgeTokenCost(nft.rarity);
  const dailyEst = venaPerDayForPickaxe(nft.rarity, nft.hashrate);
  const hourlyEst = venaPerHourForPickaxe(nft.rarity, nft.hashrate);
  const miningPower = effectiveMiningPower(nft.hashrate, nft.rarity);

  useEffect(() => {
    if (!localStaked) return;
    const tick = MINING_EMISSION.uiTickMs;
    const interval = setInterval(() => {
      setSessionRewards(
        (prev) => prev + venaPerSecondForPickaxe(nft.rarity, nft.hashrate) * (tick / 1000)
      );
    }, tick);
    return () => clearInterval(interval);
  }, [localStaked, nft.rarity, nft.hashrate]);

  const handleAction = useCallback(async () => {
    setPending(true);
    await new Promise((r) => setTimeout(r, 800));
    if (localStaked) {
      setLocalStaked(false);
      setSessionRewards(0);
      onUnstake(nft.id);
    } else {
      setLocalStaked(true);
      onStake(nft.id);
    }
    setPending(false);
  }, [localStaked, nft.id, onStake, onUnstake]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="relative rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.06)] bg-[#0a0f16]"
      style={{
        boxShadow: localStaked
          ? `0 0 0 1px ${config.color}30, 0 8px 32px ${config.color}12`
          : "0 4px 24px rgba(0,0,0,0.35)",
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: config.color, opacity: localStaked ? 1 : 0.55 }}
      />

      <div className="relative ml-1 h-48 sm:h-52 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 80% 70% at 50% 55%, ${config.color}18 0%, #0a0f16 65%, #030609 100%)`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="relative w-full h-full max-w-[200px] max-h-[160px]">
            <Image
              src={nft.image ?? config.image}
              alt={`${nft.name} — ${config.label} Pickaxe`}
              fill
              className="object-contain pickaxe-blend select-none pointer-events-none"
              sizes="200px"
            />
          </div>
        </div>
        <div className="absolute top-3 left-4 right-4 flex justify-between gap-2 z-10">
          {localStaked ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-[#030609]/90 border border-[rgba(0,255,136,0.35)] text-[#00ff88]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
              Mining
            </span>
          ) : (
            <span />
          )}
          <span
            className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-[#030609]/92 border"
            style={{ borderColor: `${config.color}55`, color: config.color }}
          >
            {config.label} · {pyramidMult}x
          </span>
        </div>
      </div>

      <div className="px-4 pb-4 pt-3 ml-1">
        <h3
          className="font-bold text-sm text-white truncate"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          {nft.name}
        </h3>
        <span className="text-[11px] text-slate-500 font-mono">{nft.tokenId}</span>

        <div className="grid grid-cols-2 gap-2 mt-3 mb-2">
          <StatBox label="Hashrate" value={`${nft.hashrate} H/s`} accent="#fff" />
          <StatBox
            label="Est. daily"
            value={`${formatVenaAmount(dailyEst)} ${PROJECT.tokenSymbol}`}
            accent={config.color}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatBox
            label="Est. hourly"
            value={`${formatVenaAmount(hourlyEst, 5)} ${PROJECT.tokenSymbol}`}
            accent="#94a3b8"
            small
          />
          <StatBox
            label="Mining power"
            value={formatNumber(miningPower)}
            accent="#00d4ff"
            small
            hint={`${tokenCost} ${PROJECT.tokenSymbol} locked`}
          />
        </div>

        <AnimatePresence>
          {localStaked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 px-3 py-2 rounded-lg border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.04)] flex justify-between text-xs font-mono"
            >
              <span className="text-slate-500 flex items-center gap-1">
                <Clock size={10} className="text-[#00ff88]" /> Session
              </span>
              <span className="text-[#00ff88] font-bold">
                +{formatVenaAmount(sessionRewards, 6)} {PROJECT.tokenSymbol}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={handleAction}
          disabled={pending}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-xs tracking-widest uppercase disabled:opacity-60"
          style={{
            fontFamily: "var(--font-orbitron)",
            background: localStaked ? "rgba(239,68,68,0.12)" : `${config.color}14`,
            border: localStaked
              ? "1px solid rgba(239,68,68,0.35)"
              : `1px solid ${config.color}40`,
            color: localStaked ? "#f87171" : config.color,
          }}
        >
          {pending ? (
            <Zap size={14} className="animate-spin" />
          ) : localStaked ? (
            <>
              <Unlock size={14} /> Unstake
            </>
          ) : (
            <>
              <Lock size={14} /> Stake
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

function StatBox({
  label,
  value,
  accent,
  small,
  hint,
}: {
  label: string;
  value: string;
  accent: string;
  small?: boolean;
  hint?: string;
}) {
  return (
    <div className="px-3 py-2.5 rounded-lg bg-[#030609]/60 border border-[rgba(255,255,255,0.05)]">
      <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">{label}</div>
      <div
        className={`font-bold font-mono mt-0.5 ${small ? "text-xs" : "text-sm"}`}
        style={{ color: accent }}
      >
        {value}
      </div>
      {hint && <div className="text-[9px] text-slate-600 font-mono mt-0.5">{hint}</div>}
    </div>
  );
}
