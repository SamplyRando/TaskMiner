import { useEffect } from "react";

import { AdaptationSection } from "@/components/marketing/adaptation-section";
import { CollaborationSection } from "@/components/marketing/collaboration-section";
import { ControlSection } from "@/components/marketing/control-section";
import { ExecutionSection } from "@/components/marketing/execution-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { FinalCta } from "@/components/marketing/final-cta";
import { HeroSection } from "@/components/marketing/hero-section";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MarketingAnchorNavigation } from "@/components/marketing/marketing-anchor-navigation";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { PricingSection } from "@/components/marketing/pricing-section";
import { ProblemSection } from "@/components/marketing/problem-section";
import { VisibilitySection } from "@/components/marketing/visibility-section";

export const LANDING_TITLE = "TaskMiner — Gestion de projet assistée par IA";

/**
 * Public landing page. The narrative follows the product: a goal becomes a
 * reviewed plan (TaskMiner AI), then work the team executes, follows and
 * adapts — with the person always deciding what is applied.
 */
export function LandingPage() {
  // The static index.html carries the same title for crawlers; this restores
  // it after an in-app navigation from another public page.
  useEffect(() => {
    document.title = LANDING_TITLE;
  }, []);

  return (
    <>
      <MarketingAnchorNavigation />
      <main className="outline-none" id="marketing-content" tabIndex={-1}>
        <HeroSection />
        <ProblemSection />
        <HowItWorks />
        <ExecutionSection />
        <AdaptationSection />
        <VisibilitySection />
        <CollaborationSection />
        <ControlSection />
        <PricingSection />
        <FaqSection />
        <FinalCta />
      </main>
      <MarketingFooter />
    </>
  );
}
