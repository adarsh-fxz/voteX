import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Solana Foundation HTTP RPC — supports `getProgramAccounts`
const PUBLIC_HTTP: Record<string, string> = {
  devnet: "https://api.devnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  testnet: "https://api.testnet.solana.com",
};

function primaryRpcUrl(): string | null {
  return process.env.SOLANA_RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? null;
}

// Used for `getProgramAccounts` when primary RPC does not allow it
function gpaRpcUrl(): string {
  const override =
    process.env.SOLANA_RPC_GPA_URL ?? process.env.NEXT_PUBLIC_RPC_GPA_URL;
  if (override) return override;
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";
  return PUBLIC_HTTP[cluster] ?? PUBLIC_HTTP.devnet;
}

function pickUpstream(method: string | undefined, primary: string): string {
  if (method === "getProgramAccounts") {
    return gpaRpcUrl();
  }
  return primary;
}

function rpcMethodFromPayload(single: unknown): string | undefined {
  if (
    typeof single === "object" &&
    single !== null &&
    "method" in single &&
    typeof (single as { method: unknown }).method === "string"
  ) {
    return (single as { method: string }).method;
  }
  return undefined;
}

// Forwards JSON-RPC POSTs. Batches are split per entry.
export async function POST(req: Request) {
  const primary = primaryRpcUrl();
  if (!primary) {
    return NextResponse.json(
      { error: "Set SOLANA_RPC_URL or NEXT_PUBLIC_RPC_URL" },
      { status: 503 },
    );
  }

  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!body.trim()) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) {
      return new NextResponse("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const results: unknown[] = [];
    for (const single of parsed) {
      const method = rpcMethodFromPayload(single);
      const endpoint = pickUpstream(method, primary);
      const one = JSON.stringify(single);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: one,
      });
      const text = await res.text();
      if (process.env.NODE_ENV === "development" && !res.ok) {
        console.warn(
          `[solana-rpc] batch item upstream ${res.status} method=${method ?? "?"} endpoint=${endpoint.slice(0, 48)}…`,
          text.slice(0, 200),
        );
      }
      try {
        const j = JSON.parse(text) as { jsonrpc?: string };
        if (j && j.jsonrpc === "2.0") {
          results.push(j);
          continue;
        }
      } catch {
        /* fall through */
      }
      results.push({
        jsonrpc: "2.0",
        id:
          typeof single === "object" && single !== null && "id" in single
            ? (single as { id: unknown }).id
            : null,
        error: {
          code: -32603,
          message: `Upstream HTTP ${res.status}: ${text.slice(0, 200)}`,
        },
      });
    }

    return new NextResponse(JSON.stringify(results), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const method = rpcMethodFromPayload(parsed);
  const endpoint = pickUpstream(method, primary);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const text = await res.text();

  if (process.env.NODE_ENV === "development" && !res.ok) {
    console.warn(
      `[solana-rpc] upstream ${res.status} method=${method ?? "?"} endpoint=${endpoint.slice(0, 48)}…`,
      text.slice(0, 320),
    );
  }

  if (!res.ok) {
    try {
      const j = JSON.parse(text) as { jsonrpc?: string };
      if (j && j.jsonrpc === "2.0") {
        return new NextResponse(text, {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch {
      // fall through
    }
  }

  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
