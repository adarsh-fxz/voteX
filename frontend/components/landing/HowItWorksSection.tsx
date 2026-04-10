"use client";

import { motion } from "framer-motion";
import { Vote } from "lucide-react";
import { GlassPanel } from "@/components/landing/GlassPanel";
import { SectionHeader } from "@/components/landing/SectionHeader";
import { fadeUp, slideLeft, staggerChildren, viewportOnce } from "@/lib/motion";

const steps = [
  {
    step: "01",
    title: "Create a poll",
    description: "Set candidates, schedule, and access rules in one simple flow.",
  },
  {
    step: "02",
    title: "Control access",
    description:
      "Open to all or invite-only — your rules, enforced by Merkle proof.",
  },
  {
    step: "03",
    title: "Record on-chain",
    description: "Every vote is anchored to Solana with metadata stored on IPFS.",
  },
  {
    step: "04",
    title: "Verify results",
    description:
      "Inspect tallies and audit trails without trusting a middleman.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section id="flow" className="premium-section py-10 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <motion.div
          variants={slideLeft}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <SectionHeader
            eyebrow="How it works"
            title="Four steps from idea to verified result."
            description="Simple on the surface, cryptographically sound underneath."
          />
        </motion.div>

        <motion.div
          className="grid gap-4 sm:grid-cols-2"
          variants={staggerChildren}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {steps.map((item) => (
            <motion.div key={item.step} variants={fadeUp}>
              <GlassPanel className="h-full rounded-[1.75rem] p-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium tracking-[0.28em] text-primary uppercase">
                    {item.step}
                  </span>
                  <Vote className="size-4 text-primary" />
                </div>
                <h3 className="mt-5 font-heading text-xl font-semibold tracking-[-0.04em]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </GlassPanel>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
