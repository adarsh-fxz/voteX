"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GlassPanel } from "@/components/landing/GlassPanel";
import { slideLeft, slideRight, staggerChildren, viewportOnce } from "@/lib/motion";

const votexPerks = [
  "Wallet-signed votes",
  "Merkle-gated eligibility",
  "On-chain + IPFS audit trail",
  "Open, inspectable results",
] as const;

const legacyFlaws = [
  "Opaque tallying",
  "Password or spreadsheet flows",
  "No audit trail after voting",
  "Trust the platform or don't",
] as const;

const useCases = [
  {
    title: "Governance boards",
    summary:
      "Run internal votes that are easy to present and impossible to dispute.",
    bullets: ["Wallet-signed votes", "Clean results view", "Full audit trail"],
  },
  {
    title: "Communities and DAOs",
    summary:
      "Replace spreadsheet tallying with something members can verify themselves.",
    bullets: ["Transparent outcomes", "Open or gated access", "Creator-controlled rules"],
  },
  {
    title: "Campus elections",
    summary: "Simple to join, hard to tamper with — works for any size cohort.",
    bullets: ["Invite-code registration", "IPFS-backed roster", "One-click voting"],
  },
] as const;

export function ShowcaseSection() {
  return (
    <section id="showcase" className="premium-section py-10 sm:py-16">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          variants={slideLeft}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <GlassPanel gradientBorder className="h-full rounded-[2rem] p-7 sm:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-primary">
              Why VoteX
            </p>
            <h2 className="mt-4 font-heading text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              Modern voting shouldn't require trust in the platform.
            </h2>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-primary/20 bg-primary/8 p-5">
                <p className="text-sm font-medium text-primary">VoteX</p>
                <ul className="mt-4 space-y-3 text-sm text-foreground">
                  {votexPerks.map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[1.4rem] border border-border/70 bg-background/60 p-5">
                <p className="text-sm font-medium text-muted-foreground">
                  Legacy polling
                </p>
                <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                  {legacyFlaws.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </GlassPanel>
        </motion.div>

        <motion.div
          className="grid gap-4"
          variants={staggerChildren}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {useCases.map((card) => (
            <motion.div key={card.title} variants={slideRight}>
              <GlassPanel className="rounded-[1.75rem] p-6">
                <h3 className="font-heading text-2xl font-semibold tracking-[-0.04em]">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {card.summary}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {card.bullets.map((bullet) => (
                    <Badge
                      key={bullet}
                      variant="outline"
                      className="border-border/70 bg-background/65 px-3 py-1 text-foreground"
                    >
                      {bullet}
                    </Badge>
                  ))}
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
