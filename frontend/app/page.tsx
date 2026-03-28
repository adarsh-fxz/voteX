import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex max-w-3xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          Solana · devnet
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {APP_NAME}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          Verifiable voting: Merkle eligibility, on-chain commitments, IPFS
          voter lists, and explorer links. Connect a Phantom / Solflare wallet.
        </p>
        <ul className="mt-6 list-inside list-disc text-muted">
          <li>Normal or rating polls</li>
          <li>Open or Merkle-restricted access</li>
          <li>Invite codes (hashed) + commit flow for restricted polls</li>
        </ul>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/polls"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Browse polls
          </Link>
          <Link
            href="/create"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-slate-50"
          >
            Create poll
          </Link>
        </div>
      </section>
    </div>
  );
}
