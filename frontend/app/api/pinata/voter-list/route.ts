import { NextResponse } from "next/server";
import { canonicalVoterListBytes } from "@/lib/canonical";
import { ipfsUri } from "@/lib/constants";
import { pinBytesToIpfs } from "@/lib/pinata-upload";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return NextResponse.json(
      { error: "PINATA_JWT is not set" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const obj = body as { pubkeys?: string[] };
  if (!Array.isArray(obj.pubkeys)) {
    return NextResponse.json(
      { error: 'Body must include "pubkeys" string[]' },
      { status: 400 },
    );
  }

  const bytes = canonicalVoterListBytes(obj.pubkeys);

  try {
    const out = await pinBytesToIpfs(jwt, bytes, "voters.json");
    const cid = out.IpfsHash;
    return NextResponse.json({
      cid,
      ipfsUri: ipfsUri(cid),
      byteLength: bytes.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "pin failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
