"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { targetChainId } from "@/config/wagmi";
import { RH_CONTRACTS } from "@/lib/contracts/robinhood";

const VENA_TOKEN = RH_CONTRACTS.venaToken;

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export function useWalletVena() {
  const { address, isConnected } = useAccount();

  const { data: raw, isLoading, refetch } = useReadContract({
    address: VENA_TOKEN,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: { enabled: isConnected && !!address && !!VENA_TOKEN },
  });

  const balanceVena = raw != null ? Number(formatUnits(raw, 18)) : 0;

  return { balanceVena, isLoading, isConnected, refetch };
}
