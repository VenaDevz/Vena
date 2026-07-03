"use client";

import { useCallback, useMemo, useState } from "react";
import MinerHeader from "./MinerHeader";
import MinerUnitPanel from "./MinerUnitPanel";
import ControlPanel from "./ControlPanel";
import {
  GAME_CONFIG,
  SLOT_DEFINITIONS,
  type StoreItem,
} from "../config/game-config";
import { useWalletVena } from "../hooks/useWalletVena";
import { useWalletPickaxes } from "../hooks/useWalletPickaxes";
import {
  canMineEquipped,
  useMiningLoop,
} from "../hooks/useMiningLoop";
import { useOnChainMining } from "../hooks/useOnChainMining";
import { usePickaxesWithStaked } from "../hooks/usePickaxesWithStaked";
import { usePoolStats } from "../hooks/usePoolStats";
import { hasMiningContract, isMiningDeployed } from "../config/mining-contract";
import { mergeWithDemoPickaxes } from "../config/demo-pickaxes";
import {
  resolveAccessoryBySlot,
  useMinerStore,
} from "../store/miner-store";
import type { PickaxeNFT } from "@/lib/types";

export default function MinerLayout() {
  const { balanceVena: walletBalance, isConnected } = useWalletVena();
  const {
    pickaxes: walletPickaxesRaw,
    isLoading: pickaxesLoading,
    walletAddressShort,
    isContractReady,
  } = useWalletPickaxes();
  const chain = useOnChainMining();
  const poolStats = usePoolStats(chain.userPower);

  const walletPickaxesRawMerged = usePickaxesWithStaked(
    mergeWithDemoPickaxes(walletPickaxesRaw),
    chain.stakedIds
  );

  const walletPickaxes = walletPickaxesRawMerged;

  const level = useMinerStore((s) => s.level);
  const localSpentVena = useMinerStore((s) => s.localSpentVena);
  const earnedVena = useMinerStore((s) => s.earnedVena);
  const unlockedSlots = useMinerStore((s) => s.unlockedSlots);
  const ownedAccessoryIds = useMinerStore((s) => s.ownedAccessoryIds);
  const selectedPickaxeIds = useMinerStore((s) => s.selectedPickaxeIds ?? []);
  const accessoryIdBySlot = useMinerStore((s) => s.accessoryIdBySlot);
  const displayMode = useMinerStore((s) => s.displayMode);
  const displayPickaxeId = useMinerStore((s) => s.displayPickaxeId);

  const unlockSlot = useMinerStore((s) => s.unlockSlot);
  const togglePickaxeSelection = useMinerStore((s) => s.togglePickaxeSelection);
  const buyAccessory = useMinerStore((s) => s.buyAccessory);
  const setDisplayPickaxe = useMinerStore((s) => s.setDisplayPickaxe);
  const startUpgrade = useMinerStore((s) => s.startUpgrade);
  const skipUpgrade = useMinerStore((s) => s.skipUpgrade);
  const completeUpgrade = useMinerStore((s) => s.completeUpgrade);

  const [toast, setToast] = useState<string | null>(null);

  const availableBalance = Math.max(0, walletBalance - localSpentVena);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const accessoryBySlot = useMemo(
    () => resolveAccessoryBySlot(accessoryIdBySlot),
    [accessoryIdBySlot]
  );

  const equippedPickaxes = useMemo(
    () =>
      walletPickaxes.filter((p) => selectedPickaxeIds.includes(p.id)),
    [walletPickaxes, selectedPickaxeIds]
  );

  const equippedAccessories = useMemo(
    () =>
      Object.values(accessoryBySlot).filter(
        (a): a is StoreItem => a != null
      ),
    [accessoryBySlot]
  );

  const equippedPickaxeIds = useMemo(
    () => new Set(equippedPickaxes.map((p) => p.id)),
    [equippedPickaxes]
  );

  const ownedAccessoryIdSet = useMemo(
    () => new Set(ownedAccessoryIds),
    [ownedAccessoryIds]
  );

  const isMiningLive = useMemo(
    () =>
      canMineEquipped(
        equippedPickaxes,
        chain.stakedIds,
        chain.enabled && hasMiningContract,
        chain.miningActive
      ),
    [equippedPickaxes, chain.stakedIds, chain.enabled, chain.miningActive]
  );

  const stakedPickaxes = useMemo(
    () => walletPickaxes.filter((p) => p.id >= 0 && chain.stakedIds.has(p.id)),
    [walletPickaxes, chain.stakedIds]
  );

  useMiningLoop(
    equippedPickaxes,
    equippedAccessories,
    // Session tick only before on-chain pool is live (preview UI).
    !isMiningDeployed || !chain.miningActive ? isMiningLive : false
  );

  const handleUnlockSlot = useCallback(
    (slotIndex: number): boolean => unlockSlot(slotIndex, availableBalance),
    [unlockSlot, availableBalance]
  );

  const handleTogglePickaxe = useCallback(
    (pickaxe: PickaxeNFT) => {
      const wasSelected = equippedPickaxeIds.has(pickaxe.id);
      const ok = togglePickaxeSelection(pickaxe.id);
      if (!ok) {
        notify(
          `Max ${GAME_CONFIG.pickaxes.maxMiningStake} pickaxes can be selected at once. Remove one first.`
        );
        return;
      }
      notify(wasSelected ? `${pickaxe.name} removed` : `${pickaxe.name} selected`);
    },
    [togglePickaxeSelection, equippedPickaxeIds, notify]
  );

  const handleStakePickaxe = useCallback(
    async (pickaxe: PickaxeNFT) => {
      if (pickaxe.id < 0) return;
      if (!hasMiningContract) {
        notify("Staking is not open yet — check back at launch.");
        return;
      }
      if (!chain.miningActive) {
        notify("Mining pool is still funding — try again shortly.");
        return;
      }
      if (chain.stakedIds.has(pickaxe.id)) {
        notify(`${pickaxe.name} is already staked`);
        return;
      }
      try {
        await chain.stakeToken(pickaxe.id);
        if (displayPickaxeId !== pickaxe.id) {
          setDisplayPickaxe(pickaxe.id);
        }
        notify(`${pickaxe.name} staked on-chain`);
      } catch {
        notify("Stake failed or was rejected");
      }
    },
    [chain, notify, displayPickaxeId, setDisplayPickaxe]
  );

  const handleUnstakePickaxe = useCallback(
    async (pickaxe: PickaxeNFT) => {
      if (pickaxe.id < 0 || !chain.stakedIds.has(pickaxe.id)) return;
      try {
        await chain.unstakeToken(pickaxe.id);
        notify(`${pickaxe.name} unstaked`);
      } catch {
        notify("Unstake failed or was rejected");
      }
    },
    [chain, notify]
  );

  const handleStartUpgrade = useCallback((): boolean => {
    return startUpgrade(availableBalance);
  }, [startUpgrade, availableBalance]);

  const handleSkipUpgrade = useCallback((): boolean => {
    return skipUpgrade(availableBalance);
  }, [skipUpgrade, availableBalance]);

  const handleUpgradeComplete = useCallback(() => {
    completeUpgrade();
    notify("Upgrade complete — level increased");
  }, [completeUpgrade, notify]);

  const handleBuyAccessory = useCallback(
    (item: StoreItem): boolean => {
      const targetSlot = SLOT_DEFINITIONS.find(
        (slot) =>
          slot.accepts === "accessory" &&
          unlockedSlots[slot.slotIndex] &&
          !accessoryBySlot[slot.slotIndex]
      )?.slotIndex;

      return buyAccessory(item, availableBalance, targetSlot);
    },
    [buyAccessory, availableBalance, unlockedSlots, accessoryBySlot]
  );

  const handleClaimOnChain = useCallback(async () => {
    try {
      const ok = await chain.claimOnChain();
      if (ok) notify("On-chain rewards claimed to wallet");
    } catch {
      notify("Claim failed or was rejected");
    }
  }, [chain, notify]);

  return (
    <div className="miner-root relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 miner-grid-bg" aria-hidden />
      <div className="pointer-events-none fixed inset-0 miner-vignette" aria-hidden />

      <MinerHeader
        balanceVena={walletBalance}
        isConnected={isConnected}
      />

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-xl border border-[#00f0ff]/30 bg-[#0a0a0f]/95 px-4 py-2.5 text-sm text-[#00f0ff] shadow-lg backdrop-blur-md"
          role="status"
        >
          {toast}
        </div>
      )}

      <main className="relative mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mb-6 lg:mb-8">
          <p className="miner-panel-title text-[10px] uppercase tracking-[0.3em] text-slate-600">
            Cybernetic mining interface · v0.5
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,11fr)_minmax(0,17fr)] lg:items-start lg:gap-6 xl:gap-8">
          <div className="relative z-10 self-start lg:sticky lg:top-20">
            <MinerUnitPanel
            walletPickaxes={walletPickaxes}
            walletAddressShort={walletAddressShort}
            balanceVena={availableBalance}
            unlockedSlots={unlockedSlots}
            equippedPickaxes={equippedPickaxes}
            equippedPickaxeIds={equippedPickaxeIds}
            accessoryBySlot={accessoryBySlot}
            displayMode={displayMode}
            displayPickaxeId={displayPickaxeId}
            isMiningLive={isMiningLive}
            stakedCount={stakedPickaxes.length}
            onUnlockSlot={handleUnlockSlot}
            onTogglePickaxe={handleTogglePickaxe}
            onSetDisplayPickaxe={setDisplayPickaxe}
            onNotify={notify}
          />
          </div>
          <div className="relative z-0 min-w-0">
          <ControlPanel
            level={level}
            availableBalance={availableBalance}
            earnedVena={earnedVena}
            equippedPickaxes={equippedPickaxes}
            equippedAccessories={equippedAccessories}
            walletPickaxes={walletPickaxes}
            equippedPickaxeIds={equippedPickaxeIds}
            displayPickaxeId={displayPickaxeId}
            pickaxesLoading={pickaxesLoading}
            walletAddressShort={walletAddressShort}
            isContractReady={isContractReady}
            isConnected={isConnected}
            isMiningLive={isMiningLive}
            miningActive={chain.miningActive}
            poolStats={poolStats}
            stakedIds={chain.stakedIds}
            pendingOnChainVena={chain.pendingVena}
            isClaimPending={chain.isPending}
            ownedAccessoryIds={ownedAccessoryIdSet}
            onClaimOnChain={() => {
              void handleClaimOnChain();
            }}
            onStartUpgrade={handleStartUpgrade}
            onSkipUpgrade={handleSkipUpgrade}
            onUpgradeComplete={handleUpgradeComplete}
            onBuyAccessory={handleBuyAccessory}
            onTogglePickaxe={handleTogglePickaxe}
            onStakePickaxe={(pickaxe) => {
              void handleStakePickaxe(pickaxe);
            }}
            onUnstakePickaxe={(pickaxe) => {
              void handleUnstakePickaxe(pickaxe);
            }}
            onSetDisplayPickaxe={setDisplayPickaxe}
            onNotify={notify}
          />
          </div>
        </div>
      </main>
    </div>
  );
}
