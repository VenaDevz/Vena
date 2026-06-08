"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { formatNumber } from "@/lib/format";
import {
  DAILY_GLOBAL_CAP,
  formatVenaAmount,
  MINING_EMISSION,
  venaPerDayFromPower,
  venaPerSecondFromPower,
} from "@/lib/mining";
import { PROJECT } from "@/lib/project";

interface RewardCounterProps {
  totalHashrate: number;
  totalMiningPower: number;
  baseRewards?: number;
}

export default function RewardCounter({
  totalHashrate,
  totalMiningPower,
  baseRewards = 0,
}: RewardCounterProps) {
  const [rewards, setRewards] = useState(baseRewards);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dailyEst = venaPerDayFromPower(totalMiningPower);
  const perSecond = venaPerSecondFromPower(totalMiningPower);
  const isActive = totalMiningPower > 0;

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isActive) return;

    const tickMs = MINING_EMISSION.uiTickMs;
    const perTick = perSecond * (tickMs / 1000);

    intervalRef.current = setInterval(() => {
      setRewards((prev) => prev + perTick);
    }, tickMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, perSecond]);

  const displayRewards = isActive ? rewards : 0;

  const handleClaim = async () => {
    if (!isActive || claiming) return;
    setClaiming(true);
    await new Promise((r) => setTimeout(r, 1500));
    setRewards(0);
    setClaiming(false);
    setClaimed(true);
    setTimeout(() => setClaimed(false), 3000);
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden p-6 sm:p-8"
      style={{
        background: "linear-gradient(135deg, rgba(13,21,32,0.95) 0%, rgba(17,29,46,0.95) 100%)",
        border: isActive
          ? "1px solid rgba(0,255,136,0.35)"
          : "1px solid rgba(0,212,255,0.15)",
      }}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: isActive ? "rgba(0,255,136,0.15)" : "rgba(0,212,255,0.1)",
                border: isActive
                  ? "1px solid rgba(0,255,136,0.3)"
                  : "1px solid rgba(0,212,255,0.2)",
              }}
            >
              <Sparkles size={18} className={isActive ? "text-[#00ff88]" : "text-[#00d4ff]"} />
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-bold tracking-wider text-white truncate"
                style={{ fontFamily: "var(--font-orbitron)" }}
              >
                Mining Rewards
              </p>
              <p className="text-[11px] text-slate-500 font-mono tracking-wider">
                Pyramid · {MINING_EMISSION.emissionDays}d pool
              </p>
            </div>
          </div>

          <div
            className="flex flex-col items-end gap-0.5 flex-shrink-0"
            style={{
              background: isActive ? "rgba(0,255,136,0.08)" : "rgba(100,100,100,0.08)",
              border: isActive
                ? "1px solid rgba(0,255,136,0.25)"
                : "1px solid rgba(100,100,100,0.15)",
              borderRadius: 12,
              padding: "6px 10px",
            }}
          >
            <span className={`text-[10px] font-mono ${isActive ? "text-[#00ff88]" : "text-slate-600"}`}>
              {formatNumber(totalMiningPower)} power
            </span>
            <span className="text-[10px] font-mono text-slate-600">
              {formatNumber(totalHashrate)} H/s
            </span>
          </div>
        </div>

        <div className="text-center mb-5">
          <div
            className="font-black tabular-nums leading-none mb-2"
            style={{
              fontFamily: "var(--font-orbitron)",
              fontSize: "clamp(2rem, 7vw, 3.5rem)",
              color: isActive ? "#00ff88" : "#475569",
            }}
          >
            {formatVenaAmount(displayRewards, 6)}
            <span className="text-base ml-2 text-slate-500">{PROJECT.tokenSymbol}</span>
          </div>
          <p className="text-xs font-mono text-slate-500">
            {isActive ? (
              <>
                ≈ {formatVenaAmount(dailyEst)} {PROJECT.tokenSymbol}/day · cap{" "}
                {DAILY_GLOBAL_CAP.toFixed(2)}/day global
              </>
            ) : (
              "Stake Pickaxes to start earning"
            )}
          </p>
        </div>

        {isActive && (
          <div className="mb-5 px-3 py-2.5 rounded-lg bg-[rgba(0,0,0,0.25)] border border-[rgba(255,255,255,0.05)] text-[10px] text-slate-500 font-mono leading-relaxed">
            Early-network est. @ {MINING_EMISSION.launchReferencePower.toLocaleString("en-US")}{" "}
            mining power. Higher tiers use pyramid multipliers — more VENA per token
            invested. Pool hard-capped at {MINING_EMISSION.poolVena.toLocaleString("en-US")}{" "}
            {PROJECT.tokenSymbol} total.
          </div>
        )}

        <motion.button
          onClick={handleClaim}
          disabled={!isActive || claiming || displayRewards === 0}
          whileHover={{ scale: isActive ? 1.01 : 1 }}
          whileTap={{ scale: isActive ? 0.98 : 1 }}
          className="relative w-full py-4 rounded-xl font-black text-sm tracking-[0.2em] uppercase disabled:cursor-not-allowed"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          <span
            className="absolute inset-0 rounded-xl"
            style={
              isActive && !claiming
                ? {
                    background:
                      "linear-gradient(135deg, rgba(0,255,136,0.2) 0%, rgba(0,212,255,0.15) 100%)",
                    border: "1px solid rgba(0,255,136,0.5)",
                  }
                : {
                    background: "rgba(30,41,59,0.5)",
                    border: "1px solid rgba(100,116,139,0.2)",
                  }
            }
          />
          <span
            className="relative z-10 flex items-center justify-center gap-3"
            style={{ color: isActive && !claiming ? "#00ff88" : "rgba(100,116,139,0.5)" }}
          >
            {claiming ? "Processing..." : claimed ? "Claimed!" : `Claim ${PROJECT.tokenSymbol}`}
          </span>
        </motion.button>
      </div>
    </div>
  );
}
