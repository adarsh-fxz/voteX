import { clusterApiUrl } from "@solana/web3.js";

export const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl("devnet");

export const SOLANA_CLUSTER_LABEL =
  process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";

// Solana Foundation pubsub endpoints — support `signatureSubscribe` (many HTTP-only RPCs do not).
const OFFICIAL_WS: Record<string, string> = {
  devnet: "wss://api.devnet.solana.com",
  "mainnet-beta": "wss://api.mainnet-beta.solana.com",
  testnet: "wss://api.testnet.solana.com",
};

function isLocalValidatorRpc(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  } catch {
    return false;
  }
}

// Same-host `wss` as HTTP — only some providers implement `signatureSubscribe` on it (not Alchemy).
function deriveWsFromHttp(httpEndpoint: string): string | undefined {
  try {
    const u = new URL(httpEndpoint);
    if (u.protocol === "https:") {
      return `wss://${u.host}${u.pathname}${u.search}`;
    }
    if (u.protocol === "http:" && !isLocalValidatorRpc(httpEndpoint)) {
      return `ws://${u.host}${u.pathname}${u.search}`;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export const RPC_WS_ENDPOINT: string | undefined = (() => {
  if (process.env.NEXT_PUBLIC_RPC_WS_URL) {
    return process.env.NEXT_PUBLIC_RPC_WS_URL;
  }
  if (isLocalValidatorRpc(RPC_ENDPOINT)) {
    return undefined;
  }
  if (process.env.NEXT_PUBLIC_RPC_USE_PROVIDER_WS === "1") {
    const derived = deriveWsFromHttp(RPC_ENDPOINT);
    if (derived) {
      return derived;
    }
  }
  return OFFICIAL_WS[SOLANA_CLUSTER_LABEL] ?? OFFICIAL_WS.devnet;
})();

export function shouldUseRpcHttpProxy(): boolean {
  if (process.env.NEXT_PUBLIC_RPC_DIRECT === "1") return false;
  if (isLocalValidatorRpc(RPC_ENDPOINT)) return false;
  return true;
}

export const VOTEX_PROGRAM_ID =
  process.env.NEXT_PUBLIC_VOTEX_PROGRAM_ID ??
  "HFGLGj86P9gnjLVWnfvoWGjViiEFfwfdQYUtVJ131ZpH";

export const APP_NAME = "VoteX";

// Public gateway for `ipfs://` CIDs (no secrets)
export const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs";

// Anchor `metadata_uri` / `content_cid` max length (bytes).
export const ONCHAIN_IPFS_REF_MAX_LEN = 60;

export function ipfsUri(cid: string): string {
  return `ipfs://${cid}`;
}

export function ipfsGatewayUrl(cid: string): string {
  return `${IPFS_GATEWAY.replace(/\/$/, "")}/${cid}`;
}

// Resolve gateway URL for metadata stored as raw CID or legacy `ipfs://…`.
export function ipfsGatewayHrefFromStored(
  stored: string | undefined | null,
): string | null {
  if (!stored) return null;
  const cid = stored.startsWith("ipfs://")
    ? stored.slice("ipfs://".length)
    : stored;
  return cid ? ipfsGatewayUrl(cid) : null;
}
