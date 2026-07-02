#!/usr/bin/env node
/**
 * Upload VPICK tier metadata JSON to Pinata, then print setMetadataURI commands.
 *
 * Requires in .env:
 *   PINATA_JWT=eyJ...
 *
 * Usage:
 *   node scripts/pinata-upload-metadata.js
 *   node scripts/pinata-upload-metadata.js --set-on-chain
 */

const fs = require("fs");
const path = require("path");

const NFT = process.env.PICKAXE_NFT ?? "0xe250751a2514e0d1267AcBEBF43787aF579b6F4c";
const RPC = process.env.RH_RPC ?? "https://rpc.mainnet.chain.robinhood.com";

const TIERS = [
  { index: 0, file: "silver.json", label: "Silver" },
  { index: 1, file: "gold.json", label: "Gold" },
  { index: 2, file: "platinum.json", label: "Platinum" },
  { index: 3, file: "diamond.json", label: "Diamond" },
  { index: 4, file: "emerald.json", label: "Emerald" },
];

const META_DIR = path.join(__dirname, "..", "metadata", "robinhood");

async function pinJson(name, content) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT missing in .env");

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: content,
      pinataMetadata: { name },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pinata ${name}: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.IpfsHash;
}

async function setOnChain(tierIndex, uri) {
  const { execSync } = require("child_process");
  if (!process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY missing for --set-on-chain");
  }
  execSync(
    `cast send ${NFT} "setMetadataURI(uint8,string)" ${tierIndex} "${uri}" --rpc-url ${RPC} --private-key ${process.env.PRIVATE_KEY}`,
    { stdio: "inherit", env: process.env }
  );
}

async function main() {
  const setOnChainFlag = process.argv.includes("--set-on-chain");
  const results = [];

  for (const tier of TIERS) {
    const filePath = path.join(META_DIR, tier.file);
    const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
    console.log(`Uploading ${tier.label}…`);
    const cid = await pinJson(tier.file, content);
    const uri = `ipfs://${cid}`;
    results.push({ ...tier, cid, uri });
    console.log(`  ${tier.label}: ${uri}`);
    console.log(`  gateway: https://gateway.pinata.cloud/ipfs/${cid}\n`);
  }

  console.log("=== setMetadataURI commands ===\n");
  for (const r of results) {
    console.log(
      `cast send ${NFT} "setMetadataURI(uint8,string)" ${r.index} "${r.uri}" --rpc-url ${RPC}`
    );
  }

  if (setOnChainFlag) {
    console.log("\n=== Writing on-chain ===\n");
    for (const r of results) {
      console.log(`Tier ${r.index} (${r.label})…`);
      await setOnChain(r.index, r.uri);
    }
    console.log("\nDone. Verify: cast call", NFT, '"tokenURI(uint256)(string)" 0 --rpc-url', RPC);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
