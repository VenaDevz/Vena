"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { RARITY_CONFIG, type PickaxeNFT, type Rarity } from "@/lib/types";

const PICKAXE_ADDR = (process.env.NEXT_PUBLIC_PICKAXE_NFT ?? "") as `0x${string}`;
const MINING_ADDR = (process.env.NEXT_PUBLIC_VENA_MINING ?? "") as `0x${string}`;

const pickaxeABI = [
  {
    name: "totalMinted",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    name: "tokenTier",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "uint8" }],
  },
] as const;

const miningABI = [
  {
    name: "getUserInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [
      { name: "power", type: "uint256" },
      { name: "stakedIds", type: "uint256[]" },
      { name: "pending", type: "uint256" },
    ],
  },
] as const;

const TIER_TO_RARITY: Rarity[] = ["Silver", "Gold", "Platinum", "Diamond", "Emerald"];

export function useOwnedPickaxes() {
  const { isConnected, address } = useAccount();

  const { data: totalMinted, refetch: refetchTotalMinted } = useReadContract({
    address: PICKAXE_ADDR,
    abi: pickaxeABI,
    functionName: "totalMinted",
    query: { enabled: isConnected },
  });

  const { data: userInfo, refetch: refetchUserInfo } = useReadContract({
    address: MINING_ADDR,
    abi: miningABI,
    functionName: "getUserInfo",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address },
  });

  const total = Number(totalMinted ?? 0);
  const tokenIds = useMemo(
    () => Array.from({ length: total }, (_, i) => i),
    [total]
  );

  const ownerCalls = useMemo(
    () =>
      tokenIds.map((id) => ({
        address: PICKAXE_ADDR,
        abi: pickaxeABI,
        functionName: "ownerOf" as const,
        args: [BigInt(id)] as [bigint],
      })),
    [tokenIds]
  );

  const tierCalls = useMemo(
    () =>
      tokenIds.map((id) => ({
        address: PICKAXE_ADDR,
        abi: pickaxeABI,
        functionName: "tokenTier" as const,
        args: [BigInt(id)] as [bigint],
      })),
    [tokenIds]
  );

  const { data: owners, refetch: refetchOwners } = useReadContracts({
    contracts: ownerCalls,
    query: { enabled: isConnected && total > 0 },
  });

  const { data: tierData } = useReadContracts({
    contracts: tierCalls,
    query: { enabled: isConnected && total > 0 },
  });

  const stakedIdSet = useMemo(() => {
    const ids = (userInfo?.[1] ?? []) as bigint[];
    return new Set(ids.map((id) => Number(id)));
  }, [userInfo]);

  const nfts = useMemo((): PickaxeNFT[] => {
    if (!isConnected || !address || !owners || !tierData) return [];

    const result: PickaxeNFT[] = [];

    tokenIds.forEach((id) => {
      const owner = owners[id]?.result as string | undefined;
      const tierNum = tierData[id]?.result as number | undefined;
      if (tierNum === undefined) return;

      const isStaked = stakedIdSet.has(id);
      const isOwned = owner?.toLowerCase() === address.toLowerCase();
      if (!isOwned && !isStaked) return;

      const rarity = TIER_TO_RARITY[tierNum] ?? "Silver";
      const cfg = RARITY_CONFIG[rarity];

      result.push({
        id,
        tokenId: `#${id.toString().padStart(4, "0")}`,
        name: `${rarity} Pickaxe`,
        rarity,
        hashrate: cfg.hashrate,
        staked: isStaked,
        image: cfg.image,
      });
    });

    return result;
  }, [isConnected, address, owners, tierData, stakedIdSet, tokenIds]);

  const isLoading = isConnected && total > 0 && (!owners || !tierData);

  async function refetch() {
    await Promise.all([refetchTotalMinted(), refetchUserInfo(), refetchOwners()]);
  }

  return { nfts, isLoading, isConnected, refetch };
}
