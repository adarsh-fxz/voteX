import type { Program } from "@coral-xyz/anchor";
import BN from "bn.js";
import bs58 from "bs58";
import type { Votex } from "@/types/votex";

export type PollAccount = Awaited<
  ReturnType<Program<Votex>["account"]["poll"]["fetch"]>
>;

export type CandidateAccount = Awaited<
  ReturnType<Program<Votex>["account"]["candidate"]["fetch"]>
>;

export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

export type PollPhase =
  | "registration"
  | "commit"
  | "waiting"
  | "voting"
  | "ended";

export function pollPhase(
  poll: PollAccount,
  nowSec: number = nowUnix(),
): PollPhase {
  const merkle = "merkleRestricted" in poll.accessMode;
  if (nowSec <= poll.registrationEnd.toNumber()) return "registration";
  if (merkle && !poll.isFrozen) return "commit";
  if (nowSec < poll.votingStart.toNumber()) return "waiting";
  if (nowSec <= poll.votingEnd.toNumber()) return "voting";
  return "ended";
}

export function pollKindLabel(kind: PollAccount["kind"]): string {
  if ("normal" in kind) return "Normal";
  if ("rating" in kind) return "Rating";
  return "?";
}

export function accessModeLabel(mode: PollAccount["accessMode"]): string {
  if ("open" in mode) return "Open";
  if ("merkleRestricted" in mode) return "Merkle";
  return "?";
}

// Candidate layout after 8-byte discriminator: cid (u64), poll_id (u64), …
// Memcmp on poll_id avoids scanning every candidate (reduces RPC 429s on public endpoints).
const POLL_ID_MEMCMP_OFFSET = 8 + 8;

// Filter candidate accounts for a poll (global cid numbering).
export async function fetchCandidatesForPoll(
  program: Program<Votex>,
  pollId: BN,
): Promise<{ publicKey: unknown; account: CandidateAccount }[]> {
  const key = pollId.toArrayLike(Buffer, "le", 8);
  const bytes = bs58.encode(new Uint8Array(key));
  const all = await program.account.candidate.all([
    { memcmp: { offset: POLL_ID_MEMCMP_OFFSET, bytes } },
  ]);
  return all as { publicKey: unknown; account: CandidateAccount }[];
}
