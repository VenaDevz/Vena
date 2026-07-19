"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function MobileRotateOverlay() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // If width is less than height and width is small enough to be a phone/tablet
      if (window.innerWidth < window.innerHeight && window.innerWidth <= 768) {
        setIsPortrait(true);
      } else {
        setIsPortrait(false);
      }
    };

    // Initial check
    checkOrientation();

    // Listen to resize and orientation change
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);

    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  return (
    <AnimatePresence>
      {isPortrait && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#030609]/95 backdrop-blur-xl p-6 text-center"
        >
          <motion.div
            animate={{ rotate: 90 }}
            transition={{
              repeat: Infinity,
              duration: 2,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
            className="mb-8"
          >
            <Smartphone size={80} className="text-[#00ff88]" strokeWidth={1} />
          </motion.div>
          
          <h2 
            className="text-2xl font-black mb-4 text-white uppercase tracking-widest"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            Rotate Device
          </h2>
          
          <p className="text-slate-400 max-w-sm leading-relaxed">
            VenaLand is a massive grid-based strategy game. For the best experience and full control of your empire, please rotate your phone to landscape mode.
          </p>
          
          <div className="mt-12 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Waiting for landscape mode...
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
