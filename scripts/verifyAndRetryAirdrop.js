import { ethers } from "ethers";
import fs from "fs";
import * as dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.RH_MAINNET_RPC || "https://rpc.mainnet.chain.robinhood.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY; 

const CHEST_ADDRESS = "0xB12C93B2e308AE4d6C1713c97B60F9A0389F3B94";
const CHEST_ABI = [
  "function mintChest(address to, uint256 chestId, uint256 amount) external",
  "function balanceOf(address account, uint256 id) view returns (uint256)"
];

async function processMissingAirdrops(chestContract, filename, chestId, expectedAmount) {
  if (!fs.existsSync(filename)) return;
  const wallets = JSON.parse(fs.readFileSync(filename, "utf8"));
  
  console.log(`\nVerifying ${filename} (Chest ID: ${chestId}, Expected: ${expectedAmount})`);
  let missingWallets = [];

  // Check balances
  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    try {
      const balance = await chestContract.balanceOf(wallet, chestId);
      if (balance < BigInt(expectedAmount)) {
        missingWallets.push(wallet);
      }
    } catch (e) {
      console.error(`Error checking balance for ${wallet}:`, e);
    }
  }

  console.log(`Found ${missingWallets.length} wallets that missed the airdrop in this list.`);

  // Retry sending one by one to avoid batch reverts
  for (let i = 0; i < missingWallets.length; i++) {
    const wallet = missingWallets[i];
    console.log(`Retrying mint to ${wallet} (${i+1}/${missingWallets.length})...`);
    try {
      const tx = await chestContract.mintChest(wallet, chestId, expectedAmount);
      await tx.wait();
      console.log(`  -> Success: ${tx.hash}`);
    } catch (err) {
      console.log(`  -> Skipped: Wallet is likely a Smart Contract without ERC1155 receiver support.`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const ownerWallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const chestContract = new ethers.Contract(CHEST_ADDRESS, CHEST_ABI, ownerWallet);

  console.log(`Scanning for missed airdrops and retrying...`);

  await processMissingAirdrops(chestContract, "airdrop_vena_qty_1.json", 0, 1);
  await processMissingAirdrops(chestContract, "airdrop_vena_qty_2.json", 0, 2);
  await processMissingAirdrops(chestContract, "airdrop_premium_qty_1.json", 1, 1);
  await processMissingAirdrops(chestContract, "airdrop_premium_qty_2.json", 1, 2);

  console.log("\nAll missed airdrops have been processed! 🚀");
}

main().catch(console.error);
