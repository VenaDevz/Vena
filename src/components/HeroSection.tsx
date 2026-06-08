"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Layers } from "lucide-react";
import { PROJECT } from "@/lib/project";
import { SUPPLY_BREAKDOWN } from "@/lib/tokenomics";
import HeroParticles from "./HeroParticles";
import XIcon from "./XIcon";
import ProtocolMetrics from "./ProtocolMetrics";

export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex flex-col overflow-hidden cyber-grid scanlines"
      id="protocol"
    >
      <div className="absolute inset-x-0 top-24 sm:top-28 flex justify-center pointer-events-none opacity-25 sm:opacity-35">
        <div className="relative w-full max-w-4xl px-6">
          <Image
            src={PROJECT.bannerPath}
            alt=""
            width={1500}
            height={500}
            className="w-full h-auto object-contain"
            priority
            aria-hidden
          />
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(ellipse at center, transparent 10%, #030609 65%)",
            }}
          />
        </div>
      </div>

      <div
        className="absolute top-1/3 left-1/4 w-[480px] h-[480px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(50,205,50,0.08) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(0,212,255,0.07) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      <HeroParticles />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 w-full flex-1 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-6"
        >
          <p className="text-[10px] sm:text-xs font-mono tracking-[0.35em] text-[#00d4ff]/80 uppercase text-center">
            {PROJECT.subtitle}
          </p>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
          className="text-center text-4xl sm:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          <span className="block text-white">{PROJECT.heroLine1}</span>
          <span className="block mt-1 sm:mt-2 hero-gradient-text">{PROJECT.heroLine2}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="max-w-xl mx-auto text-center text-slate-400 text-base sm:text-lg mt-6 mb-10 leading-relaxed"
        >
          One whole {PROJECT.tokenDisplay} mints one Pickaxe.{" "}
          <span className="text-[#00d4ff]">Stratum</span> depth weights LP fees — mining runs on a
          fixed {SUPPLY_BREAKDOWN.mining.toLocaleString("en-US")} token emission schedule.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
        >
          <motion.a
            href="#tokenomics"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm tracking-wider text-[#030609]"
            style={{
              fontFamily: "var(--font-orbitron)",
              backgroundImage: "linear-gradient(135deg, #32cd32 0%, #00ff88 50%, #00d4ff 100%)",
              boxShadow: "0 0 28px rgba(0,255,136,0.3)",
            }}
          >
            Buy {PROJECT.tokenDisplay}
            <ArrowRight size={16} />
          </motion.a>
          <motion.a
            href="#stratum"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm tracking-wider border border-[rgba(0,212,255,0.35)] text-[#00d4ff] hover:bg-[rgba(0,212,255,0.08)] transition-colors"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            <Layers size={16} />
            View Stratum
          </motion.a>
          <motion.a
            href={PROJECT.social.xUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            aria-label={PROJECT.social.xHandle}
            className="flex items-center justify-center w-12 h-12 rounded-xl text-slate-400 hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] transition-colors"
          >
            <XIcon size={18} />
          </motion.a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
        >
          <p className="text-[10px] font-mono tracking-[0.25em] text-slate-600 uppercase text-center mb-4">
            Protocol Metrics
          </p>
          <ProtocolMetrics />
        </motion.div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
        <span className="text-[10px] font-mono tracking-[0.3em] text-slate-600 uppercase">
          Scroll
        </span>
        <div className="w-px h-6 bg-gradient-to-b from-[#00d4ff] to-transparent" />
      </div>
    </section>
  );
}
