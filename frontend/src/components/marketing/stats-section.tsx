import { useEffect, useRef, useState } from "react";

const stats = [
  { decimals: 0, label: "Tasks organized", suffix: "k+", value: 50 },
  { decimals: 1, label: "Availability", suffix: "%", value: 99.9 },
  { decimals: 0, label: "Faster planning", suffix: "x", value: 4 },
  { decimals: 0, label: "AI assistance", suffix: "/7", value: 24 },
] as const;

type AnimatedStatProps = {
  decimals: number;
  suffix: string;
  value: number;
};

function AnimatedStat({ decimals, suffix, value }: AnimatedStatProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const showFinalValue = () => {
      hasAnimatedRef.current = true;
      setDisplayValue(value);
    };

    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      showFinalValue();
      return;
    }

    let animationFrame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasAnimatedRef.current) return;

        hasAnimatedRef.current = true;
        observer.unobserve(element);
        const startedAt = performance.now();
        const duration = 1300;

        const update = (now: number) => {
          const progress = Math.min((now - startedAt) / duration, 1);
          const easedProgress = 1 - Math.pow(1 - progress, 3);
          setDisplayValue(value * easedProgress);

          if (progress < 1) {
            animationFrame = window.requestAnimationFrame(update);
          }
        };

        animationFrame = window.requestAnimationFrame(update);
      },
      { threshold: 0.45 },
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, [value]);

  return (
    <span aria-label={`${value.toFixed(decimals)}${suffix}`} ref={elementRef}>
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function StatsSection() {
  return (
    <section
      aria-labelledby="marketing-stats-title"
      className="marketing-stats"
    >
      <div className="marketing-section-shell marketing-stats__inner">
        <div className="marketing-stats__intro">
          <p>Built for momentum</p>
          <h2 id="marketing-stats-title">
            Less process.
            <span>More progress.</span>
          </h2>
        </div>
        <dl className="marketing-stats__grid">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>
                <AnimatedStat
                  decimals={stat.decimals}
                  suffix={stat.suffix}
                  value={stat.value}
                />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
