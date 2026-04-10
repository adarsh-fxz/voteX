"use client";

const items = [
  "DAOs",
  "Protocol councils",
  "Student unions",
  "Ops teams",
  "Governance squads",
  "Grant committees",
] as const;

const doubled = [...items, ...items];

export function TrustBand() {
  return (
    <section className="premium-section section-divider mt-10 overflow-hidden pb-10">
      <div className="glass-panel rounded-[1.75rem] px-4 py-4 sm:px-6">
        <div className="animate-marquee flex min-w-max items-center gap-3 text-sm text-muted-foreground">
          {doubled.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-4 py-2"
            >
              <span className="size-2 rounded-full bg-primary" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
