import { NextResponse } from "next/server";
import { fetchAgentPoolSnapshot } from "@/lib/agent/read-pool";

/** Read-only pool snapshot for VENA Agent / Virtuals tools. */
export async function GET() {
  try {
    const snapshot = await fetchAgentPoolSnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pool read failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
