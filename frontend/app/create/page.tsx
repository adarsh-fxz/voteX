import { CreatePollWizard } from "@/components/CreatePollWizard";

export default function CreatePollPage() {
  return (
    <div className="premium-section pb-16 pt-6 sm:pt-10">
      {/* Page header */}
      <div className="mb-10 max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          New poll
        </p>
        <h1 className="mt-3 font-heading text-4xl font-semibold leading-tight tracking-[-0.05em] sm:text-5xl">
          Create a poll
        </h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Define the topic, set access rules, schedule voting windows, and add
          candidates - all stored on-chain.
        </p>
      </div>

      <CreatePollWizard />
    </div>
  );
}
