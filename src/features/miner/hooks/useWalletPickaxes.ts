"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import type { PickaxeNFT } from "@/lib/types";
import {
  isPickaxeDeployed,
  pickaxeNftAbi,
  RH_CONTRACTS,
} from "@/lib/contracts/robinhood";
import { targetChainId } from "@/config/wagmi";
import { pickaxeFromTokenId } from "../config/game-config";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function useWalletPickaxes() {
  const { address, isConnected, chain } = useAccount();
  const nftAddr = RH_CONTRACTS.pickaxeNft;
  const contractReady = isPickaxeDeployed();
  const isWrongNetwork = isConnected && chain?.id !== targetChainId;

  const {
    data: ownedIds,
    isLoading,
    isError,
    refetch,
  } = useReadContract({
    address: contractReady ? nftAddr : undefined,
    abi: pickaxeNftAbi,
    functionName: "tokensOfOwner",
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: {
      enabled: isConnected && !!address && contractReady,
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
        chainId: targetChainId,
      })),
    [tokenIds, nftAddr]
  );

  const { data: tierResults, isLoading: tiersLoading } = useReadContracts({
    contracts: tierCalls,
    query: { enabled: tokenIds.length > 0 && contractReady },
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
    walletAddress: address,
    walletAddressShort: address ? truncateAddress(address) : null,
    isLoading:
      isConnected &&
      contractReady &&
      (isLoading || (tokenIds.length > 0 && tiersLoading)),
    isConnected,
    isWrongNetwork,
    isContractReady: contractReady,
    isError,
    refetch,
  };
}
