"use client";

import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import FeeDistribution from "@/components/FeeDistribution";
import StratumTimeline from "@/components/StratumTimeline";
import ForgeSection from "@/components/ForgeSection";
import TokenomicsSection from "@/components/TokenomicsSection";
import MiningDashboard from "@/components/MiningDashboard";
import SwapSection from "@/components/SwapSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />

      <main>
        <HeroSection />

        <div className="relative h-px mx-8 sm:mx-16 max-w-7xl lg:mx-auto">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.25) 50%, transparent 100%)",
            }}
          />
        </div>

        <div className="section-alt">
          <HowItWorks />
          <FeeDistribution />
        </div>
        <StratumTimeline />
        <div className="section-alt">
          <ForgeSection />
          <TokenomicsSection />
        </div>

        <div className="relative h-px mx-8 sm:mx-16 max-w-7xl lg:mx-auto">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(0,255,136,0.2) 50%, transparent 100%)",
            }}
          />
        </div>

        <MiningDashboard />
        <SwapSection />
        <Footer />
      </main>
    </>
  );
}
