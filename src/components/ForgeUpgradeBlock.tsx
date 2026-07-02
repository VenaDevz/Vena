"use client";

import ForgeUpgradePanel from "./ForgeUpgradePanel";
import { useOwnedPickaxes } from "@/lib/useOwnedPickaxes";

export default function ForgeUpgradeBlock() {
  const { nfts, refetch } = useOwnedPickaxes();

  return (
    <div id="forge-upgrade" className="mt-10 max-w-xl mx-auto scroll-mt-24">
      <ForgeUpgradePanel nfts={nfts} onForged={() => void refetch()} />
    </div>
  );
}
