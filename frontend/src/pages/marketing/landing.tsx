import { AiDemoSection } from "@/components/marketing/ai-demo-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { HeroSection } from "@/components/marketing/hero-section";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingMotionController } from "@/components/marketing/marketing-motion-controller";
import { PricingSection } from "@/components/marketing/pricing-section";
import { StatsSection } from "@/components/marketing/stats-section";
import { TrustedTeams } from "@/components/marketing/trusted-teams";

export function LandingPage() {
  return (
    <>
      <MarketingMotionController />
      <HeroSection />
      <TrustedTeams />
      <FeaturesSection />
      <HowItWorks />
      <AiDemoSection />
      <StatsSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <MarketingFooter />
    </>
  );
}
