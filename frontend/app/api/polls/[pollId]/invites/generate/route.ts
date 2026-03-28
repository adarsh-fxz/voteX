import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { addInviteHashes, hashCode } from "@/lib/invite-db";

export const runtime = "nodejs";

function makeCode(): string {
  return randomBytes(6).toString("hex");
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ pollId: string }> },
) {
  const { pollId } = await ctx.params;
  let body: { count?: number };
  try {
    body = await _req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const count = Math.min(100, Math.max(1, body.count ?? 5));
  const codes: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < count; i++) {
    const c = makeCode();
    codes.push(c);
    hashes.push(hashCode(c));
  }
  await addInviteHashes(pollId, hashes);
  return NextResponse.json({
    pollId,
    codes,
    warning: "Store these codes securely; only hashes are kept server-side.",
  });
}
