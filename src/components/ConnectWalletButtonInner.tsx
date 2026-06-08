"use client";

import { useAppKit } from "@reown/appkit/react";
import { useAccount, useSwitchChain } from "wagmi";
import { motion } from "framer-motion";
import { Activity, AlertTriangle } from "lucide-react";
import { baseChainId } from "@/config/wagmi";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface ConnectWalletButtonProps {
  className?: string;
  fullWidth?: boolean;
}

export default function ConnectWalletButtonInner({
  className = "",
  fullWidth = false,
}: ConnectWalletButtonProps) {
  const { open } = useAppKit();
  const { address, isConnected, chain, isConnecting } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isWrongNetwork = isConnected && chain?.id !== baseChainId;

  const handleClick = async () => {
    if (isWrongNetwork) {
      switchChain({ chainId: baseChainId });
      return;
    }

    if (isConnected) {
      await open({ view: "Account" });
      return;
    }

    await open({ view: "Connect" });
  };

  const label = isConnecting || isSwitching
    ? "Connecting..."
    : isWrongNetwork
      ? "Switch to Base"
      : isConnected && address
        ? truncateAddress(address)
        : "Connect Wallet";

  const connected = isConnected && !isWrongNetwork;
  const warning = isWrongNetwork;

  return (
    <motion.button
      onClick={handleClick}
      disabled={isConnecting || isSwitching}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      className={`relative flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-lg font-semibold text-sm tracking-wider overflow-hidden group disabled:opacity-70 disabled:cursor-wait ${fullWidth ? "w-full" : ""} ${className}`}
      style={{ fontFamily: "var(--font-orbitron)" }}
      type="button"
      data-connect-wallet
    >
      <span
        className="absolute inset-0 rounded-lg"
        style={{
          background: warning
            ? "linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(251,146,60,0.15) 100%)"
            : connected
              ? "linear-gradient(135deg, rgba(0,255,136,0.25) 0%, rgba(0,212,255,0.2) 100%)"
              : "linear-gradient(135deg, rgba(0,212,255,0.15) 0%, rgba(0,255,136,0.1) 100%)",
          border: warning
            ? "1px solid rgba(239,68,68,0.6)"
            : connected
              ? "1px solid rgba(0,255,136,0.6)"
              : "1px solid rgba(0,212,255,0.5)",
          boxShadow: warning
            ? "0 0 15px rgba(239,68,68,0.25)"
            : connected
              ? "0 0 15px rgba(0,255,136,0.3), 0 0 30px rgba(0,255,136,0.1)"
              : "0 0 15px rgba(0,212,255,0.2)",
        }}
      />
      {warning ? (
        <AlertTriangle size={15} className="relative z-10 text-red-400" />
      ) : (
        <Activity
          size={15}
          className={`relative z-10 ${connected ? "text-[#00ff88]" : "text-[#00d4ff]"}`}
        />
      )}
      <span
        className={`relative z-10 group-hover:text-white transition-colors duration-200 ${
          warning ? "text-red-400" : connected ? "text-[#00ff88]" : "text-[#00d4ff]"
        }`}
      >
        {label}
      </span>
    </motion.button>
  );
}

export function useVenaWallet() {
  const { open } = useAppKit();
  const { address, isConnected, chain } = useAccount();
  const isWrongNetwork = isConnected && chain?.id !== baseChainId;

  return {
    address,
    isConnected: isConnected && !isWrongNetwork,
    isWrongNetwork,
    openConnect: () => {
      void open({ view: "Connect" });
    },
  };
}
