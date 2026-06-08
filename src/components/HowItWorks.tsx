"use client";

import { HOW_IT_WORKS } from "@/lib/tokenomics";
import SectionShell from "./SectionShell";

export default function HowItWorks() {
  return (
    <SectionShell
      id="how-it-works"
      eyebrow="Flow"
      title="Three rules."
      subtitle="Same fairness as Eldor — one whole token, one Pickaxe — plus forgeable rarity and Stratum depth."
    >
      <div className="grid md:grid-cols-3 gap-6">
        {HOW_IT_WORKS.map((item) => (
          <div
            key={item.step}
            className="relative p-6 sm:p-8 rounded-2xl group transition-colors duration-300 hover:border-[rgba(0,212,255,0.25)]"
            style={{
              background: "linear-gradient(160deg, rgba(13,21,32,0.9) 0%, rgba(10,15,22,0.95) 100%)",
              border: "1px solid rgba(0,212,255,0.1)",
            }}
          >
            <span
              className="text-4xl font-black text-[rgba(0,212,255,0.15)] group-hover:text-[rgba(0,212,255,0.35)] transition-colors"
              style={{ fontFamily: "var(--font-orbitron)" }}
            >
              {item.step}
            </span>
            <h3
              className="mt-4 text-xl font-bold text-white"
              style={{ fontFamily: "var(--font-orbitron)" }}
            >
              {item.title}
            </h3>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
