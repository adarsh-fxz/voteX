import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { ADMIN_PUBKEY } from "@/lib/constants";
import { flagPoll, unflagPoll } from "@/lib/flag-db";

export const runtime = "nodejs";

function verifyAdminSignature(
  pollId: string,
  action: "flag" | "unflag",
  pubkey: string,
  signature: string,
): { ok: true } | { ok: false; status: number; error: string } {
  if (pubkey !== ADMIN_PUBKEY) {
    return {
      ok: false,
      status: 403,
      error: "Only the moderator wallet may flag polls",
    };
  }

  try {
    const message = new TextEncoder().encode(`${action}:${pollId}:${pubkey}`);
    const sigBytes = bs58.decode(signature);
    const pubkeyBytes = new PublicKey(pubkey).toBytes();
    const valid = nacl.sign.detached.verify(message, sigBytes, pubkeyBytes);
    if (!valid) {
      return {
        ok: false,
        status: 401,
        error: "Signature verification failed",
      };
    }
  } catch {
    return {
      ok: false,
      status: 400,
      error: "Invalid pubkey or signature encoding",
    };
  }

  return { ok: true };
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ pollId: string }> },
) {
  const { pollId } = await ctx.params;

  let body: { reason?: string; pubkey?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { reason, pubkey, signature } = body;
  if (!pubkey || !signature) {
    return NextResponse.json(
      { error: "pubkey and signature are required" },
      { status: 400 },
    );
  }

  const trimmedReason = (reason ?? "Inappropriate content").trim().slice(0, 200);
  if (!trimmedReason) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const check = verifyAdminSignature(pollId, "flag", pubkey, signature);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  await flagPoll(pollId, trimmedReason);
  return NextResponse.json({ ok: true, reason: trimmedReason });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ pollId: string }> },
) {
  const { pollId } = await ctx.params;

  let body: { pubkey?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { pubkey, signature } = body;
  if (!pubkey || !signature) {
    return NextResponse.json(
      { error: "pubkey and signature are required" },
      { status: 400 },
    );
  }

  const check = verifyAdminSignature(pollId, "unflag", pubkey, signature);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  await unflagPoll(pollId);
  return NextResponse.json({ ok: true });
}
