"use client";

import { motion } from "framer-motion";
import { seededUnit } from "@/lib/format";
import { useIsClient } from "@/lib/useIsClient";

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: `${(seededUnit(i, 1) * 100).toFixed(2)}%`,
  top: `${(seededUnit(i, 2) * 100).toFixed(2)}%`,
  size: `${(seededUnit(i, 3) * 2 + 1).toFixed(2)}px`,
  delay: seededUnit(i, 4) * 4,
  duration: seededUnit(i, 5) * 6 + 4,
  color: i % 3 === 0 ? "#00ff88" : "#00d4ff",
}));

export default function HeroParticles() {
  const isClient = useIsClient();
  if (!isClient) return null;

  return (
    <>
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 3px ${p.color}`,
          }}
          animate={{ y: [0, -20, 0], opacity: [0.2, 0.6, 0.2] }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
}
