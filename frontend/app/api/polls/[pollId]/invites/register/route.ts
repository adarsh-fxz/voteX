import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import { registerCode } from "@/lib/invite-db";

export const runtime = "nodejs";

/**
 * This proves the caller controls the private key for `pubkey`,
 * so the server cannot register arbitrary wallets.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ pollId: string }> },
) {
  const { pollId } = await ctx.params;

  let body: { code?: string; pubkey?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { code, pubkey, signature } = body;
  if (!code || !pubkey || !signature) {
    return NextResponse.json(
      { error: "code, pubkey and signature are required" },
      { status: 400 },
    );
  }

  // Verify the wallet actually signed the canonical message
  try {
    const message = new TextEncoder().encode(`register:${pollId}:${pubkey}`);
    const sigBytes = bs58.decode(signature);
    const pubkeyBytes = new PublicKey(pubkey).toBytes();
    const valid = nacl.sign.detached.verify(message, sigBytes, pubkeyBytes);
    if (!valid) {
      return NextResponse.json(
        {
          error: "Signature verification failed — sign with the correct wallet",
        },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid pubkey or signature encoding" },
      { status: 400 },
    );
  }

  const r = await registerCode(pollId, code, pubkey);
  if (r === "invalid") {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  }
  if (r === "used") {
    return NextResponse.json(
      { error: "This invite code has already been used" },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true });
}
