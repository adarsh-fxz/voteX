import BN from "bn.js";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import { NextResponse } from "next/server";
import { createReadonlyProgram, votexProgramId } from "@/lib/anchor";
import {
  accessModeLabel,
  fetchCandidatesForPoll,
  pollKindLabel,
  pollPhase,
  retryRpcRead,
} from "@/lib/poll-utils";
import { ipfsGatewayHrefFromStored } from "@/lib/constants";
import { pollPda, ratingResultPda } from "@/lib/pdas";

export const runtime = "nodejs";

type MetadataShape = {
  title?: string;
  description?: string;
};

type DetailOverview = {
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

const PUBLIC_HTTP: Record<string, string> = {
  devnet: "https://api.devnet.solana.com",
  "mainnet-beta": "https://api.mainnet-beta.solana.com",
  testnet: "https://api.testnet.solana.com",
};

const detailCache = new Map<string, { expiresAt: number; payload: DetailOverview }>();
const detailInflight = new Map<string, Promise<DetailOverview>>();
const metadataCache = new Map<
  string,
  { expiresAt: number; payload: { title: string; description: string } }
>();

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

async function readMetadata(metadataUri: string | null | undefined) {
  const href = ipfsGatewayHrefFromStored(metadataUri);
  if (!href) {
    return { title: "", description: "", metaHref: null as string | null };
  }

  const cached = metadataCache.get(href);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.payload, metaHref: href };
  }

  try {
    const res = await fetch(href, { cache: "force-cache" });
    if (!res.ok) {
      return { title: "", description: "", metaHref: href };
    }
    const data = (await res.json()) as MetadataShape;
    const payload = {
      title: data.title?.trim() ?? "",
      description: data.description?.trim() ?? "",
    };
    metadataCache.set(href, {
      expiresAt: Date.now() + 10 * 60 * 1000,
      payload,
    });
    return { ...payload, metaHref: href };
  } catch {
    return { title: "", description: "", metaHref: href };
  }
}

async function buildDetailOverview(pollId: string): Promise<DetailOverview> {
  const pollIdBn = new BN(pollId);
  const poll = await retryRpcRead(
    () => readonlyProgram.account.poll.fetch(pollPda(votexProgramId(), pollIdBn)),
    { attempts: 5, baseDelayMs: 400 },
  );

  const [metadata, candidatesForPoll] = await Promise.all([
    readMetadata(poll.metadataUri),
    retryRpcRead(() => fetchCandidatesForPoll(readonlyProgram, pollIdBn), {
      attempts: 5,
      baseDelayMs: 400,
    }),
  ]);

  const kind = "rating" in poll.kind ? "rating" : "normal";
  const accessMode = "merkleRestricted" in poll.accessMode ? "merkleRestricted" : "open";

  let candidates = candidatesForPoll
    .map((candidate) => ({
      cid: candidate.account.cid.toString(),
      name: candidate.account.name,
      votes: candidate.account.votes.toNumber(),
      avgScore: null as number | null,
    }))
    .sort((a, b) => b.votes - a.votes);

  if (kind === "rating" && candidates.length > 0) {
    const resultPdas = candidates.map((candidate) =>
      ratingResultPda(votexProgramId(), pollIdBn, new BN(candidate.cid)),
    );
    const ratingResults = await retryRpcRead(
      () => readonlyProgram.account.ratingResult.fetchMultiple(resultPdas),
      { attempts: 5, baseDelayMs: 400 },
    );
    candidates = candidates
      .map((candidate, index) => ({
        ...candidate,
        votes: ratingResults[index]?.voteCount.toNumber() ?? 0,
        avgScore:
          (ratingResults[index]?.voteCount.toNumber() ?? 0) > 0
            ? (ratingResults[index]?.totalScore.toNumber() ?? 0) /
              (ratingResults[index]?.voteCount.toNumber() ?? 1)
            : null,
      }))
      .sort((a, b) => b.votes - a.votes);
  }

  const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";
  const clusterParam = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  const explorerHref = `https://explorer.solana.com/address/${pollPda(
    votexProgramId(),
    pollIdBn,
  ).toBase58()}${clusterParam}`;

  return {
    id: pollId,
    title: metadata.title || `Poll #${pollId}`,
    description: metadata.description,
    kind,
    kindLabel: pollKindLabel(poll.kind),
    accessMode,
    accessLabel: accessModeLabel(poll.accessMode),
    phase: pollPhase(poll),
    creator: poll.creator.toBase58(),
    isFrozen: poll.isFrozen,
    registrationEnd: poll.registrationEnd.toNumber(),
    votingStart: poll.votingStart.toNumber(),
    votingEnd: poll.votingEnd.toNumber(),
    metaHref: metadata.metaHref,
    contentCid: poll.contentCid || null,
    explorerHref,
    totalVotes,
    candidates: candidates.map((candidate) => ({
      ...candidate,
      percent: totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0,
    })),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pollId: string }> },
) {
  const { pollId } = await params;

  const cached = detailCache.get(pollId);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload);
  }

  if (!detailInflight.has(pollId)) {
    detailInflight.set(
      pollId,
      buildDetailOverview(pollId)
        .then((payload) => {
          detailCache.set(pollId, {
            expiresAt: Date.now() + 15_000,
            payload,
          });
          return payload;
        })
        .finally(() => {
          detailInflight.delete(pollId);
        }),
    );
  }

  try {
    const payload = await detailInflight.get(pollId);
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load poll overview";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
