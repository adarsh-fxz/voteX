"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  Menu,
  ShieldCheck,
  Vote,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { APP_NAME } from "@/lib/constants";

const links = [
  { href: "#flow", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "/polls", label: "Polls" },
  { href: "/create", label: "Create poll" },
] as const;

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  {
    ssr: false,
    loading: () => (
      <span
        className="inline-block h-9 min-w-[148px] rounded-md border border-border bg-surface"
        aria-hidden
      />
    ),
  },
);

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const resolvedLinks = useMemo(
    () =>
      links.map((link) => ({
        ...link,
        href:
          link.href.startsWith("#") && pathname !== "/"
            ? `/${link.href}`
            : link.href,
      })),
    [pathname],
  );

  return (
    <header className="sticky top-0 z-50 px-3 py-3 sm:px-4">
      <div className="mx-auto max-w-7xl">
        <div className="glass-panel relative flex min-h-16 items-center justify-between rounded-full px-3 py-2 sm:px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-3"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(56,189,248,0.9),rgba(45,212,191,0.9))] text-white shadow-[0_18px_40px_-26px_rgba(45,212,191,0.9)]">
                <Vote className="size-5" />
              </div>
              <div className="hidden sm:block">
                <p className="text-[0.68rem] font-medium uppercase tracking-[0.28em] text-primary">
                  Verifiable governance
                </p>
                <p className="font-heading text-lg font-semibold tracking-[-0.04em] text-foreground">
                  {APP_NAME}
                </p>
              </div>
            </Link>
          </div>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-border/60 bg-background/55 p-1 lg:flex">
            {resolvedLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-primary/8 hover:text-foreground",
                  pathname === href && "bg-primary/10 text-foreground",
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <ThemeToggle />
            <WalletMultiButton className="h-11! rounded-full! bg-background/70! px-4!" />
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <ThemeToggle />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileOpen((open) => !open)}
              className="size-11 rounded-full border-border/70 bg-background/70"
            >
              {mobileOpen ? (
                <X className="size-4" />
              ) : (
                <Menu className="size-4" />
              )}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="glass-panel mt-3 overflow-hidden rounded-[1.8rem] p-3 lg:hidden"
            >
              <nav className="space-y-1">
                {resolvedLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium text-foreground transition hover:bg-primary/8"
                  >
                    <span>{label}</span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                ))}
              </nav>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Link
                  href="/create"
                  onClick={() => setMobileOpen(false)}
                  className="button-primary-premium gap-2"
                >
                  Create poll
                  <ArrowRight className="size-4" />
                </Link>
                <WalletMultiButton className="h-11! w-full! justify-center! rounded-full! bg-background/75!" />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
}
