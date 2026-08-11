import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const prompts = [
  "Plan the launch of our mobile app before October.",
  "Prepare our product launch.",
  "Organize next week's sprint.",
  "Create onboarding tasks.",
  "Build our marketing roadmap.",
  "Generate client follow-ups.",
] as const;

type PromptAnimationProps = {
  cycle: number;
  isPaused: boolean;
  reduceMotion: boolean;
};

type TypingMode = "deleting" | "holding" | "typing";

export function PromptAnimation({
  cycle,
  isPaused,
  reduceMotion,
}: PromptAnimationProps) {
  const [promptIndex, setPromptIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState<string>(prompts[0]);
  const [mode, setMode] = useState<TypingMode>("holding");
  const currentPrompt = prompts[promptIndex] ?? prompts[0];

  useEffect(() => {
    if (reduceMotion || isPaused) return;

    let delay = 48;

    if (mode === "holding") delay = 3200;
    if (mode === "deleting") delay = displayedText.length === 0 ? 260 : 26;

    const timeout = window.setTimeout(() => {
      if (mode === "holding") {
        setMode("deleting");
        return;
      }

      if (mode === "deleting") {
        if (displayedText.length > 0) {
          setDisplayedText((current) => current.slice(0, -1));
          return;
        }

        setPromptIndex((current) => (current + 1) % prompts.length);
        setMode("typing");
        return;
      }

      if (displayedText.length < currentPrompt.length) {
        setDisplayedText(currentPrompt.slice(0, displayedText.length + 1));
        return;
      }

      setMode("holding");
    }, delay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [currentPrompt, displayedText, isPaused, mode, reduceMotion]);

  return (
    <div
      aria-label={`Example AI prompt: ${currentPrompt}`}
      aria-readonly="true"
      className={cn("marketing-ai-prompt", {
        "marketing-ai-prompt--paused": isPaused,
        "marketing-ai-prompt--reduced": reduceMotion,
      })}
      key={cycle}
      role="textbox"
    >
      <span className="marketing-ai-prompt__icon">
        <Sparkles aria-hidden="true" />
      </span>
      <span aria-hidden="true" className="marketing-ai-prompt__text">
        {displayedText}
        <span className="marketing-ai-prompt__cursor" />
      </span>
      <kbd aria-hidden="true">↵ Enter</kbd>
    </div>
  );
}
