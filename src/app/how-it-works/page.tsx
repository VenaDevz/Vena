import type { Metadata } from "next";
import MarketingPage from "@/components/MarketingPage";
import HowItWorks from "@/components/HowItWorks";
import FeeDistribution from "@/components/FeeDistribution";
import { PROJECT } from "@/lib/project";

export const metadata: Metadata = {
  title: `How it works | ${PROJECT.name}`,
  description:
    "Mint a Silver Pickaxe, upgrade with $VENA, and stake to earn from a buyback-fed pool on Robinhood Chain.",
};

export default function HowItWorksPage() {
  return (
    <MarketingPage>
      <div className="section-alt">
        <HowItWorks />
        <FeeDistribution />
      </div>
    </MarketingPage>
  );
}
