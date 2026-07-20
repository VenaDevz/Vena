"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits } from "viem";
import { targetChainId } from "@/config/wagmi";
import { RH_CONTRACTS } from "@/lib/contracts/robinhood";
import { useWalletVena } from "@/features/miner/hooks/useWalletVena";
import { useWalletPickaxes } from "@/features/miner/hooks/useWalletPickaxes";
import { useOnChainMining } from "@/features/miner/hooks/useOnChainMining";
import { usePickaxesWithStaked } from "@/features/miner/hooks/usePickaxesWithStaked";
import {
  FARM_BUILDING_MAP,
  FARM_DEMO_MODE,
  FARM_DEMO_START_CRYSTAL,
  FARM_PICKAXE_START_CRYSTAL,
  FARM_START_CRYSTAL,
  FARM_GRID_TIERS,
  FARM_MARKET,
  FARM_MIN_VENA_HOLD,
  FARM_PERKS,
  FARM_RALLY,
  FARM_TREASURY,
  vpickBonusPercent,
  vpickProductionMultiplier,
  vpickTierFromRarities,
  type VpickTier,
  POWER_CORE_MAX,
  RESOURCE_META,
  gridDimForTier,
  nextCoreCost,
  powerCoreMultiplier,
  upgradeCost,
  type FarmBuildingId,
} from "../config/farm-config";
import { hasProduction, productionRate, tickResources } from "../lib/farm-math";
import {
  emptyFarmState,
  loadFarmState,
  saveFarmState,
  type SavedFarmState,
} from "../lib/farm-storage";
import {
  getDayKey,
  freshQuestInstances,
  streakMultiplier,
  QUEST_POOL_MAP,
  type QuestInstance,
} from "../config/farm-quests";
import {
  EXCHANGE_MIN_CRYSTAL,
  EXCHANGE_POOL_USDC,
  normalizeExchange,
  poolRemaining,
  previewUsdc,
  recordExchange,
} from "../config/farm-exchange";
import { orderNetCrystal, type TradeOrder } from "../config/farm-trade";
import {
  cacheDayKey,
  dailyCacheReward,
  msUntilNextCache,
} from "../config/farm-daily-cache";
import { TUTORIAL_COMPLETE } from "../config/farm-tutorial";

function addCrystalStats(s: SavedFarmState, gained: number): SavedFarmState {
  if (gained <= 0) return s;
  return {
    ...s,
    stats: {
      totalCrystalProduced: (s.stats?.totalCrystalProduced ?? 0) + gained,
      tradesFilled: s.stats?.tradesFilled ?? 0,
    },
  };
}

function bumpTutorial(s: SavedFarmState, minStep: number): SavedFarmState {
  const step = s.tutorialStep ?? 0;
  if (step >= TUTORIAL_COMPLETE) return s;
  if (step < minStep) return { ...s, tutorialStep: minStep };
  return s;
}

const erc20Abi = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

const pickaxeBalanceAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const baseNftAbi = [
  {
    name: "balanceOfBatch",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "accounts", type: "address[]" }, { name: "ids", type: "uint256[]" }],
    outputs: [{ type: "uint256[]" }],
  },
] as const;

const BASE_CONTRACT_ADDRESS = "0xe91078b979e9910cadce340e2e4ffe0450d830a9";

export type OfflineBanner = { gained: number; hoursAway: number } | null;

/** On-chain payment can settle several kinds of purchases. */
type PendingAction =
  | { kind: "build"; cellIndex: number; buildingId: FarmBuildingId }
  | { kind: "replace"; cellIndex: number; buildingId: FarmBuildingId }
  | { kind: "expand"; targetTier: 1 | 2 | 3 | 4 }
  | { kind: "upgrade"; cellIndex: number }
  | { kind: "market"; itemId: string };

// ── Quest helpers ──────────────────────────────────────────────────────────

type QuestDelta = {
  ore?: number; iron?: number; gold?: number; crystal?: number;
  rally?: number; build?: number; upgrade?: number;
};

/** Accumulate quest progress for a set of instances in place (mutates copy). */
function applyQuestProgress(
  instances: QuestInstance[],
  delta: QuestDelta
): QuestInstance[] {
  return instances.map((inst) => {
    if (inst.claimed) return inst;
    const tpl = QUEST_POOL_MAP[inst.templateId];
    if (!tpl) return inst;
    let add = 0;
    if (tpl.type === "produce_ore"     && delta.ore)     add = delta.ore;
    if (tpl.type === "produce_iron"    && delta.iron)    add = delta.iron;
    if (tpl.type === "produce_gold"    && delta.gold)    add = delta.gold;
    if (tpl.type === "produce_crystal" && delta.crystal) add = delta.crystal;
    if (tpl.type === "use_rally"       && delta.rally)   add = delta.rally;
    if (tpl.type === "build"           && delta.build)   add = delta.build;
    if (tpl.type === "upgrade"         && delta.upgrade) add = delta.upgrade;
    if (add === 0) return inst;
    return { ...inst, progress: Math.min(inst.progress + add, tpl.target) };
  });
}

/**
 * On every load/session-start, check streak and quests.
 * - Same day as last play → restore unchanged.
 * - Next consecutive day → increment streak, issue new quests.
 * - Skipped day(s) → reset streak to 1, issue new quests.
 */
function refreshStreakAndQuests(s: SavedFarmState): SavedFarmState {
  const today = getDayKey();
  const todayMs = new Date(today).getTime();

  // ── Streak ──
  let streakCount = s.streak?.count ?? 0;
  const lastDay = s.streak?.lastDayKey;
  if (lastDay !== today) {
    const lastMs = lastDay ? new Date(lastDay).getTime() : 0;
    const diffDays = Math.round((todayMs - lastMs) / 86_400_000);
    streakCount = diffDays === 1 ? streakCount + 1 : 1;
  }

  // ── Daily quests ──
  let quests = s.quests;
  if (!quests || quests.dayKey !== today) {
    quests = { dayKey: today, instances: freshQuestInstances(today) };
  }

  return {
    ...s,
    streak: { lastDayKey: today, count: streakCount },
    quests,
  };
}

// ── Market helper ──────────────────────────────────────────────────────────

/** Apply a completed market purchase (owned flag + any granted Crystal). */
function applyMarketPurchase(s: SavedFarmState, itemId: string): SavedFarmState {
  const item = FARM_MARKET.find((m) => m.id === itemId);
  if (!item) return s;
  const cosmetics =
    item.repeatable || s.cosmetics.includes(item.key)
      ? s.cosmetics
      : [...s.cosmetics, item.key];
  return { ...s, crystal: s.crystal + (item.grantCrystal ?? 0), cosmetics };
}

export function useFarmGame() {
  const { address, isConnected } = useAccount();
  const { balanceVena, isLoading: venaLoading, refetch: refetchVena } = useWalletVena();
  const [state, setState] = useState<SavedFarmState | null>(null);
  const [hasLoadedFromCloud, setHasLoadedFromCloud] = useState(false);
  const lastSyncRef = useRef<number>(0);
  const syncTimeoutRef = useRef<number | null>(null);

  const effectiveAddress =
    address ?? (FARM_DEMO_MODE ? "0xDEMO000000000000000000000000000000000000" : undefined);

  const [offlineBanner, setOfflineBanner] = useState<OfflineBanner>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [exchangePoolLeft, setExchangePoolLeft] = useState(EXCHANGE_POOL_USDC);

  const { writeContract, data: txHash, isPending: txPending, reset: resetTx, error: txError } =
    useWriteContract();
  const { isLoading: txConfirming, isSuccess: txSuccess, isError: txFailed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const { data: pickaxeCount } = useReadContract({
    address: RH_CONTRACTS.pickaxeNft,
    abi: pickaxeBalanceAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: { enabled: Boolean(address && RH_CONTRACTS.pickaxeNft) },
  });

  const { pickaxes: walletPickaxes } = useWalletPickaxes();
  const { stakedIds } = useOnChainMining();
  const pickaxes = usePickaxesWithStaked(walletPickaxes, stakedIds);
  const balanceVpickCount = Number(pickaxeCount ?? 0);
  const vpickCount = pickaxes.length > 0 ? pickaxes.length : balanceVpickCount;
  const vpickTier: VpickTier =
    pickaxes.length > 0
      ? vpickTierFromRarities(pickaxes.map((p) => p.rarity))
      : balanceVpickCount > 0
        ? "silver"
        : "none";
  const vpickMultiplier = vpickProductionMultiplier(vpickTier);
  const vpickBonusPct = vpickBonusPercent(vpickTier);

  const { data: landBalances } = useReadContract({
    address: BASE_CONTRACT_ADDRESS,
    abi: baseNftAbi,
    functionName: "balanceOfBatch",
    args: address ? [
      [address, address, address, address],
      [2n, 3n, 4n, 5n]
    ] : undefined,
    chainId: targetChainId,
    query: { enabled: Boolean(address) },
  });

  const hasAnyLand = landBalances ? landBalances.some((b: bigint) => b > 0n) : false;


  // VenaLand is strictly gated by owning a VenaLand Base NFT for the first phase.
  const pickaxeRequired = false;
  const hasPickaxe = vpickCount > 0;
  const hasAccess =
    FARM_DEMO_MODE || (isConnected && hasAnyLand);

  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Perk effects from owned market keys
  const owned = state?.cosmetics ?? [];
  const perkMultiplier = owned.includes("overclock") ? FARM_PERKS.overclockMultiplier : 1;
  const rallyCooldownSec = owned.includes("rapid_rally")
    ? FARM_PERKS.rapidRallyCooldownSec
    : FARM_RALLY.cooldownSec;

  const streakCount = state?.streak?.count ?? 0;
  const strMult = streakMultiplier(streakCount);
  const powerCores = state?.powerCores ?? 0;
  const coreMult = powerCoreMultiplier(powerCores);

  const rallyElapsed = state?.lastRallyAt ? (nowTs - state.lastRallyAt) / 1000 : Infinity;
  const rallyActive       = rallyElapsed < FARM_RALLY.durationSec;
  const rallyOnCooldown   = rallyElapsed < rallyCooldownSec;
  const rallyRemaining    = rallyActive ? Math.ceil(FARM_RALLY.durationSec - rallyElapsed) : 0;
  const rallyCooldownRemaining = rallyOnCooldown ? Math.ceil(rallyCooldownSec - rallyElapsed) : 0;
  const rateMultiplier    = vpickMultiplier * (rallyActive ? FARM_RALLY.boost : 1) * perkMultiplier * strMult * coreMult;

  const gridDim = state ? gridDimForTier(state.gridTier ?? 1) : 2;

  const rate = useMemo(
    () => (state ? productionRate(state.cells, rateMultiplier, gridDim) : 0),
    [state, rateMultiplier, gridDim]
  );
  const producing = useMemo(
    () => (state ? hasProduction(state.cells) : false),
    [state]
  );

  useEffect(() => {
    setExchangePoolLeft(poolRemaining());
  }, [effectiveAddress]);

  const exchange = state ? normalizeExchange(state.exchange) : null;

  const persist = useCallback(
    (next: SavedFarmState) => {
      // Always bump lastTickAt to ensure any local action makes this state "newer" than the cloud
      const nextState = { ...next, lastTickAt: Date.now() };
      setState(nextState);
      if (effectiveAddress) {
        saveFarmState(effectiveAddress, nextState); // Sync locally immediately
        
        // Debounce network save (every 5 seconds max)
        const syncToCloud = () => {
          lastSyncRef.current = Date.now();
          fetch("/api/farm/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ address: effectiveAddress, state: next }),
          }).catch(console.error);
        };

        if (syncTimeoutRef.current) {
          window.clearTimeout(syncTimeoutRef.current);
        }

        const now = Date.now();
        if (now - lastSyncRef.current > 5000) {
          syncToCloud();
        } else {
          syncTimeoutRef.current = window.setTimeout(syncToCloud, 5000 - (now - lastSyncRef.current));
        }
      }
    },
    [effectiveAddress]
  );

  // Sync the local gridTier with the highest tier VenaLand Base NFT they own,
  // or recover corrupted gridTier if cells array is already expanded.
  useEffect(() => {
    if (!landBalances || !state) return;
    
    let actualTier: 1 | 2 | 3 | 4 = 1;
    if (landBalances[3] > 0n) actualTier = 4;
    else if (landBalances[2] > 0n) actualTier = 3;
    else if (landBalances[1] > 0n) actualTier = 2;
    else if (landBalances[0] > 0n) actualTier = 1;

    const currentTier = state.gridTier ?? 1;
    const currentPlots = state.cells.length;
    
    // Determine what tier the user's cells array actually corresponds to.
    // If the bug downgraded their tier but left cells intact, this will be > currentTier.
    let tierFromCells: 1 | 2 | 3 | 4 = 1;
    if (currentPlots >= 16) tierFromCells = 4;
    else if (currentPlots >= 9) tierFromCells = 3;
    else if (currentPlots >= 6) tierFromCells = 2;

    const targetTier = Math.max(actualTier, currentTier, tierFromCells) as 1 | 2 | 3 | 4;

    if (currentTier !== targetTier) {
      const tierDef = FARM_GRID_TIERS.find((t) => t.tier === targetTier);
      if (tierDef) {
        const newCells = Array.from(
          { length: tierDef.plots },
          (_, i) => state.cells[i] ?? { buildingId: null }
        );
        persist({ ...state, cells: newCells, gridTier: targetTier });
      }
    }
  }, [landBalances, state?.gridTier, state?.cells.length, persist]);

  // Load / migrate on wallet connect
  useEffect(() => {
    if (!effectiveAddress) { 
      setState(null); 
      setHasLoadedFromCloud(false);
      return; 
    }
    
    let active = true;
    
    const init = async () => {
      let rawCloud = null;
      if (!hasLoadedFromCloud) {
        try {
          const res = await fetch(`/api/farm/load?address=${effectiveAddress}`);
          const data = await res.json();
          if (data.state) {
             rawCloud = typeof data.state === "string" ? JSON.parse(data.state) : data.state;
          }
          if (active) setHasLoadedFromCloud(true);
        } catch (err) {
          console.error("Failed to load state from backend:", err);
        }
      }

      if (!active) return;
      
      const rawLocal = loadFarmState(effectiveAddress);
      
      let raw: SavedFarmState;
      if (rawCloud && rawLocal) {
        const cloudStats = rawCloud.stats?.totalCrystalProduced ?? 0;
        const localStats = rawLocal.stats?.totalCrystalProduced ?? 0;
        const cloudTick = rawCloud.lastTickAt ?? 0;
        const localTick = rawLocal.lastTickAt ?? 0;

        // 1. Pick the base state (fungible items like resources, crystal, cells)
        let baseState = null;
        if (cloudStats > localStats + 100) {
          baseState = rawCloud;
        } else if (localStats > cloudStats + 100) {
          baseState = rawLocal;
        } else {
          // If they are roughly equal in lifetime progress, tie-break by timestamp
          baseState = localTick > cloudTick ? rawLocal : rawCloud;
        }

        // 2. Merge in "permanent" upgrades that only ever increase, to prevent split-brain wipeouts.
        raw = {
          ...baseState,
          gridTier: Math.max(rawCloud.gridTier ?? 1, rawLocal.gridTier ?? 1),
          powerCores: Math.max(rawCloud.powerCores ?? 0, rawLocal.powerCores ?? 0),
          landGranted: rawCloud.landGranted || rawLocal.landGranted,
          tutorialStep: Math.max(rawCloud.tutorialStep ?? 0, rawLocal.tutorialStep ?? 0),
          cosmetics: Array.from(new Set([...(rawCloud.cosmetics || []), ...(rawLocal.cosmetics || [])])),
        };

        // 3. Ensure lifetime stats never go down during a merge
        if (!raw.stats) raw.stats = { totalCrystalProduced: 0 };
        raw.stats.totalCrystalProduced = Math.max(cloudStats, localStats);
        raw.stats.tradesFilled = Math.max(
           rawCloud.stats?.tradesFilled ?? 0,
           rawLocal.stats?.tradesFilled ?? 0
        );

        // 4. If the gridTier was merged up from the other state, ensure cells array is expanded
        // so it doesn't crash FarmLayout when rendering.
        const tierDef = FARM_GRID_TIERS.find((t) => t.tier === raw.gridTier);
        if (tierDef && raw.cells.length < tierDef.plots) {
           const mergedCells = Array.from(
             { length: tierDef.plots },
             (_, i) => raw.cells[i] ?? { buildingId: null }
           );
           raw.cells = mergedCells;
        }

      } else {
        raw = rawCloud || rawLocal || emptyFarmState();
      }

      // Refresh streak + daily quests before touching anything else
      let withStreak = refreshStreakAndQuests(raw);
    withStreak = { ...withStreak, exchange: normalizeExchange(withStreak.exchange) };

    if (
      (withStreak.tutorialStep ?? 0) < TUTORIAL_COMPLETE &&
      withStreak.cells.some((c) => c.buildingId)
    ) {
      withStreak = { ...withStreak, tutorialStep: TUTORIAL_COMPLETE };
    }

    // First-login welcome grant. Every VENA-holding commander gets starter
    // Crystal; VPICK holders get the larger bundled head-start.
    const isFresh = withStreak.cells.every((c) => !c.buildingId) && withStreak.crystal === 0;
    if (!withStreak.landGranted && isFresh && !FARM_DEMO_MODE) {
      withStreak = {
        ...withStreak,
        landGranted: true,
        crystal: vpickCount > 0 ? FARM_PICKAXE_START_CRYSTAL : FARM_START_CRYSTAL,
      };
    } else if (!withStreak.landGranted) {
      withStreak = { ...withStreak, landGranted: true };
    }

    const withDemo =
      FARM_DEMO_MODE && withStreak.crystal === 0 && withStreak.cells.every((c) => !c.buildingId)
        ? { ...withStreak, crystal: FARM_DEMO_START_CRYSTAL }
        : withStreak;

    // Offline accrual — includes vPick, Overclock, streak and Power Core bonus
    const elapsedSec = Math.max(0, (Date.now() - withDemo.lastTickAt) / 1000);
    const offlineMult =
      vpickMultiplier *
      (withDemo.cosmetics?.includes("overclock") ? FARM_PERKS.overclockMultiplier : 1) *
      streakMultiplier(withDemo.streak?.count ?? 0) *
      powerCoreMultiplier(withDemo.powerCores ?? 0);
    const {
      stockpile,
      crystal,
      primeCrystal,
      gained: gainedResources,
    } = tickResources(
      withDemo.cells,
      withDemo.resources ?? { ore: 0, iron: 0, gold: 0 },
      withDemo.crystal,
      withDemo.primeCrystal ?? 0,
      elapsedSec,
      offlineMult,
      gridDimForTier(withDemo.gridTier ?? 1)
    );
    const crystalGained = crystal - withDemo.crystal;

    // Accumulate offline production into today's quests
    const updatedInstances = withDemo.quests
      ? applyQuestProgress(withDemo.quests.instances, {
          ore:     gainedResources.ore,
          iron:    gainedResources.iron,
          gold:    gainedResources.gold,
          crystal: gainedResources.crystal,
        })
      : withDemo.quests;

    const next: SavedFarmState = addCrystalStats(
      {
        ...withDemo,
        crystal,
        primeCrystal,
        resources: stockpile,
        lastTickAt: Date.now(),
        quests: withDemo.quests
          ? { ...withDemo.quests, instances: updatedInstances ?? withDemo.quests.instances }
          : withDemo.quests,
      },
      gainedResources.crystal
    );
    setState(next);
    saveFarmState(effectiveAddress, next); // Ensure the migrated/loaded state is persisted locally
    if (crystalGained > 1) {
      const hoursAway = elapsedSec / 3600;
      setOfflineBanner({ gained: crystalGained, hoursAway });
    }
    
  };
  init();
  return () => { active = false; };
  }, [effectiveAddress, vpickCount, vpickTier, vpickMultiplier, hasLoadedFromCloud]);

  // Live tick every second
  useEffect(() => {
    if (!effectiveAddress || !producing) return;
    const id = window.setInterval(() => {
      setState((prev) => {
        if (!prev) return prev;
        const { stockpile, crystal, primeCrystal, gained } = tickResources(
          prev.cells,
          prev.resources,
          prev.crystal,
          prev.primeCrystal ?? 0,
          1,
          rateMultiplier,
          gridDimForTier(prev.gridTier ?? 1)
        );

        // Accumulate quest progress
        const today = getDayKey();
        let quests = prev.quests;
        if (quests) {
          // Day rolled over mid-session → issue fresh quests
          if (quests.dayKey !== today) {
            quests = { dayKey: today, instances: freshQuestInstances(today) };
          } else {
            const updatedInst = applyQuestProgress(quests.instances, {
              ore: gained.ore, iron: gained.iron, gold: gained.gold, crystal: gained.crystal,
            });
            quests = { ...quests, instances: updatedInst };
          }
        }

        const next = addCrystalStats(
          { ...prev, crystal, primeCrystal, resources: stockpile, lastTickAt: Date.now(), quests },
          gained.crystal
        );
        saveFarmState(effectiveAddress, next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [effectiveAddress, producing, rateMultiplier]);

  // Settle any on-chain purchase once the tx confirms
  useEffect(() => {
    if (!txSuccess || !pendingAction || !address || !state) return;

    if (pendingAction.kind === "build") {
      const nextCells = [...state.cells];
      nextCells[pendingAction.cellIndex] = { buildingId: pendingAction.buildingId, level: 1 };
      const built: SavedFarmState = { ...state, cells: nextCells };
      const withBQ = built.quests
        ? { ...built, quests: { ...built.quests, instances: applyQuestProgress(built.quests.instances, { build: 1 }) } }
        : built;
      persist(bumpTutorial(withBQ, 2));
    } else if (pendingAction.kind === "replace") {
      const DEMOLISH_COST = 500;
      const def = FARM_BUILDING_MAP[pendingAction.buildingId];
      const crystalBuildCost = def.tier === 2 && def.costCrystal ? def.costCrystal : 0;
      const nextCells = [...state.cells];
      nextCells[pendingAction.cellIndex] = { buildingId: pendingAction.buildingId, level: 1 };
      const replaced: SavedFarmState = {
        ...state,
        cells: nextCells,
        crystal: Math.max(0, state.crystal - DEMOLISH_COST - crystalBuildCost),
      };
      const withBQ = replaced.quests
        ? {
            ...replaced,
            quests: {
              ...replaced.quests,
              instances: applyQuestProgress(replaced.quests.instances, { build: 1 }),
            },
          }
        : replaced;
      persist(withBQ);
    } else if (pendingAction.kind === "expand") {
      const tierDef = FARM_GRID_TIERS.find((t) => t.tier === pendingAction.targetTier);
      if (tierDef) {
        const newCells = Array.from(
          { length: tierDef.plots },
          (_, i) => state.cells[i] ?? { buildingId: null }
        );
        persist({
          ...state,
          cells: newCells,
          gridTier: pendingAction.targetTier,
          crystal: Math.max(0, state.crystal - tierDef.costCrystal),
        });
      }
    } else if (pendingAction.kind === "upgrade") {
      const cell = state.cells[pendingAction.cellIndex];
      if (cell?.buildingId) {
        const def = FARM_BUILDING_MAP[cell.buildingId];
        const level = cell.level ?? 1;
        const cost = upgradeCost(def, level);
        if (cost) {
          const nextResources = { ...state.resources };
          if (cost.resource && cost.resource.type !== "crystal") {
            const k = cost.resource.type as "ore" | "iron" | "gold";
            nextResources[k] = Math.max(0, (nextResources[k] ?? 0) - cost.resource.amount);
          }
          const nextCells = [...state.cells];
          nextCells[pendingAction.cellIndex] = { buildingId: cell.buildingId, level: level + 1 };
          const upgd: SavedFarmState = {
            ...state,
            cells: nextCells,
            crystal: Math.max(0, state.crystal - cost.crystal),
            resources: nextResources,
          };
          const withUQ = upgd.quests
            ? { ...upgd, quests: { ...upgd.quests, instances: applyQuestProgress(upgd.quests.instances, { upgrade: 1 }) } }
            : upgd;
          persist(withUQ);
        }
      }
    } else if (pendingAction.kind === "market") {
      persist(applyMarketPurchase(state, pendingAction.itemId));
    }

    void refetchVena();
    setPendingAction(null);
    resetTx();
    setBuildError(null);
  }, [txSuccess, pendingAction, address, state, refetchVena, resetTx, persist]);

  useEffect(() => {
    if (!txFailed && !txError) return;
    setBuildError("Transaction failed or rejected.");
    setPendingAction(null);
    resetTx();
  }, [txFailed, txError, resetTx]);

  /** Kick off an on-chain VENA transfer to the treasury for a purchase. */
  const payVena = useCallback(
    (amountVena: number, action: PendingAction) => {
      if (!RH_CONTRACTS.venaToken || !/^0x[a-fA-F0-9]{40}$/.test(RH_CONTRACTS.venaToken)) {
        setBuildError("VENA token not configured.");
        return;
      }
      setPendingAction(action);
      writeContract({
        address: RH_CONTRACTS.venaToken,
        abi: erc20Abi,
        functionName: "transfer",
        args: [FARM_TREASURY, parseUnits(String(amountVena), 18)],
        chainId: targetChainId,
      });
    },
    [writeContract]
  );

  const buildOnCell = useCallback(
    (cellIndex: number, buildingId: FarmBuildingId) => {
      if (!effectiveAddress || !state) return;
      setBuildError(null);
      const def = FARM_BUILDING_MAP[buildingId];
      if (state.cells[cellIndex]?.buildingId) { setBuildError("Cell already has a building."); return; }

      const addBuildQuest = (s: SavedFarmState): SavedFarmState => {
        if (!s.quests) return s;
        return {
          ...s,
          quests: {
            ...s.quests,
            instances: applyQuestProgress(s.quests.instances, { build: 1 }),
          },
        };
      };

      const finishBuild = (built: SavedFarmState) =>
        persist(bumpTutorial(addBuildQuest(built), 2));

      if (FARM_DEMO_MODE) {
        // T2 buildings cost crystal in demo
        if (def.tier === 2 && def.costCrystal) {
          if (state.crystal < def.costCrystal) {
            setBuildError(`Need ${def.costCrystal.toLocaleString("en-US")} CRYSTAL.`);
            return;
          }
          const nextCells = [...state.cells];
          nextCells[cellIndex] = { buildingId, level: 1 };
          finishBuild({ ...state, cells: nextCells, crystal: state.crystal - def.costCrystal });
        } else {
          const nextCells = [...state.cells];
          nextCells[cellIndex] = { buildingId, level: 1 };
          finishBuild({ ...state, cells: nextCells });
        }
        return;
      }

      if (def.tier === 2 && def.costCrystal) {
        if (state.crystal < def.costCrystal) {
          setBuildError(`Need ${def.costCrystal.toLocaleString("en-US")} CRYSTAL.`);
          return;
        }
        const nextCells = [...state.cells];
        nextCells[cellIndex] = { buildingId, level: 1 };
        finishBuild({ ...state, cells: nextCells, crystal: state.crystal - def.costCrystal });
        return;
      }

      if (balanceVena < FARM_MIN_VENA_HOLD + def.costVena) {
        setBuildError(`Need ${FARM_MIN_VENA_HOLD.toLocaleString("en-US")} VENA hold + ${def.costVena.toLocaleString("en-US")} build cost.`);
        return;
      }
      payVena(def.costVena, { kind: "build", cellIndex, buildingId });
    },
    [effectiveAddress, state, balanceVena, payVena, persist]
  );

  const demolishCell = useCallback(
    (cellIndex: number) => {
      if (!state) return;
      if (!state.cells[cellIndex]?.buildingId) return;
      setBuildError(null);
      const DEMOLISH_COST = FARM_DEMO_MODE ? 0 : 500;
      if (!FARM_DEMO_MODE && state.crystal < DEMOLISH_COST) {
        setBuildError(`Need ${DEMOLISH_COST} CRYSTAL to demolish.`);
        return;
      }
      const nextCells = [...state.cells];
      nextCells[cellIndex] = { buildingId: null };
      persist({ ...state, cells: nextCells, crystal: state.crystal - DEMOLISH_COST });
    },
    [state, persist]
  );

  /** Demolish + build in one atomic update (avoids race with async state). */
  const replaceCell = useCallback(
    (cellIndex: number, buildingId: FarmBuildingId) => {
      if (!effectiveAddress || !state) return;
      if (!state.cells[cellIndex]?.buildingId) return;
      setBuildError(null);

      const def = FARM_BUILDING_MAP[buildingId];
      const DEMOLISH_COST = FARM_DEMO_MODE ? 0 : 500;
      const crystalBuildCost =
        !FARM_DEMO_MODE && def.tier === 2 && def.costCrystal ? def.costCrystal : 0;
      const totalCrystal = DEMOLISH_COST + crystalBuildCost;

      const addBuildQuest = (s: SavedFarmState): SavedFarmState => {
        if (!s.quests) return s;
        return {
          ...s,
          quests: {
            ...s.quests,
            instances: applyQuestProgress(s.quests.instances, { build: 1 }),
          },
        };
      };

      if (!FARM_DEMO_MODE && state.crystal < totalCrystal) {
        setBuildError(`Need ${totalCrystal.toLocaleString("en-US")} CRYSTAL to replace.`);
        return;
      }

      if (FARM_DEMO_MODE) {
        const nextCells = [...state.cells];
        nextCells[cellIndex] = { buildingId, level: 1 };
        persist(addBuildQuest({ ...state, cells: nextCells }));
        return;
      }

      if (def.tier === 2 && def.costCrystal) {
        const nextCells = [...state.cells];
        nextCells[cellIndex] = { buildingId, level: 1 };
        persist(
          addBuildQuest({
            ...state,
            cells: nextCells,
            crystal: state.crystal - totalCrystal,
          })
        );
        return;
      }

      if (balanceVena < FARM_MIN_VENA_HOLD + def.costVena) {
        setBuildError(
          `Need ${FARM_MIN_VENA_HOLD.toLocaleString("en-US")} VENA hold + ${def.costVena.toLocaleString("en-US")} build cost.`
        );
        return;
      }
      payVena(def.costVena, { kind: "replace", cellIndex, buildingId });
    },
    [effectiveAddress, state, balanceVena, payVena, persist]
  );

  /** Upgrade a building one level using in-game materials (Crystal + its resource). */
  const upgradeCell = useCallback(
    (cellIndex: number) => {
      if (!state) return;
      const cell = state.cells[cellIndex];
      if (!cell?.buildingId) return;
      setBuildError(null);

      const def = FARM_BUILDING_MAP[cell.buildingId];
      const level = cell.level ?? 1;
      const cost = upgradeCost(def, level);
      if (!cost) { setBuildError("Building is at max level."); return; }

      if (state.crystal < cost.crystal) {
        setBuildError(`Need ${cost.crystal.toLocaleString("en-US")} CRYSTAL to upgrade.`);
        return;
      }

      const nextResources = { ...state.resources };
      const res = cost.resource;
      if (res && res.type !== "crystal") {
        const key = res.type as "ore" | "iron" | "gold";
        if ((nextResources[key] ?? 0) < res.amount) {
          setBuildError(`Need ${res.amount.toLocaleString("en-US")} ${RESOURCE_META[res.type].label}.`);
          return;
        }
        nextResources[key] -= res.amount;
      }

      // Milestone levels (5, 10) require an on-chain VENA payment in live mode.
      // Crystal + resources are only spent once the tx confirms.
      if (cost.milestone && !FARM_DEMO_MODE && cost.vena > 0) {
        if (balanceVena < FARM_MIN_VENA_HOLD + cost.vena) {
          setBuildError(
            `Milestone upgrade needs ${cost.vena.toLocaleString("en-US")} VENA (+${FARM_MIN_VENA_HOLD.toLocaleString("en-US")} hold).`
          );
          return;
        }
        payVena(cost.vena, { kind: "upgrade", cellIndex });
        return;
      }

      const nextCells = [...state.cells];
      nextCells[cellIndex] = { buildingId: cell.buildingId, level: level + 1 };
      const upgraded: SavedFarmState = {
        ...state,
        cells: nextCells,
        crystal: state.crystal - cost.crystal,
        resources: nextResources,
      };
      const withUpgradeQuest: SavedFarmState = upgraded.quests
        ? {
            ...upgraded,
            quests: {
              ...upgraded.quests,
              instances: applyQuestProgress(upgraded.quests.instances, { upgrade: 1 }),
            },
          }
        : upgraded;
      persist(withUpgradeQuest);
    },
    [state, balanceVena, payVena, persist]
  );

  const buyMarketItem = useCallback(
    (itemId: string) => {
      if (!state) return;
      const item = FARM_MARKET.find((m) => m.id === itemId);
      if (!item) return;
      if (!item.repeatable && state.cosmetics.includes(item.key)) return;
      setBuildError(null);

      // VENA-priced goods: on-chain payment in live mode, free in demo.
      if (item.costVena) {
        if (FARM_DEMO_MODE) {
          persist(applyMarketPurchase(state, itemId));
          return;
        }
        if (balanceVena < FARM_MIN_VENA_HOLD + item.costVena) {
          setBuildError(
            `Need ${item.costVena.toLocaleString("en-US")} VENA (+${FARM_MIN_VENA_HOLD.toLocaleString("en-US")} hold).`
          );
          return;
        }
        payVena(item.costVena, { kind: "market", itemId });
        return;
      }

      // Crystal-priced goods: instant.
      const cost = item.costCrystal ?? 0;
      if (state.crystal < cost) { setBuildError("Not enough CRYSTAL."); return; }
      persist(applyMarketPurchase({ ...state, crystal: state.crystal - cost }, itemId));
    },
    [state, balanceVena, payVena, persist]
  );

  const rallyCommander = useCallback(() => {
    if (!state || rallyOnCooldown) return;
    const rallied: SavedFarmState = { ...state, lastRallyAt: Date.now() };
    const withRallyQuest: SavedFarmState = rallied.quests
      ? {
          ...rallied,
          quests: {
            ...rallied.quests,
            instances: applyQuestProgress(rallied.quests.instances, { rally: 1 }),
          },
        }
      : rallied;
    persist(bumpTutorial(withRallyQuest, 3));
    setNowTs(Date.now());
  }, [state, rallyOnCooldown, persist]);

  /**
   * Switch the grid to another tier. Downgrading to an already-unlocked tier is
   * always free (just changes the visible board). Upgrading in live mode requires
   * holding the tier's VENA threshold, spends Crystal, and charges VENA on-chain.
   * Demo mode is free in either direction (for quick previewing).
   */
  const expandBase = useCallback(
    (targetTier: 1 | 2 | 3 | 4) => {
      if (!state) return;
      const tierDef = FARM_GRID_TIERS.find((t) => t.tier === targetTier);
      if (!tierDef) return;
      const currentTier = state.gridTier ?? 1;
      if (targetTier === currentTier) return;
      setBuildError(null);

      const goingUp = targetTier > currentTier;

      // Free switch: demo mode, or downgrading to an already-unlocked tier.
      if (FARM_DEMO_MODE || !goingUp) {
        const newCells = Array.from(
          { length: tierDef.plots },
          (_, i) => state.cells[i] ?? { buildingId: null }
        );
        persist({ ...state, cells: newCells, gridTier: targetTier });
        return;
      }

      // Live upward expansion: Crystal + VENA hold gate + on-chain VENA payment.
      if (state.crystal < tierDef.costCrystal) {
        setBuildError(`Need ${tierDef.costCrystal.toLocaleString("en-US")} CRYSTAL to expand.`);
        return;
      }
      if (balanceVena < tierDef.holdVena + tierDef.costVena) {
        setBuildError(
          `Requires holding ${tierDef.holdVena.toLocaleString("en-US")} VENA + ${tierDef.costVena.toLocaleString("en-US")} expansion cost.`
        );
        return;
      }
      payVena(tierDef.costVena, { kind: "expand", targetTier });
    },
    [state, balanceVena, payVena, persist]
  );

  /**
   * Burn Prime Crystal to forge the next Power Core.
   * Each core gives a permanent +5% production multiplier to all buildings.
   */
  const forgePowerCore = useCallback(() => {
    if (!state) return;
    const cores = state.powerCores ?? 0;
    const cost = nextCoreCost(cores);
    if (cost === null) return; // already maxed
    const prime = state.primeCrystal ?? 0;
    if (prime < cost) {
      setBuildError(`Need ${cost} ◆ Prime Crystal to forge next Power Core.`);
      return;
    }
    setBuildError(null);
    persist({
      ...state,
      primeCrystal: prime - cost,
      powerCores: cores + 1,
    });
  }, [state, persist]);

  /** Claim a completed quest reward — adds Crystal, marks claimed. */
  const claimQuest = useCallback(
    (templateId: string) => {
      if (!state?.quests) return;
      const inst = state.quests.instances.find((i) => i.templateId === templateId);
      const tpl = QUEST_POOL_MAP[templateId];
      if (!inst || !tpl || inst.claimed || inst.progress < tpl.target) return;
      const updatedInst = state.quests.instances.map((i) =>
        i.templateId === templateId ? { ...i, claimed: true } : i
      );
      persist(
        bumpTutorial(
          {
            ...state,
            crystal: state.crystal + tpl.rewardCrystal,
            quests: { ...state.quests, instances: updatedInst },
          },
          4
        )
      );
    },
    [state, persist]
  );

  /**
   * Swap Crystal for USDC from the dynamic fee-funded pool.
   * Rate = poolRemaining / quotaRemaining (demo: local tracking).
   */
  const exchangeCrystal = useCallback(
    (crystalAmount: number) => {
      if (!state) return;
      const ex = normalizeExchange(state.exchange);
      const usdcOut = previewUsdc(crystalAmount);

      if (crystalAmount < EXCHANGE_MIN_CRYSTAL) {
        setBuildError(`Minimum swap is ${EXCHANGE_MIN_CRYSTAL.toLocaleString("en-US")} Crystal.`);
        return;
      }
      if (state.crystal < crystalAmount) {
        setBuildError("Not enough Crystal.");
        return;
      }
      if (usdcOut <= 0 || poolRemaining() < usdcOut) {
        setBuildError("Exchange pool is empty — wait for the next fee top-up.");
        return;
      }

      setBuildError(null);
      recordExchange(crystalAmount, usdcOut);
      setExchangePoolLeft(poolRemaining());
      persist({
        ...state,
        crystal: state.crystal - crystalAmount,
        exchange: {
          ...ex,
          totalCrystalSold: ex.totalCrystalSold + crystalAmount,
          totalUsdcEarned: ex.totalUsdcEarned + usdcOut,
        },
      });
    },
    [state, persist]
  );

  /**
   * Fill a Commander Trade Post order (simulated P2P resource market).
   * "sell": trade surplus resource for Crystal (−5% network fee).
   * "buy":  spend Crystal to acquire a resource (+5% network fee).
   * Returns true if the trade was applied.
   */
  const fillTrade = useCallback(
    (order: TradeOrder): boolean => {
      if (!state) return false;
      setBuildError(null);

      if (order.side === "sell") {
        const have = state.resources[order.resource] ?? 0;
        if (have < order.amount) {
          setBuildError(`Need ${order.amount.toLocaleString("en-US")} ${RESOURCE_META[order.resource].label} to fill this order.`);
          return false;
        }
        const gain = orderNetCrystal(order); // gross − fee
        persist(
          bumpTutorial(
            {
              ...state,
              crystal: state.crystal + gain,
              resources: {
                ...state.resources,
                [order.resource]: have - order.amount,
              },
              stats: {
                totalCrystalProduced: state.stats?.totalCrystalProduced ?? 0,
                tradesFilled: (state.stats?.tradesFilled ?? 0) + 1,
              },
            },
            TUTORIAL_COMPLETE
          )
        );
        return true;
      }

      // Buy: player pays Crystal (gross + fee) for the resource.
      const cost = -orderNetCrystal(order);
      if (state.crystal < cost) {
        setBuildError(`Need ${Math.ceil(cost).toLocaleString("en-US")} Crystal to buy this order.`);
        return false;
      }
      persist(
        bumpTutorial(
          {
            ...state,
            crystal: state.crystal - cost,
            resources: {
              ...state.resources,
              [order.resource]: (state.resources[order.resource] ?? 0) + order.amount,
            },
            stats: {
              totalCrystalProduced: state.stats?.totalCrystalProduced ?? 0,
              tradesFilled: (state.stats?.tradesFilled ?? 0) + 1,
            },
          },
          TUTORIAL_COMPLETE
        )
      );
      return true;
    },
    [state, persist]
  );

  const dismissOffline = useCallback(() => setOfflineBanner(null), []);

  const dismissTutorial = useCallback(() => {
    if (!state) return;
    const step = state.tutorialStep ?? 0;
    if (step >= TUTORIAL_COMPLETE) return;
    persist({ ...state, tutorialStep: step + 1 });
  }, [state, persist]);

  const skipTutorial = useCallback(() => {
    if (!state) return;
    persist({ ...state, tutorialStep: TUTORIAL_COMPLETE });
  }, [state, persist]);

  const claimDailyCache = useCallback(() => {
    if (!state || !effectiveAddress) return;
    const today = cacheDayKey();
    if (state.dailyCacheDay === today) return;

    const reward = dailyCacheReward(today, effectiveAddress, vpickTier);
    let next: SavedFarmState = { ...state, dailyCacheDay: today };

    if (reward.kind === "crystal") {
      next = addCrystalStats(
        { ...next, crystal: next.crystal + reward.amount },
        reward.amount
      );
    } else {
      next = {
        ...next,
        resources: {
          ...next.resources,
          [reward.kind]: (next.resources[reward.kind] ?? 0) + reward.amount,
        },
      };
    }
    persist(next);
  }, [state, effectiveAddress, vpickTier, persist]);

  const tutorialStep = state?.tutorialStep ?? 0;
  const tutorialDone = tutorialStep >= TUTORIAL_COMPLETE;
  const dailyCacheAvailable = Boolean(state && state.dailyCacheDay !== cacheDayKey());
  const dailyCachePreview =
    effectiveAddress && state
      ? dailyCacheReward(cacheDayKey(), effectiveAddress, vpickTier)
      : null;
  const cacheCountdownMs =
    state?.dailyCacheDay === cacheDayKey()
      ? msUntilNextCache(state.dailyCacheDay)
      : 0;
  const totalCrystalProduced = state?.stats?.totalCrystalProduced ?? 0;
  const tradesFilled = state?.stats?.tradesFilled ?? 0;
  const gridTier = state?.gridTier ?? 1;
  const builtPlots = state?.cells.filter((c) => c.buildingId).length ?? 0;

  const isPaying = txPending || txConfirming;

  const claimDecryptorReward = useCallback((reward: { type: string; amount: number; name: string; isPaid?: boolean }) => {
    if (!state) return;
    const newState = { ...state };
    if (reward.type === "crystal") {
      newState.crystal += reward.amount;
    } else if (reward.type === "ore") {
      newState.resources.ore += reward.amount;
    } else if (reward.type === "iron") {
      newState.resources.iron += reward.amount;
    } else if (reward.type === "gold") {
      newState.resources.gold += reward.amount;
    } else if (reward.type === "core") {
      newState.powerCores = (newState.powerCores || 0) + reward.amount;
    }
    
    if (reward.isPaid === false) {
      newState.decryptorFreeSpinAt = Date.now() + 24 * 60 * 60 * 1000;
    }
    
    persist(newState);
  }, [state, persist]);

  return {
    state,
    rate,
    rateMultiplier,
    vpickCount,
    vpickTier,
    vpickBonusPct,
    hasPickaxe,
    pickaxeRequired,
    balanceVena,
    venaLoading,
    isConnected,
    hasAccess,
    minHold: FARM_MIN_VENA_HOLD,
    offlineBanner,
    dismissOffline,
    buildOnCell,
    demolishCell,
    replaceCell,
    upgradeCell,
    buyMarketItem,
    buildError,
    isPaying,
    pendingCell:
      pendingAction?.kind === "build" || pendingAction?.kind === "replace"
        ? pendingAction.cellIndex
        : null,
    isDemoMode: FARM_DEMO_MODE,
    rallyCommander,
    rallyActive,
    rallyOnCooldown,
    rallyRemaining,
    rallyCooldownRemaining,
    rallyBoost: FARM_RALLY.boost,
    expandBase,
    isExpanding: pendingAction?.kind === "expand",
    // Quests & streak
    quests: state?.quests ?? null,
    streakCount,
    strMult,
    claimQuest,
    // End-game resource + prestige
    primeCrystal: state?.primeCrystal ?? 0,
    powerCores,
    coreMult,
    nextCoreCost: nextCoreCost(powerCores),
    forgePowerCore,
    powerCoreMax: POWER_CORE_MAX,
    // Crystal → USDC exchange
    exchange,
    exchangePoolLeft,
    exchangePoolTotal: EXCHANGE_POOL_USDC,
    exchangeCrystal,
    totalUsdcEarned: exchange?.totalUsdcEarned ?? 0,
    // Commander Trade Post (P2P resource market)
    fillTrade,
    // Tutorial & daily cache
    tutorialStep,
    tutorialDone,
    dismissTutorial,
    skipTutorial,
    claimDailyCache,
    dailyCacheAvailable,
    dailyCachePreview,
    cacheCountdownMs,
    totalCrystalProduced,
    tradesFilled,
    gridTier,
    builtPlots,
    claimDecryptorReward,
    decryptorFreeSpinAt: state?.decryptorFreeSpinAt ?? 0,
  };
}
