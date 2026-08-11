import { Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [reduceMotion, setReduceMotion] = useState(getReducedMotionPreference);

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
    if (isPaused || reduceMotion) return;

    const interval = window.setInterval(() => {
      setCycle((current) => current + 1);
    }, 6000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isPaused, reduceMotion]);

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
    >
      <div className="marketing-section-shell marketing-ai-demo__layout">
        <div className="marketing-ai-demo__copy">
          <span className="marketing-ai-demo__eyebrow">
            <Sparkles aria-hidden="true" />
            Intelligence, in motion
          </span>
          <h2 id="marketing-ai-demo-title">Watch TaskMiner think.</h2>
          <p>
            Describe your project in one sentence. TaskMiner instantly creates
            tasks, priorities, milestones and next actions.
          </p>
          <PromptAnimation
            cycle={cycle}
            isPaused={isPaused}
            reduceMotion={reduceMotion}
          />
        </div>

        <figure
          className={cn("marketing-ai-demo__card", {
            "marketing-ai-demo__card--paused": isPaused,
            "marketing-ai-demo__card--reduced": reduceMotion,
          })}
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
