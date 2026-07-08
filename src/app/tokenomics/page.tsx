import type { Metadata } from "next";
import MarketingPage from "@/components/MarketingPage";
import TokenomicsSection from "@/components/TokenomicsSection";
import StratumTimeline from "@/components/StratumTimeline";
import { PROJECT } from "@/lib/project";

export const metadata: Metadata = {
  title: `Tokenomics | ${PROJECT.name}`,
  description:
    "1B $VENA supply, buyback-fed staking pool, and Stratum depth multipliers for the VENA mining protocol.",
};

export default function TokenomicsPage() {
  return (
    <MarketingPage>
      <div className="section-alt">
        <TokenomicsSection />
        <StratumTimeline />
      </div>
    </MarketingPage>
  );
}
