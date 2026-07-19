import type { Metadata } from "next";
import FarmLayout from "@/features/farm/components/FarmLayout";
import MobileRotateOverlay from "@/components/MobileRotateOverlay";
import { PROJECT } from "@/lib/project";

export const metadata: Metadata = {
  title: `Command Base | ${PROJECT.name}`,
  description: "Manage your Vena Command Base and extract crystals.",
};

export default function FarmPage() {
  return (
    <>
      <MobileRotateOverlay />
      <FarmLayout />
    </>
  );
}
