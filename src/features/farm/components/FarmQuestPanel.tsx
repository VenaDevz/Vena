"use client";

import { Flame, CheckCircle2, Clock, Gem, Trophy } from "lucide-react";
import { getDailyTemplates, QUEST_POOL_MAP, type QuestInstance } from "../config/farm-quests";
import { formatCrystal } from "../config/farm-config";

type QuestState = {
  dayKey: string;
  instances: QuestInstance[];
} | null;

type Props = {
  quests: QuestState;
  streakCount: number;
  strMult: number;
  onClaim: (templateId: string) => void;
};

export default function FarmQuestPanel({ quests, streakCount, strMult, onClaim }: Props) {
  const templates = quests ? getDailyTemplates(quests.dayKey) : [];
  const instances = quests?.instances ?? [];

  const totalCompleted = instances.filter((i) => {
    const tpl = QUEST_POOL_MAP[i.templateId];
    return tpl && i.progress >= tpl.target;
  }).length;
  const allClaimed = instances.every((i) => i.claimed);
  const streakBonus = streakCount > 0 ? Math.round((strMult - 1) * 100) : 0;

  return (
    <div className="farm-bazaar farm-bazaar--quest">
      <div className="farm-bazaar-awning farm-bazaar-awning--quest" aria-hidden />

      <div className="farm-bazaar-inner">
        {/* Header */}
        <div className="farm-bazaar-top">
          <div>
            <p className="farm-bazaar-kicker">
              <Trophy size={11} strokeWidth={2.25} />
              Daily Operations
            </p>
            <h3 className="farm-bazaar-title">Mission Board</h3>
          </div>
          {streakCount > 0 && (
            <span className="farm-bazaar-badge farm-bazaar-badge--quest">
              <Flame size={10} />
              {streakCount}d
            </span>
          )}
        </div>

        <p className="farm-bazaar-sub">
          Complete daily missions to earn Crystal. Keep your streak alive for bonus multipliers.
          {streakBonus > 0 && (
            <span className="farm-quest-streak-inline">
              {" "}Streak: +{streakBonus}% Crystal.
            </span>
          )}
        </p>

        {/* Stats */}
        <div className="farm-bazaar-stats">
          <div className="farm-bazaar-stat">
            <Trophy size={12} className="text-[#fb923c]" />
            <span>{totalCompleted}/{templates.length} done</span>
          </div>
          <div className="farm-bazaar-stat">
            <Flame size={12} className="text-orange-400" />
            <span>{streakCount}d streak</span>
          </div>
          {streakBonus > 0 && (
            <div className="farm-bazaar-stat">
              <span className="text-orange-300">+{streakBonus}% bonus</span>
            </div>
          )}
        </div>

        {/* Quest list */}
        <div className="farm-quest-list">
          {templates.map((tpl) => {
            const inst = instances.find((i) => i.templateId === tpl.id);
            const progress = inst?.progress ?? 0;
            const claimed  = inst?.claimed ?? false;
            const done     = progress >= tpl.target;
            const pct      = Math.min(100, (progress / tpl.target) * 100);

            return (
              <div key={tpl.id} className={`farm-quest-item ${done ? "farm-quest-item-done" : ""} ${claimed ? "farm-quest-item-claimed" : ""}`}>
                <div className="farm-quest-top">
                  <div className="farm-quest-name-wrap">
                    {claimed ? (
                      <CheckCircle2 size={13} strokeWidth={2.5} className="text-[#00ff88]" />
                    ) : done ? (
                      <CheckCircle2 size={13} strokeWidth={2.5} className="text-yellow-400" />
                    ) : (
                      <Clock size={13} strokeWidth={2.25} className="text-slate-500" />
                    )}
                    <span className="farm-quest-name">{tpl.label}</span>
                  </div>
                  <div className="farm-quest-reward">
                    <Gem size={10} strokeWidth={2.5} className="text-[#00d4ff]" />
                    <span>+{formatCrystal(tpl.rewardCrystal)}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="farm-quest-bar-wrap">
                  <div
                    className="farm-quest-bar-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="farm-quest-bottom">
                  <span className="farm-quest-progress-text">
                    {formatCrystal(progress)} / {formatCrystal(tpl.target)}
                  </span>
                  {done && !claimed && (
                    <button
                      type="button"
                      className="farm-quest-claim-btn"
                      onClick={() => onClaim(tpl.id)}
                    >
                      Claim
                    </button>
                  )}
                  {claimed && (
                    <span className="farm-quest-claimed-label">Claimed ✓</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="farm-bazaar-footer">
          {allClaimed
            ? "All missions complete! New board at UTC midnight."
            : `${totalCompleted}/${templates.length} complete · resets at UTC midnight`}
        </p>
      </div>
    </div>
  );
}
