"use client";

import { motion } from "framer-motion";
import { Sparkles, Map, Pickaxe, Factory, Box, Clock } from "lucide-react";

export default function VenaLandGuide() {
  const sections = [
    {
      icon: <Sparkles className="w-8 h-8 text-yellow-400" />,
      title: "How to Access",
      desc: "To step into VenaLand, you must be a VenaLand Base NFT owner. You can acquire your land by unboxing chests. Once you own your land NFT, the command center opens its doors instantly."
    },
    {
      icon: <Map className="w-8 h-8 text-blue-400" />,
      title: "Discover Your Land",
      desc: "When you unbox your chest and first enter the game, a dedicated territory will be assigned to you on the massive map. Depending on your luck, you might win a sweet 2x2 base or a gigantic 5x5 industrial zone."
    },
    {
      icon: <Pickaxe className="w-8 h-8 text-orange-400" />,
      title: "Primary Extractors",
      desc: "Set up your primary extractors using $VENA. Ore Mine extracts raw Ore from the surface, Deep Shaft drills for valuable Iron, and Core Excavator extracts pure Gold from the planet's core."
    },
    {
      icon: <Factory className="w-8 h-8 text-purple-400" />,
      title: "Refineries & Upgrades",
      desc: "Build refineries using Crystal to process raw materials and multiply their value. Smelt Ore into Iron at the Forge, refine Iron into Gold, and use the ultimate Crystal Lab to transmute Gold directly into pure Crystal."
    },
    {
      icon: <Box className="w-8 h-8 text-emerald-400" />,
      title: "Orbital Chest",
      desc: "Once a day, call down a supply drop from space completely for free. Spin the roulette to win thousands of Crystals, rare Power Cores, or massive amounts of $VENA. You can also purchase extra spins."
    },
    {
      icon: <Clock className="w-8 h-8 text-rose-400" />,
      title: "Earn While You Sleep",
      desc: "The VenaLand world never sleeps. Even when you are away from the game, your workers and machines continue to operate for you. Log back in and collect all your accumulated loot with a single click."
    }
  ];

  return (
    <section className="relative py-24 bg-[#030609] overflow-hidden border-t border-white/5">
      <div className="absolute inset-0 bg-[url('/scanlines.png')] opacity-10 pointer-events-none mix-blend-overlay" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-4 hero-gradient-text" style={{ fontFamily: "var(--font-orbitron)" }}>
            Commander's Guide
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Everything you need to know to build your command center, establish your mines, and process your resources to create a massive mining empire.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sections.map((sec, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl hover:bg-white/10 transition-colors group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
              <div className="mb-6 bg-black/40 w-16 h-16 rounded-xl flex items-center justify-center border border-white/5 shadow-inner">
                {sec.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: "var(--font-orbitron)" }}>
                {sec.title}
              </h3>
              <p className="text-slate-400 leading-relaxed text-sm">
                {sec.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
