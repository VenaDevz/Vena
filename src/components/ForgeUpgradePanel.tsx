"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { ArrowUpRight, Hammer, Loader2 } from "lucide-react";
import { RARITY_CONFIG, type PickaxeNFT, type Rarity } from "@/lib/types";
import { FORGE_RECIPES, type ForgeRecipe } from "@/lib/forge";

const FORGE_ADDR = (process.env.NEXT_PUBLIC_FORGE ?? "") as `0x${string}`;
const PICKAXE_ADDR = (process.env.NEXT_PUBLIC_PICKAXE_NFT ?? "") as `0x${string}`;

const pickaxeABI = [
  {
    name: "setApprovalForAll",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }],
    outputs: [],
  },
  {
    name: "isApprovedForAll",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "operator", type: "address" }],
    outputs: [{ type: "bool" }],
  },
] as const;

const forgeABI = [
  {
    name: "forge",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "inputTier", type: "uint8" },
      { name: "tokenIds", type: "uint256[]" },
    ],
    outputs: [],
  },
  {
    name: "paused",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
] as const;

const TIER_INDEX: Record<Rarity, number> = {
  Silver: 0,
  Gold: 1,
  Platinum: 2,
  Diamond: 3,
  Emerald: 4,
};

type RecipeStatus = {
  recipe: ForgeRecipe;
  tokenIds: number[];
  ready: boolean;
  hint: string;
};

type Props = {
  nfts: PickaxeNFT[];
  onForged: () => void;
  compact?: boolean;
};

function buildRecipeStatuses(nfts: PickaxeNFT[]): RecipeStatus[] {
  const unstaked = nfts.filter((n) => !n.staked);
  const owned = nfts;
  const unstakedByTier = new Map<Rarity, number[]>();
  const ownedByTier = new Map<Rarity, number[]>();

  for (const n of unstaked) {
    const list = unstakedByTier.get(n.rarity) ?? [];
    list.push(n.id);
    unstakedByTier.set(n.rarity, list);
  }
  for (const n of owned) {
    const list = ownedByTier.get(n.rarity) ?? [];
    list.push(n.id);
    ownedByTier.set(n.rarity, list);
  }

  return FORGE_RECIPES.map((recipe) => {
    const unstakedIds = unstakedByTier.get(recipe.inputTier) ?? [];
    const ownedIds = ownedByTier.get(recipe.inputTier) ?? [];
    const tokenIds = unstakedIds.slice(0, recipe.inputCount);

    if (unstakedIds.length >= recipe.inputCount) {
      return { recipe, tokenIds, ready: true, hint: "Ready to forge" };
    }

    const missing = recipe.inputCount - unstakedIds.length;
    if (ownedIds.length >= recipe.inputCount && unstakedIds.length < recipe.inputCount) {
      return {
        recipe,
        tokenIds,
        ready: false,
        hint: `Unstake ${missing} ${recipe.inputTier} pickaxe${missing !== 1 ? "s" : ""} first`,
      };
    }

    const needMore = recipe.inputCount - ownedIds.length;
    return {
      recipe,
      tokenIds,
      ready: false,
      hint: `Need ${needMore} more unstaked ${recipe.inputTier}`,
    };
  });
}

export default function ForgeUpgradePanel({ nfts, onForged, compact }: Props) {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const [pendingTier, setPendingTier] = useState<Rarity | null>(null);
  const [status, setStatus] = useState("");

  const { writeContractAsync } = useWriteContract();

  const { data: forgePaused } = useReadContract({
    address: FORGE_ADDR,
    abi: forgeABI,
    functionName: "paused",
    query: { enabled: !!FORGE_ADDR },
  });

  const { data: forgeApproved, refetch: refetchApproval } = useReadContract({
    address: PICKAXE_ADDR,
    abi: pickaxeABI,
    functionName: "isApprovedForAll",
    args: address && FORGE_ADDR ? [address, FORGE_ADDR] : undefined,
    query: { enabled: isConnected && !!address && !!FORGE_ADDR },
  });

  const recipes = useMemo(() => buildRecipeStatuses(nfts), [nfts]);

  if (!FORGE_ADDR) return null;

  async function handleUpgrade(recipe: ForgeRecipe, tokenIds: number[]) {
    if (forgePaused) {
      setStatus("Forge is paused.");
      return;
    }
    setPendingTier(recipe.inputTier);
    setStatus("");
    try {
      if (!forgeApproved) {
        setStatus("Approving Forge…");
        await writeContractAsync({
          address: PICKAXE_ADDR,
          abi: pickaxeABI,
          functionName: "setApprovalForAll",
          args: [FORGE_ADDR, true],
        });
        await refetchApproval();
      }
      setStatus(`Upgrading ${recipe.label}…`);
      await writeContractAsync({
        address: FORGE_ADDR,
        abi: forgeABI,
        functionName: "forge",
        args: [TIER_INDEX[recipe.inputTier], tokenIds.map((id) => BigInt(id))],
      });
      setStatus("Upgrade successful.");
      onForged();
    } catch (e) {
      setStatus(e instanceof Error ? e.message.slice(0, 100) : "Upgrade failed");
    } finally {
      setPendingTier(null);
    }
  }

  return (
    <div
      className={`${compact ? "" : "mb-6 "}p-4 sm:p-5 rounded-2xl border border-[rgba(167,139,250,0.2)]`}
      style={{ background: "rgba(13,21,32,0.85)" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Hammer size={16} className="text-[#a78bfa]" />
        <h3
          className="text-sm font-bold text-white"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          Upgrade Pickaxes
        </h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Unstaked pickaxes only. Forge burns lower tiers and mints the next tier.
      </p>

      {!isConnected ? (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-slate-500">Connect wallet to upgrade your pickaxes.</p>
          <button
            type="button"
            onClick={() => open()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#030609]"
            style={{
              fontFamily: "var(--font-orbitron)",
              backgroundImage: "linear-gradient(135deg, #32cd32 0%, #00ff88 50%, #00d4ff 100%)",
            }}
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {recipes.map(({ recipe, tokenIds, ready, hint }) => {
            const outColor = RARITY_CONFIG[recipe.outputTier].color;
            const busy = pendingTier === recipe.inputTier;
            return (
              <button
                key={recipe.inputTier}
                type="button"
                disabled={!ready || busy || !!forgePaused}
                onClick={() => ready && handleUpgrade(recipe, tokenIds)}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#030609]/50 hover:border-[rgba(167,139,250,0.35)] transition-colors disabled:opacity-60 text-left"
              >
                <div className="min-w-0">
                  <span className="text-sm text-slate-300 block">
                    {recipe.label}{" "}
                    <span className="text-slate-600">→</span>{" "}
                    <span style={{ color: outColor }}>{recipe.outputTier}</span>
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono mt-0.5 block">
                    {ready ? "Ready" : hint}
                  </span>
                </div>
                {busy ? (
                  <Loader2 size={14} className="animate-spin text-[#a78bfa] shrink-0" />
                ) : ready ? (
                  <ArrowUpRight size={14} className="text-[#a78bfa] shrink-0" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {status && <p className="mt-3 text-xs text-center text-gray-400">{status}</p>}
    </div>
  );
}
