"use client";

import { useState } from "react";
import { useConnect } from "wagmi";
import { switchRobinhoodChain } from "@/lib/chains/add-robinhood-to-wallet";
import { targetChainId } from "@/config/wagmi";

type ConnectRabbyButtonProps = {
  fullWidth?: boolean;
  className?: string;
};

/** Direct injected-wallet connect (Rabby / MetaMask) — bypasses AppKit modal issues on localhost. */
export default function ConnectRabbyButton({
  fullWidth = false,
  className = "",
}: ConnectRabbyButtonProps) {
  const { connectAsync, connectors, isPending } = useConnect();
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setError(null);
    try {
      const injected =
        connectors.find((c) => c.id === "injected") ??
        connectors.find((c) => c.type === "injected");
      if (!injected) {
        setError("No browser wallet found. Open Rabby or MetaMask.");
        return;
      }
      await connectAsync({ connector: injected, chainId: targetChainId });
      await switchRobinhoodChain(targetChainId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed";
      if (msg.toLowerCase().includes("chain") || msg.includes("4902")) {
        const added = await switchRobinhoodChain(targetChainId);
        if (!added) {
          setError("Add Robinhood Chain (4663) in Rabby → Settings → Networks.");
          return;
        }
      }
      setError(msg.slice(0, 120));
    }
  };

  return (
    <div className={fullWidth ? "w-full" : ""}>
      <button
        type="button"
        onClick={() => void handleConnect()}
        disabled={isPending}
        className={`farm-btn-ghost py-2.5 text-xs uppercase tracking-wider disabled:opacity-50 ${fullWidth ? "w-full" : ""} ${className}`}
      >
        {isPending ? "Connecting…" : "Connect Rabby / Injected"}
      </button>
      {error && (
        <p className="mt-2 text-[10px] text-amber-400">{error}</p>
      )}
    </div>
  );
}
