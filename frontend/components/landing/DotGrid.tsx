import { cn } from "@/lib/utils";

type DotGridProps = {
  className?: string;
};

export function DotGrid({ className }: DotGridProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.18)_1px,transparent_1px)] bg-size-[22px_22px] mask-[linear-gradient(to_bottom,rgba(0,0,0,0.85),transparent)]",
        className,
      )}
    />
  );
}
