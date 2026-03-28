"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import bs58Import from "bs58";
import { useVotexProgram } from "@/hooks/useVotexProgram";
import {
  ipfsGatewayHrefFromStored,
  ONCHAIN_IPFS_REF_MAX_LEN,
} from "@/lib/constants";
import { buildMerkleTree, merkleProof } from "@/lib/merkle";
import {
  canonicalVoterListBytes,
  normalizeVoterPubkeys,
  sha256Bytes,
} from "@/lib/canonical";
import { votexProgramId } from "@/lib/anchor";
import {
  candidatePda,
  pollPda,
  raterPda,
  ratingResultPda,
  voterPda,
} from "@/lib/pdas";
import {
  accessModeLabel,
  fetchCandidatesForPoll,
  nowUnix,
  pollKindLabel,
  pollPhase,
  type PollAccount,
} from "@/lib/poll-utils";

const RechartsChart = dynamic(
  () =>
    import("recharts").then((m) => {
      const { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } = m;
      function Chart({ data }: { data: { t: string; v: number }[] }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="t" />
              <YAxis />
              <Tooltip />
              <Line dataKey="v" stroke="var(--primary)" dot />
            </LineChart>
          </ResponsiveContainer>
        );
      }
      return Chart;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full animate-pulse rounded bg-slate-100" />
    ),
  },
);

type Props = { pollIdStr: string };

export function PollDetailClient({ pollIdStr }: Props) {
  const { publicKey } = useWallet();
  const { program, readonlyProgram } = useVotexProgram();
  const [poll, setPoll] = useState<PollAccount | null>(null);
  const [cands, setCands] = useState<{ cid: BN; name: string; votes: BN }[]>(
    [],
  );
  const [ratings, setRatings] = useState<{ cid: BN; total: BN; count: BN }[]>(
    [],
  );
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const programId = useMemo(() => votexProgramId(), []);
  const pid = useMemo(() => new BN(pollIdStr), [pollIdStr]);
  const loadGenRef = useRef(0);

  const load = useCallback(async () => {
    const gen = ++loadGenRef.current;
    setErr(null);
    setLoading(true);
    try {
      const p = await readonlyProgram.account.poll.fetch(
        pollPda(programId, pid),
      );
      if (gen !== loadGenRef.current) return;
      setPoll(p as PollAccount);
      const list = await fetchCandidatesForPoll(readonlyProgram, pid);
      if (gen !== loadGenRef.current) return;
      const rows = list
        .map((x) => x.account)
        .sort((a, b) => a.cid.cmp(b.cid))
        .map((a) => ({
          cid: a.cid,
          name: a.name,
          votes: a.votes,
        }));
      setCands(rows);

      if ("rating" in (p as PollAccount).kind && rows.length > 0) {
        const pdas = rows.map((row) =>
          ratingResultPda(programId, pid, row.cid),
        );
        const fetched =
          await readonlyProgram.account.ratingResult.fetchMultiple(pdas);
        if (gen !== loadGenRef.current) return;
        const rr: { cid: BN; total: BN; count: BN }[] = [];
        for (let i = 0; i < rows.length; i++) {
          const acc = fetched[i];
          if (!acc) continue;
          rr.push({
            cid: rows[i].cid,
            total: acc.totalScore,
            count: acc.voteCount,
          });
        }
        setRatings(rr);
      } else {
        setRatings([]);
      }
    } catch (e) {
      if (gen === loadGenRef.current) {
        setErr(e instanceof Error ? e.message : "Failed to load poll");
      }
    } finally {
      if (gen === loadGenRef.current) {
        setLoading(false);
      }
    }
  }, [pid, programId, readonlyProgram]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-muted">Loading poll…</p>;
  }
  if (err || !poll) {
    return <p className="text-red-600">{err ?? "Poll not found"}</p>;
  }

  const phase = pollPhase(poll);
  const metaHref = ipfsGatewayHrefFromStored(poll.metadataUri);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted">
          {pollKindLabel(poll.kind)} · {accessModeLabel(poll.accessMode)} ·
          Phase: <strong>{phase}</strong>
        </p>
        {metaHref && (
          <a
            href={metaHref}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Metadata (IPFS)
          </a>
        )}
      </div>

      {poll.contentCid && (
        <p className="text-sm">
          Voter list CID:{" "}
          <code className="rounded bg-slate-100 px-1">{poll.contentCid}</code>
        </p>
      )}

      <section>
        <h2 className="text-lg font-semibold">Results</h2>
        {"normal" in poll.kind ? (
          <ul className="mt-2 space-y-2">
            {cands.map((c) => (
              <li key={c.cid.toString()} className="flex justify-between">
                <span>{c.name}</span>
                <span className="text-muted">{c.votes.toString()} votes</span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-2 space-y-2">
            {ratings.map((r) => (
              <li key={r.cid.toString()} className="flex justify-between">
                <span>
                  {cands.find((c) => c.cid.eq(r.cid))?.name ?? r.cid.toString()}
                </span>
                <span className="text-muted">
                  total {r.total.toString()} / {r.count.toString()} ratings
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="h-48">
        <h2 className="text-lg font-semibold">Activity (placeholder)</h2>
        <RechartsChart
          data={[
            { t: "Committed", v: Number(poll.committedVoterCount) },
            {
              t: "Voted",
              v: cands.reduce((s, c) => s + c.votes.toNumber(), 0),
            },
          ]}
        />
      </section>

      <ExplorerLink pollId={pollIdStr} />

      {/* ── Invite manager: creator only, during registration phase ── */}
      {publicKey &&
        poll.creator.equals(publicKey) &&
        "merkleRestricted" in poll.accessMode &&
        phase === "registration" && <InviteManagerPanel pollId={pid} />}

      {/* ── Register with invite: non-creator voters, during registration phase ── */}
      {publicKey &&
        !poll.creator.equals(publicKey) &&
        "merkleRestricted" in poll.accessMode &&
        phase === "registration" && (
          <RegisterWithInvitePanel pollId={pid} publicKey={publicKey} />
        )}

      {/* ── Commit eligibility: creator, after registration ends, before voting starts ── */}
      {publicKey &&
        program &&
        poll.creator.equals(publicKey) &&
        "merkleRestricted" in poll.accessMode &&
        !poll.isFrozen &&
        nowUnix() > poll.registrationEnd.toNumber() &&
        nowUnix() < poll.votingStart.toNumber() && (
          <CommitPanel
            pollId={pid}
            poll={poll}
            program={program}
            onDone={load}
          />
        )}

      {/* ── Vote / rate: anyone connected, during voting phase ── */}
      {publicKey && program && phase === "voting" && (
        <VotePanel
          poll={poll}
          pollId={pid}
          candidates={cands}
          program={program}
          publicKey={publicKey}
        />
      )}
    </div>
  );
}

function ExplorerLink({ pollId }: { pollId: string }) {
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";
  const address = pollPda(votexProgramId(), new BN(pollId)).toBase58();
  const clusterParam = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  const href = `https://explorer.solana.com/address/${address}${clusterParam}`;
  return (
    <p className="text-sm">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-primary hover:underline"
      >
        View poll PDA on Explorer
      </a>
    </p>
  );
}

// Invite Manager (poll creator only, during registration phase)

function InviteManagerPanel({ pollId }: { pollId: BN }) {
  const pollIdStr = pollId.toString();
  const [count, setCount] = useState(5);
  const [codes, setCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<string[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  async function generate() {
    setBusy(true);
    setMsg(null);
    setCodes([]);
    try {
      const res = await fetch(`/api/polls/${pollIdStr}/invites/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = (await res.json()) as { codes?: string[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setCodes(data.codes ?? []);
      setMsg(
        `${data.codes?.length ?? 0} invite codes generated. Share each code with one voter — they can only be redeemed once.`,
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function refreshRegistrations() {
    setLoadingRegs(true);
    try {
      const res = await fetch(`/api/polls/${pollIdStr}/invites/registrations`);
      const data = (await res.json()) as { pubkeys: string[] };
      setRegistrations(data.pubkeys ?? []);
    } finally {
      setLoadingRegs(false);
    }
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyAll() {
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied("__all__");
    setTimeout(() => setCopied(null), 2000);
  }

  useEffect(() => {
    refreshRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollIdStr]);

  return (
    <section className="space-y-4 rounded-lg border border-border bg-surface p-5">
      <div>
        <h3 className="font-semibold">Invite manager</h3>
        <p className="mt-1 text-sm text-muted">
          Generate one-time invite codes during the registration window. Share
          each code privately with one voter. After voting opens you must commit
          eligibility.
        </p>
      </div>

      {/* Generate controls */}
      <div className="flex items-end gap-3">
        <label className="block text-sm">
          How many codes
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1 w-24 rounded border border-border bg-background px-2 py-1"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={generate}
          className="rounded bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Generating…" : "Generate codes"}
        </button>
      </div>

      {msg && (
        <p className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {msg}
        </p>
      )}

      {/* Generated code list */}
      {codes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              New codes (copy and send to voters)
            </p>
            <button
              type="button"
              onClick={copyAll}
              className="rounded border border-border px-2 py-1 text-xs hover:bg-slate-50"
            >
              {copied === "__all__" ? "Copied all!" : "Copy all"}
            </button>
          </div>
          <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded border border-border">
            {codes.map((c) => (
              <li
                key={c}
                className="flex items-center justify-between px-3 py-2"
              >
                <code className="font-mono text-sm tracking-wider">{c}</code>
                <button
                  type="button"
                  onClick={() => copyCode(c)}
                  className="ml-4 rounded border border-border px-2 py-0.5 text-xs hover:bg-slate-50"
                >
                  {copied === c ? "Copied!" : "Copy"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Registered wallets */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            Registered wallets ({registrations.length})
          </p>
          <button
            type="button"
            onClick={refreshRegistrations}
            disabled={loadingRegs}
            className="rounded border border-border px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
          >
            {loadingRegs ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {registrations.length === 0 ? (
          <p className="text-sm text-muted">No wallets registered yet.</p>
        ) : (
          <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded border border-border">
            {registrations.map((pk) => (
              <li key={pk} className="px-3 py-2">
                <code className="break-all font-mono text-xs">{pk}</code>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// Register with Invite (voter, during registration phase)

function RegisterWithInvitePanel({
  pollId,
  publicKey,
}: {
  pollId: BN;
  publicKey: PublicKey;
}) {
  const { signMessage } = useWallet();
  const pollIdStr = pollId.toString();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function register() {
    if (!code.trim()) return;
    if (!signMessage) {
      setMsg({
        ok: false,
        text: "Your wallet does not support message signing.",
      });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      // Canonical message — server verifies this exact string
      const message = new TextEncoder().encode(
        `register:${pollIdStr}:${publicKey.toBase58()}`,
      );
      const sigBytes = await signMessage(message);
      // bs58-encode the raw Uint8Array signature
      const signature = bs58Import.encode(sigBytes);

      const res = await fetch(`/api/polls/${pollIdStr}/invites/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          pubkey: publicKey.toBase58(),
          signature,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      setMsg({
        ok: true,
        text: "Registered! Your wallet is on the voter list. Wait for the creator to commit eligibility before voting opens.",
      });
      setCode("");
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-surface p-5">
      <div>
        <h3 className="font-semibold">Register to vote</h3>
        <p className="mt-1 text-sm text-muted">
          Enter the invite code the poll creator sent you. Your wallet (
          <code className="rounded bg-slate-100 px-1 text-xs">
            {publicKey.toBase58().slice(0, 8)}…{publicKey.toBase58().slice(-6)}
          </code>
          ) will sign a message to prove ownership, then be added to the voter
          list.
        </p>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Paste invite code…"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && register()}
          className="flex-1 rounded border border-border bg-background px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          disabled={busy || !code.trim()}
          onClick={register}
          className="rounded bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Signing & registering…" : "Register"}
        </button>
      </div>
      {msg && (
        <p
          className={`rounded px-3 py-2 text-sm ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}

// CommitPanel

function CommitPanel({
  pollId,
  poll,
  program,
  onDone,
}: {
  pollId: BN;
  poll: PollAccount;
  program: NonNullable<ReturnType<typeof useVotexProgram>["program"]>;
  onDone: () => void;
}) {
  const { publicKey } = useWallet();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function commit() {
    if (!publicKey) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/polls/${pollId.toString()}/invites/registrations`,
      );
      const data = (await res.json()) as { pubkeys: string[] };
      const pubkeys = data.pubkeys ?? [];
      if (pubkeys.length === 0) {
        throw new Error("No registered wallets from invite API");
      }
      const sorted = normalizeVoterPubkeys(pubkeys);
      const bytes = canonicalVoterListBytes(sorted);
      const listHash = await sha256Bytes(bytes);
      const leaves = sorted.map(
        (p) => new Uint8Array(new PublicKey(p).toBytes()),
      );
      const tree = await buildMerkleTree(leaves);
      const root = tree.root;

      const up = await fetch("/api/pinata/voter-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pubkeys }),
      });
      const upJson = (await up.json()) as { cid?: string; error?: string };
      if (!up.ok) {
        throw new Error(upJson.error ?? "IPFS upload failed");
      }
      const cid = upJson.cid;
      if (!cid) throw new Error("No CID returned from voter list upload");
      if (cid.length > ONCHAIN_IPFS_REF_MAX_LEN) {
        throw new Error(
          `Voter list CID exceeds on-chain limit (${ONCHAIN_IPFS_REF_MAX_LEN}).`,
        );
      }

      await program.methods
        .commitEligibility(
          pollId,
          Array.from(root),
          Array.from(listHash),
          cid,
          new BN(sorted.length),
        )
        .accountsPartial({
          user: publicKey,
          poll: pollPda(votexProgramId(), pollId),
        })
        .rpc();

      setMsg("Commit successful.");
      onDone();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Commit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded border border-border p-4">
      <h3 className="font-semibold">Commit eligibility</h3>
      <p className="mt-1 text-sm text-muted">
        Uploads canonical voter list + commits Merkle root (invites must be
        registered first).
      </p>
      <button
        type="button"
        disabled={busy}
        className="mt-3 rounded bg-primary px-4 py-2 text-white disabled:opacity-50"
        onClick={commit}
      >
        {busy ? "Committing…" : "Build list, pin, commit on-chain"}
      </button>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </section>
  );
}

function VotePanel({
  poll,
  pollId,
  candidates,
  program,
  publicKey,
}: {
  poll: PollAccount;
  pollId: BN;
  candidates: { cid: BN; name: string; votes: BN }[];
  program: NonNullable<ReturnType<typeof useVotexProgram>["program"]>;
  publicKey: PublicKey;
}) {
  const programId = votexProgramId();
  const [sel, setSel] = useState<string>(candidates[0]?.cid.toString() ?? "");
  const [score, setScore] = useState(3);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function proofForWallet(): Promise<number[][]> {
    if ("open" in poll.accessMode) return [];
    const res = await fetch(
      `/api/polls/${pollId.toString()}/invites/registrations`,
    );
    const data = (await res.json()) as { pubkeys: string[] };
    const pubkeys = data.pubkeys ?? [];
    const sorted = normalizeVoterPubkeys(pubkeys);
    const leaves = sorted.map(
      (p) => new Uint8Array(new PublicKey(p).toBytes()),
    );
    const tree = await buildMerkleTree(leaves);
    const idx = sorted.indexOf(publicKey.toBase58());
    if (idx < 0) throw new Error("Your wallet is not on the voter list");
    const proof = merkleProof(tree, idx);
    return proof.map((p) => [...p]);
  }

  async function voteNormal() {
    setBusy(true);
    setNote(null);
    try {
      const cid = new BN(sel);
      const proof = await proofForWallet();
      await program.methods
        .vote(pollId, cid, proof)
        .accountsPartial({
          user: publicKey,
          poll: pollPda(programId, pollId),
          candidate: candidatePda(programId, pollId, cid),
          voter: voterPda(programId, pollId, publicKey),
        })
        .rpc();
      setNote("Vote recorded.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Vote failed");
    } finally {
      setBusy(false);
    }
  }

  async function voteRate() {
    setBusy(true);
    setNote(null);
    try {
      const cid = new BN(sel);
      const proof = await proofForWallet();
      await program.methods
        .rateCandidate(pollId, cid, score, proof)
        .accountsPartial({
          user: publicKey,
          poll: pollPda(programId, pollId),
          candidate: candidatePda(programId, pollId, cid),
          rater: raterPda(programId, pollId, publicKey),
          ratingResult: ratingResultPda(programId, pollId, cid),
        })
        .rpc();
      setNote("Rating submitted.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Rating failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded border border-border p-4">
      <h3 className="font-semibold">Vote</h3>
      <p className="mt-1 text-sm text-muted">
        Merkle proofs are built from the invite registration list.
      </p>
      <label className="mt-3 block text-sm">
        Candidate
        <select
          className="mt-1 w-full rounded border border-border px-2 py-1"
          value={sel}
          onChange={(e) => setSel(e.target.value)}
        >
          {candidates.map((c) => (
            <option key={c.cid.toString()} value={c.cid.toString()}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {"rating" in poll.kind && (
        <label className="mt-3 block text-sm">
          Score (1–5)
          <input
            type="range"
            min={1}
            max={5}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="ml-2"
          />
          <span className="ml-2">{score}</span>
        </label>
      )}
      {note && <p className="mt-2 text-sm">{note}</p>}
      <div className="mt-3 flex gap-2">
        {"normal" in poll.kind ? (
          <button
            type="button"
            disabled={busy}
            className="rounded bg-primary px-4 py-2 text-white"
            onClick={voteNormal}
          >
            Submit vote
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            className="rounded bg-primary px-4 py-2 text-white"
            onClick={voteRate}
          >
            Submit rating
          </button>
        )}
        <Link href="/polls" className="rounded border px-4 py-2 text-sm">
          All polls
        </Link>
      </div>
    </section>
  );
}
