import { NextResponse } from "next/server";
import { ipfsUri } from "@/lib/constants";
import { pinFileToIpfs } from "@/lib/pinata-upload";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return NextResponse.json(
      { error: "PINATA_JWT is not set" },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: 'Expected multipart field "file" (blob)' },
      { status: 400 },
    );
  }

  const name = (form.get("name") as string | null) ?? undefined;

  try {
    const out = await pinFileToIpfs(jwt, file, name);
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
