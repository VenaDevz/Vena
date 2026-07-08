import type { Metadata } from "next";
import MarketingPage from "@/components/MarketingPage";
import ForgeSection from "@/components/ForgeSection";
import { PROJECT } from "@/lib/project";

export const metadata: Metadata = {
  title: `Forge | ${PROJECT.name}`,
  description:
    "Upgrade your VPICK Pickaxe — burn lower tiers and pay $VENA to climb Silver through Emerald on Robinhood Chain.",
};

export default function ForgePage() {
  return (
    <MarketingPage>
      <div className="section-alt">
        <ForgeSection />
      </div>
    </MarketingPage>
  );
}
