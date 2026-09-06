import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import { SectionHeading } from "@/components/marketing/section-heading";
import { cn } from "@/lib/utils";

const plans = [
  {
    action: "Start free",
    billingNote: "Free",
    features: [
      "1 workspace",
      "3 members per workspace",
      "5 projects per workspace",
      "25 AI requests per month",
    ],
    name: "Starter",
    price: "Free",
    summary: "For individuals and small teams getting organized.",
  },
  {
    action: "Start Pro",
    badge: "Most popular",
    billingNote: "per workspace, billed monthly",
    features: [
      "Up to 5 owned workspaces",
      "15 members per workspace",
      "50 projects per workspace",
      "500 AI requests per month",
      "Full TaskMiner AI",
    ],
    name: "Pro",
    price: "12 € / month",
    summary: "For teams running more projects with TaskMiner AI.",
  },
  {
    action: "Contact us",
    billingNote: "Tell us about your team and requirements",
    features: [
      "Custom workspace limits",
      "Custom member and project limits",
      "Security and rollout discussion",
      "Migration planning",
    ],
    name: "Enterprise",
    price: "Contact",
    summary: "For organizations evaluating TaskMiner for a broader rollout.",
  },
] as const;

export function PricingSection() {
  return (
    <section
      aria-labelledby="marketing-pricing-title"
      className="marketing-section marketing-pricing"
      id="pricing"
    >
      <div className="marketing-section-shell">
        <div
          className="marketing-pricing__intro marketing-motion-reveal marketing-motion-reveal--up"
          data-marketing-reveal
        >
          <SectionHeading
            description="Start free, then upgrade individual workspaces when your team needs more capacity."
            eyebrow="Simple pricing"
          >
            <span id="marketing-pricing-title">
              Choose the capacity your team needs.
            </span>
            <span>Keep control as your work grows.</span>
          </SectionHeading>
        </div>

        <div className="marketing-pricing-grid">
          {plans.map((plan, index) => {
            const isPro = plan.name === "Pro";
            const isEnterprise = plan.name === "Enterprise";

            return (
              <article
                className={cn(
                  "marketing-pricing-card",
                  {
                    "marketing-pricing-card--featured": isPro,
                  },
                  "marketing-motion-reveal marketing-motion-reveal--up",
                )}
                data-marketing-reveal
                key={plan.name}
                style={
                  {
                    "--reveal-delay": `${String(index * 90)}ms`,
                  } as CSSProperties
                }
              >
                {"badge" in plan ? (
                  <span className="marketing-pricing-card__badge">
                    {plan.badge}
                  </span>
                ) : null}

                <header>
                  <h3>{plan.name}</h3>
                  <span>{plan.summary}</span>
                </header>

                <div className="marketing-pricing-card__price">
                  <strong>{plan.price}</strong>
                </div>

                <p className="marketing-pricing-card__billing-note">
                  {plan.billingNote}
                </p>

                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <Check aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {isEnterprise ? (
                  <a
                    className="marketing-pricing-card__action"
                    href="mailto:hello@taskminer.app?subject=TaskMiner%20Enterprise"
                  >
                    {plan.action}
                  </a>
                ) : (
                  <Link
                    className={cn("marketing-pricing-card__action", {
                      "marketing-pricing-card__action--primary": isPro,
                    })}
                    to="/register"
                  >
                    {plan.action}
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
