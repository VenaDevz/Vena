import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL || "https://dummy.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { address, state } = body;

    if (!address || typeof address !== "string") {
      return NextResponse.json({ success: false, error: "Missing or invalid address" }, { status: 400 });
    }
    
    if (!state) {
      return NextResponse.json({ success: false, error: "Missing state data" }, { status: 400 });
    }

    // Upsert into Supabase farm_saves table
    const { error } = await supabase
      .from("farm_saves")
      .upsert({ 
        wallet_address: address.toLowerCase(), 
        state_json: state,
        updated_at: new Date().toISOString()
      }, { onConflict: "wallet_address" });

    if (error) {
      console.error("Supabase upsert error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error saving farm state:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
