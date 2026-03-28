import { CreatePollWizard } from "@/components/CreatePollWizard";

export default function CreatePollPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Create poll</h1>
      <p className="mt-2 max-w-xl text-muted">
        Metadata is uploaded to IPFS (requires{" "}
        <code className="rounded bg-slate-100 px-1">PINATA_JWT</code> on the
        server). Then the poll and candidates are created on-chain.
      </p>
      <div className="mt-8">
        <CreatePollWizard />
      </div>
    </div>
  );
}
