"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import bs58Import from "bs58";
import dynamic from "next/dynamic";
import {
  ChartNoAxesCombined,
  ChevronDown,
  Clock3,
  ExternalLink,
  Landmark,
  Lock,
  MapPinned,
  ShieldCheck,
  StickyNote,
  Vote,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { Badge } from "@/components/ui/badge";
import { useVotexProgram } from "@/hooks/useVotexProgram";
import {
  ONCHAIN_IPFS_REF_MAX_LEN,
  SOLANA_CLUSTER_LABEL,
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
import { nowUnix } from "@/lib/poll-utils";

const ResultsChart = dynamic(
  () =>
    import("recharts").then((m) => {
      const {
        Bar,
        BarChart,
        CartesianGrid,
        ResponsiveContainer,
        Tooltip,
        XAxis,
        YAxis,
      } = m;

      function Chart({ data }: { data: { name: string; percent: number }[] }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="rgba(148, 163, 184, 0.18)"
              />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                tickFormatter={(value) => `${value}%`}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={40}
              />
              <Tooltip
                cursor={{ fill: "rgba(125, 211, 252, 0.08)" }}
                formatter={(value: number) => [
                  `${Math.round(value)}%`,
                  "Share",
                ]}
              />
              <Bar
                dataKey="percent"
                fill="url(#pollResults)"
                radius={[10, 10, 4, 4]}
              />
              <defs>
                <linearGradient id="pollResults" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        );
      }

      return Chart;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-full animate-pulse rounded-2xl bg-muted/70" />
    ),
  },
);

type PollOverview = {
  id: string;
  title: string;
  description: string;
  kind: "normal" | "rating";
  kindLabel: string;
  accessMode: "open" | "merkleRestricted";
  accessLabel: string;
  phase: string;
  creator: string;
  isFrozen: boolean;
  registrationEnd: number;
  votingStart: number;
  votingEnd: number;
  metaHref: string | null;
  contentCid: string | null;
  explorerHref: string;
  totalVotes: number;
  candidates: Array<{
    cid: string;
    name: string;
    votes: number;
    percent: number;
  }>;
};

type Props = { pollIdStr: string };

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp * 1000));
}

function formatShortCountdown(targetUnix: number) {
  const diff = Math.max(targetUnix - nowUnix(), 0);
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  if (minutes > 0) return `${minutes}m left`;
  return "Ending soon";
}

function phaseLabel(phase: string) {
  if (phase === "voting") return "Active";
  if (phase === "ended") return "Ended";
  return "Upcoming";
}

function phaseTone(phase: string) {
  if (phase === "voting") {
    return "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  }
  if (phase === "ended") {
    return "border-border/70 bg-background/70 text-muted-foreground";
  }
  return "border-sky-500/20 bg-sky-500/12 text-sky-700 dark:text-sky-300";
}

function generatedCoverClass(id: string) {
  const index = Number(id) % 4;
  const variants = [
    "from-sky-100 via-white to-cyan-100 dark:from-slate-800 dark:via-slate-900 dark:to-cyan-950/70",
    "from-emerald-100 via-white to-teal-100 dark:from-slate-800 dark:via-slate-900 dark:to-emerald-950/70",
    "from-indigo-100 via-white to-sky-100 dark:from-slate-800 dark:via-slate-900 dark:to-indigo-950/70",
    "from-cyan-100 via-white to-blue-100 dark:from-slate-800 dark:via-slate-900 dark:to-sky-950/70",
  ] as const;
  return variants[index];
}

function PollCoverArtwork({
  title,
  kind,
  pollId,
}: {
  title: string;
  kind: string;
  pollId: string;
}) {
  return (
    <div
      className={`relative h-40 overflow-hidden rounded-[1.5rem] border border-border/70 bg-linear-to-br ${generatedCoverClass(
        pollId,
      )}`}
    >
      <div className="absolute inset-0 opacity-40 bg-[linear-gradient(to_right,rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.14)_1px,transparent_1px)] bg-size-[26px_26px]" />
      <div className="absolute left-1/2 top-4 h-24 w-24 -translate-x-1/2 rounded-full border border-white/40 bg-white/30 blur-2xl dark:border-primary/10 dark:bg-primary/10" />
      <div className="absolute inset-x-0 bottom-6 flex justify-center">
        <div className="rounded-sm bg-red-600 px-4 py-2 text-sm font-extrabold uppercase tracking-[0.08em] text-white shadow-lg">
          {kind}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-t-full border border-border/60 border-b-0 bg-white/55 backdrop-blur dark:bg-slate-900/40">
          <Landmark className="size-9 text-primary/70" />
        </div>
      </div>
      <div className="absolute left-4 top-4 rounded-full border border-white/50 bg-white/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-700 backdrop-blur dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-200">
        {title.slice(0, 22)}
      </div>
    </div>
  );
}

export function PollDetailClient({ pollIdStr }: Props) {
  const { publicKey } = useWallet();
  const { program } = useVotexProgram();
  const [overview, setOverview] = useState<PollOverview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const pid = useMemo(() => new BN(pollIdStr), [pollIdStr]);
  const loadGenRef = useRef(0);

  const load = useCallback(async () => {
    const gen = ++loadGenRef.current;
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/polls/${pollIdStr}/overview`, {
        cache: "no-store",
      });
      const data = (await res.json()) as PollOverview & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load poll");
      }
      if (gen !== loadGenRef.current) return;
      setOverview(data);
    } catch (e) {
      if (gen === loadGenRef.current) {
        setErr(e instanceof Error ? e.message : "Failed to load poll");
      }
    } finally {
      if (gen === loadGenRef.current) {
        setLoading(false);
      }
    }
  }, [pollIdStr]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="glass-panel rounded-[1.75rem] px-5 py-8 text-muted-foreground">
        Loading poll…
      </div>
    );
  }

  if (err || !overview) {
    return (
      <div className="rounded-[1.5rem] border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
        {err ?? "Poll not found"}
      </div>
    );
  }

  const isCreator = publicKey?.toBase58() === overview.creator;
  const chartData = overview.candidates.map((candidate) => ({
    name: candidate.name,
    percent: Math.round(candidate.percent),
  }));
  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-6">
          <section className="glass-panel rounded-[1.85rem] p-5 sm:p-6">
            <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
              <PollCoverArtwork
                title={overview.title}
                kind={overview.kindLabel}
                pollId={overview.id}
              />
              <div>
                <h2 className="font-heading text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
                  {overview.title}
                </h2>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    {overview.creator.slice(0, 8)}…{overview.creator.slice(-6)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="size-4 text-primary" />
                    {overview.phase === "voting"
                      ? formatShortCountdown(overview.votingEnd)
                      : overview.phase === "ended"
                        ? "Voting ended"
                        : `Starts ${formatDateTime(overview.votingStart)}`}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={`rounded-full px-3 py-1 text-sm ${phaseTone(
                      overview.phase,
                    )}`}
                  >
                    <span className="size-2 rounded-full bg-current opacity-75" />
                    {phaseLabel(overview.phase)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-border/70 bg-background/65 px-3 py-1 text-sm text-muted-foreground"
                  >
                    <ChartNoAxesCombined className="size-3.5" />
                    {overview.totalVotes} vote
                    {overview.totalVotes === 1 ? "" : "s"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-border/70 bg-background/65 px-3 py-1 text-sm text-muted-foreground"
                  >
                    <MapPinned className="size-3.5" />
                    {SOLANA_CLUSTER_LABEL}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-full border-border/70 bg-background/65 px-3 py-1 text-sm text-muted-foreground"
                  >
                    <Vote className="size-3.5" />
                    {overview.kindLabel}
                  </Badge>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-[1.85rem] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-rose-500/14 px-4 py-2 text-sm font-medium text-rose-700 dark:text-rose-300">
                  All outcomes
                </div>
                <div className="rounded-full border border-border/70 bg-background/60 px-4 py-2 text-sm text-muted-foreground">
                  Results snapshot
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {["1H", "24H", "7D", "All"].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    className={`rounded-full px-4 py-2 text-sm ${
                      index === 3
                        ? "bg-rose-500/14 text-rose-700 dark:text-rose-300"
                        : "border border-border/70 bg-background/60 text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-border/70 bg-background/45 p-4">
              <div className="mb-4 flex flex-wrap gap-4 text-sm">
                {overview.candidates.map((candidate, index) => (
                  <div key={candidate.cid} className="flex items-center gap-2">
                    <span
                      className={`size-2.5 rounded-full ${
                        index === 0
                          ? "bg-violet-500"
                          : index === 1
                            ? "bg-orange-500"
                            : "bg-sky-500"
                      }`}
                    />
                    <span>{candidate.name}</span>
                  </div>
                ))}
              </div>
              <div className="h-72">
                <ResultsChart data={chartData} />
              </div>
            </div>
          </section>

          <details className="group rounded-[1.85rem] border border-rose-500/20 bg-rose-500/10 p-5 sm:p-6 open:[&_.rules-chevron]:rotate-180">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <div className="flex min-w-0 flex-1 items-center gap-2 text-foreground">
                <ShieldCheck className="size-5 shrink-0 text-rose-500" />
                <h3 className="text-xl font-semibold tracking-[-0.03em]">
                  Rules
                </h3>
              </div>
              <ChevronDown className="rules-chevron size-5 shrink-0 text-rose-500 transition-transform duration-200" />
            </summary>
            <div className="mt-3 rounded-[1.35rem] border border-rose-500/15 bg-background/75 p-5 text-sm text-foreground/92">
              <p>
                This poll measures public opinion among verified users. Each
                user may cast one vote per poll, and once submitted, votes
                cannot be changed or withdrawn.
              </p>
              <p><br />
                The poll resolves based on aggregated valid responses submitted
                before the designated closing time. Votes submitted after the
                poll closes will not be counted.
              </p>
              <p><br />Responses are considered valid only if:</p>
              <ul className="list-disc pl-10 text-foreground/90">
                <li>The user selects one of the predefined options.</li>
                <li>The poll is active at the time of submission.</li>
                <li>
                  The participant is a verified user, ensuring protection
                  against duplicate or automated voting.
                </li>
              </ul>
              <p><br />
                Participation is limited to verified users to preserve the
                integrity, fairness, and reliability of the poll results.
              </p>
              <p><br />
                Poll results reflect public sentiment at the time of voting and
                are not legally binding. VoteX records results in a verifiable
                and auditable manner while keeping individual votes private.
              </p>
              <p><br />
                The poll may resolve early if a clearly defined majority
                threshold is reached before the scheduled closing time.
                Otherwise, it resolves at the stated end time.
              </p>
            </div>
          </details>

          <details className="group rounded-[1.85rem] border border-rose-500/20 bg-rose-500/10 p-5 sm:p-6 open:[&_.notes-chevron]:rotate-180">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <div className="flex min-w-0 flex-1 items-center gap-2 text-foreground">
                <StickyNote className="size-5 shrink-0 text-rose-500" />
                <h3 className="text-xl font-semibold tracking-[-0.03em]">
                  Creator notes
                </h3>
              </div>
              <ChevronDown className="notes-chevron size-5 shrink-0 text-rose-500 transition-transform duration-200" />
            </summary>
            <div className="mt-5 rounded-[1.35rem] border border-rose-500/15 bg-background/75 p-5 text-sm leading-7 text-foreground/92">
              {overview.description ? (
                <p className="whitespace-pre-wrap border-l-[3px] border-rose-400/55 pl-4 dark:border-rose-400/40">
                  {overview.description}
                </p>
              ) : (
                <p className="rounded-lg border border-rose-500/20 bg-rose-500/8 px-3 py-2.5 text-rose-800 dark:text-rose-200/90">
                  No creator description has been provided for this poll.
                </p>
              )}
            </div>
          </details>
        </div>

        <aside className="space-y-6">
          <section className="glass-panel rounded-[1.85rem] p-5 sm:p-6">
            <h3 className="text-center font-heading text-3xl font-semibold tracking-[-0.05em]">
              Vote overview
            </h3>
            <p className="mt-3 text-center text-sm leading-7 text-muted-foreground">
              Results are computed from the current on-chain state and presented
              without additional client RPC bootstrapping.
            </p>

            <div className="mt-6 space-y-3">
              {overview.candidates.map((candidate, index) => (
                <div
                  key={candidate.cid}
                  className={`rounded-[1.25rem] border px-4 py-3 ${
                    index === 0
                      ? "border-violet-500/40 bg-violet-500/8"
                      : index === 1
                        ? "border-rose-500/30 bg-rose-500/6"
                        : "border-emerald-500/25 bg-emerald-500/6"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-foreground">
                      {candidate.name}
                    </span>
                    <span className="text-lg font-semibold text-foreground">
                      {formatPercent(candidate.percent)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-border/70 bg-background/55 px-4 py-4 text-center text-sm text-muted-foreground">
              <Lock className="mx-auto mb-2 size-4 text-primary" />
              Live poll detail loaded through a single cached overview request.
            </div>

            <div className="mt-5 grid gap-3">
              <a
                href={overview.explorerHref}
                target="_blank"
                rel="noreferrer"
                className="button-primary-premium justify-center gap-2 text-sm"
              >
                View on Solana Explorer
                <ExternalLink className="size-4" />
              </a>
              {overview.metaHref ? (
                <a
                  href={overview.metaHref}
                  target="_blank"
                  rel="noreferrer"
                  className="button-secondary-premium justify-center gap-2 text-sm"
                >
                  Open metadata
                  <ExternalLink className="size-4" />
                </a>
              ) : null}
            </div>
          </section>

          <section className="glass-panel rounded-[1.85rem] p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-semibold tracking-[-0.04em]">
                Poll metadata
              </h3>
              <span className="text-sm text-muted-foreground">
                PID #{overview.id}
              </span>
            </div>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`rounded-md border px-4 py-2 text-sm ${phaseTone(overview.phase)}`}
                >
                  {phaseLabel(overview.phase)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(
                    overview.phase === "ended"
                      ? overview.votingEnd
                      : overview.votingStart,
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/55 px-4 py-3">
                <span className="text-sm font-medium text-foreground">
                  Created window
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(overview.registrationEnd)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/55 px-4 py-3">
                <span className="text-sm font-medium text-foreground">
                  Voting closes
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(overview.votingEnd)}
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="space-y-6">
        {publicKey &&
          isCreator &&
          overview.accessMode === "merkleRestricted" &&
          overview.phase === "registration" && (
            <InviteManagerPanel pollId={pid} />
          )}

        {publicKey &&
          !isCreator &&
          overview.accessMode === "merkleRestricted" &&
          overview.phase === "registration" && (
            <RegisterWithInvitePanel pollId={pid} publicKey={publicKey} />
          )}

        {publicKey &&
          program &&
          isCreator &&
          overview.accessMode === "merkleRestricted" &&
          !overview.isFrozen &&
          nowUnix() > overview.registrationEnd &&
          nowUnix() < overview.votingStart && (
            <CommitPanel pollId={pid} program={program} onDone={load} />
          )}

        {publicKey && program && overview.phase === "voting" && (
          <VotePanel
            kind={overview.kind}
            accessMode={overview.accessMode}
            pollId={pid}
            candidates={overview.candidates}
            program={program}
            publicKey={publicKey}
            onDone={load}
          />
        )}
      </div>
    </div>
  );
}

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
    <section className="glass-panel space-y-4 rounded-[1.75rem] p-5">
      <div>
        <h3 className="font-semibold">Invite manager</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate one-time invite codes during the registration window. Share
          each code privately with one voter. After voting opens you must commit
          eligibility.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          How many codes
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="input-premium mt-2 w-28"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={generate}
          className="button-primary-premium disabled:opacity-50"
        >
          {busy ? "Generating…" : "Generate codes"}
        </button>
      </div>

      {msg && (
        <p className="rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-foreground">
          {msg}
        </p>
      )}

      {codes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              New codes (copy and send to voters)
            </p>
            <button
              type="button"
              onClick={copyAll}
              className="button-secondary-premium px-3 py-2 text-xs"
            >
              {copied === "__all__" ? "Copied all!" : "Copy all"}
            </button>
          </div>
          <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-[1.2rem] border border-border/70 bg-background/55">
            {codes.map((c) => (
              <li
                key={c}
                className="flex items-center justify-between px-3 py-2"
              >
                <code className="font-mono text-sm tracking-wider">{c}</code>
                <button
                  type="button"
                  onClick={() => copyCode(c)}
                  className="button-secondary-premium ml-4 px-3 py-1 text-xs"
                >
                  {copied === c ? "Copied!" : "Copy"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            Registered wallets ({registrations.length})
          </p>
          <button
            type="button"
            onClick={refreshRegistrations}
            disabled={loadingRegs}
            className="button-secondary-premium px-3 py-2 text-xs disabled:opacity-50"
          >
            {loadingRegs ? "Refreshing…" : "Refresh"}
          </button>
        </div>
        {registrations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No wallets registered yet.
          </p>
        ) : (
          <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-[1.2rem] border border-border/70 bg-background/55">
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
      const message = new TextEncoder().encode(
        `register:${pollIdStr}:${publicKey.toBase58()}`,
      );
      const sigBytes = await signMessage(message);
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
    <section className="glass-panel space-y-3 rounded-[1.75rem] p-5">
      <div>
        <h3 className="font-semibold">Register to vote</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the invite code the poll creator sent you. Your wallet (
          <code className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs">
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
          className="input-premium flex-1 font-mono text-sm"
        />
        <button
          type="button"
          disabled={busy || !code.trim()}
          onClick={register}
          className="button-primary-premium disabled:opacity-50"
        >
          {busy ? "Signing & registering…" : "Register"}
        </button>
      </div>
      {msg && (
        <p
          className={`rounded-2xl px-3 py-2 text-sm ${
            msg.ok
              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {msg.text}
        </p>
      )}
    </section>
  );
}

function CommitPanel({
  pollId,
  program,
  onDone,
}: {
  pollId: BN;
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
    <section className="glass-panel rounded-[1.75rem] p-5">
      <h3 className="font-semibold">Commit eligibility</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Uploads canonical voter list + commits Merkle root (invites must be
        registered first).
      </p>
      <button
        type="button"
        disabled={busy}
        className="button-primary-premium mt-3 disabled:opacity-50"
        onClick={commit}
      >
        {busy ? "Committing…" : "Build list, pin, commit on-chain"}
      </button>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </section>
  );
}

function VotePanel({
  kind,
  accessMode,
  pollId,
  candidates,
  program,
  publicKey,
  onDone,
}: {
  kind: "normal" | "rating";
  accessMode: "open" | "merkleRestricted";
  pollId: BN;
  candidates: Array<{ cid: string; name: string; votes: number }>;
  program: NonNullable<ReturnType<typeof useVotexProgram>["program"]>;
  publicKey: PublicKey;
  onDone: () => void;
}) {
  const programId = votexProgramId();
  const [sel, setSel] = useState<string>(candidates[0]?.cid ?? "");
  const [score, setScore] = useState(3);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSel(candidates[0]?.cid ?? "");
  }, [candidates]);

  async function proofForWallet(): Promise<number[][]> {
    if (accessMode === "open") return [];
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
      onDone();
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
      onDone();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Rating failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass-panel rounded-[1.75rem] p-5">
      <h3 className="font-semibold">Vote</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Merkle proofs are built from the invite registration list.
      </p>
      <label className="mt-3 block text-sm">
        Candidate
        <select
          className="input-premium mt-2"
          value={sel}
          onChange={(e) => setSel(e.target.value)}
        >
          {candidates.map((c) => (
            <option key={c.cid} value={c.cid}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {kind === "rating" && (
        <label className="mt-3 block text-sm">
          Score (1–5)
          <input
            type="range"
            min={1}
            max={5}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="ml-2 accent-primary"
          />
          <span className="ml-2">{score}</span>
        </label>
      )}
      {note && <p className="mt-2 text-sm">{note}</p>}
      <div className="mt-3 flex gap-2">
        {kind === "normal" ? (
          <button
            type="button"
            disabled={busy}
            className="button-primary-premium"
            onClick={voteNormal}
          >
            Submit vote
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            className="button-primary-premium"
            onClick={voteRate}
          >
            Submit rating
          </button>
        )}
        <Link href="/polls" className="button-secondary-premium text-sm">
          All polls
        </Link>
      </div>
    </section>
  );
}
