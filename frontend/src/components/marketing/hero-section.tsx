import { ArrowRight, Check, Play } from "lucide-react";
import { Link } from "react-router-dom";

import { ProductPreview } from "@/components/marketing/product-preview";
import { useHeroParallax } from "@/components/marketing/use-hero-parallax";

export function HeroSection() {
  const heroRef = useHeroParallax<HTMLElement>();

  return (
    <section
      aria-labelledby="marketing-hero-title"
      className="marketing-hero"
      ref={heroRef}
    >
      <div aria-hidden="true" className="marketing-hero__orb" />
      <div aria-hidden="true" className="marketing-hero__ambient">
        <span />
        <span />
        <span />
      </div>
      <div className="marketing-hero__container">
        <div className="marketing-hero__copy marketing-reveal">
          <div className="marketing-hero__eyebrow">
            <span>
              <span className="marketing-hero__eyebrow-dot" />
              AI-assisted project workspace
            </span>
          </div>

          <h1 id="marketing-hero-title">
            <span>Stop managing work.</span>
            <span className="marketing-hero__title-accent">
              Start executing it.
            </span>
          </h1>

          <p className="marketing-hero__description">
            Turn project context into clear tasks, priorities, and next actions
            in one shared workspace for planning, collaboration, and delivery.
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
              Watch demo
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
            No credit card required
          </p>
        </div>

        <ProductPreview />
      </div>
    </section>
  );
}
