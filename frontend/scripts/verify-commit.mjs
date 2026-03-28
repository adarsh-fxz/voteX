#!/usr/bin/env node
/**
 * Auditor: download voter list JSON from IPFS, verify list_hash and Merkle root.
 *
 *   node scripts/verify-commit.mjs <cid> <list_hash_hex> <merkle_root_hex> <expected_count>
 *
 * Run from frontend/ so @solana/web3.js resolves:
 *   cd frontend && node scripts/verify-commit.mjs ...
 */

import { createHash } from "crypto";
import { PublicKey } from "@solana/web3.js";

const [, , cidArg, listHashHex, rootHex, countArg] = process.argv;

if (!cidArg || !listHashHex || !rootHex || countArg === undefined) {
  console.error(
    "Usage: node scripts/verify-commit.mjs <cid> <list_hash_hex> <merkle_root_hex> <expected_count>",
  );
  process.exit(1);
}

function hashPair(a, b) {
  const [x, y] = Buffer.compare(a, b) <= 0 ? [a, b] : [b, a];
  return createHash("sha256").update(Buffer.concat([x, y])).digest();
}

function buildRootFromLeafHashes(leafHashes) {
  let layer = leafHashes;
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const r = i + 1 < layer.length ? layer[i + 1] : layer[i];
      next.push(hashPair(layer[i], r));
    }
    layer = next;
  }
  return layer[0];
}

async function main() {
  const gateway =
    process.env.IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs";
  const path = cidArg.replace(/^ipfs:\/\//, "");
  const url = cidArg.startsWith("http") ? cidArg : `${gateway.replace(/\/$/, "")}/${path}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const listHash = createHash("sha256").update(buf).digest();
  if (listHash.toString("hex") !== listHashHex.toLowerCase()) {
    console.error("list_hash MISMATCH");
    process.exit(2);
  }
  console.log("list_hash OK");

  const json = JSON.parse(buf.toString("utf8"));
  const voters = json.voters;
  if (!Array.isArray(voters)) throw new Error("expected { voters: string[] }");
  const sorted = [...new Set(voters)].sort((a, b) => a.localeCompare(b));
  if (sorted.length !== Number(countArg)) {
    console.error("count MISMATCH", sorted.length, "vs", countArg);
    process.exit(3);
  }
  console.log("count OK:", sorted.length);

  const leafHashes = sorted.map((p) => {
    const raw = new PublicKey(p).toBytes();
    return createHash("sha256").update(Buffer.from(raw)).digest();
  });

  const root = buildRootFromLeafHashes(leafHashes);
  if (root.toString("hex") !== rootHex.toLowerCase()) {
    console.error("merkle_root MISMATCH");
    process.exit(4);
  }
  console.log("merkle_root OK");
  console.log("Verification passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
