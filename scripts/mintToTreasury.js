import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const RPC_URL = process.env.RH_MAINNET_RPC || "https://rpc.mainnet.chain.robinhood.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY; // Owner of the contract
const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;

const CHEST_ADDRESS = "0xB12C93B2e308AE4d6C1713c97B60F9A0389F3B94";
const CHEST_ABI = [
  "function mintChest(address to, uint256 chestId, uint256 amount) external"
];

async function main() {
  if (!PRIVATE_KEY || !TREASURY_PRIVATE_KEY) {
    console.error("Missing PRIVATE_KEY or TREASURY_PRIVATE_KEY in .env");
    return;
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const ownerWallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const treasuryWallet = new ethers.Wallet(TREASURY_PRIVATE_KEY);
  const treasuryAddress = treasuryWallet.address;

  console.log(`Treasury Address: ${treasuryAddress}`);
  console.log(`Owner Address: ${ownerWallet.address}`);
  console.log(`Minting to Treasury...`);

  const chestContract = new ethers.Contract(CHEST_ADDRESS, CHEST_ABI, ownerWallet);

  try {
    // STANDARD_CHEST = 0
    console.log("Minting 1 Standard Chest (ID: 0)...");
    const tx1 = await chestContract.mintChest(treasuryAddress, 0, 1);
    await tx1.wait();
    console.log(`Success! Tx Hash: ${tx1.hash}`);

    // PREMIUM_CHEST = 1
    console.log("Minting 1 Premium Chest (ID: 1)...");
    const tx2 = await chestContract.mintChest(treasuryAddress, 1, 1);
    await tx2.wait();
    console.log(`Success! Tx Hash: ${tx2.hash}`);

    console.log("Minting completed successfully.");
  } catch (e) {
    console.error("Error minting:", e);
  }
}

main().catch(console.error);
