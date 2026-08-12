import { useEffect, useRef, useState } from "react";

const stats = [
  { decimals: 0, label: "Workspace roles", suffix: "", value: 4 },
  { decimals: 0, label: "Task priority levels", suffix: "", value: 4 },
  { decimals: 0, label: "Task workflow states", suffix: "", value: 3 },
  { decimals: 0, label: "Live activity histories", suffix: "", value: 2 },
] as const;

type AnimatedStatProps = {
  decimals: number;
  motionState: "animate" | "complete" | "idle";
  suffix: string;
  value: number;
};

function AnimatedStat({
  decimals,
  motionState,
  suffix,
  value,
}: AnimatedStatProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (motionState !== "animate") return;

    let animationFrame = 0;
    const startedAt = performance.now();
    const duration = 1050;

    const update = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * easedProgress);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(update);
      }
    };

    animationFrame = window.requestAnimationFrame(update);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [motionState, value]);

  return (
    <span aria-label={`${value.toFixed(decimals)}${suffix}`}>
      {(motionState === "complete" ? value : displayValue).toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function StatsSection() {
  const [motionState, setMotionState] = useState<
    "animate" | "complete" | "idle"
  >(() => {
    if (
      typeof window === "undefined" ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return "complete";
    }
    return "idle";
  });
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || motionState !== "idle") return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setMotionState("animate");
        observer.disconnect();
      },
      { threshold: 0.35 },
    );
    observer.observe(section);
    const handleMotionPreference = () => {
      if (reducedMotion.matches) {
        setMotionState("complete");
        observer.disconnect();
      }
    };
    reducedMotion.addEventListener("change", handleMotionPreference);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", handleMotionPreference);
    };
  }, [motionState]);

  return (
    <section
      aria-labelledby="marketing-stats-title"
      className="marketing-stats"
      id="product-proof"
      ref={sectionRef}
    >
      <div
        className="marketing-section-shell marketing-stats__inner marketing-motion-reveal marketing-motion-reveal--scale marketing-motion-reveal--blur"
        data-marketing-reveal
      >
        <div className="marketing-stats__intro">
          <p>Structure you can verify</p>
          <h2 id="marketing-stats-title">
            Clear ownership.
            <span>Traceable work.</span>
          </h2>
        </div>
        <dl className="marketing-stats__grid">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>
                <AnimatedStat
                  decimals={stat.decimals}
                  motionState={motionState}
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
