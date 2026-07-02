"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import type { PickaxeNFT } from "@/lib/types";
import {
  GAME_CONFIG,
  pickaxeFromTokenId,
} from "../config/game-config";

const HOOK_ADDR = (
  process.env.NEXT_PUBLIC_HOOK_ADDRESS ??
  process.env.NEXT_PUBLIC_VENA_TOKEN ??
  ""
) as `0x${string}`;

const LEGACY_PICKAXE = (process.env.NEXT_PUBLIC_PICKAXE_NFT ?? "") as `0x${string}`;

const prismHookAbi = [
  {
    name: "ownedTokensOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256[]" }],
  },
] as const;

const legacyPickaxeAbi = [
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

export function useWalletPickaxes() {
  const { address, isConnected } = useAccount();

  const { data: prismIds, isLoading: prismLoading } = useReadContract({
    address: HOOK_ADDR,
    abi: prismHookAbi,
    functionName: "ownedTokensOf",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address && !!HOOK_ADDR },
  });

  const { data: legacyTotal } = useReadContract({
    address: LEGACY_PICKAXE,
    abi: legacyPickaxeAbi,
    functionName: "totalMinted",
    query: { enabled: isConnected && !!LEGACY_PICKAXE },
  });

  const totalLegacy = Number(legacyTotal ?? 0);
  const legacyTokenIds = useMemo(
    () => Array.from({ length: totalLegacy }, (_, i) => i),
    [totalLegacy]
  );

  const ownerCalls = useMemo(
    () =>
      legacyTokenIds.map((id) => ({
        address: LEGACY_PICKAXE,
        abi: legacyPickaxeAbi,
        functionName: "ownerOf" as const,
        args: [BigInt(id)] as [bigint],
      })),
    [legacyTokenIds]
  );

  const tierCalls = useMemo(
    () =>
      legacyTokenIds.map((id) => ({
        address: LEGACY_PICKAXE,
        abi: legacyPickaxeAbi,
        functionName: "tokenTier" as const,
        args: [BigInt(id)] as [bigint],
      })),
    [legacyTokenIds]
  );

  const { data: owners, isLoading: ownersLoading } = useReadContracts({
    contracts: ownerCalls,
    query: { enabled: isConnected && totalLegacy > 0 && !!address },
  });

  const { data: tiers } = useReadContracts({
    contracts: tierCalls,
    query: { enabled: isConnected && totalLegacy > 0 },
  });

  const pickaxes = useMemo((): PickaxeNFT[] => {
    if (!isConnected || !address) return [];

    const fromPrism = (prismIds as bigint[] | undefined)?.map((id) => {
      const num = Number(id);
      const p = pickaxeFromTokenId(num, 0);
      return {
        ...p,
        hashrate: GAME_CONFIG.pickaxes.defaultHashratePerNft,
        name: `Pickaxe ${p.tokenId}`,
      };
    });

    if (fromPrism && fromPrism.length > 0) return fromPrism;

    if (!owners || !tiers) return [];

    const legacy: PickaxeNFT[] = [];
    legacyTokenIds.forEach((id) => {
      const owner = owners[id]?.result as string | undefined;
      const tierNum = tiers[id]?.result as number | undefined;
      if (tierNum === undefined) return;
      if (owner?.toLowerCase() !== address.toLowerCase()) return;
      legacy.push(pickaxeFromTokenId(id, tierNum));
    });
    return legacy;
  }, [
    isConnected,
    address,
    prismIds,
    owners,
    tiers,
    legacyTokenIds,
  ]);

  const isLoading =
    isConnected &&
    (prismLoading || (totalLegacy > 0 && ownersLoading && pickaxes.length === 0));

  return { pickaxes, isLoading, isConnected };
}
