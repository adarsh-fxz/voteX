import { ChartNoAxesCombined, ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { PollsListClient, type PollRow } from "@/components/PollsListClient";

async function loadPollOverview(): Promise<{
  rows: PollRow[];
  error: string | null;
}> {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    process.env.NEXT_PUBLIC_APP_HOST;

  if (!host) {
    return { rows: [], error: "Failed to resolve host for poll overview." };
  }

  const protocol =
    headerStore.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");

  try {
    const res = await fetch(`${protocol}://${host}/api/polls/overview`, {
      next: { revalidate: 15 },
    });
    const data = (await res.json()) as { rows?: PollRow[]; error?: string };

    if (!res.ok) {
      return { rows: [], error: data.error ?? "Failed to load polls" };
    }

    return { rows: data.rows ?? [], error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load polls";
    return { rows: [], error: message };
  }
}

export default async function PollsPage() {
  const { rows, error } = await loadPollOverview();

  return (
    <div className="premium-section pb-12 pt-4 sm:pt-6">
      <div className="hero-sheen relative overflow-hidden rounded-[2rem] border border-border/70 px-5 py-10 shadow-(--shadow-soft) sm:px-8">
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Badge
              variant="outline"
              className="border-primary/20 bg-background/70 px-3 py-1 text-[0.72rem] tracking-[0.24em] uppercase text-primary"
            >
              live governance feed
            </Badge>
            <h1 className="mt-5 font-heading text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Browse active and historical VoteX polls.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-muted-foreground">
              Review the latest on-chain polls, inspect participation state, and
              jump directly into individual voting flows from a polished,
              responsive surface.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="glass-panel rounded-[1.4rem] px-4 py-4">
              <ShieldCheck className="size-5 text-primary" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Inspectable state
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pulls directly from the VoteX program.
              </p>
            </div>
            <div className="glass-panel rounded-[1.4rem] px-4 py-4">
              <ChartNoAxesCombined className="size-5 text-primary" />
              <p className="mt-3 text-sm font-medium text-foreground">
                Results ready
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Jump from overview to detail without losing context.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <PollsListClient initialRows={rows} initialError={error} />
      </div>
    </div>
  );
}
