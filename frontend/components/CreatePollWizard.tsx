"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import {
  ComputeBudgetProgram,
  Connection,
  SendTransactionError,
  Transaction,
} from "@solana/web3.js";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  Users,
  Vote,
  Wallet,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useVotexProgram } from "@/hooks/useVotexProgram";
import { votexProgramId } from "@/lib/anchor";
import { ONCHAIN_IPFS_REF_MAX_LEN } from "@/lib/constants";
import {
  candidatePda,
  counterPda,
  pollPda,
  ratingResultPda,
  registrationsPda,
} from "@/lib/pdas";

type Step = 1 | 2 | 3 | 4;

const steps = [
  { label: "Details", icon: Vote },
  { label: "Access", icon: Users },
  { label: "Schedule", icon: Calendar },
  { label: "Candidates", icon: ChevronRight },
] as const;

const minuteMs = 60 * 1000;

async function formatSolanaTxError(
  e: unknown,
  connection: Connection,
): Promise<string> {
  if (e instanceof SendTransactionError) {
    let msg = e.message;
    try {
      const logs = await e.getLogs(connection);
      if (logs?.length) msg += `\n\n${logs.join("\n")}`;
    } catch {
      /* log fetch is best-effort */
    }
    return msg;
  }
  return e instanceof Error ? e.message : "Failed";
}

function toDateTimeLocalValue(date: Date) {
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive">
      <span className="inline-block size-1 rounded-full bg-destructive" />
      {msg}
    </p>
  );
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-1.5 block text-sm font-medium text-foreground/90">
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </span>
  );
}

export function CreatePollWizard() {
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { program } = useVotexProgram();
  const [step, setStep] = useState<Step>(1);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const submitLockRef = useRef(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<"normal" | "rating">("normal");
  const [access, setAccess] = useState<"open" | "merkle">("open");

  const [regEnd, setRegEnd] = useState("");
  const [voteStart, setVoteStart] = useState("");
  const [voteEnd, setVoteEnd] = useState("");

  const [candidates, setCandidates] = useState(["Option A", "Option B"]);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});

  const toUnix = (local: string) =>
    Math.floor(new Date(local).getTime() / 1000);
  const nowUnix = () => Math.floor(Date.now() / 1000);
  const minDateTime = toDateTimeLocalValue(new Date());
  const minVoteEndDateTime = voteStart || minDateTime;

  function addCandidate() {
    setCandidates((prev) => [...prev, ""]);
  }

  function updateCandidate(index: number, value: string) {
    setCandidates((prev) => prev.map((c, i) => (i === index ? value : c)));
  }

  function removeCandidate(index: number) {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      setFieldErr((prev) => ({ ...prev, image: "Image must be under 5 MB." }));
      return;
    }
    setFieldErr((prev) => {
      const next = { ...prev };
      delete next.image;
      return next;
    });
    setCoverImage(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setCoverImage(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const parsedCandidates = candidates.map((s) => s.trim()).filter(Boolean);

  function validateStep(targetStep: Step) {
    const nextErrors: Record<string, string> = {};
    const now = nowUnix();

    if (targetStep >= 1) {
      if (!title.trim()) nextErrors.title = "Title is required.";
      if (title.trim().length > 120)
        nextErrors.title = "Title must be 120 characters or less.";
    }

    if (targetStep >= 3) {
      if (access === "merkle" && !regEnd)
        nextErrors.regEnd =
          "Registration end is required for restricted polls.";
      if (!voteStart) nextErrors.voteStart = "Voting start is required.";
      if (!voteEnd) nextErrors.voteEnd = "Voting end is required.";

      if (regEnd && toUnix(regEnd) < now)
        nextErrors.regEnd = "Registration end cannot be in the past.";
      if (voteStart && toUnix(voteStart) < now)
        nextErrors.voteStart = "Voting start cannot be in the past.";
      if (voteEnd && toUnix(voteEnd) < now)
        nextErrors.voteEnd = "Voting end cannot be in the past.";
      if (voteStart && voteEnd && toUnix(voteStart) >= toUnix(voteEnd))
        nextErrors.voteEnd = "Voting end must be after voting start.";
      if (
        access === "merkle" &&
        regEnd &&
        voteStart &&
        toUnix(regEnd) >= toUnix(voteStart)
      )
        nextErrors.regEnd = "Registration end must be before voting start.";
    }

    if (targetStep >= 4) {
      if (parsedCandidates.length < 2)
        nextErrors.candidates = "Add at least two candidates.";
      const tooLong = parsedCandidates.find((n) => n.length > 32);
      if (tooLong)
        nextErrors.candidates = `Name too long (max 32 chars): "${tooLong}"`;
    }

    setFieldErr(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goToStep(nextStep: Step) {
    setErr(null);
    if (nextStep > step && !validateStep(step)) return;
    setStep(nextStep);
  }

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

  async function uploadImageToIpfs(): Promise<string | undefined> {
    if (!coverImage) return undefined;
    const form = new FormData();
    form.append("file", coverImage, coverImage.name);
    form.append("name", `poll-cover-${Date.now()}`);
    const res = await fetch("/api/pinata/file", {
      method: "POST",
      body: form,
    });
    const j = (await res.json()) as { cid?: string; error?: string };
    if (!res.ok) throw new Error(j.error ?? "Image upload failed");
    if (!j.cid) throw new Error("No CID returned for image");
    return j.cid;
  }

  async function uploadMetadata(): Promise<string> {
    const imageCid = await uploadImageToIpfs();
    const content: Record<string, unknown> = { title, description };
    if (imageCid) content.image = imageCid;

    const res = await fetch("/api/pinata/json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "poll-metadata", content }),
    });
    const j = (await res.json()) as { cid?: string; error?: string };
    if (!res.ok) throw new Error(j.error ?? "metadata upload failed");
    const cid = j.cid;
    if (!cid) throw new Error("No CID returned from Pinata");
    if (cid.length > ONCHAIN_IPFS_REF_MAX_LEN)
      throw new Error(
        `CID is ${cid.length} chars; on-chain limit is ${ONCHAIN_IPFS_REF_MAX_LEN}.`,
      );
    return cid;
  }

  async function onSubmit() {
    setErr(null);
    if (!validateStep(4)) return;
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setLoading(true);
    try {
      if (!program || !publicKey) throw new Error("Connect wallet");
      await ensureInit();
      const metadataUri = await uploadMetadata();
      const pid = votexProgramId();
      const counter = await program.account.counter.fetch(counterPda(pid));
      const nextPid = counter.count.add(new BN(1));

      const registrationUnix =
        access === "open"
          ? Math.max(nowUnix(), toUnix(voteStart) - Math.floor(minuteMs / 1000))
          : toUnix(regEnd);
      const registrationEnd = new BN(registrationUnix);
      const votingStart = new BN(toUnix(voteStart));
      const votingEnd = new BN(toUnix(voteEnd));

      const kindArg = kind === "normal" ? { normal: {} } : { rating: {} };
      const accessArg =
        access === "open" ? { open: {} } : { merkleRestricted: {} };

      const names = parsedCandidates;
      if (names.length < 2) throw new Error("Add at least two candidates");

      const pollIdBn = nextPid;
      const tx = new Transaction();
      tx.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 1_000_000,
        }),
      );
      tx.add(
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
            poll: pollPda(pid, pollIdBn),
            counter: counterPda(pid),
          })
          .instruction(),
      );

      // Batch candidate registrations in the same transaction to reduce RPC round-trips.
      for (let i = 0; i < names.length; i++) {
        const name = names[i];
        if (name.length > 32)
          throw new Error(`Name too long (max 32): ${name}`);
        const cidBn = new BN(i + 1);
        tx.add(
          await program.methods
            .registerCandidate(pollIdBn, name)
            .accountsPartial({
              user: publicKey,
              poll: pollPda(pid, pollIdBn),
              candidate: candidatePda(pid, pollIdBn, cidBn),
              ratingResult: ratingResultPda(pid, pollIdBn, cidBn),
              registrations: registrationsPda(pid),
            })
            .instruction(),
        );
      }

      const sendAndConfirm = program.provider.sendAndConfirm;
      if (!sendAndConfirm) {
        throw new Error("Wallet provider cannot send transactions");
      }
      await sendAndConfirm.call(program.provider, tx);

      router.push(`/poll/${pollIdBn.toString()}`);
    } catch (e) {
      const msg = await formatSolanaTxError(e, connection);
      const hint =
        /already been processed/i.test(msg) &&
        "\n\nIf you clicked Create twice or retried quickly, the first transaction may have succeeded—check the poll on-chain before trying again.";
      setErr(msg + (hint || ""));
    } finally {
      submitLockRef.current = false;
      setLoading(false);
    }
  }

  if (!publicKey) {
    return (
      <div className="glass-panel flex items-center gap-4 rounded-[1.75rem] px-6 py-8">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Wallet className="size-5" />
        </div>
        <div>
          <p className="font-medium">Wallet not connected</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Connect a wallet to create a poll.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Step indicator */}
      <div className="glass-panel rounded-[1.75rem] px-5 py-4">
        <div className="flex items-center justify-between">
          {steps.map(({ label, icon: Icon }, idx) => {
            const s = (idx + 1) as Step;
            const done = step > s;
            const active = step === s;
            return (
              <div key={s} className="flex flex-1 items-center">
                <button
                  type="button"
                  onClick={() => {
                    if (s < step) goToStep(s);
                  }}
                  disabled={s >= step}
                  className={`group flex flex-col items-center gap-1.5 disabled:cursor-default ${s < step ? "cursor-pointer" : ""}`}
                >
                  <div
                    className={`flex size-9 items-center justify-center rounded-2xl border text-xs font-semibold transition-all duration-200 ${
                      done
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : active
                          ? "border-primary bg-primary text-primary-foreground shadow-[0_6px_20px_-8px_var(--primary)]"
                          : "border-border/70 bg-background/60 text-muted-foreground"
                    }`}
                  >
                    {done ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                  </div>
                  <span
                    className={`hidden text-[0.65rem] font-medium tracking-wide sm:block ${
                      active
                        ? "text-foreground"
                        : done
                          ? "text-primary/80"
                          : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <div className="mx-1 h-px flex-1 sm:mx-2">
                    <div
                      className={`h-full transition-all duration-300 ${
                        step > s ? "bg-primary/40" : "bg-border/60"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="glass-panel rounded-[1.85rem] p-6 sm:p-8">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Step 1 of 4
            </p>
            <h2 className="mt-2 font-heading text-[1.6rem] font-semibold leading-tight tracking-[-0.04em]">
              Frame your poll
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Give voters enough context to make an informed choice.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <Label required>Title</Label>
              <input
                className="input-premium"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Which feature should we ship next?"
                maxLength={120}
              />
              <div className="mt-1.5 flex items-start justify-between gap-2">
                <FieldError msg={fieldErr.title} />
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {title.length}/120
                </span>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <textarea
                className="input-premium resize-none"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide any background voters should know before casting a vote."
              />
            </div>

            <div>
              <Label>Cover image</Label>
              <p className="mb-2 text-xs text-muted-foreground">
                Optional · JPG, PNG, GIF or WebP · max 5 MB
              </p>
              {coverPreview ? (
                <div className="relative w-full overflow-hidden rounded-2xl border border-border/70">
                  <Image
                    src={coverPreview}
                    alt="Cover preview"
                    width={600}
                    height={240}
                    className="h-40 w-full object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full border border-white/40 bg-black/50 text-white transition hover:bg-black/70"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 py-8 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                >
                  <ImagePlus className="size-5" />
                  Click to upload a cover image
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <FieldError msg={fieldErr.image} />
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                className="button-primary-premium gap-2"
                onClick={() => goToStep(2)}
              >
                Continue
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Access */}
      {step === 2 && (
        <div className="glass-panel rounded-[1.85rem] p-6 sm:p-8">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Step 2 of 4
            </p>
            <h2 className="mt-2 font-heading text-[1.6rem] font-semibold leading-tight tracking-[-0.04em]">
              Voting type & access
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Choose how voters interact and who is eligible.
            </p>
          </div>

          <div className="space-y-6">
            {/* Poll kind */}
            <div>
              <p className="mb-3 text-sm font-medium text-foreground/90">
                Poll type
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      value: "normal",
                      title: "Single choice",
                      desc: "Each voter picks one option.",
                    },
                    {
                      value: "rating",
                      title: "Rating",
                      desc: "Rate each candidate 1–5.",
                    },
                  ] as const
                ).map(({ value, title: t, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setKind(value)}
                    className={`group relative w-full rounded-2xl border px-4 py-4 text-left transition-all duration-150 ${
                      kind === value
                        ? "border-primary/40 bg-primary/8 shadow-[0_0_0_1px_var(--primary)/20]"
                        : "border-border/70 bg-background/50 hover:border-border hover:bg-background/70"
                    }`}
                  >
                    {kind === value && (
                      <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" />
                      </span>
                    )}
                    <p className="text-sm font-semibold">{t}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Access kind */}
            <div>
              <p className="mb-3 text-sm font-medium text-foreground/90">
                Voter eligibility
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    {
                      value: "open",
                      title: "Open",
                      desc: "Anyone with a wallet can vote.",
                    },
                    {
                      value: "merkle",
                      title: "Invite-only",
                      desc: "Merkle-restricted to a specific list.",
                    },
                  ] as const
                ).map(({ value, title: t, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAccess(value)}
                    className={`group relative w-full rounded-2xl border px-4 py-4 text-left transition-all duration-150 ${
                      access === value
                        ? "border-primary/40 bg-primary/8 shadow-[0_0_0_1px_var(--primary)/20]"
                        : "border-border/70 bg-background/50 hover:border-border hover:bg-background/70"
                    }`}
                  >
                    {access === value && (
                      <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3" />
                      </span>
                    )}
                    <p className="text-sm font-semibold">{t}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="ghost"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => goToStep(1)}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                type="button"
                className="button-primary-premium gap-2"
                onClick={() => goToStep(3)}
              >
                Continue
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Schedule */}
      {step === 3 && (
        <div className="glass-panel rounded-[1.85rem] p-6 sm:p-8">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Step 3 of 4
            </p>
            <h2 className="mt-2 font-heading text-[1.6rem] font-semibold leading-tight tracking-[-0.04em]">
              Set the schedule
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              All times are local - stored as Unix seconds on-chain.
            </p>
          </div>

          <div className="space-y-5">
            {access === "merkle" ? (
              <div>
                <Label required>Registration ends</Label>
                <input
                  type="datetime-local"
                  className="input-premium"
                  value={regEnd}
                  min={minDateTime}
                  onChange={(e) => setRegEnd(e.target.value)}
                />
                <FieldError msg={fieldErr.regEnd} />
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3">
                <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="size-3" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Open voting - no registration deadline required.
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label required>Voting starts</Label>
                <input
                  type="datetime-local"
                  className="input-premium"
                  value={voteStart}
                  min={minDateTime}
                  onChange={(e) => setVoteStart(e.target.value)}
                />
                <FieldError msg={fieldErr.voteStart} />
              </div>
              <div>
                <Label required>Voting ends</Label>
                <input
                  type="datetime-local"
                  className="input-premium"
                  value={voteEnd}
                  min={minVoteEndDateTime}
                  onChange={(e) => setVoteEnd(e.target.value)}
                />
                <FieldError msg={fieldErr.voteEnd} />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="ghost"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => goToStep(2)}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                type="button"
                className="button-primary-premium gap-2"
                onClick={() => goToStep(4)}
              >
                Continue
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Candidates */}
      {step === 4 && (
        <div className="glass-panel rounded-[1.85rem] p-6 sm:p-8">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Step 4 of 4
            </p>
            <h2 className="mt-2 font-heading text-[1.6rem] font-semibold leading-tight tracking-[-0.04em]">
              Add candidates
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Minimum 2 · max 32 characters each.
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              {candidates.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <input
                    className="input-premium flex-1"
                    value={c}
                    onChange={(e) => updateCandidate(i, e.target.value)}
                    placeholder={`Candidate ${i + 1}`}
                    maxLength={32}
                  />
                  <button
                    type="button"
                    onClick={() => removeCandidate(i)}
                    disabled={candidates.length <= 2}
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/60 text-muted-foreground transition hover:border-destructive/40 hover:bg-destructive/8 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addCandidate}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 py-3 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              <Plus className="size-4" />
              Add candidate
            </button>

            <FieldError msg={fieldErr.candidates} />

            {err && (
              <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/8 px-4 py-3">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                  <span className="text-[9px] font-bold">!</span>
                </span>
                <p className="text-sm text-destructive">{err}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <Button
                type="button"
                variant="ghost"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => goToStep(3)}
              >
                <ArrowLeft className="size-4" />
                Back
              </Button>
              <Button
                type="button"
                disabled={loading}
                className="button-primary-premium gap-2 disabled:opacity-50"
                onClick={onSubmit}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    Create poll
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
