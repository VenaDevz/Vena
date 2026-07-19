import { NextResponse } from "next/server";
import { ethers } from "ethers";

export const dynamic = "force-dynamic";

// Minimal ERC20 ABI to call transfer()
const erc20Abi = [
  "function transfer(address to, uint256 amount) returns (bool)"
];

const VENA_CONTRACT_ADDRESS = "0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf";
const RPC_URL = process.env.RH_MAINNET_RPC || "https://rpc.mainnet.chain.robinhood.com";

export async function POST(req: Request) {
  try {
    const { address, amount } = await req.json();

    if (!address) {
      return NextResponse.json({ success: false, error: "Missing address" }, { status: 400 });
    }

    // Security Check: Only allow exact amounts from the Loot Table
    if (amount !== 1000 && amount !== 10000) {
      console.error(`Suspicious payload: amount ${amount} is not valid.`);
      return NextResponse.json({ success: false, error: "Invalid reward amount" }, { status: 400 });
    }

    const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;
    if (!TREASURY_PRIVATE_KEY) {
      console.error("CRITICAL ERROR: TREASURY_PRIVATE_KEY is not set in environment variables!");
      return NextResponse.json({ success: false, error: "Server Configuration Error: Treasury key missing." }, { status: 500 });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(TREASURY_PRIVATE_KEY, provider);
    const venaContract = new ethers.Contract(VENA_CONTRACT_ADDRESS, erc20Abi, wallet);

    // Convert VENA amount to Wei (18 decimals)
    const amountInWei = ethers.parseUnits(amount.toString(), 18);

    console.log(`[Decryptor Payout] Sending ${amount} VENA to ${address}...`);
    
    // Call transfer(address, amount)
    const tx = await venaContract.transfer(address, amountInWei);
    
    // Wait for the transaction to be mined for finality
    const receipt = await tx.wait();
    
    if (receipt.status !== 1) {
      console.error("[Decryptor Payout] Transaction failed on chain", tx.hash);
      return NextResponse.json({ success: false, error: "Transaction failed on the blockchain." }, { status: 400 });
    }

    console.log(`[Decryptor Payout] Success! TxHash: ${tx.hash}`);

    return NextResponse.json({ 
      success: true, 
      txHash: tx.hash 
    });

  } catch (error: any) {
    console.error("[Decryptor Payout] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
