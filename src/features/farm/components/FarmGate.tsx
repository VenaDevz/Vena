"use client";

import Image from "next/image";
import Link from "next/link";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import ConnectRabbyButton from "@/components/ConnectRabbyButton";
import { getBuyVenaHref } from "@/lib/links";
import {
  FARM_MIN_VENA_HOLD,
  FARM_PICKAXE_START_CRYSTAL,
  FARM_START_CRYSTAL,
} from "../config/farm-config";

type FarmGateProps = {
  isConnected: boolean;
  hasAccess: boolean;
  hasPickaxe: boolean;
  pickaxeRequired: boolean;
  balanceVena: number;
  venaLoading: boolean;
};

export default function FarmGate({
  isConnected,
  hasAccess,
  hasPickaxe,
  balanceVena,
  venaLoading,
}: FarmGateProps) {
  const meetsVena = balanceVena >= FARM_MIN_VENA_HOLD;
  return (
    <div className="farm-gate-bg farm-panel mx-auto flex max-w-lg flex-col items-center rounded-xl p-8 text-center">
      <div className="farm-robot-stage mb-2 w-full">
        <Image
          src="/miner/robot-silver.png"
          alt="VENA Commander Robot"
          width={200}
          height={200}
          className="farm-robot-img mx-auto"
          style={{ width: "auto", height: "auto" }}
          priority
        />
      </div>
      <h2 className="farm-hud-stat text-xl font-bold text-white sm:text-2xl">
        Command Base
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        Build mine shafts on your grid. Pay $VENA to construct. Earn CRYSTAL
        while you&apos;re away — Farmville meets robot mining.
      </p>

      <div className="mt-6 w-full rounded-lg border border-[#00ff88]/20 bg-[#00ff88]/5 p-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-500">
          Entry requirement
        </p>
        <ul className="mt-2 space-y-1.5 text-left text-xs text-slate-300">
          <li>
            Own a <strong className="text-white">VenaLand Base NFT</strong> to deploy your base
            {isConnected && (
              <span className={hasAccess ? " text-[#00ff88]" : " text-amber-400"}>
                {" "}— {hasAccess ? "Access Granted" : "No Base Found"}
              </span>
            )}
          </li>
          <li>
            New commanders start with {FARM_START_CRYSTAL.toLocaleString("en-US")} Crystal
          </li>
        </ul>

        <p className="mt-3 border-t border-white/10 pt-3 text-[10px] uppercase tracking-widest text-purple-400/80">
          Optional bonus
        </p>
        <ul className="mt-1.5 space-y-1 text-left text-xs text-slate-400">
          <li>
            Hold a <span className="text-purple-300">VPICK</span> pickaxe →{" "}
            {FARM_PICKAXE_START_CRYSTAL.toLocaleString("en-US")} starter Crystal +{" "}
            <span className="text-purple-300">+10%</span> production
            {" "}(<span className="text-emerald-400">Emerald +25%</span>)
            {isConnected && hasPickaxe && <span className="text-[#00ff88]"> ✓ active</span>}
          </li>
        </ul>
      </div>

      <div className="mt-6 flex w-full flex-col gap-3">
        {!isConnected ? (
          <>
            <ConnectWalletButton fullWidth />
            <ConnectRabbyButton fullWidth />
            <p className="text-[10px] text-slate-600">
              Localhost: use <strong className="text-slate-400">Connect Rabby</strong> if
              the Reown modal fails. Network: Robinhood Chain (4663).
            </p>
          </>
        ) : hasAccess ? (
          <p className="text-sm text-[#00ff88]">Access granted — loading base…</p>
        ) : (
          <>
            <p className="text-slate-400 mt-2 max-w-sm mx-auto text-sm">
              VenaLand is an exclusive territory. To enter the command center, you must unbox a chest and own a <strong className="text-white">VenaLand Base NFT</strong>.
            </p>
            <div className="flex flex-col gap-4 max-w-xs mx-auto w-full">
              <Link 
                href="/venaland" 
                className="w-full py-4 rounded-xl font-black text-sm tracking-widest text-[#030609] transition-transform hover:scale-105"
                style={{
                  backgroundImage: "linear-gradient(135deg, #a78bfa 0%, #c084fc 100%)",
                  boxShadow: "0 0 20px rgba(167,139,250,0.3)",
                  fontFamily: "var(--font-orbitron)"
                }}
              >
                UNBOX CHEST
              </Link>
            </div>
          </>
        )}
        <Link href="/miner" className="farm-btn-ghost py-2.5 text-center text-xs uppercase tracking-wider">
          Real mining → Miner Command
        </Link>
      </div>
    </div>
  );
}
