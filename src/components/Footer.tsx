"use client";

import Image from "next/image";
import { PROJECT } from "@/lib/project";
import BrandLogo from "@/components/BrandLogo";
import XIcon from "@/components/XIcon";

export default function Footer() {
  return (
    <footer className="relative border-t border-[rgba(0,212,255,0.08)] py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 mb-10">
          <div className="flex items-center gap-4">
            <BrandLogo size="sm" showWordmark={false} />
            <div>
              <span
                className="text-sm font-black tracking-[0.25em] text-white block"
                style={{ fontFamily: "var(--font-orbitron)" }}
              >
                {PROJECT.name}
              </span>
              <p className="text-[10px] text-slate-600 font-mono tracking-wider mt-1">
                {PROJECT.taglineShort} · © 2026 · {PROJECT.maxSupply.toLocaleString("en-US")}{" "}
                supply · {PROJECT.network}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 font-mono text-center max-w-md">
            Live on {PROJECT.network} · Uniswap v4 · {PROJECT.timeBonusName} depth ·{" "}
            <span className="text-[#00ff88]">{PROJECT.network} mainnet</span>
          </p>

          <a
            href={PROJECT.social.xUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={PROJECT.social.xHandle}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[rgba(255,255,255,0.08)] text-slate-500 hover:text-white hover:border-[rgba(255,255,255,0.18)] transition-colors"
          >
            <XIcon size={17} />
          </a>
        </div>

        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(0,212,255,0.1)" }}
        >
          <Image
            src={PROJECT.bannerPath}
            alt={`${PROJECT.name} — ${PROJECT.tokenDisplay}`}
            width={1024}
            height={341}
            className="w-full h-auto block opacity-80"
            style={{ display: "block" }}
          />
          {/* top + bottom fade to blend with page background */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: [
                "linear-gradient(to bottom, #030609 0%, transparent 20%, transparent 80%, #030609 100%)",
                "linear-gradient(to right,  #030609 0%, transparent 12%, transparent 88%, #030609 100%)",
              ].join(", "),
            }}
          />
        </div>
      </div>
    </footer>
  );
}
