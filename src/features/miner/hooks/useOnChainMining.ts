"use client";

import { useCallback, useMemo } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatUnits } from "viem";
import {
  hasMiningContract,
  isMiningDeployed,
  PICKAXE_NFT_ADDRESS,
  pickaxeNftAbi,
  VENA_MINING_ADDRESS,
  venaMiningAbi,
} from "../config/mining-contract";

export function useOnChainMining() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const readsEnabled = isConnected && !!address && isMiningDeployed;
  const writesEnabled = readsEnabled && hasMiningContract;

  const { data: userInfo, refetch: refetchUserInfo } = useReadContract({
    address: VENA_MINING_ADDRESS,
    abi: venaMiningAbi,
    functionName: "getUserInfo",
    args: address ? [address] : undefined,
    query: { enabled: readsEnabled, refetchInterval: 5_000 },
  });

  const { data: miningActive } = useReadContract({
    address: VENA_MINING_ADDRESS,
    abi: venaMiningAbi,
    functionName: "isActive",
    query: { enabled: isMiningDeployed },
  });

  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: PICKAXE_NFT_ADDRESS,
    abi: pickaxeNftAbi,
    functionName: "isApprovedForAll",
    args: address ? [address, VENA_MINING_ADDRESS] : undefined,
    query: { enabled: writesEnabled },
  });

  const stakedIds = useMemo(() => {
    const ids = (userInfo?.[1] ?? []) as bigint[];
    return new Set(ids.map((id) => Number(id)));
  }, [userInfo]);

  const pendingWei = (userInfo?.[2] ?? BigInt(0)) as bigint;
  const pendingVena = Number(formatUnits(pendingWei, 18));
  const userPower = Number((userInfo?.[0] ?? BigInt(0)) as bigint);

  const ensureApproval = useCallback(async (): Promise<boolean> => {
    if (!writesEnabled || isApproved) return true;
    await writeContractAsync({
      address: PICKAXE_NFT_ADDRESS,
      abi: pickaxeNftAbi,
      functionName: "setApprovalForAll",
      args: [VENA_MINING_ADDRESS, true],
    });
    await refetchApproval();
    return true;
  }, [writesEnabled, isApproved, writeContractAsync, refetchApproval]);

  const stakeToken = useCallback(
    async (tokenId: number): Promise<boolean> => {
      if (!writesEnabled || tokenId < 0) return false;
      if (!miningActive) return false;
      if (stakedIds.has(tokenId)) return true;

      await ensureApproval();
      await writeContractAsync({
        address: VENA_MINING_ADDRESS,
        abi: venaMiningAbi,
        functionName: "stakeNFT",
        args: [BigInt(tokenId)],
      });
      await refetchUserInfo();
      return true;
    },
    [
      writesEnabled,
      miningActive,
      stakedIds,
      ensureApproval,
      writeContractAsync,
      refetchUserInfo,
    ]
  );

  const unstakeToken = useCallback(
    async (tokenId: number): Promise<boolean> => {
      if (!writesEnabled || tokenId < 0 || !stakedIds.has(tokenId)) return false;

      await writeContractAsync({
        address: VENA_MINING_ADDRESS,
        abi: venaMiningAbi,
        functionName: "unstakeNFT",
        args: [BigInt(tokenId)],
      });
      await refetchUserInfo();
      return true;
    },
    [writesEnabled, stakedIds, writeContractAsync, refetchUserInfo]
  );

  const claimOnChain = useCallback(async (): Promise<boolean> => {
    if (!writesEnabled || pendingWei === BigInt(0)) return false;

    await writeContractAsync({
      address: VENA_MINING_ADDRESS,
      abi: venaMiningAbi,
      functionName: "claimRewards",
      args: [],
    });
    await refetchUserInfo();
    return true;
  }, [writesEnabled, pendingWei, writeContractAsync, refetchUserInfo]);

  return {
    enabled: writesEnabled,
    miningActive: Boolean(miningActive),
    stakedIds,
    pendingVena,
    userPower,
    isApproved: Boolean(isApproved),
    isPending,
    stakeToken,
    unstakeToken,
    claimOnChain,
    refetchUserInfo,
  };
}
