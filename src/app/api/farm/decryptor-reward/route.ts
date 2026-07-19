import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Supabase setup
const SUPABASE_URL = process.env.SUPABASE_URL || "https://dummy.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const VENA_CONTRACT_ADDRESS = "0xFbD1Bf9d354CD8197Ab54f80778C03cc468ADAaf";
const FARM_TREASURY = process.env.TREASURY || process.env.NEXT_PUBLIC_TREASURY || "0x52c965483B19FBeF104B5490Ec65aD4c6ae76AD3";
const RPC_URL = process.env.RH_MAINNET_RPC || "https://rpc.mainnet.chain.robinhood.com";

const erc20Abi = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

const LOOT_TABLE = [
  { id: 1, chance: 35, type: "crystal", amount: 50000, name: "50K Crystal", image: "/farm/items/crystal.png", color: "text-[#00ff88]", bg: "bg-[#00ff88]/20" },
  { id: 2, chance: 20, type: "ore", amount: 25000, name: "25K Ore", image: "/farm/items/ore.png", color: "text-orange-300", bg: "bg-orange-500/20" },
  { id: 3, chance: 15, type: "iron", amount: 10000, name: "10K Iron", image: "/farm/items/iron.png", color: "text-slate-300", bg: "bg-slate-500/20" },
  { id: 4, chance: 10, type: "gold", amount: 2500, name: "2.5K Gold", image: "/farm/items/gold.png", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  { id: 5, chance: 18, type: "vena", amount: 1000, name: "1,000 $VENA", image: "/farm/items/vena-token.png", color: "text-[#00d4ff]", bg: "bg-[#00d4ff]/20" },
  { id: 6, chance: 1, type: "vena", amount: 10000, name: "10,000 $VENA", image: "/farm/items/vena-token.png", color: "text-[#c084fc]", bg: "bg-purple-500/20" },
  { id: 7, chance: 1, type: "core", amount: 1, name: "Power Core", image: "/farm/items/power_core.png", color: "text-red-400", bg: "bg-red-500/20" },
];

function generateReward() {
  const roll = Math.random() * 100;
  let cum = 0;
  for (const loot of LOOT_TABLE) {
    cum += loot.chance;
    if (roll <= cum) return loot;
  }
  return LOOT_TABLE[0];
}

export async function POST(req: Request) {
  try {
    const { address, isPaid, payTxHash } = await req.json();

    if (!address) {
      return NextResponse.json({ success: false, error: "Missing address" }, { status: 400 });
    }

    if (isPaid) {
      if (!payTxHash) return NextResponse.json({ success: false, error: "Missing payTxHash for paid spin" }, { status: 400 });

      // Anti-Replay Check
      const { data: existingTx } = await supabase
        .from("decryptor_payments")
        .select("tx_hash")
        .eq("tx_hash", payTxHash)
        .single();
        
      if (existingTx) {
        return NextResponse.json({ success: false, error: "Transaction already used for a spin" }, { status: 400 });
      }

      // Verify Transaction
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const receipt = await provider.getTransactionReceipt(payTxHash);
      if (!receipt || receipt.status !== 1) {
        return NextResponse.json({ success: false, error: "Payment transaction not found or failed" }, { status: 400 });
      }

      // Check Transfer logs for 5,000 VENA to Treasury
      const iface = new ethers.Interface(erc20Abi);
      let validPayment = false;
      const expectedAmount = ethers.parseUnits("5000", 18);
      
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === VENA_CONTRACT_ADDRESS.toLowerCase()) {
          try {
            const parsed = iface.parseLog(log as any);
            if (
              parsed?.name === "Transfer" &&
              parsed.args[1].toLowerCase() === FARM_TREASURY.toLowerCase() &&
              parsed.args[2] >= expectedAmount
            ) {
              validPayment = true;
              break;
            }
          } catch (e) { /* ignore parse errors */ }
        }
      }

      if (!validPayment) {
        return NextResponse.json({ success: false, error: "Invalid payment: No 5000 VENA transfer to Treasury found" }, { status: 400 });
      }

      // Mark as used
      await supabase.from("decryptor_payments").insert({ tx_hash: payTxHash, wallet_address: address });
      
    } else {
      // Free Spin Cooldown Check
      const { data: freeSpinRow } = await supabase
        .from("farm_free_spins")
        .select("last_spin_at")
        .eq("wallet_address", address)
        .single();

      if (freeSpinRow) {
        const lastSpin = new Date(freeSpinRow.last_spin_at).getTime();
        const now = Date.now();
        if (now - lastSpin < 24 * 60 * 60 * 1000) {
          return NextResponse.json({ success: false, error: "Free spin is on cooldown (24h)" }, { status: 400 });
        }
      }
      
      // Update Cooldown
      await supabase.from("farm_free_spins").upsert({ wallet_address: address, last_spin_at: new Date().toISOString() });
    }

    // RNG Roll
    const reward = generateReward();
    let txHash = undefined;

    // Execute VENA Payout if won
    if (reward.type === "vena") {
      const TREASURY_PRIVATE_KEY = process.env.TREASURY_PRIVATE_KEY;
      if (!TREASURY_PRIVATE_KEY) throw new Error("Treasury key missing");
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      const wallet = new ethers.Wallet(TREASURY_PRIVATE_KEY, provider);
      const venaContract = new ethers.Contract(VENA_CONTRACT_ADDRESS, erc20Abi, wallet);
      
      const amountInWei = ethers.parseUnits(reward.amount.toString(), 18);
      console.log(`[Decryptor Payout] Sending ${reward.amount} VENA to ${address}...`);
      const tx = await venaContract.transfer(address, amountInWei);
      
      // We will loop slightly to make sure RPC caches the receipt
      let payoutReceipt = null;
      for (let i = 0; i < 5; i++) {
        payoutReceipt = await provider.getTransactionReceipt(tx.hash);
        if (payoutReceipt) break;
        await new Promise(r => setTimeout(r, 2000));
      }
      if (!payoutReceipt) {
        // Just return txHash if we couldn't fetch receipt in time, it was sent.
        txHash = tx.hash;
      } else if (payoutReceipt.status !== 1) {
        throw new Error("Payout transaction failed");
      } else {
        txHash = tx.hash;
      }
    }

    return NextResponse.json({ success: true, reward, txHash });

  } catch (error: any) {
    console.error("[Decryptor Reward] Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 });
  }
}
