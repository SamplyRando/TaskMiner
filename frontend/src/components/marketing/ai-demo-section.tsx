import { Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

import { AiSummary } from "@/components/marketing/ai-summary";
import { AiTaskCards } from "@/components/marketing/ai-task-cards";
import { AiTimeline } from "@/components/marketing/ai-timeline";
import { PromptAnimation } from "@/components/marketing/prompt-animation";
import { cn } from "@/lib/utils";

function getReducedMotionPreference() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function AiDemoSection() {
  const [cycle, setCycle] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(getReducedMotionPreference);
  const sectionRef = useRef<HTMLElement>(null);
  const wasInViewportRef = useRef(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setReduceMotion(mediaQuery.matches);
    };

    mediaQuery.addEventListener("change", updatePreference);
    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !("IntersectionObserver" in window)) {
      setIsInViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry?.isIntersecting ?? false;
        setIsInViewport(isVisible);

        if (isVisible && !wasInViewportRef.current) {
          setCycle((current) => current + 1);
        }
        wasInViewportRef.current = isVisible;
      },
      { rootMargin: "120px 0px", threshold: 0.08 },
    );

    observer.observe(section);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (isPaused || reduceMotion || !isInViewport) return;

    const interval = window.setInterval(() => {
      setCycle((current) => current + 1);
    }, 6000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isInViewport, isPaused, reduceMotion]);

  const togglePlayback = () => {
    if (isPaused) setCycle((current) => current + 1);
    setIsPaused((current) => !current);
  };

  const replay = () => {
    setCycle((current) => current + 1);
    setIsPaused(false);
  };

  return (
    <section
      aria-labelledby="marketing-ai-demo-title"
      className="marketing-section marketing-ai-demo"
      ref={sectionRef}
    >
      <div className="marketing-section-shell marketing-ai-demo__layout">
        <div
          className="marketing-ai-demo__copy marketing-motion-reveal marketing-motion-reveal--up"
          data-marketing-reveal
        >
          <span className="marketing-ai-demo__eyebrow">
            <Sparkles aria-hidden="true" />
            Intelligence, in motion
          </span>
          <h2 id="marketing-ai-demo-title">Watch TaskMiner think.</h2>
          <p>
            Describe your project in one sentence. TaskMiner instantly creates
            tasks, priorities, milestones and next actions.
          </p>
          <div
            className="marketing-motion-reveal marketing-motion-reveal--up"
            data-marketing-reveal
            style={{ "--reveal-delay": "100ms" } as CSSProperties}
          >
            <PromptAnimation
              cycle={cycle}
              isPaused={isPaused}
              reduceMotion={reduceMotion}
            />
          </div>
        </div>

        <figure
          className={cn(
            "marketing-ai-demo__card marketing-motion-reveal marketing-motion-reveal--scale marketing-motion-reveal--blur",
            {
              "marketing-ai-demo__card--paused": isPaused,
              "marketing-ai-demo__card--reduced": reduceMotion,
            },
          )}
          data-marketing-reveal
          style={{ "--reveal-delay": "190ms" } as CSSProperties}
        >
          <div className="marketing-ai-demo__header">
            <div>
              <span className="marketing-ai-demo__brand">
                <Sparkles aria-hidden="true" />
              </span>
              <span>
                <strong>TaskMiner AI</strong>
                <small>Project intelligence</small>
              </span>
            </div>
            <div className="marketing-ai-demo__controls">
              <button
                aria-label="Replay AI demonstration"
                onClick={replay}
                type="button"
              >
                <RotateCcw aria-hidden="true" />
              </button>
              <button
                aria-label={
                  isPaused
                    ? "Resume AI demonstration"
                    : "Pause AI demonstration"
                }
                aria-pressed={isPaused}
                onClick={togglePlayback}
                type="button"
              >
                {isPaused ? (
                  <Play aria-hidden="true" />
                ) : (
                  <Pause aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="marketing-ai-demo__stage"
            key={cycle}
          >
            <div className="marketing-ai-demo__sweep" />
            <div className="marketing-ai-demo__thinking">
              <span>Thinking</span>
              <span className="marketing-ai-demo__thinking-dots">
                <i />
                <i />
                <i />
              </span>
            </div>
            <div className="marketing-ai-demo__content">
              <AiTaskCards />
              <div className="marketing-ai-demo__insights">
                <AiTimeline />
                <AiSummary />
              </div>
            </div>
          </div>

          <figcaption className="sr-only">
            Animated TaskMiner AI demonstration. A project prompt becomes five
            prioritized tasks, a two-week timeline, and an actionable summary.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
