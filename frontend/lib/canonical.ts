// Deterministic voter list bytes for `list_hash` + IPFS upload.
// Sort unique base58 pubkeys lexicographically, JSON envelope for versioning.

export const CANONICAL_VOTER_LIST_VERSION = 1 as const;

export type CanonicalVoterList = {
  version: typeof CANONICAL_VOTER_LIST_VERSION;
  voters: string[];
};

// Dedupe + lexicographic sort (base58 strings)
export function normalizeVoterPubkeys(pubkeys: string[]): string[] {
  return [...new Set(pubkeys)].sort((a, b) => a.localeCompare(b));
}

export function buildCanonicalVoterList(pubkeys: string[]): CanonicalVoterList {
  return {
    version: CANONICAL_VOTER_LIST_VERSION,
    voters: normalizeVoterPubkeys(pubkeys),
  };
}

// Stable JSON string (no extra whitespace) for hashing / IPFS
export function canonicalVoterListJson(pubkeys: string[]): string {
  return JSON.stringify(buildCanonicalVoterList(pubkeys));
}

export function canonicalVoterListBytes(pubkeys: string[]): Uint8Array {
  return new TextEncoder().encode(canonicalVoterListJson(pubkeys));
}

// SHA-256 of exact file bytes (matches auditors hashing the downloaded file)
export async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(data);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return new Uint8Array(digest);
}
