"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  ChartNoAxesCombined,
  FileLock2,
  Fingerprint,
  Globe2,
  LockKeyhole,
  type LucideIcon,
} from "lucide-react";
import { GlassPanel } from "@/components/landing/GlassPanel";
import { SectionHeader } from "@/components/landing/SectionHeader";
import { fadeUp, staggerChildren, viewportOnce } from "@/lib/motion";

const features: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Fingerprint,
    title: "Wallet identity",
    text: "Sign in with your wallet. No passwords, no emails.",
  },
  {
    icon: LockKeyhole,
    title: "Merkle-gated access",
    text: "Restrict polls to verified members while keeping results open to audit.",
  },
  {
    icon: FileLock2,
    title: "IPFS evidence",
    text: "Poll metadata and voter lists are stored on IPFS — transparent and retrievable.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Live on-chain state",
    text: "Results come directly from the Solana program, not a cached database.",
  },
  {
    icon: Globe2,
    title: "Fast and low-cost",
    text: "Launch a poll in seconds. Solana keeps fees negligible.",
  },
  {
    icon: BadgeCheck,
    title: "Built-in audit trail",
    text: "Explorer links and IPFS references are attached to every election automatically.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="premium-section py-10 sm:py-16">
      <SectionHeader
        eyebrow="Features"
        title="Everything you need. Nothing you don't."
        description="Purpose-built for transparent, tamper-resistant voting on Solana."
      />

      <motion.div
        className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        variants={staggerChildren}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        {features.map(({ icon: Icon, title, text }) => (
          <motion.div key={title} variants={fadeUp}>
            <GlassPanel className="h-full rounded-[1.75rem] p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-5 font-heading text-xl font-semibold tracking-[-0.04em]">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                {text}
              </p>
            </GlassPanel>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
