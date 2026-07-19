#!/usr/bin/env node
/**
 * Computes VenaPrismHook seed() args + pool ID for Base mainnet.
 *
 * Usage:
 *   node scripts/prism-seed-params.js
 *   PRIVATE_KEY=0x... node scripts/prism-seed-params.js --send
 */

const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const { ethers } = require("ethers");
const { TickMath } = require("@uniswap/v3-sdk");
const JSBI = require("jsbi").default || require("jsbi");

const ROOT = join(__dirname, "..");
const HOOK = process.env.HOOK_ADDRESS ?? "0x7A7388D230695A1799F9e044f88ec178C5a04040";
const RPC = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
const V4_POOL_ID =
  "0x69dcdab302d501d55863810b6039498b09308c8e81f698b58824eb08b5ac13b4";
const STATE_VIEW = "0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71";
const DEFAULT_VENA_LP = process.env.VENA_LP_AMOUNT ?? "5000000000000000000000"; // 5k VENA
const SUPPLY = JSBI.BigInt(DEFAULT_VENA_LP);
const Q96 = JSBI.exponentiate(JSBI.BigInt(2), JSBI.BigInt(96));

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function poolIdForHook(hook) {
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "uint24", "int24", "address"],
      [ethers.ZeroAddress, hook, 10_000, 200, hook]
    )
  );
}

function venaOnlyBandParams(tickLower, tickUpper) {
  const sqrtUpper = TickMath.getSqrtRatioAtTick(tickUpper);
  const sqrtLower = TickMath.getSqrtRatioAtTick(tickLower);
  const liquidity = JSBI.divide(
    JSBI.multiply(SUPPLY, Q96),
    JSBI.subtract(sqrtUpper, sqrtLower)
  );
  return {
    sqrtPriceX96: sqrtUpper.toString(),
    tickLower,
    tickUpper,
    liquidity: liquidity.toString(),
  };
}

async function readV4Price(provider) {
  const sv = new ethers.Contract(
    STATE_VIEW,
    ["function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)"],
    provider
  );
  const [, tick] = await sv.getSlot0(V4_POOL_ID);
  return Number(tick);
}

async function main() {
  const env = loadEnvLocal();
  const hook = env.HOOK_ADDRESS ?? HOOK;
  const provider = new ethers.JsonRpcProvider(RPC);

  const hookContract = new ethers.Contract(
    hook,
    ["function seeded() view returns (bool)"],
    provider
  );
  if (await hookContract.seeded()) {
    console.log("Hook already seeded.");
    process.exit(0);
  }

  const v4Tick = await readV4Price(provider);
  const tickUpper = Math.ceil(v4Tick / 200) * 200;
  const tickLower = tickUpper - 4400;
  const params = venaOnlyBandParams(tickLower, tickUpper);
  const poolId = poolIdForHook(hook);

  console.log("═══════════════════════════════════════════════════════════");
  console.log(" VenaPrismHook seed() — Remix (owner wallet)");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("Hook:     ", hook);
  console.log("Pool ID:  ", poolId);
  console.log("v4 ref tick:", v4Tick);
  console.log("");
  console.log("Remix → At Address hook → seed(uint160,int24,int24,uint128):");
  console.log("");
  console.log("  sqrtPriceX96:", params.sqrtPriceX96);
  console.log("  tickLower:   ", params.tickLower);
  console.log("  tickUpper:   ", params.tickUpper);
  console.log("  liquidity:   ", params.liquidity);
  console.log("");
  console.log("After seed: swap ~0.1–0.5 ETH → VENA on Uniswap (ETH side for sells).");
  console.log("═══════════════════════════════════════════════════════════");

  if (process.argv.includes("--send")) {
    const pk = process.env.PRIVATE_KEY ?? env.PRIVATE_KEY;
    if (!pk) {
      console.error("Missing PRIVATE_KEY for --send");
      process.exit(1);
    }
    const wallet = new ethers.Wallet(pk, provider);
    const seedHook = new ethers.Contract(
      hook,
      ["function seed(uint160,int24,int24,uint128) external returns (uint256)"],
      wallet
    );
    console.log("Sending seed() from", wallet.address);
    const tx = await seedHook.seed(
      params.sqrtPriceX96,
      params.tickLower,
      params.tickUpper,
      params.liquidity
    );
    console.log("tx:", tx.hash);
    const rc = await tx.wait();
    console.log("mined block", rc.blockNumber);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
