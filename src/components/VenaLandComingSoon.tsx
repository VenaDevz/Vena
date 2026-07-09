"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

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
        className="relative z-10 text-center"
      >
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
      </motion.div>
    </section>
  );
}
