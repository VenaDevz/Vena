#!/usr/bin/env node
/**
 * Update VenaForge tier upgrade $VENA costs (owner-only).
 *
 * Default ladder (2× from 150K Gold):
 *   Gold 150K · Platinum 300K · Diamond 600K · Emerald 1.2M
 *
 * Usage:
 *   node scripts/set-forge-upgrade-prices.mjs           # dry-run
 *   node scripts/set-forge-upgrade-prices.mjs --execute  # send txs
 *
 * Env:
 *   NEXT_PUBLIC_FORGE or FORGE — VenaForge address
 *   PRIVATE_KEY — forge owner wallet
 *   RH_RPC / RH_MAINNET_RPC / NEXT_PUBLIC_RH_RPC
 */

import { readFileSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __dir = dirname(fileURLToPath(import.meta.url));

function loadEnvFile() {
  const envPath = resolve(__dir, "../.env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile();

const EXECUTE = process.argv.includes("--execute");
const RH_RPC =
  process.env.RH_RPC ??
  process.env.RH_MAINNET_RPC ??
  process.env.NEXT_PUBLIC_RH_RPC ??
  "https://rpc.mainnet.chain.robinhood.com";
const CHAIN_ID = 4663;

const FORGE = (
  process.env.FORGE ??
  process.env.NEXT_PUBLIC_FORGE ??
  "0x99A1ac88eeB9eFFF12Be0607F4089c40F6765823"
).trim();

const PRIVATE_KEY = process.env.PRIVATE_KEY?.trim();
if (!PRIVATE_KEY) {
  console.error("Missing PRIVATE_KEY in .env");
  process.exit(1);
}

/** PickaxeNFT.Tier enum — output tier for upgrade cost. */
const UPGRADES = [
  { tier: 1, label: "Gold", vena: "150000" },
  { tier: 2, label: "Platinum", vena: "300000" },
  { tier: 3, label: "Diamond", vena: "600000" },
  { tier: 4, label: "Emerald", vena: "1200000" },
];

const forgeAbi = [
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    name: "tierUpgradeVena",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tier", type: "uint8" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "setTierUpgradeVena",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tier", type: "uint8" },
      { name: "venaAmount", type: "uint256" },
    ],
    outputs: [],
  },
];

const publicClient = createPublicClient({
  chain: {
    id: CHAIN_ID,
    name: "Robinhood Chain",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [RH_RPC] } },
  },
  transport: http(RH_RPC),
});

const account = privateKeyToAccount(
  PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`
);

const walletClient = createWalletClient({
  account,
  chain: {
    id: CHAIN_ID,
    name: "Robinhood Chain",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [RH_RPC] } },
  },
  transport: http(RH_RPC),
});

async function main() {
  console.log(`Forge: ${FORGE}`);
  console.log(`Signer: ${account.address}`);
  console.log(`Mode: ${EXECUTE ? "EXECUTE" : "dry-run"}\n`);

  const owner = await publicClient.readContract({
    address: FORGE,
    abi: forgeAbi,
    functionName: "owner",
  });

  if (owner.toLowerCase() !== account.address.toLowerCase()) {
    console.error(
      `Signer is not forge owner.\n  owner:  ${owner}\n  signer: ${account.address}`
    );
    process.exit(1);
  }

  for (const row of UPGRADES) {
    const target = parseUnits(row.vena, 18);
    const current = await publicClient.readContract({
      address: FORGE,
      abi: forgeAbi,
      functionName: "tierUpgradeVena",
      args: [row.tier],
    });

    const currentHuman = formatUnits(current, 18);
    console.log(
      `${row.label} (tier ${row.tier}): ${currentHuman} → ${row.vena} VENA`
    );

    if (current === target) {
      console.log("  skip — already set\n");
      continue;
    }

    if (!EXECUTE) {
      console.log("  would call setTierUpgradeVena\n");
      continue;
    }

    const hash = await walletClient.writeContract({
      address: FORGE,
      abi: forgeAbi,
      functionName: "setTierUpgradeVena",
      args: [row.tier, target],
    });
    console.log(`  tx: ${hash}`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log("  confirmed\n");
  }

  if (!EXECUTE) {
    console.log("Dry-run complete. Re-run with --execute to apply on-chain.");
  } else {
    console.log("All upgrade prices updated on-chain.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
