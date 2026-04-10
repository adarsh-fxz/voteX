import { clusterApiUrl, Connection } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { createReadonlyProgram } from "@/lib/anchor";
import { ipfsGatewayHrefFromStored } from "@/lib/constants";
import {
  accessModeLabel,
  pollKindLabel,
  pollPhase,
  retryRpcRead,
} from "@/lib/poll-utils";

export const runtime = "nodejs";

type MetadataShape = {
  title?: string;
};

type PollOverviewItem = {
  id: string;
  title: string;
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

type CachedOverview = {
  expiresAt: number;
  payload: PollOverviewItem[];
};

const PUBLIC_HTTP: Record<string, string> = {
  devnet: "https://api.devnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  testnet: "https://api.testnet.solana.com",
};

let overviewCache: CachedOverview | null = null;
let overviewInflight: Promise<PollOverviewItem[]> | null = null;
const metadataCache = new Map<string, { expiresAt: number; title: string }>();

const CACHE_TTL_MS = 60_000; // serve cached data for 60s
const STALE_TTL_MS = 120_000; // background-refresh up to 2 min after expiry

function gpaFriendlyRpcUrl(): string {
  return (
    process.env.SOLANA_RPC_GPA_URL ??
    process.env.NEXT_PUBLIC_RPC_GPA_URL ??
    PUBLIC_HTTP[process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet"] ??
    clusterApiUrl("devnet")
  );
}

const connection = new Connection(gpaFriendlyRpcUrl(), {
  commitment: "confirmed",
});

const readonlyProgram = createReadonlyProgram(connection);

async function readMetadataTitle(
  metadataUri: string | null | undefined,
  fallback: string,
) {
  const href = ipfsGatewayHrefFromStored(metadataUri);
  if (!href) return fallback;

  const cached = metadataCache.get(href);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.title;
  }

  try {
    const res = await fetch(href, { cache: "force-cache" });
    if (!res.ok) return fallback;
    const data = (await res.json()) as MetadataShape;
    const title = data.title?.trim() || fallback;
    metadataCache.set(href, {
      expiresAt: Date.now() + 10 * 60 * 1000,
      title,
    });
    return title;
  } catch {
    return fallback;
  }
}

async function buildOverview(): Promise<PollOverviewItem[]> {
  // Fire all three GPA scans in parallel instead of sequentially
  const [polls, candidates, ratingResultsMaybe] = await Promise.all([
    retryRpcRead(() => readonlyProgram.account.poll.all(), {
      attempts: 5,
      baseDelayMs: 400,
    }),
    retryRpcRead(() => readonlyProgram.account.candidate.all(), {
      attempts: 5,
      baseDelayMs: 400,
    }),
    retryRpcRead(() => readonlyProgram.account.ratingResult.all(), {
      attempts: 5,
      baseDelayMs: 400,
    }),
  ]);

  const hasRatingPoll = polls.some((poll) => "rating" in poll.account.kind);
  const ratingResults = hasRatingPoll ? ratingResultsMaybe : [];

  const ratingCounts = new Map<string, number>();
  for (const ratingResult of ratingResults) {
    const account = ratingResult.account as {
      pollId: { toString(): string };
      candidateId: { toString(): string };
      voteCount: { toNumber(): number };
    };
    ratingCounts.set(
      `${account.pollId.toString()}:${account.candidateId.toString()}`,
      account.voteCount.toNumber(),
    );
  }

  const candidatesByPoll = new Map<
    string,
    Array<{ cid: string; name: string; votes: number }>
  >();

  for (const candidate of candidates) {
    const account = candidate.account as {
      pollId: { toString(): string };
      cid: { toString(): string };
      name: string;
      votes: { toNumber(): number };
    };
    const pollId = account.pollId.toString();
    const row = {
      cid: account.cid.toString(),
      name: account.name,
      votes: account.votes.toNumber(),
    };
    const existing = candidatesByPoll.get(pollId);
    if (existing) {
      existing.push(row);
    } else {
      candidatesByPoll.set(pollId, [row]);
    }
  }

  const overview = await Promise.all(
    polls
      .map((poll) => ({
        id: (poll.account.id as { toString(): string }).toString(),
        poll: poll.account,
      }))
      .sort((a, b) => Number(b.id) - Number(a.id))
      .map(async ({ id, poll }) => {
        const title = await readMetadataTitle(poll.metadataUri, `Poll #${id}`);
        const rawCandidates = candidatesByPoll.get(id) ?? [];
        const candidateValues = rawCandidates
          .map((candidate) => ({
            name: candidate.name,
            value:
              "rating" in poll.kind
                ? (ratingCounts.get(`${id}:${candidate.cid}`) ?? 0)
                : candidate.votes,
          }))
          .sort((a, b) => b.value - a.value);

        const totalVotes =
          candidateValues.reduce(
            (sum, candidate) => sum + candidate.value,
            0,
          ) || 0;

        return {
          id,
          title,
          kindLabel: pollKindLabel(poll.kind),
          accessLabel: accessModeLabel(poll.accessMode),
          phase: pollPhase(poll),
          registrationEnd: poll.registrationEnd.toNumber(),
          votingStart: poll.votingStart.toNumber(),
          votingEnd: poll.votingEnd.toNumber(),
          totalVotes,
          candidates: candidateValues.slice(0, 2).map((candidate) => ({
            name: candidate.name,
            value: candidate.value,
            percent: totalVotes > 0 ? (candidate.value / totalVotes) * 100 : 0,
          })),
        } satisfies PollOverviewItem;
      }),
  );

  return overview;
}

function scheduleRefresh() {
  if (overviewInflight) return;
  overviewInflight = buildOverview()
    .then((payload) => {
      overviewCache = { expiresAt: Date.now() + CACHE_TTL_MS, payload };
      return payload;
    })
    .finally(() => {
      overviewInflight = null;
    });
}

export async function GET() {
  const now = Date.now();

  // Serve stale data immediately while a background refresh runs
  if (overviewCache) {
    const isExpired = overviewCache.expiresAt <= now;
    const isStale = overviewCache.expiresAt + STALE_TTL_MS > now;

    if (!isExpired) {
      // Fresh — return immediately with cache headers
      return NextResponse.json(
        { rows: overviewCache.payload },
        {
          headers: {
            "Cache-Control": `public, s-maxage=15, stale-while-revalidate=60`,
          },
        },
      );
    }

    if (isStale) {
      // Stale but within revalidation window — return stale data and refresh in background
      scheduleRefresh();
      return NextResponse.json(
        { rows: overviewCache.payload },
        {
          headers: {
            "Cache-Control": `public, s-maxage=15, stale-while-revalidate=60`,
          },
        },
      );
    }
  }

  // No cache or too old — wait for a fresh fetch
  scheduleRefresh();

  try {
    const payload = await overviewInflight!;
    return NextResponse.json(
      { rows: payload },
      {
        headers: {
          "Cache-Control": `public, s-maxage=15, stale-while-revalidate=60`,
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load poll overview";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
