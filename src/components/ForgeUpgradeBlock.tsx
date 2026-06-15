"use client";

import ForgeUpgradePanel from "./ForgeUpgradePanel";
import { useOwnedPickaxes } from "@/lib/useOwnedPickaxes";

export default function ForgeUpgradeBlock() {
  const { nfts, refetch } = useOwnedPickaxes();

  return (
    <div className="mt-10 max-w-xl mx-auto">
      <ForgeUpgradePanel nfts={nfts} onForged={() => void refetch()} />
    </div>
  );
}
