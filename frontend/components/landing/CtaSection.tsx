"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { FloatingParticles } from "@/components/landing/FloatingParticles";
import { GlowOrb } from "@/components/landing/GlowOrb";

export function CtaSection() {
  return (
    <section id="cta" className="premium-section py-10 sm:py-16">
      <div className="relative overflow-hidden rounded-[2.25rem] border border-primary/20 bg-[linear-gradient(135deg,rgba(12,22,42,0.96),rgba(14,32,58,0.92),rgba(12,22,42,0.96))] px-6 py-12 text-slate-100 shadow-(--shadow-strong) sm:px-8 sm:py-14 lg:px-12">
        <GlowOrb color="emerald" size={420} className="-left-24 top-1/2 -translate-y-1/2" />
        <GlowOrb color="cyan" size={360} className="-right-16 -top-16" />
        <FloatingParticles count={12} className="opacity-80" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-cyan-200/90">
              Get started
            </p>
            <h2 className="mt-4 font-heading text-3xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
              Run your first verifiable vote today.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              Create a poll, share it with your community, and let the chain
              handle the rest.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-start">
            <Link
              href="/create"
              className="button-primary-premium gap-2 bg-white text-slate-950 hover:bg-slate-100"
            >
              Create a poll
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/polls"
              className="button-secondary-premium border-white/15 bg-white/8 text-white hover:bg-white/12"
            >
              Browse live polls
            </Link>
            <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-sm text-slate-300">
              Don't trust the vote. Verify it.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
