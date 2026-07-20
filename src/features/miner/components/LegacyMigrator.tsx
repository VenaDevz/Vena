"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { targetChainId } from "@/config/wagmi";
import { venaMiningAbi } from "../config/mining-contract";
import { useCallback, useEffect } from "react";

const LEGACY_MINING_ADDRESS = "0x1dDA64bd76165400Ad929D4d94E0D8285288D37B";

export default function LegacyMigrator() {
  const { address, isConnected } = useAccount();

  const { data: userInfo, refetch } = useReadContract({
    address: LEGACY_MINING_ADDRESS,
    abi: venaMiningAbi,
    functionName: "getUserInfo",
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: { enabled: isConnected && !!address },
  });

  const stakedIds = (userInfo?.[1] ?? []) as bigint[];

  const { data: pendingV1RewardsRaw } = useReadContract({
    address: LEGACY_MINING_ADDRESS,
    abi: venaMiningAbi,
    functionName: "pendingRewards",
    args: address ? [address] : undefined,
    chainId: targetChainId,
    query: { enabled: isConnected && !!address },
  });

  const pendingV1 = Number(pendingV1RewardsRaw ?? 0n) / 1e18;

  const { data: txHash, writeContractAsync, isPending, reset } = useWriteContract();

  const { isSuccess, isLoading: isMining } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (isSuccess) {
      refetch();
      reset();
    }
  }, [isSuccess, refetch, reset]);

  const handleUnstake = useCallback(async () => {
    if (stakedIds.length === 0) return;
    const firstId = stakedIds[0];
    await writeContractAsync({
      address: LEGACY_MINING_ADDRESS,
      abi: venaMiningAbi,
      functionName: "unstakeNFT",
      args: [firstId],
    });
  }, [stakedIds, writeContractAsync]);

  const handleClaim = useCallback(async () => {
    if (pendingV1 <= 0) return;
    await writeContractAsync({
      address: LEGACY_MINING_ADDRESS,
      abi: venaMiningAbi,
      functionName: "claimRewards",
    });
  }, [pendingV1, writeContractAsync]);

  if (!isConnected || (stakedIds.length === 0 && pendingV1 <= 0.01)) return null;

  return (
    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 shadow-lg backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-red-400">Migrate from V1 Staking</h3>
          <p className="text-xs text-red-200 mt-1">
            You have {stakedIds.length} pickaxe(s) stuck in the legacy V1 contract. 
            You must unstake them here to use them in the new V2 Mining pool.
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          {stakedIds.length > 0 && (
            <button
              type="button"
              onClick={handleUnstake}
              disabled={isPending || isMining}
              className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white shadow hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || isMining ? "Unstaking..." : "Unstake 1 VPICK"}
            </button>
          )}
          {pendingV1 > 0.01 && (
            <button
              type="button"
              onClick={handleClaim}
              disabled={isPending || isMining}
              className="rounded-lg bg-[#00ff88]/20 px-4 py-2 text-xs font-bold text-[#00ff88] shadow hover:bg-[#00ff88]/30 disabled:opacity-50 disabled:cursor-not-allowed border border-[#00ff88]/50"
            >
              {isPending || isMining ? "Claiming..." : `Claim ${pendingV1.toLocaleString("en-US", { maximumFractionDigits: 2 })} V1 VENA`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
