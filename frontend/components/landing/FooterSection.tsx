"use client";

import { Vote } from "lucide-react";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

const columns = [
  {
    heading: "Product",
    links: [
      { href: "/create", label: "Create poll" },
      { href: "/polls", label: "Browse polls" },
      { href: "#features", label: "Feature stack" },
    ],
  },
  {
    heading: "Why VoteX",
    links: [
      { href: "#flow", label: "How it works" },
      { href: "#showcase", label: "Use cases" },
      { href: "#testimonials", label: "Adoption" },
    ],
  },
  {
    heading: "Trust model",
    links: [
      { href: "/polls", label: "Live poll state" },
      { href: "/create", label: "Launch a demo vote" },
      { href: "#cta", label: "Get started" },
    ],
  },
] as const;

export function FooterSection() {
  return (
    <footer className="premium-section pb-8 pt-12">
      <div className="section-divider pb-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(3,minmax(0,0.8fr))]">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(56,189,248,0.95),rgba(45,212,191,0.92))] text-white shadow-[0_18px_40px_-24px_rgba(45,212,191,0.7)]">
                <Vote className="size-5" />
              </div>
              <div>
                <p className="font-heading text-xl font-semibold tracking-[-0.04em]">
                  {APP_NAME}
                </p>
                <p className="text-sm text-muted-foreground">
                  Transparent voting on Solana.
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
              On-chain polls with wallet-native access, Merkle eligibility, and
              IPFS-backed audit trails.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.heading}>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-primary">
                {column.heading}
              </p>
              <div className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-6 text-xs uppercase tracking-[0.24em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>Built on Solana</span>
        <span>© 2026 {APP_NAME}. All rights reserved.</span>
      </div>
    </footer>
  );
}
