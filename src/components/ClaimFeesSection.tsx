"use client";

import Link from "next/link";
import { Pickaxe, Coins, Clock } from "lucide-react";
import { PROJECT } from "@/lib/project";
import { TOKENOMICS } from "@/lib/tokenomics";

export default function ClaimFeesSection() {
  return (
    <section id="claim-fees" className="py-16 px-4 sm:px-8 scroll-mt-24">
      <div className="max-w-xl mx-auto">
        <h2
          className="text-2xl sm:text-3xl font-bold text-center mb-2"
          style={{ fontFamily: "var(--font-orbitron)", color: "#00d4ff" }}
        >
          Stake to Earn
        </h2>
        <p className="text-center text-slate-400 text-sm mb-8 max-w-md mx-auto">
          Stake your Pickaxes to earn {PROJECT.tokenDisplay} from the buyback-fed
          staking pool. Every mint and upgrade buys {PROJECT.tokenSymbol} into the
          pool; trade fees buy back and burn — real volume, not a fixed emission.
        </p>

        <div
          className="rounded-2xl border border-cyan-900/30 p-6 space-y-5"
          style={{ background: "rgba(0,20,40,0.6)" }}
        >
          <div className="grid sm:grid-cols-3 gap-4">
            <Feature
              icon={<Pickaxe size={18} className="text-[#00d4ff]" />}
              title="Stake"
              body="Lock Pickaxes into the miner to start earning."
            />
            <Feature
              icon={<Coins size={18} className="text-[#00ff88]" />}
              title="Earn VENA"
              body="Buyback-fed pool that grows with mint & upgrade volume."
            />
            <Feature
              icon={<Clock size={18} className="text-[#a78bfa]" />}
              title="Stratum"
              body={`Up to ${TOKENOMICS.stratumMaxMultiplier}x after 30 days staked.`}
            />
          </div>

          <Link
            href={PROJECT.routes.miner}
            className="block w-full py-3 rounded-xl font-semibold text-sm text-center transition-colors"
            style={{
              background: "linear-gradient(135deg, rgba(0,212,255,0.3), rgba(0,255,136,0.2))",
              border: "1px solid rgba(0,212,255,0.4)",
              color: "#00d4ff",
            }}
          >
            Open Miner Command →
          </Link>
        </div>
      </div>
    </section>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl bg-black/40 border border-cyan-900/20 p-4 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-slate-500 leading-relaxed">{body}</p>
    </div>
  );
}
