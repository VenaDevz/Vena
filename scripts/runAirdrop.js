import { ethers } from "ethers";
import fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.RH_MAINNET_RPC || "https://rpc.mainnet.chain.robinhood.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY; 

const CHEST_ADDRESS = "0xB12C93B2e308AE4d6C1713c97B60F9A0389F3B94";
const CHEST_ABI = [
  "function airdropChests(address[] calldata recipients, uint256 chestId, uint256 amountPerRecipient) external"
];

async function processAirdrop(chestContract, filename, chestId, amount) {
  if (!fs.existsSync(filename)) {
    console.log(`File ${filename} not found, skipping...`);
    return;
  }
  
  const fileData = JSON.parse(fs.readFileSync(filename, "utf8"));
  const wallets = fileData; // or fileData.wallets depending on snapshot script
  if (!wallets || wallets.length === 0) {
    console.log(`No wallets in ${filename}, skipping...`);
    return;
  }

  console.log(`Starting airdrop for ${filename} -> Chest ID: ${chestId}, Qty: ${amount}`);
  const batchSize = 50;

  for (let i = 0; i < wallets.length; i += batchSize) {
    const batch = wallets.slice(i, i + batchSize);
    console.log(`Sending batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(wallets.length/batchSize)} (${batch.length} wallets)...`);
    
    try {
      const tx = await chestContract.airdropChests(batch, chestId, amount);
      await tx.wait();
      console.log(`Batch successful! Tx Hash: ${tx.hash}`);
    } catch (e) {
      console.error(`Batch failed (likely invalid receiver). Falling back to individual mints for this batch...`);
      for (const wallet of batch) {
        try {
          const tx = await chestContract.mintChest(wallet, chestId, amount);
          await tx.wait();
          console.log(`  -> Sent to ${wallet}`);
        } catch (err) {
          console.error(`  -> Failed to send to ${wallet}: ${err.shortMessage || "Invalid Receiver"}`);
        }
      }
    }
    
    // Tiny delay to avoid nonce issues or rate limits
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const ownerWallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const chestContract = new ethers.Contract(CHEST_ADDRESS, CHEST_ABI, ownerWallet);

  console.log(`Initiating Airdrop from Owner Wallet: ${ownerWallet.address}`);

  await processAirdrop(chestContract, "airdrop_vena_qty_1.json", 0, 1);
  await processAirdrop(chestContract, "airdrop_vena_qty_2.json", 0, 2);
  await processAirdrop(chestContract, "airdrop_premium_qty_1.json", 1, 1);
  await processAirdrop(chestContract, "airdrop_premium_qty_2.json", 1, 2);

  console.log("Airdrop completely finished! 🪂🚀");
}

main().catch(console.error);
