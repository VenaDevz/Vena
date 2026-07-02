"use client";

import Link from "next/link";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import { PROJECT } from "@/lib/project";
import { formatVena } from "../config/game-config";

type MinerHeaderProps = {
  balanceVena: number;
  isConnected: boolean;
};

export default function MinerHeader({
  balanceVena,
  isConnected,
}: MinerHeaderProps) {
  return (
    <header className="miner-header sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <Link
            href="/"
            className="miner-panel-title shrink-0 text-[10px] uppercase tracking-widest text-slate-500 transition-colors hover:text-[#00f0ff]"
          >
            ← Protocol
          </Link>
          <div className="hidden h-5 w-px bg-white/10 sm:block" aria-hidden />
          <div className="min-w-0">
            <p className="miner-panel-title truncate text-[10px] uppercase tracking-[0.2em] text-[#7000ff]">
              {PROJECT.name}
            </p>
            <h1 className="miner-panel-title truncate text-sm font-bold text-white sm:text-base">
              Miner Command
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="miner-panel-title flex items-center gap-2 rounded-lg border border-[#00f0ff]/20 bg-[#00f0ff]/5 px-3 py-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-500">
              VENA
            </span>
            <span className="text-sm font-semibold tabular-nums text-[#00f0ff]">
              {isConnected ? formatVena(balanceVena) : "—"}
            </span>
          </div>
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}
