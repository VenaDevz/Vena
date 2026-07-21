import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://dummy.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy";
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ success: false, error: "Missing address" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("farm_saves")
      .select("state_json")
      .eq("wallet_address", address.toLowerCase())
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 means no rows found, which is fine for a new player
      console.error("Supabase select error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, state: data?.state_json || null });
  } catch (err: any) {
    console.error("Error loading farm state:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
