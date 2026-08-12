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

const DEMO_STAGE_TIMES = [
  0, 400, 800, 1200, 1300, 1600, 1700, 2000, 2100, 2400, 2500, 2900, 3200, 3425,
  3650, 3875, 4100, 4300, 4550, 4800, 5050, 5200,
] as const;
const TASK_REVEAL_TIMES = [800, 1200, 1600, 2000, 2400] as const;
const PRIORITY_REVEAL_TIMES = [1300, 1700, 2100, 2500, 2900] as const;
const TIMELINE_REVEAL_TIMES = [3200, 3425, 3650, 3875, 4100] as const;
const SUMMARY_REVEAL_TIMES = [4300, 4550, 4800, 5050] as const;
const DEMO_COMPLETE_TIME = 5200;
const DEMO_DURATION = 6000;

function countReachedStages(times: readonly number[], stageTime: number) {
  return times.filter((time) => time <= stageTime).length;
}

export function AiDemoSection() {
  const [cycle, setCycle] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(getReducedMotionPreference);
  const sectionRef = useRef<HTMLElement>(null);

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

    const currentStageTime = DEMO_STAGE_TIMES[stageIndex] ?? 0;
    const nextStageTime = DEMO_STAGE_TIMES[stageIndex + 1];
    const delay =
      nextStageTime === undefined
        ? DEMO_DURATION - currentStageTime
        : nextStageTime - currentStageTime;

    const timeout = window.setTimeout(() => {
      if (nextStageTime === undefined) {
        setStageIndex(0);
        setCycle((current) => current + 1);
        return;
      }

      setStageIndex((current) => current + 1);
    }, delay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isInViewport, isPaused, reduceMotion, stageIndex]);

  const togglePlayback = () => {
    setIsPaused((current) => !current);
  };

  const replay = () => {
    setStageIndex(0);
    setCycle((current) => current + 1);
    setIsPaused(false);
  };

  const currentStageTime = reduceMotion
    ? DEMO_COMPLETE_TIME
    : (DEMO_STAGE_TIMES[stageIndex] ?? 0);
  const visibleTaskCount = countReachedStages(
    TASK_REVEAL_TIMES,
    currentStageTime,
  );
  const prioritizedTaskCount = countReachedStages(
    PRIORITY_REVEAL_TIMES,
    currentStageTime,
  );
  const visibleTimelineStepCount = countReachedStages(
    TIMELINE_REVEAL_TIMES,
    currentStageTime,
  );
  const visibleSummaryLineCount = countReachedStages(
    SUMMARY_REVEAL_TIMES,
    currentStageTime,
  );
  const isThinking = currentStageTime >= 400 && currentStageTime < 3200;
  const isComplete = currentStageTime >= DEMO_COMPLETE_TIME;
  let demoState = "inactive";
  if (isInViewport) demoState = "active";
  if (isPaused) demoState = "paused";
  if (reduceMotion) demoState = "complete";

  return (
    <section
      aria-labelledby="marketing-ai-demo-title"
      className="marketing-section marketing-ai-demo"
      id="demo"
      ref={sectionRef}
    >
      <div className="marketing-section-shell marketing-ai-demo__layout">
        <div
          className="marketing-ai-demo__copy marketing-motion-reveal marketing-motion-reveal--up"
          data-marketing-anchor-target
          data-marketing-reveal
          tabIndex={-1}
        >
          <span className="marketing-ai-demo__eyebrow">
            <Sparkles aria-hidden="true" />
            Intelligence, in motion
          </span>
          <h2 id="marketing-ai-demo-title">Watch TaskMiner think.</h2>
          <p>
            Describe the outcome and context. TaskMiner turns it into a
            reviewable starting plan with tasks, priorities, milestones, and
            next actions.
          </p>
          <div
            className="marketing-motion-reveal marketing-motion-reveal--up"
            data-marketing-reveal
            style={{ "--reveal-delay": "100ms" } as CSSProperties}
          >
            <PromptAnimation
              cycle={cycle}
              isPaused={isPaused || !isInViewport}
              reduceMotion={reduceMotion}
            />
          </div>
        </div>

        <figure
          className={cn("marketing-ai-demo__card", {
            "marketing-ai-demo__card--paused": isPaused,
            "marketing-ai-demo__card--reduced": reduceMotion,
            "marketing-ai-demo__card--inactive": !isInViewport,
          })}
          data-demo-state={demoState}
          data-testid="ai-demo-panel"
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
            data-demo-stage={currentStageTime}
            key={cycle}
          >
            {isThinking ? (
              <>
                <div className="marketing-ai-demo__sweep" />
                <div className="marketing-ai-demo__thinking">
                  <span>Thinking</span>
                  <span className="marketing-ai-demo__thinking-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              </>
            ) : null}
            <div className="marketing-ai-demo__content">
              <AiTaskCards
                prioritizedTaskCount={prioritizedTaskCount}
                visibleTaskCount={visibleTaskCount}
              />
              <div className="marketing-ai-demo__insights">
                {visibleTimelineStepCount > 0 ? (
                  <AiTimeline visibleStepCount={visibleTimelineStepCount} />
                ) : null}
                {visibleSummaryLineCount > 0 ? (
                  <AiSummary
                    isComplete={isComplete}
                    visibleLineCount={visibleSummaryLineCount}
                  />
                ) : null}
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
