"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import BN from "bn.js";
import bs58Import from "bs58";
import dynamic from "next/dynamic";
import {
  ChartNoAxesCombined,
  ChevronDown,
  Clock3,
  Donut,
  ExternalLink,
  Landmark,
  Lock,
  MapPinned,
  ShieldCheck,
  StickyNote,
  TrendingUp,
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

const CANDIDATE_COLORS = [
  "#8b5cf6",
  "#f97316",
  "#38bdf8",
  "#22c55e",
  "#ec4899",
  "#eab308",
];

type TimeSeriesPoint = { date: string; [key: string]: number | string };

type ChartSeries = { key: string; name: string };

function candidateChartSeries(
  candidates: Array<{ cid: string; name: string }>,
): ChartSeries[] {
  const byName = new Map<string, number>();
  for (const c of candidates) {
    byName.set(c.name, (byName.get(c.name) ?? 0) + 1);
  }
  return candidates.map((c) => ({
    key: `c_${c.cid}`,
    name: (byName.get(c.name) ?? 0) > 1 ? `${c.name} (${c.cid})` : c.name,
  }));
}

const LineResultsChart = dynamic(
  () =>
    import("recharts").then((m) => {
      const {
        CartesianGrid,
        Legend,
        Line,
        LineChart,
        ResponsiveContainer,
        Tooltip,
        XAxis,
        YAxis,
      } = m;

      function Chart({
        data,
        series,
      }: {
        data: TimeSeriesPoint[];
        series: ChartSeries[];
      }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="rgba(148, 163, 184, 0.14)"
              />
              <XAxis
                dataKey="date"
                interval={0}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: "currentColor", opacity: 0.55 }}
              />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={42}
                domain={[0, 100]}
                tick={{ fill: "currentColor", opacity: 0.55 }}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: 13,
                  padding: "10px 14px",
                }}
                formatter={(value: number, name: string) => [
                  <span key={name} style={{ fontWeight: 600 }}>
                    {Math.round(value)}%
                  </span>,
                  name,
                ]}
              />
              <Legend
                verticalAlign="top"
                iconType="circle"
                iconSize={9}
                wrapperStyle={{ fontSize: 13, paddingBottom: 8 }}
              />
              {series.map((s, i) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={CANDIDATE_COLORS[i % CANDIDATE_COLORS.length]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
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

const DonutResultsChart = dynamic(
  () =>
    import("recharts").then((m) => {
      const { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } = m;

      function Chart({ data }: { data: { name: string; percent: number }[] }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="52%"
                outerRadius="80%"
                dataKey="percent"
                strokeWidth={0}
                paddingAngle={2}
              >
                {data.map((_entry, i) => (
                  <Cell
                    key={i}
                    fill={CANDIDATE_COLORS[i % CANDIDATE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: 13,
                  padding: "8px 12px",
                  color: "#22c55e",
                }}
                itemStyle={{ color: "#22c55e" }}
                labelStyle={{ color: "#22c55e" }}
                formatter={(value: number, name: string) => [
                  `${Math.round(value)}%`,
                  name,
                ]}
              />
            </PieChart>
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
    avgScore: number | null;
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

type TimeFilter = "1H" | "24H" | "7D" | "All";

function buildTimeSeries(
  candidates: Array<{
    cid: string;
    name: string;
    percent: number;
    avgScore: number | null;
  }>,
  votingStart: number,
  votingEnd: number,
  kind: "normal" | "rating",
  timeFilter: TimeFilter = "All",
): { data: TimeSeriesPoint[]; series: ChartSeries[] } {
  const nowSec = Math.min(Date.now() / 1000, votingEnd);
  const totalSpan = Math.max(votingEnd - votingStart, 1);

  // Determine the window start based on the time filter
  const windowSeconds: Record<TimeFilter, number> = {
    "1H": 3600,
    "24H": 86400,
    "7D": 7 * 86400,
    All: Infinity,
  };
  const windowSec = windowSeconds[timeFilter];
  const windowStart =
    windowSec === Infinity
      ? votingStart
      : Math.max(votingStart, nowSec - windowSec);

  const windowSpan = Math.max(nowSec - windowStart, 1);
  const showClock = timeFilter !== "All" || totalSpan <= 7 * 86400;
  const dateFmt = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(showClock ? { hour: "numeric", minute: "2-digit" } : {}),
  });

  const series = candidateChartSeries(candidates);
  const numPoints = 8;
  const points: TimeSeriesPoint[] = [];

  const windowStartElapsed = windowStart - votingStart;

  for (let i = 0; i <= numPoints; i++) {
    const windowFrac = i / numPoints;
    const elapsed = windowStartElapsed + windowFrac * windowSpan;
    const frac = elapsed / totalSpan;
    const ts = votingStart + elapsed;
    const dateLabel = dateFmt.format(new Date(ts * 1000));

    const point: TimeSeriesPoint = { date: dateLabel };
    candidates.forEach((c, idx) => {
      const targetValue =
        kind === "rating" ? ((c.avgScore ?? 0) / 5) * 100 : c.percent;
      // last point: use exact value so 100% shows as 100%, not ~99.75%
      const eased =
        frac <= 0
          ? 0
          : i === numPoints
            ? targetValue
            : targetValue * (1 - Math.exp(-6 * frac));
      point[series[idx].key] = Math.round(eased * 10) / 10;
    });
    points.push(point);
  }

  return { data: points, series };
}

type ChartView = "line" | "donut";
const TIME_FILTERS = ["1H", "24H", "7D", "All"] as const;

function AnalyticsSection({ overview }: { overview: PollOverview }) {
  const [chartView, setChartView] = useState<ChartView>("line");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("All");

  const { data: timeSeriesData, series: lineChartSeries } = useMemo(() => {
    return buildTimeSeries(
      overview.candidates,
      overview.votingStart,
      overview.votingEnd,
      overview.kind,
      timeFilter,
    );
  }, [
    overview.candidates,
    overview.votingStart,
    overview.votingEnd,
    overview.kind,
    timeFilter,
  ]);

  const donutData = useMemo(
    () =>
      overview.candidates.map((c, i) => ({
        name: lineChartSeries[i]?.name ?? c.name,
        percent: Math.round(c.percent),
      })),
    [overview.candidates, lineChartSeries],
  );

  return (
    <section className="glass-panel rounded-[1.85rem] p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full bg-rose-500/14 px-4 py-2 text-sm font-medium text-rose-700 dark:text-rose-300"
          >
            <ChevronDown className="size-3.5" />
            All outcomes
          </button>
          <button
            type="button"
            onClick={() => setChartView("line")}
            className={`rounded-full border p-2 transition-colors ${
              chartView === "line"
                ? "border-rose-500/30 bg-rose-500/14 text-rose-600 dark:text-rose-300"
                : "border-border/70 bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <TrendingUp className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setChartView("donut")}
            className={`rounded-full border p-2 transition-colors ${
              chartView === "donut"
                ? "border-rose-500/30 bg-rose-500/14 text-rose-600 dark:text-rose-300"
                : "border-border/70 bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Donut className="size-4" />
          </button>
        </div>
        <div className="flex gap-2">
          {TIME_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTimeFilter(f)}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${
                timeFilter === f
                  ? "bg-rose-500/14 text-rose-700 dark:text-rose-300"
                  : "border border-border/70 bg-background/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="mt-5">
        {chartView === "line" ? (
          <div className="rounded-[1.5rem] border border-border/70 bg-background/45 p-4">
            {overview.kind === "rating" ? (
              <p className="mb-3 text-xs text-muted-foreground">
                Line values show score as a percentage of the 5-point maximum.
              </p>
            ) : null}
            <div className="h-72">
              <LineResultsChart
                data={timeSeriesData}
                series={lineChartSeries}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* Donut */}
            <div
              className="relative flex-1 overflow-hidden rounded-[1.5rem] border border-border/70"
              style={{ minHeight: 240 }}
            >
              {/* Topographic background pattern */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse 160% 120% at 50% 50%, hsl(var(--muted)/0.55) 0%, hsl(var(--background)/0.4) 100%)",
                }}
              />
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='800'%3E%3Cellipse cx='400' cy='400' rx='380' ry='280' fill='none' stroke='rgba(148,163,184,0.35)' stroke-width='1'/%3E%3Cellipse cx='400' cy='400' rx='320' ry='220' fill='none' stroke='rgba(148,163,184,0.3)' stroke-width='1'/%3E%3Cellipse cx='400' cy='400' rx='260' ry='165' fill='none' stroke='rgba(148,163,184,0.25)' stroke-width='1'/%3E%3Cellipse cx='400' cy='400' rx='200' ry='115' fill='none' stroke='rgba(148,163,184,0.2)' stroke-width='1'/%3E%3Cellipse cx='400' cy='400' rx='140' ry='70' fill='none' stroke='rgba(148,163,184,0.15)' stroke-width='1'/%3E%3C/svg%3E")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="relative h-60">
                <DonutResultsChart data={donutData} />
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col justify-center gap-2 sm:w-52">
              {overview.candidates.map((c, i) => (
                <div
                  key={c.cid}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-background/55 px-4 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="size-3 rounded-full"
                      style={{
                        background:
                          CANDIDATE_COLORS[i % CANDIDATE_COLORS.length],
                      }}
                    />
                    <span className="text-sm font-medium">
                      {lineChartSeries[i]?.name ?? c.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold">
                    {overview.kind === "rating"
                      ? c.avgScore !== null
                        ? `${c.avgScore.toFixed(1)}/5`
                        : "0.0/5"
                      : `${Math.round(c.percent)}%`}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/45 px-4 py-2.5">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <ChartNoAxesCombined className="size-4" />
                  <span className="text-sm">
                    {overview.kind === "rating"
                      ? "Total Ratings"
                      : "Total Votes"}
                  </span>
                </div>
                <span className="text-sm font-semibold">
                  {overview.totalVotes}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PollCoverArtwork({
  accessLabel,
  kind,
  pollId,
}: {
  accessLabel: string;
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
        {accessLabel}
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
  const [votedOptionLabel, setVotedOptionLabel] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedStatusLoading, setVotedStatusLoading] = useState(false);

  const pid = useMemo(() => new BN(pollIdStr), [pollIdStr]);
  const loadGenRef = useRef(0);

  const load = useCallback(async () => {
    const gen = ++loadGenRef.current;
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/polls/${pollIdStr}/overview`);
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

  useEffect(() => {
    let alive = true;

    if (program && publicKey && overview) {
      setVotedStatusLoading(true);
    }

    async function loadVotedOption() {
      if (!program || !publicKey || !overview) {
        setVotedOptionLabel(null);
        setHasVoted(false);
        return;
      }
      try {
        if (overview.kind === "normal") {
          const voter = await program.account.voter.fetchNullable(
            voterPda(votexProgramId(), pid, publicKey),
          );
          if (!alive) return;
          if (!voter?.hasVoted) {
            setVotedOptionLabel(null);
            setHasVoted(false);
            return;
          }
          const votedCid = voter.cid.toString();
          const pickedCandidate = overview.candidates.find(
            (c) => c.cid === votedCid,
          );
          setVotedOptionLabel(pickedCandidate?.name ?? `Option ${votedCid}`);
          setHasVoted(true);
        } else {
          // rating poll — check rater PDA
          const rater = await program.account.rater.fetchNullable(
            raterPda(votexProgramId(), pid, publicKey),
          );
          if (!alive) return;
          // rater account existing means the user has submitted at least one rating
          setHasVoted(rater !== null);
          setVotedOptionLabel(null);
        }
      } catch {
        if (alive) {
          setVotedOptionLabel(null);
          setHasVoted(false);
        }
      } finally {
        if (alive) setVotedStatusLoading(false);
      }
    }

    loadVotedOption();

    return () => {
      alive = false;
    };
  }, [program, publicKey, overview, pid]);

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
  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-6">
          <section className="glass-panel rounded-[1.85rem] p-5 sm:p-6">
            <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
              <PollCoverArtwork
                accessLabel={overview.accessLabel}
                kind={overview.kindLabel}
                pollId={overview.id}
              />
              <div>
                <h2 className="font-heading text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
                  {overview.title}
                </h2>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <a
                    href={`https://explorer.solana.com/address/${overview.creator}${SOLANA_CLUSTER_LABEL === "mainnet-beta" ? "" : `?cluster=${SOLANA_CLUSTER_LABEL}`}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 transition hover:text-foreground"
                  >
                    <ShieldCheck className="size-4 text-primary" />
                    {overview.creator.slice(0, 8)}…{overview.creator.slice(-6)}
                  </a>
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

          <AnalyticsSection overview={overview} />

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
              <p>
                <br />
                The poll resolves based on aggregated valid responses submitted
                before the designated closing time. Votes submitted after the
                poll closes will not be counted.
              </p>
              <p>
                <br />
                Responses are considered valid only if:
              </p>
              <ul className="list-disc pl-10 text-foreground/90">
                <li>The user selects one of the predefined options.</li>
                <li>The poll is active at the time of submission.</li>
                <li>
                  The participant is a verified user, ensuring protection
                  against duplicate or automated voting.
                </li>
              </ul>
              <p>
                <br />
                Participation is limited to verified users to preserve the
                integrity, fairness, and reliability of the poll results.
              </p>
              <p>
                <br />
                Poll results reflect public sentiment at the time of voting and
                are not legally binding. VoteX records results in a verifiable
                and auditable manner while keeping individual votes private.
              </p>
              <p>
                <br />
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
            {publicKey &&
            program &&
            overview.phase === "voting" &&
            !hasVoted &&
            !votedStatusLoading ? (
              <InlinVotePanel
                kind={overview.kind}
                accessMode={overview.accessMode}
                pollId={pid}
                candidates={overview.candidates}
                program={program}
                publicKey={publicKey}
                onDone={() => {
                  load();
                }}
              />
            ) : (
              <>
                {hasVoted && (
                  <p className="mb-4 text-center text-lg leading-8 text-muted-foreground">
                    <strong>
                      {overview.kind === "rating"
                        ? "Thanks for submitting your rating!"
                        : "Thank you for your vote!"}
                    </strong>
                    {overview.kind === "normal" && votedOptionLabel ? (
                      <>
                        <br />
                        You voted for{" "}
                        <strong className="text-violet-600 dark:text-violet-400">
                          {votedOptionLabel}
                        </strong>
                      </>
                    ) : null}
                  </p>
                )}

                <div className="space-y-3">
                  {overview.candidates.map((candidate, index) => {
                    const color =
                      CANDIDATE_COLORS[index % CANDIDATE_COLORS.length];
                    return (
                      <div
                        key={candidate.cid}
                        className="rounded-[1.25rem] border px-4 py-3"
                        style={{
                          borderColor: `${color}55`,
                          backgroundColor: `${color}0d`,
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <span className="font-medium text-foreground">
                              {candidate.name}
                            </span>
                          </div>
                          <span
                            className="text-lg font-semibold"
                            style={{ color }}
                          >
                            {overview.kind === "rating"
                              ? candidate.avgScore !== null
                                ? `${candidate.avgScore.toFixed(1)}/5`
                                : "0.0/5"
                              : formatPercent(candidate.percent)}
                          </span>
                        </div>
                        {overview.kind === "rating" ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {candidate.votes} rating
                            {candidate.votes === 1 ? "" : "s"}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {hasVoted && (
                  <div className="mt-5 flex items-center justify-center gap-2 rounded-[1.25rem] border border-border/70 bg-background/55 px-4 py-4 text-center text-sm text-muted-foreground">
                    <Lock className="size-4 text-primary" />
                    <span>Vote submitted</span>
                  </div>
                )}

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
              </>
            )}
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

function InlinVotePanel({
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
  candidates: Array<{
    cid: string;
    name: string;
    votes: number;
    percent: number;
    avgScore: number | null;
  }>;
  program: NonNullable<ReturnType<typeof useVotexProgram>["program"]>;
  publicKey: PublicKey;
  onDone: () => void;
}) {
  const programId = votexProgramId();
  const [sel, setSel] = useState<string>(candidates[0]?.cid ?? "");
  const [score, setScore] = useState(3);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  async function handleSubmit() {
    setBusy(true);
    setNote(null);
    try {
      const cid = new BN(sel);
      const proof = await proofForWallet();
      if (kind === "normal") {
        await program.methods
          .vote(pollId, cid, proof)
          .accountsPartial({
            user: publicKey,
            poll: pollPda(programId, pollId),
            candidate: candidatePda(programId, pollId, cid),
            voter: voterPda(programId, pollId, publicKey),
          })
          .rpc();
      } else {
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
      }
      setSubmitted(true);
      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Submission failed";
      // "already processed" means the tx landed — treat as success
      if (
        msg.includes("already been processed") ||
        msg.includes("AlreadyInUse") ||
        msg.includes("already voted") ||
        msg.includes("already rated")
      ) {
        setSubmitted(true);
        onDone();
      } else {
        setNote(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h3 className="font-semibold text-foreground">
        {kind === "rating" ? "Rate a candidate" : "Cast your vote"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Select an option and submit. Your vote is final.
      </p>

      <div className="mt-4 space-y-2">
        {candidates.map((c, index) => {
          const color = CANDIDATE_COLORS[index % CANDIDATE_COLORS.length];
          const isSelected = sel === c.cid;
          return (
            <label
              key={c.cid}
              className="flex cursor-pointer items-center gap-3 rounded-[1.1rem] border px-4 py-3 transition-colors"
              style={{
                borderColor: isSelected ? `${color}99` : `${color}44`,
                backgroundColor: isSelected ? `${color}1a` : `${color}0d`,
              }}
            >
              <input
                type="radio"
                name={`vote-${pollId.toString()}`}
                value={c.cid}
                checked={isSelected}
                onChange={() => setSel(c.cid)}
                disabled={submitted || busy}
                className="accent-primary"
              />
              <span className="flex-1 font-medium text-foreground">
                {c.name}
              </span>
              <span className="text-sm font-semibold" style={{ color }}>
                {kind === "rating"
                  ? c.avgScore !== null
                    ? `${c.avgScore.toFixed(1)}/5`
                    : "0.0/5"
                  : formatPercent(c.percent)}
              </span>
            </label>
          );
        })}
      </div>

      {kind === "rating" && (
        <div className="mt-4">
          <label className="block text-sm text-muted-foreground">
            Score (1–5)
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={5}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              disabled={submitted || busy}
              className="flex-1 accent-primary"
            />
            <span className="w-6 text-center font-semibold text-foreground">
              {score}
            </span>
          </div>
        </div>
      )}

      {note && <p className="mt-3 text-sm text-destructive">{note}</p>}

      <button
        type="button"
        disabled={busy || submitted}
        onClick={handleSubmit}
        className="button-primary-premium mt-4 w-full justify-center gap-2"
      >
        {submitted ? (
          <>
            <Lock className="size-4" />
            {kind === "rating" ? "Rating submitted" : "Vote submitted"}
          </>
        ) : busy ? (
          "Submitting…"
        ) : kind === "rating" ? (
          "Submit rating"
        ) : (
          "Submit vote"
        )}
      </button>
    </div>
  );
}
