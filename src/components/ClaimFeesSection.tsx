"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther, formatUnits } from "viem";

const HOOK_ADDR = (process.env.NEXT_PUBLIC_HOOK_ADDRESS ?? "") as `0x${string}`;

const hookABI = [
  {
    name: "getUserTokenIds",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "pendingFeesMultiple",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenIds", type: "uint256[]" }],
    outputs: [
      { name: "totalEth", type: "uint256" },
      { name: "totalVena", type: "uint256" },
    ],
  },
  {
    name: "claimFees",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenIds", type: "uint256[]" }],
    outputs: [],
  },
] as const;

export default function ClaimFeesSection() {
  const { address, isConnected } = useAccount();
  const [status, setStatus] = useState("");

  const { data: hookTokenIds, refetch: refetchIds } = useReadContract({
    address: HOOK_ADDR,
    abi: hookABI,
    functionName: "getUserTokenIds",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && !!address && !!HOOK_ADDR },
  });

  const tokenIds = useMemo(
    () => (hookTokenIds as bigint[] | undefined)?.map((id) => id) ?? [],
    [hookTokenIds]
  );

  const { data: pending, refetch: refetchPending } = useReadContract({
    address: HOOK_ADDR,
    abi: hookABI,
    functionName: "pendingFeesMultiple",
    args: tokenIds.length > 0 ? [tokenIds] : undefined,
    query: { enabled: isConnected && !!HOOK_ADDR && tokenIds.length > 0 },
  });

  const pendingEth = pending?.[0] ?? BigInt(0);
  const pendingVena = pending?.[1] ?? BigInt(0);
  const hasPending = pendingEth > BigInt(0) || pendingVena > BigInt(0);

  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const txBusy = isPending || confirming;

  async function handleClaim() {
    if (!HOOK_ADDR || tokenIds.length === 0) return;
    setStatus("Claiming fees…");
    try {
      await writeContractAsync({
        address: HOOK_ADDR,
        abi: hookABI,
        functionName: "claimFees",
        args: [tokenIds],
      });
      setStatus("Confirm in wallet…");
    } catch (e) {
      setStatus(e instanceof Error ? e.message.slice(0, 120) : "Claim failed");
    }
  }

  if (!HOOK_ADDR) return null;

  return (
    <section id="claim-fees" className="py-16 px-4 sm:px-8">
      <div className="max-w-xl mx-auto">
        <h2
          className="text-2xl sm:text-3xl font-bold text-center mb-2"
          style={{ fontFamily: "var(--font-orbitron)", color: "#00d4ff" }}
        >
          Swap Fee Rewards
        </h2>
        <p className="text-center text-gray-400 text-sm mb-8 max-w-md mx-auto">
          80% of the 1% swap fee goes to Pickaxe holders. Claim anytime here, or
          automatically when you sell VENA — only your own NFT share, never
          others&apos;.
        </p>

        <div
          className="rounded-2xl border border-cyan-900/30 p-6 space-y-4"
          style={{ background: "rgba(0,20,40,0.6)" }}
        >
          {!isConnected ? (
            <p className="text-center text-gray-500 text-sm py-4">
              Connect wallet to view and claim fee rewards.
            </p>
          ) : tokenIds.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-4">
              No Pickaxes registered in the fee pool yet. Buy VENA to mint Silver
              pickaxes — they register automatically.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="rounded-xl bg-black/40 border border-cyan-900/20 py-4 px-3">
                  <p className="text-xs text-gray-500 mb-1">Pending ETH</p>
                  <p className="text-lg font-semibold text-white">
                    {formatEther(pendingEth)}
                  </p>
                </div>
                <div className="rounded-xl bg-black/40 border border-cyan-900/20 py-4 px-3">
                  <p className="text-xs text-gray-500 mb-1">Pending VENA</p>
                  <p className="text-lg font-semibold text-[#00ff88]">
                    {formatUnits(pendingVena, 18)}
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-600 text-center">
                {tokenIds.length} pickaxe{tokenIds.length !== 1 ? "s" : ""} in
                fee pool
              </p>

              <button
                onClick={handleClaim}
                disabled={!hasPending || txBusy}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40"
                style={{
                  background: hasPending
                    ? "linear-gradient(135deg, rgba(0,212,255,0.3), rgba(0,255,136,0.2))"
                    : undefined,
                  border: "1px solid rgba(0,212,255,0.4)",
                  color: "#00d4ff",
                }}
              >
                {txBusy
                  ? "Confirming…"
                  : isSuccess
                  ? "Claimed ✓"
                  : hasPending
                  ? "Claim Fees"
                  : "Nothing to claim"}
              </button>

              {isSuccess && (
                <button
                  type="button"
                  className="w-full text-xs text-cyan-500 hover:underline"
                  onClick={() => {
                    refetchIds();
                    refetchPending();
                    setStatus("");
                  }}
                >
                  Refresh balances
                </button>
              )}
            </>
          )}

          {status && (
            <p className="text-xs text-center text-gray-400 break-all">{status}</p>
          )}
          {txHash && (
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-xs text-cyan-500 hover:underline"
            >
              View on Basescan →
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
