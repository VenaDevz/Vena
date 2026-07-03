#!/usr/bin/env node
/**
 * Manual keeper — run when you want (no daemon required).
 *
 * Default cycle (--execute):
 *   1. If treasury ETH >= reserve + min swap → ETH → VIRTUAL → VENA (bonding proxy)
 *   2. If treasury VENA >= MIN_FUND_VENA → fundRewards() on VenaMiningV2
 *
 * Env (see .env.example):
 *   TREASURY, TREASURY_PRIVATE_KEY (preferred) or PRIVATE_KEY
 *   MINING / NEXT_PUBLIC_STAKING, VENA_TOKEN, RH_RPC
 *   GAS_RESERVE_ETH=0.01  MIN_SWAP_ETH=0.02  MIN_FUND_VENA=1000
 *   KEEPER_INTERVAL_MINUTES=30  (optional — only with --watch)
 *
 * Flags:
 *   (default)     dry-run
 *   --execute       live txs
 *   --fund-only     skip ETH buyback
 *   --buyback-only  skip fundRewards
 *   --watch         loop (requires --execute)
 */

import { readFileSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  formatUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __dir = dirname(fileURLToPath(import.meta.url));

/** Load project .env when npm scripts don't source it. */
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

const RH_RPC =
  process.env.RH_RPC ??
  process.env.RH_MAINNET_RPC ??
  process.env.NEXT_PUBLIC_RH_RPC ??
  "https://rpc.mainnet.chain.robinhood.com";
const CHAIN_ID = 4663;

const VENA = (
  process.env.VENA_TOKEN ?? "0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf"
).trim();
const VIRTUAL = "0xc6911796042b15d7fa4f6cde69e245ddcd3d9c31";
const WETH = "0x0bd7d308f8e1639fab988df18a8011f41eacad73";
const UNISWAP_ROUTER = "0x89e5db8b5aa49aa85ac63f691524311aeb649eba";
const F_ROUTER = "0xCa6395246B4382Ba70F886526dD9a9De984F6081";
const BONDING_PROXY = "0xd4cCBFA37e2f35611b3042e4096Ad7a3459Bd007";

const GAS_RESERVE = parseEther(process.env.GAS_RESERVE_ETH ?? "0.01");
const MIN_SWAP = parseEther(process.env.MIN_SWAP_ETH ?? "0.02");
const MIN_FUND = parseEther(process.env.MIN_FUND_VENA ?? "1000");
const MAX_SLIPPAGE_BPS = 2000; // hard cap: 20%
const SLIPPAGE_BPS = Math.min(
  Number(process.env.SLIPPAGE_BPS ?? String(MAX_SLIPPAGE_BPS)),
  MAX_SLIPPAGE_BPS
);
const WATCH_MS =
  Number(process.env.KEEPER_INTERVAL_MINUTES ?? "30") * 60 * 1000;

const erc20Abi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "a", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
];

const routerAbi = [
  {
    name: "getAmountsOut",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ type: "uint256[]" }],
  },
  {
    name: "swapExactETHForTokens",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ type: "uint256[]" }],
  },
];

const fRouterAbi = [
  {
    name: "getAmountsOut",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "tokenAddress", type: "address" },
      { name: "assetToken", type: "address" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
];

const bondingBuyAbi = [
  {
    name: "buy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "tokenAddress", type: "address" },
      { name: "amountOutMin", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
];

const miningAbi = [
  {
    name: "fundRewards",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "started",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    name: "poolBalance",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "rewardPerSecond",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
];

const chain = {
  id: CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RH_RPC] } },
};

const args = new Set(process.argv.slice(2));
const dryRun = !args.has("--execute");
const fundOnly = args.has("--fund-only");
const buybackOnly = args.has("--buyback-only");
const watch = args.has("--watch");

function applySlippage(amount, bps) {
  return (amount * BigInt(10_000 - bps)) / 10_000n;
}

function deadline() {
  return BigInt(Math.floor(Date.now() / 1000) + 900);
}

function normalizePk(pk) {
  if (!pk) return null;
  return pk.startsWith("0x") ? pk : `0x${pk}`;
}

function resolveTreasuryKey() {
  const treasuryPk = normalizePk(process.env.TREASURY_PRIVATE_KEY);
  const deployPk = normalizePk(process.env.PRIVATE_KEY);
  return treasuryPk ?? deployPk;
}

async function ensureAllowance(
  publicClient,
  walletClient,
  token,
  owner,
  spender,
  amount
) {
  const allowance = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, spender],
  });
  if (allowance >= amount) return;
  const hash = await walletClient.writeContract({
    address: token,
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, amount],
  });
  console.log(`approve ${spender.slice(0, 10)}… tx:`, hash);
  await publicClient.waitForTransactionReceipt({ hash });
}

async function readTreasuryVena(publicClient, treasury) {
  return publicClient.readContract({
    address: VENA,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [treasury],
  });
}

async function readPoolStatus(publicClient, mining) {
  if (!mining) return null;
  const [poolBal, started, rps] = await Promise.all([
    publicClient.readContract({
      address: mining,
      abi: miningAbi,
      functionName: "poolBalance",
    }),
    publicClient.readContract({
      address: mining,
      abi: miningAbi,
      functionName: "started",
    }),
    publicClient.readContract({
      address: mining,
      abi: miningAbi,
      functionName: "rewardPerSecond",
    }),
  ]);
  return { poolBal, started, rps };
}

async function runFund(publicClient, walletClient, treasury, mining) {
  const venaBal = await readTreasuryVena(publicClient, treasury);
  if (venaBal < MIN_FUND) {
    console.log(
      "Skip fund — treasury VENA",
      formatUnits(venaBal, 18),
      `< min`,
      formatUnits(MIN_FUND, 18)
    );
    return false;
  }

  console.log("→ Fund pool:", formatUnits(venaBal, 18), "VENA");
  if (dryRun) return true;

  await ensureAllowance(publicClient, walletClient, VENA, treasury, mining, venaBal);
  const hash = await walletClient.writeContract({
    address: mining,
    abi: miningAbi,
    functionName: "fundRewards",
    args: [venaBal],
  });
  console.log("fundRewards tx:", hash);
  await publicClient.waitForTransactionReceipt({ hash });
  return true;
}

async function runBuyback(publicClient, walletClient, treasury, swapable) {
  const virtualQuote = await publicClient.readContract({
    address: UNISWAP_ROUTER,
    abi: routerAbi,
    functionName: "getAmountsOut",
    args: [swapable, [WETH, VIRTUAL]],
  });
  const virtualAmount = virtualQuote[1];
  const venaQuote = await publicClient.readContract({
    address: F_ROUTER,
    abi: fRouterAbi,
    functionName: "getAmountsOut",
    args: [VENA, VIRTUAL, virtualAmount],
  });

  console.log("\n→ Planned buyback:");
  console.log(
    "  1. Uniswap:",
    formatEther(swapable),
    "ETH →",
    formatUnits(virtualAmount, 18),
    "VIRTUAL"
  );
  console.log(
    "  2. Bonding:",
    formatUnits(virtualAmount, 18),
    "VIRTUAL → ~",
    formatUnits(venaQuote, 18),
    "VENA"
  );

  if (dryRun) return true;

  const minVirtualOut = applySlippage(virtualAmount, SLIPPAGE_BPS);
  const swapHash = await walletClient.writeContract({
    address: UNISWAP_ROUTER,
    abi: routerAbi,
    functionName: "swapExactETHForTokens",
    args: [minVirtualOut, [WETH, VIRTUAL], treasury, deadline()],
    value: swapable,
  });
  console.log("swapExactETHForTokens tx:", swapHash);
  await publicClient.waitForTransactionReceipt({ hash: swapHash });

  const virtualBal = await publicClient.readContract({
    address: VIRTUAL,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [treasury],
  });
  console.log("VIRTUAL received:", formatUnits(virtualBal, 18));

  const venaOutQuote = await publicClient.readContract({
    address: F_ROUTER,
    abi: fRouterAbi,
    functionName: "getAmountsOut",
    args: [VENA, VIRTUAL, virtualBal],
  });
  const minVenaOut = applySlippage(venaOutQuote, SLIPPAGE_BPS);

  await ensureAllowance(
    publicClient,
    walletClient,
    VIRTUAL,
    treasury,
    BONDING_PROXY,
    virtualBal
  );
  await ensureAllowance(
    publicClient,
    walletClient,
    VIRTUAL,
    treasury,
    F_ROUTER,
    virtualBal
  );

  const buyHash = await walletClient.writeContract({
    address: BONDING_PROXY,
    abi: bondingBuyAbi,
    functionName: "buy",
    args: [virtualBal, VENA, minVenaOut, deadline()],
  });
  console.log("bonding buy tx:", buyHash);
  await publicClient.waitForTransactionReceipt({ hash: buyHash });

  const venaAfter = await readTreasuryVena(publicClient, treasury);
  console.log("Treasury VENA after buyback:", formatUnits(venaAfter, 18));
  return true;
}

async function runCycle() {
  const pk = resolveTreasuryKey();
  const treasury = process.env.TREASURY?.trim();
  const mining = (process.env.MINING ?? process.env.NEXT_PUBLIC_STAKING)?.trim();

  if (!pk || !treasury) {
    console.error("Set TREASURY and TREASURY_PRIVATE_KEY (or PRIVATE_KEY) in .env");
    process.exit(1);
  }

  const account = privateKeyToAccount(pk);
  if (account.address.toLowerCase() !== treasury.toLowerCase()) {
    console.error(
      "Treasury key mismatch:",
      account.address,
      "!= TREASURY",
      treasury
    );
    process.exit(1);
  }

  const publicClient = createPublicClient({ chain, transport: http(RH_RPC) });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(RH_RPC),
  });

  const ethBal = await publicClient.getBalance({ address: treasury });
  const swapable =
    ethBal > GAS_RESERVE + MIN_SWAP ? ethBal - GAS_RESERVE : 0n;
  const venaBefore = await readTreasuryVena(publicClient, treasury);
  const pool = await readPoolStatus(publicClient, mining);

  console.log("\n=== VENA Treasury Keeper ===");
  console.log(
    "Mode:",
    dryRun ? "DRY RUN" : "EXECUTE",
    fundOnly ? "+ fund-only" : "",
    buybackOnly ? "+ buyback-only" : "",
    watch ? "+ watch" : ""
  );
  console.log("Treasury:", treasury);
  console.log("Signer:", account.address);
  if (mining) console.log("Mining pool:", mining);
  console.log("ETH:", formatEther(ethBal), "| swapable:", formatEther(swapable));
  console.log("Treasury VENA:", formatUnits(venaBefore, 18));
  if (pool) {
    console.log(
      "Pool VENA:",
      formatUnits(pool.poolBal, 18),
      "| started:",
      pool.started,
      "| reward/s:",
      formatUnits(pool.rps, 18)
    );
  }
  console.log(
    "Thresholds — gas reserve:",
    formatEther(GAS_RESERVE),
    "| min swap:",
    formatEther(MIN_SWAP),
    "| min fund:",
    formatUnits(MIN_FUND, 18),
    "VENA"
  );
  console.log(
    "Slippage:",
    `${(SLIPPAGE_BPS / 100).toFixed(1)}%`,
    `(max ${MAX_SLIPPAGE_BPS / 100}%)`
  );

  if (!mining && !buybackOnly) {
    console.warn("Warning: MINING not set — fund step will be skipped");
  }

  let didSomething = false;

  if (!fundOnly && swapable > 0n) {
    didSomething = (await runBuyback(publicClient, walletClient, treasury, swapable)) || didSomething;
  } else if (!fundOnly && swapable === 0n) {
    console.log(
      "\nSkip buyback — need >=",
      formatEther(GAS_RESERVE + MIN_SWAP),
      "ETH (reserve + min swap)"
    );
  }

  if (!buybackOnly && mining) {
    const funded = await runFund(publicClient, walletClient, treasury, mining);
    didSomething = funded || didSomething;
  }

  if (mining) {
    const poolAfter = await readPoolStatus(publicClient, mining);
    const venaAfter = await readTreasuryVena(publicClient, treasury);
    console.log("\nAfter cycle:");
    console.log("Treasury VENA:", formatUnits(venaAfter, 18));
    if (poolAfter) {
      console.log(
        "Pool VENA:",
        formatUnits(poolAfter.poolBal, 18),
        "| reward/s:",
        formatUnits(poolAfter.rps, 18)
      );
    }
  }

  if (!didSomething && dryRun) {
    console.log("\nNothing to do this cycle (dry-run).");
  } else if (!didSomething) {
    console.log("\nNothing to do this cycle.");
  } else {
    console.log("\nCycle complete.");
  }

  return didSomething;
}

async function main() {
  if (watch && dryRun) {
    console.error("--watch requires --execute");
    process.exit(1);
  }

  if (watch) {
    console.log(`Watch mode — interval ${WATCH_MS / 60_000} min`);
    for (;;) {
      try {
        await runCycle();
      } catch (err) {
        console.error("Cycle error:", err.message ?? err);
      }
      console.log(`\nSleeping ${WATCH_MS / 60_000} min…\n`);
      await new Promise((r) => setTimeout(r, WATCH_MS));
    }
  }

  await runCycle();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
