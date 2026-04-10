"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { GlassPanel } from "@/components/landing/GlassPanel";
import { DotGrid } from "@/components/landing/DotGrid";
import { FloatingParticles } from "@/components/landing/FloatingParticles";
import { GlowOrb } from "@/components/landing/GlowOrb";
import { VoteNetworkVisual } from "@/components/landing/VoteNetworkVisual";
import {
  fadeUp,
  scaleIn,
  staggerChildren,
} from "@/lib/motion";

const trustPills = [
  "Wallet-native voting",
  "Merkle-gated access",
  "IPFS audit trail",
] as const;

export function HeroSection() {
  return (
    <section className="premium-section pt-6 sm:pt-10">
      <div className="hero-sheen premium-grid relative overflow-hidden rounded-[2rem] border border-border/70 px-5 pb-14 pt-8 shadow-(--shadow-strong) sm:px-8 sm:pb-16 lg:px-10 lg:pt-10">
        <DotGrid className="opacity-40" />
        <FloatingParticles count={14} className="opacity-70" />

        <motion.div
          className="relative z-10 grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]"
          variants={staggerChildren}
          initial="hidden"
          animate="visible"
        >
          <div>
            <motion.div variants={fadeUp}>
              <Badge
                variant="outline"
                className="border-primary/20 bg-background/70 px-3 py-1 text-[0.72rem] tracking-[0.26em] uppercase text-primary"
              >
                Built on Solana
              </Badge>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-6 max-w-3xl font-heading text-4xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl lg:text-7xl"
            >
              Voting that's
              <br />
              <span className="text-gradient"> open to see </span>
              and impossible to fake.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg"
            >
              Create polls, control who votes, and let the results speak for
              themselves — every action recorded on Solana.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <Link href="/create" className="button-primary-premium gap-2">
                Create a poll
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/polls" className="button-secondary-premium gap-2">
                Explore live polls
                <ChevronRight className="size-4" />
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-10 grid gap-3 sm:grid-cols-3"
            >
              {trustPills.map((item) => (
                <div
                  key={item}
                  className="glass-panel rounded-2xl px-4 py-3 text-sm text-muted-foreground"
                >
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    <CheckCircle2 className="size-4 text-primary" />
                    {item}
                  </span>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div variants={scaleIn} className="relative lg:pl-6">
            <GlassPanel
              gradientBorder
              className="relative overflow-hidden rounded-[2rem] p-4 sm:p-6"
            >
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-primary">
                  vote lifecycle
                </p>
                <div className="rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                  Solana + IPFS
                </div>
              </div>

              <VoteNetworkVisual />

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background/65 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    status
                  </p>
                  <p className="mt-2 text-lg font-medium text-foreground">
                    Ready to launch
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create a poll, set access rules, and go live in minutes.
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/65 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    trust
                  </p>
                  <p className="mt-2 text-lg font-medium text-foreground">
                    Simple to use, hard to dispute
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Every vote is signed and stored on-chain. No black boxes.
                  </p>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
