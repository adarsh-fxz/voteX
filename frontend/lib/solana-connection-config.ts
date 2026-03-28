import type { ConnectionConfig } from "@solana/web3.js";
import { RPC_WS_ENDPOINT, shouldUseRpcHttpProxy } from "@/lib/constants";

const baseConfig: ConnectionConfig = {
  commitment: "confirmed",
  ...(RPC_WS_ENDPOINT ? { wsEndpoint: RPC_WS_ENDPOINT } : {}),
};

// Merge `fetch(Request)` vs `fetch(url, init)` shapes from @solana/web3.js.
function mergeRequestInit(
  input: RequestInfo | URL,
  init?: RequestInit,
): RequestInit {
  if (typeof input === "object" && input instanceof Request) {
    return {
      method: init?.method ?? input.method,
      headers: init?.headers ?? input.headers,
      body: init?.body ?? input.body,
      signal: init?.signal ?? input.signal,
    };
  }
  return init ?? {};
}

// Forwards the exact JSON-RPC payload and headers (incl. `solana-client`) to `/api/solana-rpc`.
// Dropping `body` or coercing types produced empty POSTs → upstream HTTP 400.
async function rpcProxyFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const merged = mergeRequestInit(input, init);
  const headers = new Headers(merged.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const proxyUrl =
    typeof window !== "undefined"
      ? new URL("/api/solana-rpc", window.location.origin).href
      : "/api/solana-rpc";

  return fetch(proxyUrl, {
    method: "POST",
    headers,
    body: merged.body ?? undefined,
    signal: merged.signal,
    cache: "no-store",
    credentials: "same-origin",
  });
}

// Stable `Connection` options for `ConnectionProvider` (module singleton).
export const solanaConnectionConfig: ConnectionConfig = shouldUseRpcHttpProxy()
  ? { ...baseConfig, fetch: rpcProxyFetch }
  : baseConfig;
