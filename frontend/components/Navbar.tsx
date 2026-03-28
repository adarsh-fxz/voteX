"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

const links = [
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
        className="inline-block h-10 min-w-37 rounded-md border border-border bg-surface"
        aria-hidden
      />
    ),
  },
);

export function Navbar() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          {APP_NAME}
        </Link>
        <nav className="flex flex-1 items-center justify-end gap-6">
          <ul className="flex items-center gap-6 text-sm font-medium text-muted">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="transition-colors hover:text-foreground"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <WalletMultiButton />
        </nav>
      </div>
    </header>
  );
}
