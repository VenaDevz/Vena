"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

interface SectionShellProps {
  id?: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export default function SectionShell({
  id,
  eyebrow,
  title,
  subtitle,
  children,
  className = "",
}: SectionShellProps) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      id={id}
      ref={ref}
      className={`relative py-24 sm:py-32 px-4 sm:px-6 lg:px-8 ${className}`}
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-14 sm:mb-16"
        >
          {eyebrow && (
            <p className="text-[10px] sm:text-xs font-mono tracking-[0.35em] text-[#00d4ff]/70 uppercase mb-4">
              {eyebrow}
            </p>
          )}
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-4 max-w-2xl text-slate-400 text-base sm:text-lg leading-relaxed">
              {subtitle}
            </p>
          )}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}
