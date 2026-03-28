import { NextResponse } from "next/server";
import { ipfsUri } from "@/lib/constants";
import { pinJsonToIpfs } from "@/lib/pinata-upload";

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

  const obj = body as { name?: string; content?: Record<string, unknown> };
  if (!obj.content || typeof obj.content !== "object") {
    return NextResponse.json(
      { error: 'Body must include "content" object to pin' },
      { status: 400 },
    );
  }

  try {
    const out = await pinJsonToIpfs(jwt, obj.content, obj.name);
    const cid = out.IpfsHash;
    return NextResponse.json({
      cid,
      ipfsUri: ipfsUri(cid),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "pin failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
