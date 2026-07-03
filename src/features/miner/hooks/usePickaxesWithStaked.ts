"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { targetChainId } from "@/config/wagmi";
import {
  isPickaxeDeployed,
  pickaxeNftAbi,
  RH_CONTRACTS,
} from "@/lib/contracts/robinhood";
import type { PickaxeNFT } from "@/lib/types";
import { pickaxeFromTokenId } from "../config/game-config";

/**
 * Wallet `tokensOfOwner` excludes NFTs staked in VenaMining.
 * Merge on-chain staked ids back in so robot hand + roster stay in sync.
 */
export function usePickaxesWithStaked(
  walletPickaxes: PickaxeNFT[],
  stakedIds: Set<number>
): PickaxeNFT[] {
  const missingStakedIds = useMemo(() => {
    const walletIds = new Set(walletPickaxes.map((p) => p.id));
    return [...stakedIds].filter((id) => id >= 0 && !walletIds.has(id));
  }, [walletPickaxes, stakedIds]);

  const tierCalls = useMemo(
    () =>
      missingStakedIds.map((id) => ({
        address: RH_CONTRACTS.pickaxeNft,
        abi: pickaxeNftAbi,
        functionName: "tokenTier" as const,
        args: [BigInt(id)] as [bigint],
        chainId: targetChainId,
      })),
    [missingStakedIds]
  );

  const { data: tierResults } = useReadContracts({
    contracts: tierCalls,
    query: {
      enabled: isPickaxeDeployed() && missingStakedIds.length > 0,
    },
  });

  return useMemo(() => {
    const merged = new Map<number, PickaxeNFT>();

    for (const pickaxe of walletPickaxes) {
      merged.set(pickaxe.id, {
        ...pickaxe,
        staked: pickaxe.id >= 0 && stakedIds.has(pickaxe.id),
      });
    }

    missingStakedIds.forEach((id, index) => {
      if (merged.has(id)) return;
      const tierNum = tierResults?.[index]?.result as number | undefined;
      if (tierNum === undefined) return;
      merged.set(id, { ...pickaxeFromTokenId(id, tierNum), staked: true });
    });

    return [...merged.values()];
  }, [walletPickaxes, missingStakedIds, tierResults, stakedIds]);
}
