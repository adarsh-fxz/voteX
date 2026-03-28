import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export function counterPda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("counter")],
    programId,
  )[0];
}

export function registrationsPda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("registrations")],
    programId,
  )[0];
}

export function pollPda(programId: PublicKey, pollId: BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [pollId.toArrayLike(Buffer, "le", 8)],
    programId,
  )[0];
}

export function candidatePda(
  programId: PublicKey,
  pollId: BN,
  cid: BN,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [pollId.toArrayLike(Buffer, "le", 8), cid.toArrayLike(Buffer, "le", 8)],
    programId,
  )[0];
}

export function ratingResultPda(
  programId: PublicKey,
  pollId: BN,
  cid: BN,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("rating_result"),
      pollId.toArrayLike(Buffer, "le", 8),
      cid.toArrayLike(Buffer, "le", 8),
    ],
    programId,
  )[0];
}

export function voterPda(
  programId: PublicKey,
  pollId: BN,
  voter: PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("voter"),
      pollId.toArrayLike(Buffer, "le", 8),
      voter.toBuffer(),
    ],
    programId,
  )[0];
}

export function raterPda(
  programId: PublicKey,
  pollId: BN,
  judge: PublicKey,
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("rater"),
      pollId.toArrayLike(Buffer, "le", 8),
      judge.toBuffer(),
    ],
    programId,
  )[0];
}
