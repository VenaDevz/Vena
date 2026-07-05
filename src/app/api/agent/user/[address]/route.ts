import { NextResponse } from "next/server";
import { isAddress, type Address } from "viem";
import { fetchAgentUserSnapshot } from "@/lib/agent/read-pool";

type RouteContext = { params: Promise<{ address: string }> };

/** Read-only stake snapshot for a wallet (no private keys). */
export async function GET(_request: Request, context: RouteContext) {
  const { address: raw } = await context.params;
  if (!isAddress(raw)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const snapshot = await fetchAgentUserSnapshot(raw as Address);
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=20",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "User read failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
