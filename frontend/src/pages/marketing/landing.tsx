import { FeaturesSection } from "@/components/marketing/features-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { HeroSection } from "@/components/marketing/hero-section";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { StatsSection } from "@/components/marketing/stats-section";
import { TrustedTeams } from "@/components/marketing/trusted-teams";

export function LandingPage() {
  return (
    <>
      <HeroSection />
      <TrustedTeams />
      <FeaturesSection />
      <HowItWorks />
      <StatsSection />
      <FinalCta />
    </>
  );
}
