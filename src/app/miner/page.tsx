import type { Metadata } from "next";
import MinerLayout from "@/features/miner/components/MinerLayout";
import { PROJECT } from "@/lib/project";
import "@/features/miner/miner.css";

export const metadata: Metadata = {
  title: `${PROJECT.name} — Miner Command`,
  description:
    "Equip pickaxes, upgrade your miner unit, and earn VENA in the cybernetic mining interface.",
};

export default function MinerPage() {
  return <MinerLayout />;
}
