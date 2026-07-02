"use client";

import { ExternalLink } from "lucide-react";
import { getVirtualsTradeUrl, getVenaTokenExplorerUrl } from "@/lib/links";
import { PROJECT } from "@/lib/project";
import { TOKENOMICS } from "@/lib/tokenomics";

const VENA_TOKEN = (process.env.NEXT_PUBLIC_VENA_TOKEN ?? "") as string;

export default function SwapSection() {
  const tradeUrl = getVirtualsTradeUrl();

  return (
    <section className="py-20 px-4 scroll-mt-24" id="swap">
      <div className="max-w-md mx-auto">
        <h2
          className="text-2xl sm:text-3xl font-bold text-center mb-2 text-white"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          Trade {PROJECT.tokenDisplay}
        </h2>
        <p className="text-center text-sm text-slate-400 mb-8">
          {PROJECT.tokenSymbol} is an agent token on {PROJECT.launchpad}. Buy and sell against
          $VIRTUAL directly on the launchpad — a {TOKENOMICS.tradeFeeBps / 100}% trade fee applies.
        </p>

        <div
          className="rounded-2xl border p-6 space-y-4"
          style={{
            background: "rgba(0,0,0,0.6)",
            borderColor: "rgba(0,212,255,0.2)",
          }}
        >
          <a
            href={tradeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl font-semibold text-sm text-center transition-colors"
            style={{
              background: "linear-gradient(135deg, rgba(0,212,255,0.3), rgba(0,255,136,0.2))",
              border: "1px solid rgba(0,212,255,0.4)",
              color: "#00d4ff",
            }}
          >
            Trade on {PROJECT.launchpad} →
          </a>

          <p className="text-xs text-slate-600 text-center">
            {TOKENOMICS.tradeFeeBps / 100}% trade fee · {TOKENOMICS.projectFeeSharePct}% flows back
            to the project (paid in $VIRTUAL)
            {VENA_TOKEN
              ? ` · Token: ${VENA_TOKEN.slice(0, 6)}…${VENA_TOKEN.slice(-4)}`
              : ""}
          </p>

          {VENA_TOKEN && (
            <a
              href={getVenaTokenExplorerUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-600 hover:text-slate-400 hover:underline"
            >
              View {PROJECT.tokenSymbol} on Blockscout
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
