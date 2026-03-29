import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type GlassPanelProps = ComponentPropsWithoutRef<"div"> & {
  gradientBorder?: boolean;
};

export function GlassPanel({
  className,
  gradientBorder = false,
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        "glass-panel rounded-[1.75rem] p-6 shadow-[var(--shadow-soft)] sm:p-7",
        gradientBorder && "gradient-frame",
        className,
      )}
      {...props}
    />
  );
}
