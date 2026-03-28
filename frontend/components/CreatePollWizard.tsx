"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useVotexProgram } from "@/hooks/useVotexProgram";
import {
  candidatePda,
  counterPda,
  pollPda,
  ratingResultPda,
  registrationsPda,
} from "@/lib/pdas";
import { votexProgramId } from "@/lib/anchor";
import { ONCHAIN_IPFS_REF_MAX_LEN } from "@/lib/constants";

type Step = 1 | 2 | 3 | 4;

export function CreatePollWizard() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { program } = useVotexProgram();
  const [step, setStep] = useState<Step>(1);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"normal" | "rating">("normal");
  const [access, setAccess] = useState<"open" | "merkle">("open");

  const [regEnd, setRegEnd] = useState("");
  const [voteStart, setVoteStart] = useState("");
  const [voteEnd, setVoteEnd] = useState("");

  const [candidatesText, setCandidatesText] = useState("Option A\nOption B");

  const toUnix = (local: string) =>
    Math.floor(new Date(local).getTime() / 1000);

  async function ensureInit() {
    if (!program || !publicKey) throw new Error("Wallet / program");
    const pid = votexProgramId();
    const c = counterPda(pid);
    try {
      await program.account.counter.fetch(c);
    } catch {
      await program.methods.initialize().accounts({ user: publicKey }).rpc();
    }
  }

  async function uploadMetadata(): Promise<string> {
    const res = await fetch("/api/pinata/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "poll-metadata",
        content: { title, description },
      }),
    });
    const j = (await res.json()) as { cid?: string; error?: string };
    if (!res.ok) {
      throw new Error(j.error ?? "metadata upload failed");
    }
    const cid = j.cid;
    if (!cid) throw new Error("No CID returned from Pinata");
    if (cid.length > ONCHAIN_IPFS_REF_MAX_LEN) {
      throw new Error(
        `Pinned metadata CID is ${cid.length} chars; on-chain limit is ${ONCHAIN_IPFS_REF_MAX_LEN} (store raw CID, not ipfs://…).`,
      );
    }
    return cid;
  }

  async function onSubmit() {
    setErr(null);
    setLoading(true);
    try {
      if (!program || !publicKey) {
        throw new Error("Connect wallet");
      }
      if (!title.trim()) throw new Error("Title is required");
      if (!regEnd || !voteStart || !voteEnd) {
        throw new Error("All date fields are required");
      }
      if (toUnix(regEnd) >= toUnix(voteStart)) {
        throw new Error("Registration end must be before voting start");
      }
      if (toUnix(voteStart) >= toUnix(voteEnd)) {
        throw new Error("Voting start must be before voting end");
      }
      await ensureInit();
      const metadataUri = await uploadMetadata();
      const pid = votexProgramId();
      const counter = await program.account.counter.fetch(counterPda(pid));
      const nextPid = counter.count.add(new BN(1));

      const registrationEnd = new BN(toUnix(regEnd));
      const votingStart = new BN(toUnix(voteStart));
      const votingEnd = new BN(toUnix(voteEnd));

      const kindArg = kind === "normal" ? { normal: {} } : { rating: {} };
      const accessArg =
        access === "open" ? { open: {} } : { merkleRestricted: {} };

      await program.methods
        .createPoll(
          registrationEnd,
          votingStart,
          votingEnd,
          kindArg,
          accessArg,
          metadataUri,
        )
        .accountsPartial({
          user: publicKey,
          poll: pollPda(pid, nextPid),
          counter: counterPda(pid),
        })
        .rpc();

      const names = candidatesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      if (names.length === 0) throw new Error("Add at least one candidate");

      const pollIdBn = nextPid;
      for (const name of names) {
        if (name.length > 32)
          throw new Error(`Name too long (max 32): ${name}`);
        const regs = await program.account.registrations.fetch(
          registrationsPda(pid),
        );
        const cid = regs.count.add(new BN(1));
        await program.methods
          .registerCandidate(pollIdBn, name)
          .accountsPartial({
            user: publicKey,
            poll: pollPda(pid, pollIdBn),
            candidate: candidatePda(pid, pollIdBn, cid),
            ratingResult: ratingResultPda(pid, pollIdBn, cid),
            registrations: registrationsPda(pid),
          })
          .rpc();
      }

      router.push(`/poll/${pollIdBn.toString()}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (!publicKey) {
    return <p className="text-muted">Connect a wallet to create a poll.</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex gap-2 text-sm text-muted">
        {[1, 2, 3, 4].map((s) => (
          <span
            key={s}
            className={step === s ? "font-semibold text-foreground" : ""}
          >
            {s}. {["Details", "Access", "Schedule", "Candidates"][s - 1]}
          </span>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Title</span>
            <input
              className="mt-1 w-full rounded border border-border bg-surface px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Description</span>
            <textarea
              className="mt-1 w-full rounded border border-border bg-surface px-3 py-2"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="rounded bg-primary px-4 py-2 text-white"
            onClick={() => setStep(2)}
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={kind === "normal"}
              onChange={() => setKind("normal")}
            />
            Normal (single choice)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={kind === "rating"}
              onChange={() => setKind("rating")}
            />
            Rating (1–5 per candidate)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={access === "open"}
              onChange={() => setAccess("open")}
            />
            Open voting
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={access === "merkle"}
              onChange={() => setAccess("merkle")}
            />
            Merkle-restricted (invite + commit)
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border px-4 py-2"
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button
              type="button"
              className="rounded bg-primary px-4 py-2 text-white"
              onClick={() => setStep(3)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Local time → stored as Unix seconds.
          </p>
          <label className="block">
            <span className="text-sm font-medium">Registration ends</span>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border border-border bg-surface px-3 py-2"
              value={regEnd}
              onChange={(e) => setRegEnd(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Voting starts</span>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border border-border bg-surface px-3 py-2"
              value={voteStart}
              onChange={(e) => setVoteStart(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Voting ends</span>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded border border-border bg-surface px-3 py-2"
              value={voteEnd}
              onChange={(e) => setVoteEnd(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border px-4 py-2"
              onClick={() => setStep(2)}
            >
              Back
            </button>
            <button
              type="button"
              className="rounded bg-primary px-4 py-2 text-white"
              onClick={() => setStep(4)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">
              Candidates (one per line)
            </span>
            <textarea
              className="mt-1 w-full rounded border border-border bg-surface px-3 py-2 font-mono text-sm"
              rows={6}
              value={candidatesText}
              onChange={(e) => setCandidatesText(e.target.value)}
            />
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border px-4 py-2"
              onClick={() => setStep(3)}
            >
              Back
            </button>
            <button
              type="button"
              disabled={loading}
              className="rounded bg-primary px-4 py-2 text-white disabled:opacity-50"
              onClick={onSubmit}
            >
              {loading ? "Submitting…" : "Create on-chain"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
