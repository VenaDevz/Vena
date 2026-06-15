"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X as CloseIcon } from "lucide-react";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import BrandLogo from "@/components/BrandLogo";
import XIcon from "@/components/XIcon";
import { PROJECT } from "@/lib/project";
import { handleSectionLink } from "@/lib/scroll";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Protocol", href: "#protocol" },
    { label: "Swap", href: "#swap" },
    { label: "Stratum", href: "#stratum" },
    { label: "Forge", href: "#forge-upgrade" },
    { label: "Fees", href: "#claim-fees" },
    { label: "Mining", href: "#mining" },
  ];

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#030609]/90 backdrop-blur-xl border-b border-[rgba(0,212,255,0.12)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <motion.a
            href="#protocol"
            className="group"
            whileHover={{ scale: 1.02 }}
          >
          <BrandLogo size="lg" />
          </motion.a>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleSectionLink(e, link.href.slice(1))}
                className="relative text-sm font-medium tracking-wider text-slate-400 hover:text-[#00d4ff] transition-colors duration-200 group"
                style={{ fontFamily: "var(--font-orbitron)" }}
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-[#00d4ff] group-hover:w-full transition-all duration-300" />
              </a>
            ))}
            <a
              href={PROJECT.social.xUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={PROJECT.social.xHandle}
              className="text-slate-500 hover:text-white transition-colors p-1.5 -m-1.5"
            >
              <XIcon size={17} />
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.05)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-[10px] tracking-widest text-[#00ff88] font-mono uppercase">
                Live · {PROJECT.network}
              </span>
            </div>

            <div className="hidden sm:block">
              <ConnectWalletButton />
            </div>

            <button
              className="md:hidden p-2 text-slate-400 hover:text-[#00d4ff] transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              type="button"
              aria-label="Toggle menu"
            >
              {menuOpen ? <CloseIcon size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-[rgba(0,212,255,0.12)] bg-[#030609]/95 backdrop-blur-xl"
          >
            <div className="px-4 py-6 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => {
                    handleSectionLink(e, link.href.slice(1));
                    setMenuOpen(false);
                  }}
                  className="block text-sm font-medium tracking-wider text-slate-400 hover:text-[#00d4ff] transition-colors py-2"
                  style={{ fontFamily: "var(--font-orbitron)" }}
                >
                  {link.label}
                </a>
              ))}
              <a
                href={PROJECT.social.xUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={PROJECT.social.xHandle}
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors py-2"
                onClick={() => setMenuOpen(false)}
              >
                <XIcon size={18} />
                <span className="text-sm font-medium tracking-wider">X</span>
              </a>
              <ConnectWalletButton fullWidth />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
