import { cn } from "@/lib/utils";

type GlowOrbProps = {
  className?: string;
  color?: "emerald" | "cyan" | "violet";
  size?: number;
};

const colorMap = {
  emerald:
    "bg-[radial-gradient(circle,rgba(45,212,191,0.22)_0%,rgba(45,212,191,0.08)_38%,transparent_72%)]",
  cyan: "bg-[radial-gradient(circle,rgba(56,189,248,0.2)_0%,rgba(56,189,248,0.08)_38%,transparent_72%)]",
  violet:
    "bg-[radial-gradient(circle,rgba(129,140,248,0.18)_0%,rgba(129,140,248,0.07)_38%,transparent_72%)]",
} as const;

export function GlowOrb({
  className,
  color = "emerald",
  size = 440,
}: GlowOrbProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute rounded-full blur-3xl",
        colorMap[color],
        className,
      )}
      style={{ width: size, height: size }}
    />
  );
}
