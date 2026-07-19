/** VENA Mine Grid — daily quest system */

export type QuestType =
  | "produce_ore"
  | "produce_iron"
  | "produce_gold"
  | "produce_crystal"
  | "use_rally"
  | "build"
  | "upgrade";

export type QuestTemplate = {
  id: string;
  type: QuestType;
  target: number;
  label: string;
  detail: string;
  rewardCrystal: number;
};

export type QuestInstance = {
  templateId: string;
  progress: number;
  claimed: boolean;
};

/**
 * Pool of 12 possible daily quests. Three are selected each day via a
 * deterministic seeded shuffle so every player gets the same set.
 */
export const QUEST_POOL: QuestTemplate[] = [
  {
    id: "mine_ore_500",
    type: "produce_ore",
    target: 500,
    label: "Mine 500 Ore",
    detail: "Ore Mines extract raw ore.",
    rewardCrystal: 250,
  },
  {
    id: "mine_ore_2000",
    type: "produce_ore",
    target: 2000,
    label: "Mine 2,000 Ore",
    detail: "Keep your Ore Mines running.",
    rewardCrystal: 800,
  },
  {
    id: "mine_iron_300",
    type: "produce_iron",
    target: 300,
    label: "Mine 300 Iron",
    detail: "Iron Mines dig solid iron.",
    rewardCrystal: 400,
  },
  {
    id: "mine_iron_1000",
    type: "produce_iron",
    target: 1000,
    label: "Mine 1,000 Iron",
    detail: "Build more Iron Mines.",
    rewardCrystal: 1200,
  },
  {
    id: "mine_gold_100",
    type: "produce_gold",
    target: 100,
    label: "Mine 100 Gold",
    detail: "Gold Mines reach deep veins.",
    rewardCrystal: 500,
  },
  {
    id: "mine_gold_500",
    type: "produce_gold",
    target: 500,
    label: "Mine 500 Gold",
    detail: "Max out your Gold Mines.",
    rewardCrystal: 1500,
  },
  {
    id: "refine_crystal_10",
    type: "produce_crystal",
    target: 10,
    label: "Refine 10 Crystal",
    detail: "Crystal Lab refines Gold into Crystal.",
    rewardCrystal: 800,
  },
  {
    id: "refine_crystal_50",
    type: "produce_crystal",
    target: 50,
    label: "Refine 50 Crystal",
    detail: "A full refining chain is needed.",
    rewardCrystal: 2000,
  },
  {
    id: "rally_1",
    type: "use_rally",
    target: 1,
    label: "Activate Rally",
    detail: "Hit Rally the Crew once.",
    rewardCrystal: 200,
  },
  {
    id: "rally_3",
    type: "use_rally",
    target: 3,
    label: "Activate Rally 3×",
    detail: "Use the Commander's surge 3 times.",
    rewardCrystal: 500,
  },
  {
    id: "build_1",
    type: "build",
    target: 1,
    label: "Build a structure",
    detail: "Place any building on an empty plot.",
    rewardCrystal: 300,
  },
  {
    id: "upgrade_2",
    type: "upgrade",
    target: 2,
    label: "Upgrade 2 buildings",
    detail: "Open a building and hit Upgrade.",
    rewardCrystal: 600,
  },
];

export const QUEST_POOL_MAP = Object.fromEntries(QUEST_POOL.map((q) => [q.id, q]));

/**
 * Returns today's UTC date key, e.g. "2026-07-06".
 * All players share the same daily quests because this is deterministic.
 */
export function getDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Seeded LCG shuffle — same seed always produces same order. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = (seed ^ 0xdeadbeef) >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = (s ^ (s >>> 11)) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick 3 quest templates for a given UTC day. */
export function getDailyTemplates(dayKey: string): QuestTemplate[] {
  const [y, m, d] = dayKey.split("-").map(Number);
  const seed = y * 10000 + m * 100 + d;
  return seededShuffle(QUEST_POOL, seed).slice(0, 3);
}

/** Fresh instances for today (progress=0, claimed=false). */
export function freshQuestInstances(dayKey: string): QuestInstance[] {
  return getDailyTemplates(dayKey).map((t) => ({
    templateId: t.id,
    progress: 0,
    claimed: false,
  }));
}

/** Streak bonus multiplier. +1% per day, max +30% at 30 days. */
export function streakMultiplier(streakCount: number): number {
  return 1 + Math.min(streakCount, 30) * 0.01;
}
