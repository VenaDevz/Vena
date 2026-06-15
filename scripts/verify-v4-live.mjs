#!/usr/bin/env node

import {
  createPublicClient,
  decodeEventLog,
  fallback,
  getAddress,
  http,
  parseAbi,
  parseAbiItem,
  toEventSelector,
} from "viem";
import { base } from "viem/chains";
import fs from "node:fs";
import path from "node:path";

function loadDotEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requiredEnv(name, options = {}) {
  const { fallbackKeys = [], defaultValue } = options;
  const value = process.env[name] ?? fallbackKeys.map((k) => process.env[k]).find(Boolean) ?? defaultValue;
  if (!value) {
    throw new Error(`Missing env: ${name}`);
  }
  return value;
}

function assertEq(label, actual, expected) {
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`${label} mismatch. expected=${expected} actual=${actual}`);
  }
  console.log(`OK ${label}: ${actual}`);
}

async function main() {
  loadDotEnvLocal();

  const rpcUrl = process.env.RPC_URL;
  const hook = getAddress(requiredEnv("HOOK_ADDRESS", { fallbackKeys: ["NEXT_PUBLIC_HOOK_ADDRESS"] }));
  const router = getAddress(requiredEnv("SWAP_ROUTER", { fallbackKeys: ["NEXT_PUBLIC_SWAP_ROUTER"] }));
  const pickaxe = getAddress(requiredEnv("PICKAXE_NFT", { fallbackKeys: ["NEXT_PUBLIC_PICKAXE_NFT"] }));
  const mining = getAddress(requiredEnv("VENA_MINING", { fallbackKeys: ["NEXT_PUBLIC_VENA_MINING"] }));
  const vena = getAddress(requiredEnv("VENA_TOKEN", { fallbackKeys: ["NEXT_PUBLIC_VENA_TOKEN"] }));
  const poolManager = getAddress(
    requiredEnv("POOL_MANAGER", { defaultValue: "0x498581fF718922c3f8e6A244956aF099B2652b2b" })
  );
  const txHash = process.env.TX_HASH;
  const requireNftMint = process.env.REQUIRE_NFT_MINT === "1";
  const requireNftBurn = process.env.REQUIRE_NFT_BURN === "1";
  const expectedMintCount = process.env.EXPECTED_MINT_COUNT
    ? Number(process.env.EXPECTED_MINT_COUNT)
    : null;
  const expectedMintTier = process.env.EXPECTED_MINT_TIER
    ? Number(process.env.EXPECTED_MINT_TIER)
    : null;
  const expectedBurnCount = process.env.EXPECTED_BURN_COUNT
    ? Number(process.env.EXPECTED_BURN_COUNT)
    : null;
  const expectedBurnMin = process.env.EXPECTED_BURN_MIN
    ? Number(process.env.EXPECTED_BURN_MIN)
    : null;
  const swapper = process.env.SWAPPER;

  if (txHash && !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new Error("TX_HASH must be a 32-byte hex hash");
  }

  const transports = rpcUrl
    ? [http(rpcUrl)]
    : [http("https://mainnet.base.org"), http("https://base-rpc.publicnode.com")];
  const client = createPublicClient({ chain: base, transport: fallback(transports) });

  const routerCode = await client.getBytecode({ address: router });
  if (!routerCode || routerCode === "0x") {
    throw new Error(`SWAP_ROUTER is not a contract: ${router}`);
  }
  console.log(`OK router contract deployed: ${router}`);

  const routerAbi = parseAbi([
    "function hookAddress() view returns (address)",
    "function venaToken() view returns (address)",
    "function poolManager() view returns (address)",
    "function tickSpacing() view returns (int24)",
  ]);
  const pickaxeAbi = parseAbi(["function feeHook() view returns (address)"]);
  const miningAbi = parseAbi(["function venaHook() view returns (address)"]);

  const [routerHook, routerVena, routerPm, tickSpacing, pickaxeHook, miningHook] =
    await Promise.all([
      client.readContract({ address: router, abi: routerAbi, functionName: "hookAddress" }),
      client.readContract({ address: router, abi: routerAbi, functionName: "venaToken" }),
      client.readContract({ address: router, abi: routerAbi, functionName: "poolManager" }),
      client.readContract({ address: router, abi: routerAbi, functionName: "tickSpacing" }),
      client.readContract({ address: pickaxe, abi: pickaxeAbi, functionName: "feeHook" }),
      client.readContract({ address: mining, abi: miningAbi, functionName: "venaHook" }),
    ]);

  assertEq("router.hookAddress", routerHook, hook);
  assertEq("router.venaToken", routerVena, vena);
  assertEq("router.poolManager", routerPm, poolManager);
  if (Number(tickSpacing) !== 1) {
    throw new Error(`router.tickSpacing mismatch. expected=1 actual=${tickSpacing}`);
  }
  console.log("OK router.tickSpacing: 1");

  assertEq("pickaxe.feeHook", pickaxeHook, hook);
  assertEq("mining.venaHook", miningHook, hook);

  if (!txHash) {
    console.log("No TX_HASH provided. Wiring checks finished.");
    return;
  }

  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error(`TX failed: ${txHash}`);
  }
  console.log(`OK tx success: ${txHash}`);

  const swapFeeCollectedTopic = toEventSelector(
    parseAbiItem(
      "event SwapFeeCollected(bool indexed isEth, uint256 totalFee, uint256 holderShare, uint256 treasuryShare)"
    )
  );
  const erc721TransferTopic = toEventSelector(
    parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)")
  );
  const pickaxesBurnedTopic = toEventSelector(
    parseAbiItem("event PickaxesBurned(address indexed user, uint256 count)")
  );
  const pickaxesMintedTopic = toEventSelector(
    parseAbiItem("event PickaxesMinted(address indexed user, uint256 count, uint8 tier)")
  );
  const hookReadAbi = parseAbi([
    "function sellRemainderWei(address user) view returns (uint256)",
  ]);

  const hookLogs = receipt.logs.filter((l) => l.address.toLowerCase() === hook.toLowerCase());
  if (hookLogs.length === 0) {
    throw new Error(`No hook logs found in tx ${txHash}`);
  }
  console.log(`OK hook logs present: ${hookLogs.length}`);

  const feeLogs = hookLogs.filter((l) => l.topics[0] === swapFeeCollectedTopic);
  if (feeLogs.length === 0) {
    throw new Error(`No SwapFeeCollected event in tx ${txHash}`);
  }
  console.log("OK SwapFeeCollected emitted");

  const nftLogs = receipt.logs.filter(
    (l) =>
      l.address.toLowerCase() === pickaxe.toLowerCase() &&
      l.topics[0] === erc721TransferTopic &&
      l.topics.length === 4
  );
  const mintedLogs = nftLogs.filter((l) => BigInt(l.topics[1]) === 0n);
  console.log(`Info Pickaxe transfer logs in tx: ${nftLogs.length}`);
  console.log(`Info Pickaxe mint logs in tx: ${mintedLogs.length}`);
  if (requireNftMint && mintedLogs.length === 0) {
    throw new Error(`Expected at least 1 Pickaxe mint log in tx ${txHash}`);
  }
  if (requireNftMint) {
    console.log("OK Pickaxe mint emitted");
  }

  const burnedAbiItem = parseAbiItem("event PickaxesBurned(address indexed user, uint256 count)");
  const mintedAbiItem = parseAbiItem(
    "event PickaxesMinted(address indexed user, uint256 count, uint8 tier)"
  );

  const burnedHookLogs = hookLogs.filter((l) => l.topics[0] === pickaxesBurnedTopic);
  let totalBurned = 0;
  for (const log of burnedHookLogs) {
    const decoded = decodeEventLog({ abi: [burnedAbiItem], data: log.data, topics: log.topics });
    const count = Number(decoded.args.count);
    totalBurned += count;
    console.log(`Info PickaxesBurned: user=${decoded.args.user} count=${count}`);
  }

  const mintedHookLogs = hookLogs.filter((l) => l.topics[0] === pickaxesMintedTopic);
  let totalMinted = 0;
  for (const log of mintedHookLogs) {
    const decoded = decodeEventLog({ abi: [mintedAbiItem], data: log.data, topics: log.topics });
    const count = Number(decoded.args.count);
    totalMinted += count;
    console.log(
      `Info PickaxesMinted: user=${decoded.args.user} count=${decoded.args.count} tier=${decoded.args.tier}`
    );
  }

  if (expectedMintCount !== null && !Number.isNaN(expectedMintCount)) {
    if (totalMinted !== expectedMintCount) {
      throw new Error(
        `Mint count mismatch. expected=${expectedMintCount} actual=${totalMinted}`
      );
    }
    console.log(`OK mint count matches EXPECTED_MINT_COUNT=${expectedMintCount}`);
  }

  if (expectedMintTier !== null && !Number.isNaN(expectedMintTier)) {
    for (const log of mintedHookLogs) {
      const decoded = decodeEventLog({ abi: [mintedAbiItem], data: log.data, topics: log.topics });
      const tier = Number(decoded.args.tier);
      if (tier !== expectedMintTier) {
        throw new Error(
          `Mint tier mismatch. expected=${expectedMintTier} actual=${tier} (0=Silver)`
        );
      }
    }
    if (mintedHookLogs.length > 0) {
      console.log(`OK all mint tiers are EXPECTED_MINT_TIER=${expectedMintTier} (0=Silver)`);
    }
  }

  if (requireNftBurn && totalBurned === 0) {
    throw new Error(`Expected PickaxesBurned in tx ${txHash}`);
  }
  if (requireNftBurn) {
    console.log(`OK Pickaxe burn emitted (total=${totalBurned})`);
  }

  if (expectedBurnCount !== null && !Number.isNaN(expectedBurnCount)) {
    if (totalBurned !== expectedBurnCount) {
      throw new Error(
        `Burn count mismatch. expected=${expectedBurnCount} actual=${totalBurned}`
      );
    }
    console.log(`OK burn count matches EXPECTED_BURN_COUNT=${expectedBurnCount}`);
  }

  if (expectedBurnMin !== null && !Number.isNaN(expectedBurnMin)) {
    if (totalBurned < expectedBurnMin) {
      throw new Error(
        `Burn count below minimum. min=${expectedBurnMin} actual=${totalBurned}`
      );
    }
    console.log(`OK burn count >= EXPECTED_BURN_MIN=${expectedBurnMin}`);
  }

  if (swapper) {
    const remainder = await client.readContract({
      address: hook,
      abi: hookReadAbi,
      functionName: "sellRemainderWei",
      args: [getAddress(swapper)],
    });
    console.log(
      `Info sellRemainderWei(${swapper})=${remainder.toString()} wei (${Number(remainder) / 1e18} VENA)`
    );
  }
}

main().catch((err) => {
  console.error(`FAIL ${err.message ?? err}`);
  process.exit(1);
});
