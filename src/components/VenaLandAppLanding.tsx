"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Pickaxe, Box, Gamepad2 } from "lucide-react";
import VenaLandGuide from "./VenaLandGuide";
import ConnectWalletButton from "@/components/ConnectWalletButton";

export default function VenaLandAppLanding() {
  return (
    <div className="min-h-screen bg-[#030609] text-slate-300 font-sans selection:bg-[#00d4ff]/30">
      {/* App Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#030609]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-[#00d4ff]" />
            <span className="font-black tracking-widest text-white" style={{ fontFamily: "var(--font-orbitron)" }}>
              VENALAND
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <a href="https://venaprotocol.com" className="hidden sm:block text-sm font-semibold text-slate-400 hover:text-white transition-colors">
              Protocol Home
            </a>
            <ConnectWalletButton />
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 pointer-events-none mix-blend-overlay" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#00d4ff]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff] text-xs font-bold tracking-widest uppercase mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse" />
            Live on Robinhood Chain
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black mb-6"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            <span className="block text-white">COMMAND YOUR</span>
            <span className="block hero-gradient-text mt-2">MINING EMPIRE</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Unbox your chest, deploy your command center, and build a massive mining empire.
            Earn Crystal, trade resources, and rise to the top of the VenaLand leaderboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="/farm"
              className="flex items-center justify-center gap-2 px-8 py-4 w-full sm:w-auto rounded-xl font-black text-sm tracking-widest text-[#030609] hover:scale-105 transition-transform"
              style={{
                fontFamily: "var(--font-orbitron)",
                backgroundImage: "linear-gradient(135deg, #32cd32 0%, #00ff88 50%, #00d4ff 100%)",
                boxShadow: "0 0 30px rgba(0,255,136,0.3)",
              }}
            >
              <Pickaxe size={18} />
              ENTER VENALAND
            </a>
            
            <a
              href="/venaland"
              className="flex items-center justify-center gap-2 px-8 py-4 w-full sm:w-auto rounded-xl font-bold text-sm tracking-widest border border-purple-500/50 text-purple-400 hover:bg-purple-500/10 hover:scale-105 transition-all"
              style={{ fontFamily: "var(--font-orbitron)" }}
            >
              <Box className="w-5 h-5" />
              UNBOX CHESTS
            </a>
          </motion.div>
        </div>
      </section>

      {/* Guide Section */}
      <VenaLandGuide />
    </div>
  );
}
