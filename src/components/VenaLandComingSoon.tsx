"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Pickaxe, Sparkles } from "lucide-react";
import { PROJECT } from "@/lib/project";

export default function VenaLandComingSoon() {
  return (
    <section className="relative min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center px-4 py-16 overflow-hidden cyber-grid">
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(112,0,255,0.12) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[360px] h-[360px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,255,136,0.08) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-lg text-center"
      >
        <p className="text-[10px] sm:text-xs font-mono tracking-[0.35em] text-[#7000ff]/90 uppercase mb-4">
          {PROJECT.name} · Idle Command Grid
        </p>

        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          Vena<span className="text-[#00ff88]">Land</span>
        </h1>

        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(251,191,36,0.35)] bg-[rgba(251,191,36,0.08)]">
          <Sparkles size={14} className="text-[#fcd34d]" />
          <span
            className="text-sm font-bold tracking-[0.2em] text-[#fcd34d] uppercase"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            Coming Soon
          </span>
        </div>

        <p className="mt-8 text-slate-400 text-base sm:text-lg leading-relaxed">
          Build your mine grid, trade resources, and grow your command base on Robinhood Chain.
          Hold {PROJECT.tokenDisplay} to play — VPICK holders get bonus Crystal and production boosts.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={PROJECT.routes.mint}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm tracking-wider text-[#030609]"
            style={{
              fontFamily: "var(--font-orbitron)",
              backgroundImage: "linear-gradient(135deg, #32cd32 0%, #00ff88 50%, #00d4ff 100%)",
            }}
          >
            <Pickaxe size={16} />
            Mint Pickaxe
          </Link>
          <Link
            href={PROJECT.routes.miner}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm tracking-wider border border-[rgba(167,139,250,0.35)] text-[#a78bfa] hover:bg-[rgba(167,139,250,0.08)] transition-colors"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            Miner Command
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
