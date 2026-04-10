"use client";

import { motion } from "framer-motion";
import { GlassPanel } from "@/components/landing/GlassPanel";
import { SectionHeader } from "@/components/landing/SectionHeader";
import { fadeIn, staggerChildren, viewportOnce } from "@/lib/motion";

const testimonials = [
  {
    quote:
      "Feels like real governance software. The on-chain trace gives our members confidence before disputes happen.",
    name: "Maya Kharel",
    role: "Governance lead, Kathmandu Builders Collective",
  },
  {
    quote:
      "We keep voting restricted, but the proof path is open for anyone to inspect. That balance is hard to find.",
    name: "Rohan Mehta",
    role: "Ops manager, NodeBridge Labs",
  },
  {
    quote:
      "Finally looks polished enough for stakeholders while still exposing the trust model underneath.",
    name: "Aarav Sharma",
    role: "Program manager, civic innovation initiative",
  },
] as const;

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="premium-section py-10 sm:py-16">
      <SectionHeader
        eyebrow="What people say"
        title="Built for teams that need more than a show of hands."
        align="center"
      />

      <motion.div
        className="mt-10 grid gap-4 lg:grid-cols-3"
        variants={staggerChildren}
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
      >
        {testimonials.map((item) => (
          <motion.div key={item.name} variants={fadeIn}>
            <GlassPanel className="h-full rounded-[1.9rem] p-7">
              <p className="text-base leading-8 text-foreground/92">
                "{item.quote}"
              </p>
              <div className="mt-8">
                <p className="font-medium text-foreground">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.role}</p>
              </div>
            </GlassPanel>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
