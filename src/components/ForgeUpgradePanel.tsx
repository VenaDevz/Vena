"use client";

import { useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { ArrowUpRight, Hammer, Loader2 } from "lucide-react";
import { formatUnits, parseUnits } from "viem";
import { RARITY_CONFIG, type PickaxeNFT, type Rarity } from "@/lib/types";
import { FORGE_RECIPES, type ForgeRecipe } from "@/lib/forge";
import {
  erc20Abi,
  forgeAbi,
  isUpgradeLive,
  pickaxeNftAbi,
  RH_CONTRACTS,
  TIER_INDEX,
} from "@/lib/contracts/robinhood";
import { tierUpgradeVena } from "@/lib/tokenomics";
import { formatVena } from "@/lib/mint-pricing";

type RecipeStatus = {
  recipe: ForgeRecipe;
  tokenIds: number[];
  venaCost: number;
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
    const venaCost = tierUpgradeVena(recipe.outputTier);

    if (unstakedIds.length >= recipe.inputCount) {
      return {
        recipe,
        tokenIds,
        venaCost,
        ready: true,
        hint: `Burn ${recipe.label} → ${recipe.outputTier}`,
      };
    }

    const missing = recipe.inputCount - unstakedIds.length;
    if (ownedIds.length >= recipe.inputCount && unstakedIds.length < recipe.inputCount) {
      return {
        recipe,
        tokenIds,
        venaCost,
        ready: false,
        hint: `Unstake ${missing} ${recipe.inputTier} pickaxe${missing !== 1 ? "s" : ""} first`,
      };
    }

    const needMore = recipe.inputCount - ownedIds.length;
    return {
      recipe,
      tokenIds,
      venaCost,
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
  const upgradeLive = isUpgradeLive();

  const { data: forgePaused } = useReadContract({
    address: RH_CONTRACTS.forge,
    abi: forgeAbi,
    functionName: "paused",
    query: { enabled: !!RH_CONTRACTS.forge },
  });

  const { data: forgeApproved, refetch: refetchNftApproval } = useReadContract({
    address: RH_CONTRACTS.pickaxeNft,
    abi: pickaxeNftAbi,
    functionName: "isApprovedForAll",
    args: address && RH_CONTRACTS.forge ? [address, RH_CONTRACTS.forge] : undefined,
    query: { enabled: isConnected && !!address && !!RH_CONTRACTS.forge },
  });

  const { data: venaAllowance, refetch: refetchAllowance } = useReadContract({
    address: RH_CONTRACTS.venaToken,
    abi: erc20Abi,
    functionName: "allowance",
    args: address && RH_CONTRACTS.forge ? [address, RH_CONTRACTS.forge] : undefined,
    query: { enabled: isConnected && upgradeLive && !!address },
  });

  const { data: venaBalanceRaw } = useReadContract({
    address: RH_CONTRACTS.venaToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: isConnected && upgradeLive && !!address },
  });

  const venaBalance = venaBalanceRaw ? Number(formatUnits(venaBalanceRaw, 18)) : 0;
  const recipes = useMemo(() => buildRecipeStatuses(nfts), [nfts]);

  if (!RH_CONTRACTS.forge) return null;

  async function handleForge({ recipe, tokenIds, venaCost }: RecipeStatus) {
    if (forgePaused) {
      setStatus("Forge is paused.");
      return;
    }
    if (!upgradeLive) {
      setStatus("$VENA upgrades not live yet.");
      return;
    }

    const costWei = parseUnits(String(venaCost), 18);
    if (venaBalance < venaCost) {
      setStatus(`Need ${formatVena(venaCost)} $VENA (you have ${formatVena(venaBalance)}).`);
      return;
    }

    setPendingTier(recipe.inputTier);
    setStatus("");

    try {
      if (!forgeApproved) {
        setStatus("Approving Forge for VPICK…");
        await writeContractAsync({
          address: RH_CONTRACTS.pickaxeNft,
          abi: pickaxeNftAbi,
          functionName: "setApprovalForAll",
          args: [RH_CONTRACTS.forge, true],
        });
        await refetchNftApproval();
      }

      const allowance = venaAllowance ?? 0n;
      if (allowance < costWei) {
        setStatus(`Approving ${formatVena(venaCost)} $VENA…`);
        await writeContractAsync({
          address: RH_CONTRACTS.venaToken,
          abi: erc20Abi,
          functionName: "approve",
          args: [RH_CONTRACTS.forge, costWei],
        });
        await refetchAllowance();
      }

      setStatus(`Forging ${recipe.label} → ${recipe.outputTier}…`);
      await writeContractAsync({
        address: RH_CONTRACTS.forge,
        abi: forgeAbi,
        functionName: "forge",
        args: [TIER_INDEX[recipe.inputTier], tokenIds.map((id) => BigInt(id))],
      });

      setStatus(`Forge successful — ${recipe.outputTier} minted.`);
      onForged();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Forge failed";
      setStatus(msg.slice(0, 140));
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
          Forge Pickaxes
        </h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Burn the required lower-tier Pickaxes <strong className="text-slate-400">and</strong> pay
        $VENA — e.g. <strong className="text-slate-400">4 Silver + 1M $VENA → Gold</strong>.
        All must be unstaked.
      </p>

      {!isConnected ? (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-slate-500">Connect wallet to forge your pickaxes.</p>
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
      ) : !upgradeLive ? (
        <p className="text-xs text-amber-400/90 py-2">
          Upgrades unlock once $VENA is wired on-chain (mint works now).
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {recipes.map(({ recipe, tokenIds, venaCost, ready, hint }) => {
            const outColor = RARITY_CONFIG[recipe.outputTier].color;
            const busy = pendingTier === recipe.inputTier;
            const canPay = venaBalance >= venaCost;
            const disabled = !ready || busy || !!forgePaused || !canPay;

            return (
              <button
                key={recipe.inputTier}
                type="button"
                disabled={disabled}
                onClick={() => ready && handleForge({ recipe, tokenIds, venaCost, ready, hint })}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#030609]/50 hover:border-[rgba(167,139,250,0.35)] transition-colors disabled:opacity-60 text-left"
              >
                <div className="min-w-0">
                  <span className="text-sm text-slate-300 block">
                    {recipe.label}{" "}
                    <span className="text-slate-600">→</span>{" "}
                    <span style={{ color: outColor }}>{recipe.outputTier}</span>
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono mt-0.5 block">
                    {ready
                      ? `${hint} · ${formatVena(venaCost)} $VENA`
                      : hint}
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
          {upgradeLive && (
            <p className="text-[10px] text-slate-600 text-center pt-1">
              Balance: {formatVena(venaBalance)} $VENA
            </p>
          )}
        </div>
      )}

      {status && <p className="mt-3 text-xs text-center text-gray-400">{status}</p>}
    </div>
  );
}
