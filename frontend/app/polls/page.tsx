import { PollsListClient } from "@/components/PollsListClient";

export default function PollsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Polls</h1>
      <p className="mt-2 max-w-xl text-muted">
        On-chain polls from the VoteX program (devnet).
      </p>
      <div className="mt-8">
        <PollsListClient />
      </div>
    </div>
  );
}
