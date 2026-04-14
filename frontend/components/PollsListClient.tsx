"use client";

import {
  ChartNoAxesCombined,
  Clock3,
  Landmark,
  MapPin,
  Vote,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { SOLANA_CLUSTER_LABEL } from "@/lib/constants";
import { nowUnix } from "@/lib/poll-utils";

type PollRow = {
  id: string;
  title: string;
  imageHref: string | null;
  kindLabel: string;
  accessLabel: string;
  phase: string;
  registrationEnd: number;
  votingStart: number;
  votingEnd: number;
  totalVotes: number;
  candidates: Array<{
    name: string;
    value: number;
    percent: number;
  }>;
};

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatCompactDuration(targetUnix: number) {
  const diff = Math.max(targetUnix - nowUnix(), 0);
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  if (minutes > 0) return `${minutes}m left`;
  return "Ending soon";
}

function statusLabel(phase: string) {
  if (phase === "voting") return "Active";
  if (phase === "ended") return "Ended";
  return "Upcoming";
}

function statusTone(phase: string) {
  if (phase === "voting") {
    return "border-emerald-500/20 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  }
  if (phase === "ended") {
    return "border-border/70 bg-background/70 text-muted-foreground";
  }
  return "border-sky-500/20 bg-sky-500/12 text-sky-700 dark:text-sky-300";
}

function timeLabel(row: PollRow) {
  const phase = row.phase;
  if (phase === "voting") return formatCompactDuration(row.votingEnd);
  if (phase === "ended") return "Ended";
  if (phase === "registration") {
    return `${formatCompactDuration(row.registrationEnd).replace(" left", "")} reg`;
  }
  return `${formatCompactDuration(row.votingStart).replace(" left", "")} to start`;
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

function PollCardArtwork({
  kind,
  accessLabel,
  pollId,
  imageHref,
}: {
  kind: string;
  accessLabel: string;
  pollId: string;
  imageHref: string | null;
}) {
  if (imageHref) {
    return (
      <div className="relative h-44 overflow-hidden border-b border-border/70">
        <Image
          src={imageHref}
          alt=""
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/30 to-transparent" />
        <div className="absolute left-4 top-4 rounded-full border border-white/50 bg-white/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-700 backdrop-blur dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-200">
          {accessLabel}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative h-44 overflow-hidden border-b border-border/70 bg-linear-to-br ${generatedCoverClass(
        pollId,
      )}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16)_0,transparent_48%)]" />
      <div className="absolute inset-0 opacity-40 bg-[linear-gradient(to_right,rgba(148,163,184,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.14)_1px,transparent_1px)] bg-size-[26px_26px]" />
      <div className="absolute left-1/2 top-6 h-28 w-28 -translate-x-1/2 rounded-full border border-white/40 bg-white/30 blur-2xl dark:border-primary/10 dark:bg-primary/10" />
      <div className="absolute inset-x-0 bottom-7 flex justify-center">
        <div className="rounded-sm bg-red-600 px-4 py-2 text-sm font-extrabold uppercase tracking-[0.08em] text-white shadow-lg">
          {kind}
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-t-full border border-border/60 border-b-0 bg-white/50 backdrop-blur dark:bg-slate-900/40">
          <Landmark className="size-10 text-primary/70" />
        </div>
      </div>
      <div className="absolute left-4 top-4 rounded-full border border-white/50 bg-white/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-700 backdrop-blur dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-200">
        {accessLabel}
      </div>
    </div>
  );
}

type FilterTab = "all" | "active" | "ended";

export function PollsListClient() {
  const [rows, setRows] = useState<PollRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const loadGenRef = useRef(0);

  useEffect(() => {
    const gen = ++loadGenRef.current;
    setErr(null);
    setLoading(true);

    (async () => {
      try {
        const res = await fetch("/api/polls/overview");
        const data = (await res.json()) as {
          rows?: PollRow[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load polls");
        }
        if (gen !== loadGenRef.current) return;
        setRows(data.rows ?? []);
      } catch (e) {
        if (gen !== loadGenRef.current) return;
        setErr(e instanceof Error ? e.message : "Failed to load polls");
      } finally {
        if (gen === loadGenRef.current) {
          setLoading(false);
        }
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="glass-panel animate-pulse rounded-[1.75rem] px-5 py-6"
          >
            <div className="mb-3 h-4 w-2/5 rounded-full bg-muted/50" />
            <div className="h-3 w-1/4 rounded-full bg-muted/30" />
          </div>
        ))}
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-[1.5rem] border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
        {err}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="glass-panel rounded-[1.75rem] px-5 py-8 text-muted-foreground">
        No polls yet.{" "}
        <Link
          href="/create"
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>
        .
      </div>
    );
  }

  const isActivePhase = (phase: string) => phase !== "ended";

  const filteredRows = rows.filter((row) => {
    if (filter === "active") return isActivePhase(row.phase);
    if (filter === "ended") return row.phase === "ended";
    return true;
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "ended", label: "Ended" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {tabs.map((tab) => {
          const count =
            tab.key === "all"
              ? rows.length
              : rows.filter((r) =>
                  tab.key === "active"
                    ? isActivePhase(r.phase)
                    : r.phase === "ended",
                ).length;
          const isActive = filter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/70 bg-background/65 text-muted-foreground hover:border-primary/25 hover:text-foreground"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {filteredRows.length === 0 ? (
        <div className="glass-panel rounded-[1.75rem] px-5 py-8 text-muted-foreground">
          No {filter !== "all" ? filter : ""} polls found.
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredRows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/poll/${row.id}`}
                className="block overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-(--shadow-soft) transition hover:-translate-y-1 hover:border-primary/25"
              >
                <PollCardArtwork
                  kind={row.kindLabel}
                  accessLabel={row.accessLabel}
                  pollId={row.id}
                  imageHref={row.imageHref}
                />

                <div className="space-y-5 p-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className={`rounded-full px-3 py-1 text-sm ${statusTone(row.phase)}`}
                    >
                      <span className="size-2 rounded-full bg-current opacity-75" />
                      {statusLabel(row.phase)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full border-border/70 bg-background/65 px-3 py-1 text-sm text-muted-foreground"
                    >
                      <MapPin className="size-3.5" />
                      {SOLANA_CLUSTER_LABEL}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="rounded-full border-border/70 bg-background/65 px-3 py-1 text-sm text-muted-foreground"
                    >
                      <Vote className="size-3.5" />
                      {row.kindLabel}
                    </Badge>
                  </div>

                  <div>
                    <h2 className="line-clamp-2 font-heading text-[1.55rem] font-semibold tracking-[-0.04em] text-foreground">
                      {row.title}
                    </h2>
                  </div>

                  <div className="rounded-[1.35rem] border border-border/70 bg-background/55 p-3">
                    {row.candidates.length > 0 ? (
                      <div className="space-y-2">
                        {row.candidates.map((candidate, index) => (
                          <div
                            key={`${row.id}-${candidate.name}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-2xl bg-white/50 px-3 py-3 dark:bg-slate-900/40"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-base font-medium text-foreground">
                                {candidate.name}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {candidate.value} vote
                                {candidate.value === 1 ? "" : "s"}
                              </p>
                            </div>
                            <div
                              className={`shrink-0 rounded-xl px-3 py-2 text-base font-semibold ${
                                index === 0
                                  ? "bg-rose-500/14 text-rose-700 dark:text-rose-300"
                                  : "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300"
                              }`}
                            >
                              {formatPercent(candidate.percent)} →
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-2xl bg-white/50 px-3 py-4 text-sm text-muted-foreground dark:bg-slate-900/40">
                        <ChartNoAxesCombined className="size-4 text-primary" />
                        No votes yet. Open the poll to participate or review the
                        setup.
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <ChartNoAxesCombined className="size-4 text-primary" />
                      <span>
                        {row.totalVotes} vote{row.totalVotes === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      <Clock3 className="size-4 text-primary" />
                      <span>{timeLabel(row)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
