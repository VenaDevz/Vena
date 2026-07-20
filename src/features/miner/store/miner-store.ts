import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PickaxeNFT } from "@/lib/types";
import {
  GAME_CONFIG,
  getSlotUnlockCostVena,
  getUpgradeCostVena,
  type DisplayPickaxeMode,
  type StoreItem,
} from "../config/game-config";

function initialUnlockedSlots(): boolean[] {
  const { total, defaultUnlockedCount } = GAME_CONFIG.slots;
  return Array.from({ length: total }, (_, i) => i < defaultUnlockedCount);
}

function emptyPickaxeSlots(): Record<number, number | null> {
  return Object.fromEntries(
    Array.from({ length: GAME_CONFIG.slots.total }, (_, i) => [i, null])
  );
}

function emptyAccessorySlots(): Record<number, string | null> {
  return Object.fromEntries(
    Array.from({ length: GAME_CONFIG.slots.total }, (_, i) => [i, null])
  );
}

export type MinerStoreState = {
  level: number;
  localSpentVena: number;
  earnedVena: number;
  unlockedSlots: boolean[];
  ownedAccessoryIds: string[];
  selectedPickaxeIds: number[];
  pickaxeIdBySlot: Record<number, number | null>;
  accessoryIdBySlot: Record<number, string | null>;
  displayMode: DisplayPickaxeMode;
  displayPickaxeId: number | null;
  upgradeEndsAt: number | null;
  lifetimeSessionClaimed: number;
};

type MinerStoreActions = {
  tickMining: (deltaVena: number) => void;
  claimSessionRewards: () => number;
  unlockSlot: (slotIndex: number, availableBalance: number) => boolean;
  equipPickaxe: (
    slotIndex: number,
    pickaxeId: number,
    equippedCount: number,
    alreadyInSlot: boolean
  ) => boolean;
  buyAccessory: (
    item: StoreItem,
    availableBalance: number,
    targetSlotIndex: number | undefined
  ) => boolean;
  pruneUnavailablePickaxes: (validPickaxeIds: number[], stakedPickaxeIds?: number[]) => void;
  togglePickaxeSelection: (pickaxeId: number) => boolean;
  setDisplayPickaxe: (id: number) => void;
  startUpgrade: (availableBalance: number) => boolean;
  skipUpgrade: (availableBalance: number) => boolean;
  completeUpgrade: () => void;
  resetForDisconnect: () => void;
};

export type MinerStore = MinerStoreState & MinerStoreActions;

const INITIAL_STATE: MinerStoreState = {
  level: 1,
  localSpentVena: 0,
  earnedVena: 0,
  unlockedSlots: initialUnlockedSlots(),
  ownedAccessoryIds: [],
  selectedPickaxeIds: [],
  pickaxeIdBySlot: emptyPickaxeSlots(),
  accessoryIdBySlot: emptyAccessorySlots(),
  displayMode: "highest-tier",
  displayPickaxeId: null,
  upgradeEndsAt: null,
  lifetimeSessionClaimed: 0,
};

export function resolvePickaxeBySlot(
  pickaxeIdBySlot: Record<number, number | null>,
  walletPickaxes: PickaxeNFT[]
): Record<number, PickaxeNFT | null> {
  const byId = new Map(walletPickaxes.map((p) => [p.id, p]));
  const resolved: Record<number, PickaxeNFT | null> = {};

  for (const [slotKey, pickaxeId] of Object.entries(pickaxeIdBySlot)) {
    const slotIndex = Number(slotKey);
    resolved[slotIndex] =
      pickaxeId != null ? (byId.get(pickaxeId) ?? null) : null;
  }

  return resolved;
}

export function resolveAccessoryBySlot(
  accessoryIdBySlot: Record<number, string | null>
): Record<number, StoreItem | null> {
  const byId = new Map(
    GAME_CONFIG.store.accessories.map((item) => [item.id, item])
  );
  const resolved: Record<number, StoreItem | null> = {};

  for (const [slotKey, accessoryId] of Object.entries(accessoryIdBySlot)) {
    const slotIndex = Number(slotKey);
    resolved[slotIndex] =
      accessoryId != null ? (byId.get(accessoryId) ?? null) : null;
  }

  return resolved;
}

export const useMinerStore = create<MinerStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      tickMining: (deltaVena) => {
        if (deltaVena <= 0) return;
        set((state) => ({ earnedVena: state.earnedVena + deltaVena }));
      },

      claimSessionRewards: () => {
        const amount = get().earnedVena;
        if (amount <= 0) return 0;
        set((state) => ({
          earnedVena: 0,
          lifetimeSessionClaimed: state.lifetimeSessionClaimed + amount,
        }));
        return amount;
      },

      unlockSlot: (slotIndex, availableBalance) => {
        const state = get();
        const cost = getSlotUnlockCostVena(slotIndex);
        if (cost === null || state.unlockedSlots[slotIndex] || availableBalance < cost) {
          return false;
        }

        set((prev) => {
          const nextSlots = [...prev.unlockedSlots];
          nextSlots[slotIndex] = true;
          return {
            unlockedSlots: nextSlots,
            localSpentVena: prev.localSpentVena + cost,
          };
        });
        return true;
      },

      equipPickaxe: (slotIndex, pickaxeId, equippedCount, alreadyInSlot) => {
        if (
          !alreadyInSlot &&
          equippedCount >= GAME_CONFIG.pickaxes.maxEquipped &&
          get().pickaxeIdBySlot[slotIndex] == null
        ) {
          return false;
        }

        set((prev) => {
          const next = { ...prev.pickaxeIdBySlot };
          for (const key of Object.keys(next)) {
            if (next[Number(key)] === pickaxeId) {
              next[Number(key)] = null;
            }
          }
          next[slotIndex] = pickaxeId;
          return { pickaxeIdBySlot: next };
        });
        return true;
      },

      buyAccessory: (item, availableBalance, targetSlotIndex) => {
        const price = item.priceVena;
        const state = get();
        if (
          price == null ||
          state.ownedAccessoryIds.includes(item.id) ||
          availableBalance < price
        ) {
          return false;
        }

        set((prev) => {
          const nextOwned = [...prev.ownedAccessoryIds, item.id];
          const nextAccessorySlots = { ...prev.accessoryIdBySlot };

          if (targetSlotIndex !== undefined) {
            nextAccessorySlots[targetSlotIndex] = item.id;
          }

          return {
            ownedAccessoryIds: nextOwned,
            accessoryIdBySlot: nextAccessorySlots,
            localSpentVena: prev.localSpentVena + price,
          };
        });
        return true;
      },

      pruneUnavailablePickaxes: (validPickaxeIds, stakedPickaxeIds = []) => {
        const validIds = new Set(validPickaxeIds.filter((id) => id >= 0));
        const stakedIds = new Set(stakedPickaxeIds.filter((id) => id >= 0));
        const state = get();
        
        let nextSelected = state.selectedPickaxeIds.filter((id) =>
          validIds.has(id)
        );
        
        for (const id of stakedIds) {
          if (!nextSelected.includes(id)) {
            nextSelected.push(id);
          }
        }
        const nextSlots = { ...state.pickaxeIdBySlot };
        let slotsChanged = false;

        for (const [slotKey, pickaxeId] of Object.entries(nextSlots)) {
          if (pickaxeId != null && !validIds.has(pickaxeId)) {
            nextSlots[Number(slotKey)] = null;
            slotsChanged = true;
          }
        }

        const displayPickaxeMissing =
          state.displayPickaxeId != null && !validIds.has(state.displayPickaxeId);
        const selectionChanged =
          nextSelected.length !== state.selectedPickaxeIds.length;

        if (!selectionChanged && !slotsChanged && !displayPickaxeMissing) {
          return;
        }

        set({
          selectedPickaxeIds: nextSelected,
          pickaxeIdBySlot: nextSlots,
          displayMode: displayPickaxeMissing
            ? GAME_CONFIG.pickaxes.defaultDisplayMode
            : state.displayMode,
          displayPickaxeId: displayPickaxeMissing ? null : state.displayPickaxeId,
        });
      },

      togglePickaxeSelection: (pickaxeId) => {
        const state = get();
        const selected = state.selectedPickaxeIds.includes(pickaxeId);

        if (!selected && state.selectedPickaxeIds.length >= GAME_CONFIG.pickaxes.maxMiningStake) {
          return false;
        }

        set((prev) => ({
          selectedPickaxeIds: selected
            ? prev.selectedPickaxeIds.filter((id) => id !== pickaxeId)
            : [...prev.selectedPickaxeIds, pickaxeId],
          displayMode:
            prev.displayPickaxeId === pickaxeId && selected
              ? GAME_CONFIG.pickaxes.defaultDisplayMode
              : prev.displayMode,
          displayPickaxeId:
            prev.displayPickaxeId === pickaxeId && selected
              ? null
              : prev.displayPickaxeId,
        }));
        return true;
      },

      setDisplayPickaxe: (id) => {
        const state = get();
        if (state.displayMode === "selected" && state.displayPickaxeId === id) {
          set({
            displayMode: GAME_CONFIG.pickaxes.defaultDisplayMode,
            displayPickaxeId: null,
          });
        } else {
          set({ displayMode: "selected", displayPickaxeId: id });
        }
      },

      startUpgrade: (availableBalance) => {
        const state = get();
        if (!GAME_CONFIG.upgrade.pricingEnabled) return false;
        if (state.upgradeEndsAt !== null && state.upgradeEndsAt > Date.now()) {
          return false;
        }

        const cost = getUpgradeCostVena(state.level);
        if (availableBalance < cost) return false;

        set({
          localSpentVena: state.localSpentVena + cost,
          upgradeEndsAt: Date.now() + GAME_CONFIG.upgrade.durationMs,
        });
        return true;
      },

      skipUpgrade: (availableBalance) => {
        const state = get();
        if (!GAME_CONFIG.upgrade.pricingEnabled) return false;
        const isUpgrading =
          state.upgradeEndsAt !== null && state.upgradeEndsAt > Date.now();
        if (!isUpgrading) return false;

        const skipCost = GAME_CONFIG.upgrade.timeSkipCostVena;
        if (availableBalance < skipCost) return false;

        set({
          localSpentVena: state.localSpentVena + skipCost,
          upgradeEndsAt: null,
          level: state.level + 1,
        });
        return true;
      },

      completeUpgrade: () => {
        set((state) => ({
          upgradeEndsAt: null,
          level: state.level + 1,
        }));
      },

      resetForDisconnect: () => {
        set(INITIAL_STATE);
      },
    }),
    {
      name: "vena-miner-command-v2",
      version: 4,
      migrate: (persistedState, version) => {
        const state = persistedState as Partial<MinerStoreState>;

        if (version < 3) {
          state.unlockedSlots = initialUnlockedSlots();
        }

        if (version < 4) {
          state.earnedVena = 0;
        }

        if (version >= 4) return state as MinerStoreState;
        const ids = state.selectedPickaxeIds ?? [];
        if (ids.length === 0 && state.pickaxeIdBySlot) {
          const fromSlots = [
            ...new Set(
              Object.values(state.pickaxeIdBySlot).filter(
                (id): id is number => id != null
              )
            ),
          ];
          if (fromSlots.length > 0) {
            state.selectedPickaxeIds = fromSlots;
          }
        }
        if (!state.selectedPickaxeIds) {
          state.selectedPickaxeIds = [];
        }
        return state as MinerStoreState;
      },
      partialize: (state) => ({
        level: state.level,
        localSpentVena: state.localSpentVena,
        earnedVena: state.earnedVena,
        unlockedSlots: state.unlockedSlots,
        ownedAccessoryIds: state.ownedAccessoryIds,
        selectedPickaxeIds: state.selectedPickaxeIds,
        pickaxeIdBySlot: state.pickaxeIdBySlot,
        accessoryIdBySlot: state.accessoryIdBySlot,
        displayMode: state.displayMode,
        displayPickaxeId: state.displayPickaxeId,
        upgradeEndsAt: state.upgradeEndsAt,
        lifetimeSessionClaimed: state.lifetimeSessionClaimed,
      }),
    }
  )
);
