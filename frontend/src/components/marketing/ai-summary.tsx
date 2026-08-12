import { Check, Sparkles } from "lucide-react";

const summaryLines = [
  ["Project", "organized"],
  ["Tasks created", "5"],
  ["Priorities detected", "3"],
  ["Estimated duration", "2 weeks"],
] as const;

type AiSummaryProps = {
  isComplete: boolean;
  visibleLineCount: number;
};

export function AiSummary({ isComplete, visibleLineCount }: AiSummaryProps) {
  return (
    <section className="marketing-ai-summary">
      <header>
        <span>
          <Sparkles />
          AI Summary
        </span>
        {isComplete ? (
          <strong className="marketing-ai-summary__done">
            <Check />
            Done
          </strong>
        ) : null}
      </header>
      <dl>
        {summaryLines.slice(0, visibleLineCount).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {isComplete ? (
        <p>
          <span />
          Ready to start.
        </p>
      ) : null}
    </section>
  );
}
