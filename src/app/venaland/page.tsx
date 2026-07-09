import type { Metadata } from "next";
import MarketingPage from "@/components/MarketingPage";
import VenaLandComingSoon from "@/components/VenaLandComingSoon";
import { PROJECT } from "@/lib/project";

export const metadata: Metadata = {
  title: `VenaLand — Coming Soon | ${PROJECT.name}`,
  description: "VenaLand — Coming Soon.",
};

export default function VenaLandPage() {
  return (
    <MarketingPage>
      <VenaLandComingSoon />
    </MarketingPage>
  );
}
