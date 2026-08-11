import { Check } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { SectionHeading } from "@/components/marketing/section-heading";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "yearly";

const plans = [
  {
    action: "Start free",
    features: ["AI Tasks", "Projects", "Documents", "3 team members"],
    monthlyPrice: 0,
    name: "Starter",
    price: "Free",
    summary: "For individuals turning ideas into focused work.",
    yearlyPrice: 0,
  },
  {
    action: "Start Pro",
    features: [
      "Unlimited AI",
      "Unlimited Projects",
      "Analytics",
      "Team Workspace",
      "AI Automation",
    ],
    monthlyPrice: 19,
    name: "Pro",
    price: "",
    summary: "For ambitious teams ready to move with clarity.",
    yearlyPrice: 15,
  },
  {
    action: "Contact sales",
    features: ["SSO", "API", "Dedicated support", "Unlimited members"],
    monthlyPrice: 39,
    name: "Enterprise",
    price: "Custom",
    summary: "For organizations requiring control, scale, and support.",
    yearlyPrice: 31,
  },
] as const;

export function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const isYearly = billingCycle === "yearly";

  return (
    <section
      aria-labelledby="marketing-pricing-title"
      className="marketing-section marketing-pricing"
      id="pricing"
    >
      <div className="marketing-section-shell">
        <div className="marketing-pricing__intro">
          <SectionHeading
            description="Start with the essentials, then scale your workspace when your team is ready."
            eyebrow="Simple, transparent pricing"
          >
            <span id="marketing-pricing-title">Choose your momentum.</span>
            <span>Change plans anytime.</span>
          </SectionHeading>

          <div
            aria-label="Billing period"
            className={cn("marketing-billing-toggle", {
              "marketing-billing-toggle--yearly": isYearly,
            })}
            role="group"
          >
            <span
              aria-hidden="true"
              className="marketing-billing-toggle__thumb"
            />
            <button
              aria-pressed={!isYearly}
              onClick={() => {
                setBillingCycle("monthly");
              }}
              type="button"
            >
              Monthly
            </button>
            <button
              aria-pressed={isYearly}
              onClick={() => {
                setBillingCycle("yearly");
              }}
              type="button"
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="marketing-pricing-grid">
          {plans.map((plan) => {
            const isPro = plan.name === "Pro";
            const isEnterprise = plan.name === "Enterprise";
            const numericPrice = isYearly
              ? plan.yearlyPrice
              : plan.monthlyPrice;

            return (
              <article
                className={cn("marketing-pricing-card", {
                  "marketing-pricing-card--featured": isPro,
                })}
                key={plan.name}
              >
                {isPro ? (
                  <span className="marketing-pricing-card__badge">
                    Most Popular
                  </span>
                ) : null}

                <header>
                  <p>{plan.name}</p>
                  <span>{plan.summary}</span>
                </header>

                <div className="marketing-pricing-card__price">
                  {isPro ? (
                    <>
                      <span aria-hidden="true">$</span>
                      <strong key={`${billingCycle}-${plan.name}`}>
                        {numericPrice}
                      </strong>
                      <small>/month</small>
                      <span className="sr-only">
                        {numericPrice} dollars per month
                      </span>
                    </>
                  ) : (
                    <>
                      <strong>{plan.price}</strong>
                      {plan.name === "Starter" ? <small>forever</small> : null}
                    </>
                  )}
                </div>

                {isEnterprise ? (
                  <p className="marketing-pricing-card__enterprise-rate">
                    Plans from $
                    <span key={`${billingCycle}-${plan.name}`}>
                      {numericPrice}
                    </span>{" "}
                    per member / month
                  </p>
                ) : (
                  <p className="marketing-pricing-card__billing-note">
                    {isYearly ? "Billed annually" : "Billed monthly"}
                  </p>
                )}

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
