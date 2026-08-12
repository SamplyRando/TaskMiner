import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

import { SectionHeading } from "@/components/marketing/section-heading";
import { cn } from "@/lib/utils";

const plans = [
  {
    action: "Start free",
    billingNote: "Free during early access",
    features: [
      "Workspaces, projects, and tasks",
      "Task assignment and comments",
      "Files, activity, and audit history",
      "Roles and workspace invitations",
    ],
    name: "Starter",
    price: "Free",
    summary: "Use the complete current workspace during early access.",
  },
  {
    action: "Join early access",
    badge: "Planned",
    billingNote: "Pro is coming soon; no paid checkout is available today",
    features: [
      "Pricing will be announced before launch",
      "Plan details are not final",
      "No payment is collected today",
      "The current product remains available",
      "Updates will be shared before launch",
    ],
    name: "Pro",
    price: "Soon",
    summary: "The planned upgrade for teams that need deeper planning tools.",
  },
  {
    action: "Contact us",
    billingNote: "Tell us about your team and requirements",
    features: [
      "Discuss workspace requirements",
      "Review security needs",
      "Explore rollout constraints",
      "Plan migration requirements",
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
            description="Create an account and use the current product without entering payment details. Paid plans are not available yet."
            eyebrow="Early access"
          >
            <span id="marketing-pricing-title">
              Start with the full product.
            </span>
            <span>Upgrade options are coming later.</span>
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
