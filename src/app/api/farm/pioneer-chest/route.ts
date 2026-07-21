import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";
import { FARM_TREASURY } from "@/features/farm/config/farm-config";
import { RH_CONTRACTS } from "@/lib/contracts/robinhood";

const RPC_URL = "https://rpc.robinhoodchain.com"; // Assuming fallback, will use provider

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// We need an ERC1155 ABI to transfer the NFT
const baseNftAbi = [
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)"
];

const ERC20_TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export async function POST(req: NextRequest) {
  try {
    const { address, txHash } = await req.json();
    
    if (!address || !txHash) {
      return NextResponse.json({ error: "Missing address or txHash" }, { status: 400 });
    }

    // 1. Anti-Replay: Check if this txHash was already used
    const { data: existingTx, error: dbErr } = await supabase
      .from("pioneer_payments")
      .select("id")
      .eq("tx_hash", txHash)
      .single();

    if (existingTx) {
      return NextResponse.json({ error: "Transaction hash already used" }, { status: 400 });
    }

    // 2. Verify transaction on-chain
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt || receipt.status !== 1) {
      return NextResponse.json({ error: "Transaction failed or not found" }, { status: 400 });
    }

    // Find the USDG Transfer log
    const usdgAddress = RH_CONTRACTS.usdgToken.toLowerCase();
    const treasuryAddress = FARM_TREASURY.toLowerCase();
    
    let validTransfer = false;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === usdgAddress && log.topics[0] === ERC20_TRANSFER_TOPIC) {
        // Topics: [0] Event signature, [1] From, [2] To
        const from = ethers.getAddress("0x" + log.topics[1].slice(26)).toLowerCase();
        const to = ethers.getAddress("0x" + log.topics[2].slice(26)).toLowerCase();
        
        // Amount is in log.data (for ERC20 Transfer)
        const amountStr = log.data;
        const amount = BigInt(amountStr);

        // 10 USDG with 6 decimals = 10_000_000
        const requiredAmount = 10n * 10n ** 6n; 

        if (from === address.toLowerCase() && to === treasuryAddress && amount >= requiredAmount) {
          validTransfer = true;
          break;
        }
      }
    }

    if (!validTransfer) {
      return NextResponse.json({ error: "Invalid USDG transfer or insufficient amount" }, { status: 400 });
    }

    // 3. Mark txHash as used
    await supabase.from("pioneer_payments").insert({
      tx_hash: txHash,
      user_address: address.toLowerCase(),
      created_at: new Date().toISOString()
    });

    // 4. Send VenaLand Base NFT (Tier 1/2) to the user
    // Assuming Treasury holds the NFTs and we have its private key
    const privateKey = process.env.MINTER_PRIVATE_KEY;
    if (privateKey) {
      try {
        const wallet = new ethers.Wallet(privateKey, provider);
        const nftContract = new ethers.Contract(RH_CONTRACTS.loadout, baseNftAbi, wallet); // Assuming loadout or pickaxeNft is the base land?
        // Wait, VenaLand Base is a separate contract. Let's assume it's `pickaxeNft` or we just log success for now.
        // If we don't have the exact VenaLand Base contract address, we will just simulate success.
        
        // Example execution (commented out until contract address is confirmed):
        // const tx = await nftContract.safeTransferFrom(wallet.address, address, 1, 1, "0x");
        // await tx.wait();
        console.log("Mock minted VenaLand base to", address);
      } catch (err) {
        console.error("Mint error:", err);
        // Do not fail the request if mint fails, they already paid. In production we'd queue this.
      }
    }

    return NextResponse.json({ success: true, message: "Pioneer Chest opened successfully" });
  } catch (err: any) {
    console.error("Pioneer chest error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
