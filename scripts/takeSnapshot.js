import { ethers } from "ethers";
import fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.RH_MAINNET_RPC || "https://rpc.mainnet.chain.robinhood.com";
const VENA_TOKEN_ADDRESS = "0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf";
const PICKAXE_ADDRESS = "0xe250751a2514e0d1267AcBEBF43787aF579b6F4c";
const MINING_ADDRESS = "0x1dDA64bd76165400Ad929D4d94E0D8285288D37B";

const provider = new ethers.JsonRpcProvider(RPC_URL);

// Minimal ABIs
const PICKAXE_ABI = [
  "function totalMinted() view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenTier(uint256 tokenId) view returns (uint8)"
];

const MINING_ABI = [
  "function stakedBy(uint256 tokenId) view returns (address)"
];

async function fetchVenaHolders() {
  console.log("Fetching $VENA token holders from Blockscout API...");
  let holders = [];
  let nextPageParams = null;
  let url = `https://robinhoodchain.blockscout.com/api/v2/tokens/${VENA_TOKEN_ADDRESS}/holders`;

  while (true) {
    let currentUrl = url;
    if (nextPageParams) {
      const params = new URLSearchParams(nextPageParams);
      currentUrl = `${url}?${params.toString()}`;
    }

    try {
      const res = await fetch(currentUrl);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Blockscout returned non-JSON. Might be rate limited. Retrying in 2 seconds...");
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      if (!data.items || data.items.length === 0) break;

      holders = holders.concat(data.items);
      nextPageParams = data.next_page_params;

      if (!nextPageParams) break;
      
      // Delay to avoid rate limits (1.5 seconds)
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.error("Error fetching from Blockscout:", e);
      break;
    }
  }

  // Filter >= 250k and >= 500k
  // 1 VENA = 10^18 wei
  const TIER1_THRESHOLD = BigInt("250000000000000000000000"); // 250,000
  const TIER2_THRESHOLD = BigInt("500000000000000000000000"); // 500,000

  const venaChestWallets = new Set();
  const premiumChestWallets = new Set();

  for (const item of holders) {
    if (!item.address || !item.value) continue;
    const balance = BigInt(item.value);
    const wallet = item.address.hash.toLowerCase();

    if (balance >= TIER2_THRESHOLD) {
      premiumChestWallets.add(wallet);
    } else if (balance >= TIER1_THRESHOLD) {
      venaChestWallets.add(wallet);
    }
  }

  console.log(`Found ${venaChestWallets.size} Vena Chest eligible from tokens.`);
  console.log(`Found ${premiumChestWallets.size} Premium Chest eligible from tokens.`);

  return { venaChestWallets, premiumChestWallets };
}

async function fetchPickaxeHolders() {
  console.log("Scanning VPICK NFTs on-chain...");
  const pickaxe = new ethers.Contract(PICKAXE_ADDRESS, PICKAXE_ABI, provider);
  const mining = new ethers.Contract(MINING_ADDRESS, MINING_ABI, provider);

  let totalSupply = 0;
  try {
    totalSupply = Number(await pickaxe.totalMinted());
  } catch (e) {
    console.error("Failed to fetch totalMinted. Are you sure the RPC is responding?");
    return { venaChestWallets: new Set(), premiumChestWallets: new Set() };
  }

  console.log(`Total VPICK Minted: ${totalSupply}. Scanning...`);

  const venaChestWallets = new Set();
  const premiumChestWallets = new Set();

  // Fetch in batches of 10 to speed up and avoid RPC limits
  const batchSize = 10;
  for (let i = 0; i < totalSupply; i += batchSize) {
    const end = Math.min(i + batchSize, totalSupply);
    const promises = [];
    
    for (let j = i; j < end; j++) {
      promises.push((async (tokenId) => {
        try {
          let owner = (await pickaxe.ownerOf(tokenId)).toLowerCase();
          
          if (owner === MINING_ADDRESS.toLowerCase()) {
            owner = (await mining.stakedBy(tokenId)).toLowerCase();
          }

          const tier = await pickaxe.tokenTier(tokenId);
          if (tier >= 1) { // Gold+
            premiumChestWallets.add(owner);
          } else { // Silver
            venaChestWallets.add(owner);
          }
        } catch (e) {
          // Token might be burned or doesn't exist
        }
      })(j));
    }
    
    await Promise.all(promises);
    console.log(`Processed ${end}/${totalSupply} NFTs...`);
    await new Promise(r => setTimeout(r, 200)); // Small delay between batches
  }

  console.log(`Found ${venaChestWallets.size} Vena Chest eligible from NFTs.`);
  console.log(`Found ${premiumChestWallets.size} Premium Chest eligible from NFTs.`);

  return { venaChestWallets, premiumChestWallets };
}

async function main() {
  console.log("=== Starting VenaLand Snapshot ===");
  
  const currentBlock = await provider.getBlockNumber();
  console.log(`📌 SNAPSHOT BLOCK NUMBER: ${currentBlock}`);
  
  const tokenSnapshot = await fetchVenaHolders();
  const nftSnapshot = await fetchPickaxeHolders();

  // We want to count how many of each chest a user gets.
  // A user can get max 1 from token and max 1 from NFT (Total 2 max per chest type).
  const chestCounts = {}; // wallet -> { vena: 0, premium: 0 }

  function addChest(wallet, type) {
    if (!chestCounts[wallet]) chestCounts[wallet] = { vena: 0, premium: 0 };
    chestCounts[wallet][type] += 1;
  }

  // Add from Token
  for (const wallet of tokenSnapshot.venaChestWallets) addChest(wallet, 'vena');
  for (const wallet of tokenSnapshot.premiumChestWallets) addChest(wallet, 'premium');

  // Add from NFT
  for (const wallet of nftSnapshot.venaChestWallets) addChest(wallet, 'vena');
  for (const wallet of nftSnapshot.premiumChestWallets) addChest(wallet, 'premium');

  // Group by quantity for gas-efficient airdrop calls
  const vena1 = [];
  const vena2 = [];
  const premium1 = [];
  const premium2 = [];

  for (const [wallet, counts] of Object.entries(chestCounts)) {
    if (counts.vena === 1) vena1.push(wallet);
    if (counts.vena === 2) vena2.push(wallet);
    if (counts.premium === 1) premium1.push(wallet);
    if (counts.premium === 2) premium2.push(wallet);
  }

  console.log("\n=== Final Snapshot Results ===");
  console.log(`🎁 Vena Chest (Qty 1) Wallets: ${vena1.length}`);
  console.log(`🎁🎁 Vena Chest (Qty 2) Wallets: ${vena2.length}`);
  console.log(`💎 Premium Chest (Qty 1) Wallets: ${premium1.length}`);
  console.log(`💎💎 Premium Chest (Qty 2) Wallets: ${premium2.length}`);

  // Save to JSON
  if (vena1.length > 0) fs.writeFileSync("airdrop_vena_qty_1.json", JSON.stringify(vena1, null, 2));
  if (vena2.length > 0) fs.writeFileSync("airdrop_vena_qty_2.json", JSON.stringify(vena2, null, 2));
  if (premium1.length > 0) fs.writeFileSync("airdrop_premium_qty_1.json", JSON.stringify(premium1, null, 2));
  if (premium2.length > 0) fs.writeFileSync("airdrop_premium_qty_2.json", JSON.stringify(premium2, null, 2));

  console.log("\n✅ Lists saved successfully grouped by quantity!");
}

main().catch(console.error);
