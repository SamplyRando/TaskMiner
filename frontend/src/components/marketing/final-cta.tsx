import { ArrowRight, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";

export function FinalCta() {
  return (
    <section
      aria-labelledby="marketing-cta-title"
      className="marketing-final-cta"
    >
      <div aria-hidden="true" className="marketing-final-cta__glow" />
      <div className="marketing-section-shell marketing-final-cta__inner">
        <span className="marketing-final-cta__eyebrow">Your next chapter</span>
        <h2 id="marketing-cta-title">Ready to stop managing work?</h2>
        <p>
          Give your team one intelligent place to plan clearly, collaborate
          naturally, and execute with confidence.
        </p>
        <div className="marketing-final-cta__actions">
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
        <span className="marketing-final-cta__note">
          Free to start · No credit card required
        </span>
      </div>
    </section>
  );
}
