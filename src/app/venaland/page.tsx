import type { Metadata } from "next";
import MarketingPage from "@/components/MarketingPage";
import VenaLandChestOpener from "@/components/VenaLandChestOpener";
import { PROJECT } from "@/lib/project";

export const metadata: Metadata = {
  title: `VenaLand | ${PROJECT.name}`,
  description: "Unbox your VenaLand Chests.",
};

export default function VenaLandPage() {
  return (
    <MarketingPage>
      <VenaLandChestOpener />
    </MarketingPage>
  );
}
