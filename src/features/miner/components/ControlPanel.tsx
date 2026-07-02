"use client";

import MiningMonitor from "./MiningMonitor";
import ActiveStakesPanel from "./ActiveStakesPanel";
import UpgradePanel from "./UpgradePanel";
import StorePanel from "./StorePanel";
import PickaxeInventory from "./PickaxeInventory";
import type { PickaxeNFT } from "@/lib/types";
import type { StoreItem } from "../config/game-config";

type ControlPanelProps = {
  level: number;
  availableBalance: number;
  earnedVena: number;
  equippedPickaxes: PickaxeNFT[];
  equippedAccessories: StoreItem[];
  walletPickaxes: PickaxeNFT[];
  equippedPickaxeIds: Set<number>;
  displayPickaxeId: number | null;
  pickaxesLoading: boolean;
  isConnected: boolean;
  isMiningLive: boolean;
  miningActive: boolean;
  pendingOnChainVena: number;
  isClaimPending: boolean;
  ownedAccessoryIds: Set<string>;
  onClaimSession: () => void;
  onClaimOnChain: () => void;
  onStartUpgrade: () => boolean;
  onSkipUpgrade: () => boolean;
  onUpgradeComplete: () => void;
  onBuyAccessory: (item: StoreItem) => boolean;
  onTogglePickaxe: (pickaxe: PickaxeNFT) => void;
  onSetDisplayPickaxe: (id: number) => void;
  onNotify: (message: string) => void;
};

export default function ControlPanel(props: ControlPanelProps) {
  return (
    <div className="flex flex-col gap-5">
      <MiningMonitor
        level={props.level}
        equippedPickaxes={props.equippedPickaxes}
        equippedAccessories={props.equippedAccessories}
        earnedVena={props.earnedVena}
        isMining={props.isMiningLive}
        miningActive={props.miningActive}
        pendingOnChainVena={props.pendingOnChainVena}
        isClaimPending={props.isClaimPending}
        onClaimSession={props.onClaimSession}
        onClaimOnChain={props.onClaimOnChain}
      />
      <ActiveStakesPanel
        equippedPickaxes={props.equippedPickaxes}
        displayPickaxeId={props.displayPickaxeId}
        isMiningLive={props.isMiningLive}
        onToggle={props.onTogglePickaxe}
      />
      <PickaxeInventory
        pickaxes={props.walletPickaxes}
        equippedIds={props.equippedPickaxeIds}
        displayPickaxeId={props.displayPickaxeId}
        isLoading={props.pickaxesLoading}
        isConnected={props.isConnected}
        onSetDisplay={props.onSetDisplayPickaxe}
        onToggle={props.onTogglePickaxe}
      />
      <UpgradePanel
        balanceVena={props.availableBalance}
        onStartUpgrade={props.onStartUpgrade}
        onSkipUpgrade={props.onSkipUpgrade}
        onUpgradeComplete={props.onUpgradeComplete}
        onNotify={props.onNotify}
      />
      <StorePanel
        balanceVena={props.availableBalance}
        ownedItemIds={props.ownedAccessoryIds}
        onBuyItem={props.onBuyAccessory}
        onNotify={props.onNotify}
      />
    </div>
  );
}
