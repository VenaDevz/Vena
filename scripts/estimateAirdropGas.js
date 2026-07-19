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

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const ownerWallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const chestContract = new ethers.Contract(CHEST_ADDRESS, CHEST_ABI, ownerWallet);

  // Load a subset of addresses to test gas
  const allWallets = JSON.parse(fs.readFileSync("airdrop_vena_qty_1.json", "utf8"));
  const batchSize = 50;
  const testBatch = allWallets.slice(0, batchSize);

  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || (await provider.getBlock("latest")).baseFeePerGas;

    console.log(`Current Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

    const estimatedGas = await chestContract.airdropChests.estimateGas(testBatch, 0, 1);
    console.log(`Estimated gas limit for ${batchSize} wallets: ${estimatedGas}`);
    
    const costForBatch = estimatedGas * gasPrice;
    console.log(`Cost for batch of ${batchSize}: ${ethers.formatEther(costForBatch)} native token`);

    const totalWallets = 287 + 5 + 339 + 1; // 632
    const totalBatches = Math.ceil(totalWallets / batchSize);
    
    // Extrapolate
    const totalGasEstimated = estimatedGas * BigInt(totalBatches);
    const totalCost = totalGasEstimated * gasPrice;

    console.log(`Total Wallets: ${totalWallets}`);
    console.log(`Total Batches (50 per batch): ${totalBatches}`);
    console.log(`Estimated TOTAL Airdrop Cost: ${ethers.formatEther(totalCost)} native token`);
    
  } catch (e) {
    console.error("Error estimating gas:", e);
  }
}

main().catch(console.error);
