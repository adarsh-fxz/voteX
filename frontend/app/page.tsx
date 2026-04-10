"use client";

import { GlowOrb } from "@/components/landing/GlowOrb";
import { HeroSection } from "@/components/landing/HeroSection";
import { TrustBand } from "@/components/landing/TrustBand";
import { StatsSection } from "@/components/landing/StatsSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { FooterSection } from "@/components/landing/FooterSection";

export default function Home() {
  return (
    <div className="relative overflow-hidden pb-12">
      <GlowOrb color="cyan" size={520} className="-left-36 top-10" />
      <GlowOrb color="emerald" size={460} className="-right-28 top-96" />

      <HeroSection />
      <TrustBand />
      <StatsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ShowcaseSection />
      <TestimonialsSection />
      <CtaSection />
      <FooterSection />
    </div>
  );
}
