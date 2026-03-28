import { NextResponse } from "next/server";
import { listRegisteredPubkeys } from "@/lib/invite-db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ pollId: string }> },
) {
  const { pollId } = await ctx.params;
  const pubkeys = await listRegisteredPubkeys(pollId);
  return NextResponse.json({ pollId, pubkeys });
}
