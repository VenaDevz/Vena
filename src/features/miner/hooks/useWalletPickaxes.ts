"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import type { PickaxeNFT } from "@/lib/types";
import { pickaxeNftAbi, RH_CONTRACTS } from "@/lib/contracts/robinhood";
import { pickaxeFromTokenId } from "../config/game-config";

export function useWalletPickaxes() {
  const { address, isConnected } = useAccount();
  const nftAddr = RH_CONTRACTS.pickaxeNft;

  const { data: ownedIds, isLoading, refetch } = useReadContract({
    address: nftAddr,
    abi: pickaxeNftAbi,
    functionName: "tokensOfOwner",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && !!nftAddr,
      refetchInterval: 15_000,
    },
  });

  const tokenIds = (ownedIds as bigint[] | undefined) ?? [];

  const tierCalls = useMemo(
    () =>
      tokenIds.map((id) => ({
        address: nftAddr,
        abi: pickaxeNftAbi,
        functionName: "tokenTier" as const,
        args: [id] as [bigint],
      })),
    [tokenIds, nftAddr]
  );

  const { data: tierResults, isLoading: tiersLoading } = useReadContracts({
    contracts: tierCalls,
    query: { enabled: tokenIds.length > 0 && !!nftAddr },
  });

  const pickaxes = useMemo((): PickaxeNFT[] => {
    if (!isConnected || !address || tokenIds.length === 0) return [];

    return tokenIds.map((rawId, i) => {
      const id = Number(rawId);
      const tierNum = tierResults?.[i]?.result as number | undefined;
      return pickaxeFromTokenId(id, tierNum ?? 0);
    });
  }, [isConnected, address, tokenIds, tierResults]);

  return {
    pickaxes,
    isLoading: isConnected && (isLoading || (tokenIds.length > 0 && tiersLoading)),
    isConnected,
    refetch,
  };
}
