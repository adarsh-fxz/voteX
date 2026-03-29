import { Badge } from "@/components/ui/badge";
import { CreatePollWizard } from "@/components/CreatePollWizard";

export default function CreatePollPage() {
  return (
    <div className="premium-section pb-12 pt-4 sm:pt-6">
      <div className="hero-sheen relative overflow-hidden rounded-[2rem] border border-border/70 px-5 py-10 shadow-[var(--shadow-soft)] sm:px-8">
        <div className="relative z-10 max-w-3xl">
          <Badge
            variant="outline"
            className="border-primary/20 bg-background/70 px-3 py-1 text-[0.72rem] tracking-[0.24em] uppercase text-primary"
          >
            Poll composer
          </Badge>
          <h1 className="mt-5 font-heading text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Launch a poll with a cleaner operator experience.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
            Metadata is uploaded to IPFS and the poll is created on-chain without
            changing the underlying VoteX business logic. This pass focuses on premium
            presentation, responsiveness, and clarity.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Server requirement:
            <code className="ml-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs">
              PINATA_JWT
            </code>
          </p>
        </div>
      </div>
      <div className="mt-8">
        <CreatePollWizard />
      </div>
    </div>
  );
}
