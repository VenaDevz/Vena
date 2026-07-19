"use client";

import { X } from "lucide-react";
import FarmDailyCachePanel from "./FarmDailyCachePanel";
import FarmQuestPanel from "./FarmQuestPanel";
import type { QuestInstance } from "../config/farm-quests";
import type { CacheReward } from "../config/farm-daily-cache";
import type { VpickTier } from "../config/farm-config";

type QuestState = {
  dayKey: string;
  instances: QuestInstance[];
} | null;

type Props = {
  onClose: () => void;
  // Daily Cache
  dailyCacheAvailable: boolean;
  dailyCachePreview: CacheReward | null;
  cacheCountdownMs: number;
  vpickTier: VpickTier;
  onClaimCache: () => void;
  // Quests
  quests: QuestState;
  streakCount: number;
  strMult: number;
  onClaimQuest: (id: string) => void;
};

export default function FarmCommandCenterModal({
  onClose,
  dailyCacheAvailable,
  dailyCachePreview,
  cacheCountdownMs,
  vpickTier,
  onClaimCache,
  quests,
  streakCount,
  strMult,
  onClaimQuest,
}: Props) {
  return (
    <div className="farm-bazaar-modal-overlay" onClick={onClose}>
      <div className="farm-bazaar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="farm-bazaar-modal-awning" aria-hidden />

        <div className="farm-bazaar-modal-header border-b border-white/10 pb-4 mb-2">
          <div className="farm-bazaar-modal-title-row flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Command Center</h2>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider">HQ Status & Operations</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors p-1"
              aria-label="Close Command Center"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="farm-bazaar-modal-body flex flex-col gap-4 mt-2">
          <FarmDailyCachePanel
            available={dailyCacheAvailable}
            preview={dailyCachePreview}
            countdownMs={cacheCountdownMs}
            vpickTier={vpickTier}
            onClaim={onClaimCache}
          />
          <FarmQuestPanel
            quests={quests}
            streakCount={streakCount}
            strMult={strMult}
            onClaim={onClaimQuest}
          />
        </div>
      </div>
    </div>
  );
}
