import { ArrowRight, Check, Play } from "lucide-react";
import { Link } from "react-router-dom";

import { ProductPreview } from "@/components/marketing/product-preview";

export function HeroSection() {
  return (
    <section aria-labelledby="marketing-hero-title" className="marketing-hero">
      <div aria-hidden="true" className="marketing-hero__orb" />
      <div aria-hidden="true" className="marketing-hero__ambient">
        <span />
        <span />
        <span />
      </div>
      <div className="marketing-hero__container">
        <div className="marketing-hero__copy marketing-reveal">
          <div className="marketing-hero__eyebrow">
            <span>Brief · structured draft · human review</span>
          </div>

          <h1 id="marketing-hero-title">
            <span>Turn a project brief</span>
            <span className="marketing-hero__title-accent">
              into reviewed work.
            </span>
          </h1>

          <p className="marketing-hero__description">
            TaskMiner proposes tasks, priorities, dependencies, and milestones.
            Edit the draft, choose what to keep, then apply it to the workspace
            where your team delivers.
          </p>

          <div className="marketing-hero__actions">
            <Link
              className="marketing-button marketing-button--hero"
              to="/register"
            >
              Start for free
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <a
              className="marketing-button marketing-button--secondary marketing-button--hero"
              href="#demo"
            >
              <Play
                aria-hidden="true"
                className="size-3.5"
                fill="currentColor"
              />
              See the workflow
            </a>
          </div>

          <p className="marketing-hero__trust">
            <span>
              <Check
                aria-hidden="true"
                className="size-3.5"
                strokeWidth={2.5}
              />
            </span>
            Free plan · no credit card required
          </p>
        </div>

        <ProductPreview />
      </div>
    </section>
  );
}
