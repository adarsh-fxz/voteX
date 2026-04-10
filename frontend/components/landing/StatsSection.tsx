"use client";

import { motion } from "framer-motion";
import { GlassPanel } from "@/components/landing/GlassPanel";
import { SectionHeader } from "@/components/landing/SectionHeader";
import { fadeUp, staggerChildren, viewportOnce } from "@/lib/motion";

const stats = [
  {
    value: "2.4M+",
    label: "Votes cast",
    note: "across public and private polls",
  },
  {
    value: "12.8K+",
    label: "Polls created",
    note: "by teams, DAOs, and communities",
  },
  {
    value: "100%",
    label: "On-chain audit",
    note: "every vote, fully verifiable",
  },
] as const;

export function StatsSection() {
  return (
    <section className="premium-section py-10 sm:py-16">
      <SectionHeader
        eyebrow="By the numbers"
        title="Trusted by teams who take voting seriously."
        description="From DAOs to campus elections, VoteX handles the full lifecycle — creation, access, recording, and verification."
        align="center"
      />

      <motion.div
        className="mt-10 grid gap-4 lg:grid-cols-3"
        variants={staggerChildren}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={fadeUp}>
            <GlassPanel className="h-full rounded-[1.9rem] p-7">
              <p className="text-4xl font-semibold tracking-[-0.06em] text-foreground sm:text-5xl">
                {stat.value}
              </p>
              <p className="mt-4 text-lg font-medium text-foreground">
                {stat.label}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {stat.note}
              </p>
            </GlassPanel>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
