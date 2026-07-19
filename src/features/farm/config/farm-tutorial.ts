/** First-hour commander onboarding — shown once per save. */

export type TutorialStep = {
  id: string;
  title: string;
  body: string;
  /** Optional hint pointing at UI (for highlight). */
  hint?: string;
};

export const FARM_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome, Commander",
    body: "VenaLand is your idle command base. Place buildings on the grid, refine ore into Crystal, and climb the season rankings.",
    hint: "Tap an empty plot on the grid to build your first mine.",
  },
  {
    id: "build",
    title: "Deploy a Mine Shaft",
    body: "Start with a Crystal Extractor or Ore Mine. Producers feed converters — Ore → Iron → Gold → Crystal.",
    hint: "Empty plots glow when you can build.",
  },
  {
    id: "rally",
    title: "Rally the Crew",
    body: "Tap Rally in the Commander card for a 2× production surge. Use it when your converters need a push.",
  },
  {
    id: "quests",
    title: "Daily Orders",
    body: "Complete three daily quests for Crystal rewards. Streak days stack a permanent production bonus.",
  },
  {
    id: "trade",
    title: "Trade Post",
    body: "Sell surplus ore, iron, or gold to other commanders for Crystal — or buy what you're short on. A 5% fee feeds the VENA buyback pool.",
  },
];

export const TUTORIAL_COMPLETE = FARM_TUTORIAL_STEPS.length;
