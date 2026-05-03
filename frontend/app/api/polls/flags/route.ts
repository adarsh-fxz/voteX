import { NextResponse } from "next/server";
import { listFlaggedPolls } from "@/lib/flag-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const flags = await listFlaggedPolls();
    return NextResponse.json(
      { flags },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load flagged polls";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
