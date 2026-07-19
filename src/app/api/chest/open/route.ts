import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { createClient } from "@supabase/supabase-js";

// --- Configuration ---
const RPC_URL = process.env.RH_MAINNET_RPC || "https://rpc.mainnet.chain.robinhood.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const CHEST_CONTRACT_ADDRESS = "0xb12c93b2e308ae4d6c1713c97b60f9a0389f3b94"; // Chest contract
const BASE_CONTRACT_ADDRESS = "0xe91078b979e9910cadce340e2e4ffe0450d830a9"; // VenaLandBase contract deployed
const DEAD_ADDRESS = "0x000000000000000000000000000000000000dead";

// Initialize Supabase Admin (Service Role)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Basic ERC1155 Interface for Minting
const baseAbi = [
  "function mintBase(address to, uint256 sizeId, uint256 amount) external"
];

// ERC1155 TransferSingle Topic (keccak256("TransferSingle(address,address,address,uint256,uint256)"))
const TRANSFER_SINGLE_TOPIC = "0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62";

export async function POST(req: Request) {
  try {
    const { txHash, walletAddress } = await req.json();

    if (!txHash || !walletAddress) {
      return NextResponse.json({ error: "Missing txHash or walletAddress" }, { status: 400 });
    }

    // 1. Check if this txHash was already processed in Supabase (Anti-Replay)
    const { data: existingTx, error: dbError } = await supabase
      .from("chest_openings")
      .select("id")
      .eq("tx_hash", txHash)
      .single();

    if (existingTx) {
      return NextResponse.json({ error: "Transaction already processed" }, { status: 400 });
    }

    // 2. Connect to Blockchain
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return NextResponse.json({ error: "Transaction not found or pending" }, { status: 400 });
    }

    if (receipt.status !== 1) {
      return NextResponse.json({ error: "Transaction failed on chain" }, { status: 400 });
    }

    // 3. Verify it's a TransferSingle to the DEAD_ADDRESS from the VenaLandChest contract
    // Lowercase addresses for comparison
    const targetContract = CHEST_CONTRACT_ADDRESS.toLowerCase();
    const deadAddr = DEAD_ADDRESS.toLowerCase();
    const senderAddr = walletAddress.toLowerCase();

    let burnedChestId: number | null = null;
    let validBurn = false;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === targetContract && log.topics[0] === TRANSFER_SINGLE_TOPIC) {
        // Topics in ERC1155 TransferSingle:
        // topics[0]: signature
        // topics[1]: operator
        // topics[2]: from
        // topics[3]: to
        const from = ethers.dataSlice(log.topics[2], 12).toLowerCase();
        const to = ethers.dataSlice(log.topics[3], 12).toLowerCase();

        if (from === senderAddr && to === deadAddr) {
          // Decode non-indexed data: (id, value)
          const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["uint256", "uint256"], log.data);
          const id = Number(decoded[0]);
          const value = Number(decoded[1]);

          if (value >= 1 && (id === 0 || id === 1)) {
            burnedChestId = id; // 0 = Standard, 1 = Premium
            validBurn = true;
            break;
          }
        }
      }
    }

    if (!validBurn || burnedChestId === null) {
      return NextResponse.json({ error: "No valid Chest burn found in this transaction" }, { status: 400 });
    }

    // 4. Calculate RNG (Random Land Assignment)
    // Token IDs: 2 = 2x2, 3 = 3x3, 4 = 4x4, 5 = 5x5
    let landSizeId = 2; // Default to 2x2
    const roll = Math.random() * 100; // 0 to 100

    if (burnedChestId === 0) {
      // Standard Chest: 75% 2x2, 15% 3x3, 8% 4x4, 2% 5x5
      if (roll <= 2) landSizeId = 5;
      else if (roll <= 10) landSizeId = 4; // 2 + 8 = 10
      else if (roll <= 25) landSizeId = 3; // 10 + 15 = 25
      else landSizeId = 2; // remaining 75%
    } else {
      // Premium Chest: 70% 3x3, 20% 4x4, 10% 5x5
      if (roll <= 10) landSizeId = 5;
      else if (roll <= 30) landSizeId = 4; // 10 + 20 = 30
      else landSizeId = 3; // remaining 70%
    }

    // 5. Mint the Land via Smart Contract
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const baseContract = new ethers.Contract(BASE_CONTRACT_ADDRESS, baseAbi, wallet);

    // Call mintBase(to, sizeId, amount)
    const mintTx = await baseContract.mintBase(walletAddress, landSizeId, 1);
    await mintTx.wait(); // Wait for confirmation to ensure security

    // 6. Save the opening record to Supabase
    const { error: insertError } = await supabase
      .from("chest_openings")
      .insert({
        tx_hash: txHash,
        wallet_address: walletAddress,
        chest_type: burnedChestId,
        land_minted: landSizeId
      });

    if (insertError) {
      console.error("Failed to save opening to DB:", insertError);
      // Even if DB fails, the user got the NFT. We just log the error.
    }

    return NextResponse.json({ 
      success: true, 
      chestType: burnedChestId, 
      landSizeId, 
      mintTxHash: mintTx.hash 
    });

  } catch (error: any) {
    console.error("Chest Open Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
