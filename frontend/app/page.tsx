"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  FileLock2,
  Fingerprint,
  Globe2,
  LockKeyhole,
  Vote,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { GlassPanel } from "@/components/landing/GlassPanel";
import { SectionHeader } from "@/components/landing/SectionHeader";
import { DotGrid } from "@/components/landing/DotGrid";
import { FloatingParticles } from "@/components/landing/FloatingParticles";
import { GlowOrb } from "@/components/landing/GlowOrb";
import { VoteNetworkVisual } from "@/components/landing/VoteNetworkVisual";
import {
  fadeIn,
  fadeUp,
  scaleIn,
  slideLeft,
  slideRight,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";
import { APP_NAME } from "@/lib/constants";

const stats = [
  { value: "2.4M+", label: "Votes secured", note: "across public and permissioned polls" },
  { value: "12.8K+", label: "Polls launched", note: "from teams, DAOs, and campus communities" },
  { value: "100%", label: "Audit trail", note: "with chain state plus IPFS evidence" },
] as const;

const trustBand = [
  "DAOs",
  "Protocol councils",
  "Student unions",
  "Ops teams",
  "Governance squads",
  "Grant committees",
] as const;

const flow = [
  {
    step: "01",
    title: "Compose the vote",
    description: "Define the poll model, candidates, schedule, and governance rules in one guided flow.",
  },
  {
    step: "02",
    title: "Gate eligibility",
    description: "Run open access or invite-only registration with wallet ownership proofs and Merkle-ready lists.",
  },
  {
    step: "03",
    title: "Record on-chain",
    description: "Anchor poll state to Solana, keep metadata on IPFS, and create a tamper-evident audit trail.",
  },
  {
    step: "04",
    title: "Verify outcomes",
    description: "Inspect tallies, explorer state, and final artifacts without relying on a black-box operator.",
  },
] as const;

const features = [
  {
    icon: Fingerprint,
    title: "Wallet-native identity",
    text: "Voters authenticate through signatures instead of passwords, emails, or centralized accounts.",
  },
  {
    icon: LockKeyhole,
    title: "Merkle-restricted voting",
    text: "Keep sensitive or membership-only polls controlled without giving up verifiability.",
  },
  {
    icon: FileLock2,
    title: "IPFS evidence layer",
    text: "Store poll metadata and voter-list artifacts in a transparent, independently retrievable format.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Live program state",
    text: "Polls, votes, and results are fetched directly from the VoteX program for a first-class operator experience.",
  },
  {
    icon: Globe2,
    title: "Low-friction coordination",
    text: "Move from launch to tally quickly with fast finality and low fees on Solana devnet and beyond.",
  },
  {
    icon: BadgeCheck,
    title: "Audit-ready by default",
    text: "Explorer links, IPFS references, and deterministic lists create a clean review trail for every election.",
  },
] as const;

const showcaseCards = [
  {
    title: "Governance boards",
    summary: "Run fast internal votes with a polished front door and a verifiable backend.",
    bullets: ["Executive-ready presentation", "Wallet confirmation", "Post-vote auditability"],
  },
  {
    title: "Communities and DAOs",
    summary: "Replace screenshot-heavy tallying with a system members can independently inspect.",
    bullets: ["Transparent result state", "Open or gated participation", "Creator-controlled eligibility"],
  },
  {
    title: "Campus and cohort voting",
    summary: "Keep the UX approachable while giving organizers stronger controls and evidence.",
    bullets: ["Invite code registration", "IPFS-backed roster artifact", "Clean candidate presentation"],
  },
] as const;

const testimonials = [
  {
    quote:
      "VoteX feels like governance software, not a hackathon demo. The chain-backed trace gives our members confidence before disputes even happen.",
    name: "Maya Kharel",
    role: "Governance lead, Kathmandu Builders Collective",
  },
  {
    quote:
      "The eligibility flow is the standout. We can keep voting restricted, but the proof path stays inspectable for anyone reviewing the process.",
    name: "Rohan Mehta",
    role: "Ops manager, NodeBridge Labs",
  },
  {
    quote:
      "It finally looks premium enough for stakeholders while still exposing the technical trust model under the hood.",
    name: "Aarav Sharma",
    role: "Program manager, civic innovation initiative",
  },
] as const;

const footerColumns = [
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

export default function Home() {
  return (
    <div className="relative overflow-hidden pb-12">
      <GlowOrb color="cyan" size={520} className="-left-36 top-10" />
      <GlowOrb color="emerald" size={460} className="-right-28 top-96" />

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
                Build votes that feel
                <span className="text-gradient"> executive-grade </span>
                and settle with cryptographic proof.
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg"
              >
                {APP_NAME} turns poll creation, wallet-based access control, Merkle
                eligibility, and IPFS evidence into one polished governance experience.
                It looks premium on the surface and stays verifiable underneath.
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
                {[
                  "Wallet-native voter flow",
                  "Merkle-gated private access",
                  "IPFS-backed review trail",
                ].map((item) => (
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
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.28em] text-primary">
                      vote lifecycle
                    </p>
                  </div>
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
                      Ready for launch
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create a vote, issue invites, and freeze eligibility with a durable audit path.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/65 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      signal
                    </p>
                    <p className="mt-2 text-lg font-medium text-foreground">
                      Human UX, chain-backed trust
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Purpose-built for teams who need confidence without sacrificing polish.
                    </p>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="premium-section section-divider mt-10 overflow-hidden pb-10">
        <div className="glass-panel rounded-[1.75rem] px-4 py-4 sm:px-6">
          <div className="animate-marquee flex min-w-max items-center gap-3 text-sm text-muted-foreground">
            {[...trustBand, ...trustBand].map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-4 py-2"
              >
                <span className="size-2 rounded-full bg-primary" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="premium-section py-10 sm:py-16">
        <SectionHeader
          eyebrow="Operational confidence"
          title="Designed to make serious voting feel calm, clear, and trustworthy."
          description="The premium shell is not decoration. It helps operators understand state, move through setup, and present results with confidence to stakeholders."
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
                <p className="mt-4 text-lg font-medium text-foreground">{stat.label}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.note}</p>
              </GlassPanel>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section id="flow" className="premium-section py-10 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <motion.div
            variants={slideLeft}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            <SectionHeader
              eyebrow="Workflow"
              title="A guided scroll from poll setup to final verification."
              description="Each phase is framed to feel deliberate and easy to operate, even when the trust model underneath is doing heavy lifting."
            />
          </motion.div>
          <motion.div
            className="grid gap-4 sm:grid-cols-2"
            variants={staggerChildren}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            {flow.map((item) => (
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

      <section id="features" className="premium-section py-10 sm:py-16">
        <SectionHeader
          eyebrow="Feature stack"
          title="Everything the product says visually is backed by real protocol behavior."
          description="This frontend redesign keeps the existing VoteX logic intact while presenting the system with the level of clarity and quality users expect from mature software."
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
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p>
              </GlassPanel>
            </motion.div>
          ))}
        </motion.div>
      </section>

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
                Why it stands out
              </p>
              <h2 className="mt-4 font-heading text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                VoteX pairs a polished operator experience with a visible, inspectable trust model.
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.4rem] border border-primary/20 bg-primary/8 p-5">
                  <p className="text-sm font-medium text-primary">VoteX</p>
                  <ul className="mt-4 space-y-3 text-sm text-foreground">
                    {[
                      "Wallet-signed participation",
                      "Optional invite and Merkle flow",
                      "Explorer and IPFS references",
                      "Premium responsive shell",
                    ].map((item) => (
                      <li key={item} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[1.4rem] border border-border/70 bg-background/60 p-5">
                  <p className="text-sm font-medium text-muted-foreground">Legacy polling</p>
                  <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                    {[
                      "Opaque tallying process",
                      "Password or spreadsheet-heavy flows",
                      "Weak evidence trail after the vote",
                      "Generic, low-trust presentation",
                    ].map((item) => (
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
            {showcaseCards.map((card) => (
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

      <section id="testimonials" className="premium-section py-10 sm:py-16">
        <SectionHeader
          eyebrow="Adoption signal"
          title="Teams notice the difference when the experience matches the integrity of the system."
          description="A voting product earns trust through both implementation and presentation. These are the kinds of reactions the redesigned frontend is aiming to create."
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
                <p className="text-base leading-8 text-foreground/92">“{item.quote}”</p>
                <div className="mt-8">
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.role}</p>
                </div>
              </GlassPanel>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section id="cta" className="premium-section py-10 sm:py-16">
        <div className="relative overflow-hidden rounded-[2.25rem] border border-primary/20 bg-[linear-gradient(135deg,rgba(12,22,42,0.96),rgba(14,32,58,0.92),rgba(12,22,42,0.96))] px-6 py-12 text-slate-100 shadow-(--shadow-strong) sm:px-8 sm:py-14 lg:px-12">
          <GlowOrb color="emerald" size={420} className="-left-24 top-1/2 -translate-y-1/2" />
          <GlowOrb color="cyan" size={360} className="-right-16 -top-16" />
          <FloatingParticles count={12} className="opacity-80" />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.32em] text-cyan-200/90">
                premium launch path
              </p>
              <h2 className="mt-4 font-heading text-3xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                Ready to turn VoteX into a landing page that feels production-grade?
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                Start with a live poll, show the flow to stakeholders, and let the
                new shell communicate the same level of seriousness as the underlying protocol.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-start">
              <Link href="/create" className="button-primary-premium gap-2 bg-white text-slate-950 hover:bg-slate-100">
                Launch the create flow
                <ArrowRight className="size-4" />
              </Link>
              <Link href="/polls" className="button-secondary-premium border-white/15 bg-white/8 text-white hover:bg-white/12">
                Review live poll state
              </Link>
              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-4 text-sm text-slate-300">
                Don’t Trust the Vote. Verify It.
              </div>
            </div>
          </div>
        </div>
      </section>

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
                    Verifiable voting for teams that want polish and proof.
                  </p>
                </div>
              </div>
              <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
                This redesign keeps the core VoteX logic intact while upgrading the
                product story, visual hierarchy, and responsiveness across the public-facing experience.
              </p>
            </div>

            {footerColumns.map((column) => (
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
          <span>Built on Solana with wallet-native participation</span>
          <span>Responsive light and dark themes, premium non-black dark mode</span>
        </div>
      </footer>
    </div>
  );
}
