use sha2::{Digest, Sha256};

/// Leaves are SHA-256(pubkey bytes); pairs are hashed in sorted order (matches TS `buildMerkleRoot`).
pub fn verify_merkle_proof(proof: &[[u8; 32]], root: &[u8; 32], leaf_pubkey: &[u8; 32]) -> bool {
    let mut current: [u8; 32] = Sha256::digest(leaf_pubkey).into();
    for sibling in proof {
        let mut h = Sha256::new();
        if current <= *sibling {
            h.update(&current);
            h.update(sibling.as_ref());
        } else {
            h.update(sibling.as_ref());
            h.update(&current);
        }
        current = h.finalize().into();
    }
    &current == root
}
