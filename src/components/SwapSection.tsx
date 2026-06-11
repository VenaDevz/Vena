"use client";

import { useState, useCallback } from "react";
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseEther, parseUnits, formatEther, formatUnits } from "viem";

const VENA_TOKEN   = (process.env.NEXT_PUBLIC_VENA_TOKEN   ?? "") as `0x${string}`;
const SWAP_ROUTER  = (process.env.NEXT_PUBLIC_SWAP_ROUTER  ?? "") as `0x${string}`;

const ROUTER_ABI = [
  {
    name: "swapETHForVena",
    type: "function",
    stateMutability: "payable",
    inputs: [{ name: "minOut", type: "uint256" }],
    outputs: [{ name: "venaOut", type: "uint256" }],
  },
  {
    name: "swapVenaForETH",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "venaIn", type: "uint256" },
      { name: "minOut", type: "uint256" },
    ],
    outputs: [{ name: "ethOut", type: "uint256" }],
  },
] as const;

const ERC20_ABI = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// 1% slippage tolerance
const SLIPPAGE_BPS = BigInt(100);
const BPS_DENOM = BigInt(10000);

export default function SwapSection() {
  const { address, isConnected } = useAccount();
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [inputAmount, setInputAmount] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const { data: ethBalance } = useBalance({ address });
  const { data: venaBalance } = useReadContract({
    address: VENA_TOKEN,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: VENA_TOKEN,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, SWAP_ROUTER] : undefined,
    query: { enabled: !!address && direction === "sell" },
  });

  const { writeContractAsync } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: txPending, isSuccess: txSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  const needsApproval =
    direction === "sell" &&
    inputAmount &&
    allowance !== undefined &&
    allowance < parseUnits(inputAmount || "0", 18);

  const handleApprove = useCallback(async () => {
    if (!SWAP_ROUTER) return;
    setStatus("Approving VENA…");
    try {
      const hash = await writeContractAsync({
        address: VENA_TOKEN,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [SWAP_ROUTER, parseUnits(inputAmount, 18)],
      });
      setTxHash(hash);
      await refetchAllowance();
      setStatus("Approved ✓");
    } catch (e: unknown) {
      setStatus(`Error: ${(e as Error).message?.slice(0, 80)}`);
    }
  }, [inputAmount, writeContractAsync, refetchAllowance]);

  const handleSwap = useCallback(async () => {
    if (!inputAmount || !isConnected) return;
    setStatus("Sending transaction…");
    try {
      let hash: `0x${string}`;
      if (direction === "buy") {
        const ethIn = parseEther(inputAmount);
        const minOut = (ethIn * (BPS_DENOM - SLIPPAGE_BPS)) / BPS_DENOM;
        hash = await writeContractAsync({
          address: SWAP_ROUTER,
          abi: ROUTER_ABI,
          functionName: "swapETHForVena",
          args: [minOut],
          value: ethIn,
        });
      } else {
        const venaIn = parseUnits(inputAmount, 18);
        const minOut = BigInt(0);
        hash = await writeContractAsync({
          address: SWAP_ROUTER,
          abi: ROUTER_ABI,
          functionName: "swapVenaForETH",
          args: [venaIn, minOut],
        });
      }
      setTxHash(hash);
      setStatus("Waiting for confirmation…");
    } catch (e: unknown) {
      setStatus(`Error: ${(e as Error).message?.slice(0, 100)}`);
    }
  }, [direction, inputAmount, isConnected, writeContractAsync]);

  const venaBalFmt = venaBalance ? formatUnits(venaBalance, 18) : "0";
  const ethBalFmt  = ethBalance ? formatEther(ethBalance.value) : "0";

  return (
    <section className="py-20 px-4" id="swap">
      <div className="max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-center mb-2 text-white">
          Swap
        </h2>
        <p className="text-center text-sm text-gray-400 mb-8">
          ETH ↔ VENA via Uniswap v4
        </p>

        <div
          className="rounded-2xl border p-6 space-y-4"
          style={{
            background: "rgba(0,0,0,0.6)",
            borderColor: "rgba(0,212,255,0.2)",
          }}
        >
          {/* Direction toggle */}
          <div className="flex rounded-xl overflow-hidden border border-cyan-900/40">
            {(["buy", "sell"] as const).map((d) => (
              <button
                key={d}
                onClick={() => { setDirection(d); setInputAmount(""); setStatus(null); }}
                className={`flex-1 py-2 text-sm font-semibold transition-colors ${
                  direction === d
                    ? "bg-cyan-500/20 text-cyan-300"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {d === "buy" ? "Buy VENA" : "Sell VENA"}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{direction === "buy" ? "ETH amount" : "VENA amount"}</span>
              <span>
                Balance:{" "}
                {direction === "buy"
                  ? `${parseFloat(ethBalFmt).toFixed(4)} ETH`
                  : `${parseFloat(venaBalFmt).toFixed(2)} VENA`}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-black/40 border border-cyan-900/30 rounded-xl px-4 py-3">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                className="flex-1 bg-transparent text-white text-lg outline-none placeholder-gray-600"
              />
              <span className="text-cyan-400 font-medium text-sm">
                {direction === "buy" ? "ETH" : "VENA"}
              </span>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center text-gray-600">↓</div>

          {/* Output label */}
          <div className="bg-black/40 border border-cyan-900/20 rounded-xl px-4 py-3 text-gray-500 text-sm">
            {direction === "buy" ? "VENA" : "ETH"} — estimated output after swap
          </div>

          {/* Action button */}
          {!isConnected ? (
            <div className="text-center text-gray-500 text-sm py-2">
              Connect wallet to swap
            </div>
          ) : needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={txPending}
              className="w-full py-3 rounded-xl font-semibold text-sm bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
            >
              {txPending ? "Approving…" : "Approve VENA"}
            </button>
          ) : (
            <button
              onClick={handleSwap}
              disabled={!inputAmount || txPending || !SWAP_ROUTER}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40"
              style={{
                background: inputAmount && SWAP_ROUTER
                  ? "linear-gradient(135deg, rgba(0,212,255,0.3), rgba(0,255,136,0.2))"
                  : undefined,
                borderColor: "rgba(0,212,255,0.4)",
                border: "1px solid",
                color: "#00d4ff",
              }}
            >
              {txPending
                ? "Confirming…"
                : txSuccess
                ? "Swap successful ✓"
                : direction === "buy"
                ? "Buy VENA"
                : "Sell VENA"}
            </button>
          )}

          {/* Status */}
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

          {/* Slippage note */}
          <p className="text-xs text-gray-600 text-center">
            1% slippage tolerance · Uniswap v4 hook pool
          </p>
        </div>
      </div>
    </section>
  );
}
