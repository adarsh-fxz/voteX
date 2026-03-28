// SHA-256 Merkle tree (sorted child pairs) — matches `votex` on-chain `merkle.rs`
// and the Anchor tests. Use for proofs against `commit_eligibility` roots.

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(data);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return new Uint8Array(digest);
}

function compare32(a: Uint8Array, b: Uint8Array): number {
  for (let i = 0; i < 32; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

// Hash of sorted pair (lexicographic by 32 bytes)
export async function hashPair(
  a: Uint8Array,
  b: Uint8Array,
): Promise<Uint8Array> {
  const [left, right] = compare32(a, b) <= 0 ? [a, b] : [b, a];
  const buf = new Uint8Array(64);
  buf.set(left, 0);
  buf.set(right, 32);
  return sha256(buf);
}

// Leaf = SHA-256(raw leaf bytes), e.g. raw pubkey
export async function leafHash(leafBytes: Uint8Array): Promise<Uint8Array> {
  return sha256(leafBytes);
}

export type MerkleTree = {
  root: Uint8Array;
  // levels[0] = leaves (hashed), levels[levels.length-1] = [root]
  levels: Uint8Array[][];
};

export async function buildMerkleTree(
  leafInputs: Uint8Array[],
): Promise<MerkleTree> {
  if (leafInputs.length === 0) throw new Error("empty leaves");
  let level: Uint8Array[] = await Promise.all(leafInputs.map((l) => sha256(l)));
  const levels: Uint8Array[][] = [level];
  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      next.push(await hashPair(level[i], right));
    }
    level = next;
    levels.push(level);
  }
  return { root: levels[levels.length - 1][0], levels };
}

// Sibling hashes from leaf index upward (empty if single leaf)
export function merkleProof(tree: MerkleTree, leafIndex: number): Uint8Array[] {
  const { levels } = tree;
  const proof: Uint8Array[] = [];
  let idx = leafIndex;
  for (let lv = 0; lv < levels.length - 1; lv++) {
    const row = levels[lv];
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (siblingIdx < row.length) {
      proof.push(row[siblingIdx]);
    } else {
      proof.push(row[idx]);
    }
    idx = Math.floor(idx / 2);
  }
  return proof;
}

export async function verifyMerkleProof(
  proof: Uint8Array[],
  root: Uint8Array,
  leafPubkey32: Uint8Array,
): Promise<boolean> {
  let current = await sha256(leafPubkey32);
  for (const sibling of proof) {
    current = await hashPair(current, sibling);
  }
  if (current.length !== root.length) return false;
  for (let i = 0; i < current.length; i++) {
    if (current[i] !== root[i]) return false;
  }
  return true;
}
