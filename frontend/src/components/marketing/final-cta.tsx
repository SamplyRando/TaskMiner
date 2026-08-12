import { ArrowRight, CalendarDays } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";

export function FinalCta() {
  return (
    <section
      aria-labelledby="marketing-cta-title"
      className="marketing-final-cta"
    >
      <div
        aria-hidden="true"
        className="marketing-final-cta__glow marketing-motion-reveal marketing-motion-reveal--scale"
        data-marketing-reveal
      />
      <div className="marketing-section-shell marketing-final-cta__inner">
        <span
          className="marketing-final-cta__eyebrow marketing-motion-reveal marketing-motion-reveal--up"
          data-marketing-reveal
        >
          Your next chapter
        </span>
        <h2
          className="marketing-motion-reveal marketing-motion-reveal--up marketing-motion-reveal--blur"
          data-marketing-reveal
          id="marketing-cta-title"
        >
          Ready to stop managing work?
        </h2>
        <p
          className="marketing-motion-reveal marketing-motion-reveal--up"
          data-marketing-reveal
          style={{ "--reveal-delay": "80ms" } as CSSProperties}
        >
          Give your team one intelligent place to plan clearly, collaborate
          naturally, and execute with confidence.
        </p>
        <div
          className="marketing-final-cta__actions marketing-motion-reveal marketing-motion-reveal--up"
          data-marketing-reveal
          style={{ "--reveal-delay": "150ms" } as CSSProperties}
        >
          <Link
            className="marketing-button marketing-button--hero"
            to="/register"
          >
            Start for free
            <ArrowRight aria-hidden="true" />
          </Link>
          <a
            className="marketing-button marketing-button--secondary marketing-button--hero"
            href="mailto:hello@taskminer.app?subject=TaskMiner%20demo"
          >
            <CalendarDays aria-hidden="true" />
            Book a demo
          </a>
        </div>
        <span
          className="marketing-final-cta__note marketing-motion-reveal marketing-motion-reveal--up"
          data-marketing-reveal
          style={{ "--reveal-delay": "210ms" } as CSSProperties}
        >
          Free to start · No credit card required
        </span>
      </div>
    </section>
  );
}
